import { env } from '../../config/env';
import { logError } from '../../utils/logger';
import type {
  BinanceExchangeInfo,
  BinanceFundingRate,
  BinanceMarkPrice,
  BinanceOpenInterest,
  BinanceTicker24h,
} from '../../types';

const RATE_LIMIT_WINDOW_MS = 60_000;
/** Conservative cap — Binance bans IPs (418) after sustained 429s */
const MAX_REQUESTS_PER_MINUTE = 180;
const MIN_REQUEST_INTERVAL_MS = 120;
const IP_BAN_COOLDOWN_MS = 60 * 60 * 1000;

let requestTimestamps: number[] = [];
let lastRequestAt = 0;
let ipBannedUntil = 0;
let requestChain: Promise<void> = Promise.resolve();

export function isBinanceIpBanned(): boolean {
  return Date.now() < ipBannedUntil;
}

export function getBinanceBanRemainingMs(): number {
  return Math.max(0, ipBannedUntil - Date.now());
}

function binanceBanError(): Error {
  const mins = Math.ceil(getBinanceBanRemainingMs() / 60_000);
  return new Error(
    mins > 0
      ? `Binance IP rate-limited. Retry in ~${mins} minute${mins === 1 ? '' : 's'}.`
      : 'Binance IP rate-limited. Please wait before retrying.'
  );
}

async function rateLimit(): Promise<void> {
  if (isBinanceIpBanned()) {
    throw binanceBanError();
  }

  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = requestTimestamps[0];
    const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldest) + 200;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const sinceLast = Date.now() - lastRequestAt;
  if (sinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - sinceLast));
  }

  lastRequestAt = Date.now();
  requestTimestamps.push(lastRequestAt);
}

/** Serialize all Binance REST calls to avoid burst traffic from parallel services */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = requestChain.then(fn);
  requestChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function binanceFetch<T>(endpoint: string, retries = 3): Promise<T> {
  return enqueue(async () => {
    await rateLimit();

    const url = `${env.BINANCE_REST_BASE}${endpoint}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (env.BINANCE_API_KEY) {
      headers['X-MBX-APIKEY'] = env.BINANCE_API_KEY;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, { headers });

        if (response.status === 418) {
          ipBannedUntil = Date.now() + IP_BAN_COOLDOWN_MS;
          throw binanceBanError();
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') ?? '10', 10);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          if (attempt === retries) {
            ipBannedUntil = Date.now() + 15 * 60 * 1000;
            throw new Error('Binance rate limit exceeded. Please wait a few minutes.');
          }
          continue;
        }

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        if (attempt === retries || isBinanceIpBanned()) {
          await logError('binance-rest', `Failed to fetch ${endpoint}`, { attempt }, (error as Error).stack);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }

    throw new Error(`Failed to fetch ${endpoint} after ${retries} retries`);
  });
}

export async function getExchangeInfo(): Promise<BinanceExchangeInfo> {
  return binanceFetch<BinanceExchangeInfo>('/fapi/v1/exchangeInfo');
}

export async function get24hTickers(): Promise<BinanceTicker24h[]> {
  return binanceFetch<BinanceTicker24h[]>('/fapi/v1/ticker/24hr');
}

export async function getOpenInterest(symbol: string): Promise<BinanceOpenInterest> {
  return binanceFetch<BinanceOpenInterest>(`/fapi/v1/openInterest?symbol=${symbol}`);
}

export async function getOpenInterestBatch(
  symbols: string[],
  options: { batchSize?: number; batchDelayMs?: number; maxSymbols?: number } = {}
): Promise<Map<string, BinanceOpenInterest>> {
  const { batchSize = 5, batchDelayMs = 300, maxSymbols = 40 } = options;
  const map = new Map<string, BinanceOpenInterest>();
  const targets = symbols.slice(0, maxSymbols);

  for (let i = 0; i < targets.length; i += batchSize) {
    if (isBinanceIpBanned()) break;

    const batch = targets.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map((s) => getOpenInterest(s)));

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        map.set(batch[j], result.value);
      }
    }

    if (i + batchSize < targets.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  return map;
}

export async function getAllOpenInterest(): Promise<BinanceOpenInterest[]> {
  const tickers = await get24hTickers();
  const usdtPairs = tickers
    .filter((t) => t.symbol.endsWith('USDT'))
    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .map((t) => t.symbol);

  const batchMap = await getOpenInterestBatch(usdtPairs, { maxSymbols: 50 });
  return Array.from(batchMap.values());
}

export async function getPremiumIndex(symbol?: string): Promise<BinanceMarkPrice[]> {
  const endpoint = symbol
    ? `/fapi/v1/premiumIndex?symbol=${symbol}`
    : '/fapi/v1/premiumIndex';
  const data = await binanceFetch<BinanceMarkPrice | BinanceMarkPrice[]>(endpoint);
  return Array.isArray(data) ? data : [data];
}

export async function getFundingRateHistory(
  symbol: string,
  limit = 100
): Promise<BinanceFundingRate[]> {
  return binanceFetch<BinanceFundingRate[]>(
    `/fapi/v1/fundingRate?symbol=${symbol}&limit=${limit}`
  );
}

export async function getKlines(
  symbol: string,
  interval: string,
  limit = 100
): Promise<number[][]> {
  return binanceFetch<number[][]>(
    `/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
}

export async function pingBinance(): Promise<boolean> {
  if (isBinanceIpBanned()) return false;
  try {
    await binanceFetch('/fapi/v1/ping');
    return true;
  } catch {
    return false;
  }
}
