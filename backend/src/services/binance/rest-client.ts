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
const MAX_REQUESTS_PER_MINUTE = 1200;
let requestTimestamps: number[] = [];

async function rateLimit(): Promise<void> {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = requestTimestamps[0];
    const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldest) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  requestTimestamps.push(Date.now());
}

async function binanceFetch<T>(endpoint: string, retries = 3): Promise<T> {
  await rateLimit();

  const url = `${env.BINANCE_REST_BASE}${endpoint}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (env.BINANCE_API_KEY) {
    headers['X-MBX-APIKEY'] = env.BINANCE_API_KEY;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { headers });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (attempt === retries) {
        await logError('binance-rest', `Failed to fetch ${endpoint}`, { attempt }, (error as Error).stack);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw new Error(`Failed to fetch ${endpoint} after ${retries} retries`);
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

export async function getAllOpenInterest(): Promise<BinanceOpenInterest[]> {
  const tickers = await get24hTickers();
  const usdtPairs = tickers.filter((t) => t.symbol.endsWith('USDT'));

  const batchSize = 10;
  const results: BinanceOpenInterest[] = [];

  for (let i = 0; i < usdtPairs.length; i += batchSize) {
    const batch = usdtPairs.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((t) => getOpenInterest(t.symbol))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
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
  try {
    await binanceFetch('/fapi/v1/ping');
    return true;
  } catch {
    return false;
  }
}
