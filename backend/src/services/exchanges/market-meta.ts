import { marketSymbolLookupKeys } from './coin-symbols';

export interface CoinMarketMeta {
  marketCap: number;
  imageUrl: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let marketMetaCache: Map<string, CoinMarketMeta> = new Map();
let lastFetch = 0;

interface CoinGeckoMarket {
  symbol: string;
  market_cap: number | null;
  image: string;
}

function upsertMeta(map: Map<string, CoinMarketMeta>, symbol: string, marketCap: number, imageUrl: string) {
  if (marketCap <= 0) return;
  const key = symbol.toUpperCase();
  const existing = map.get(key);
  if (!existing || marketCap > existing.marketCap) {
    map.set(key, { marketCap, imageUrl });
  }
}

async function fetchFromCoinGecko(): Promise<Map<string, CoinMarketMeta>> {
  const map = new Map<string, CoinMarketMeta>();

  for (let page = 1; page <= 8; page++) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TradePulse/1.0',
          },
        }
      );

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) break;

      const coins = (await res.json()) as CoinGeckoMarket[];
      if (!Array.isArray(coins) || coins.length === 0) break;

      for (const c of coins) {
        upsertMeta(map, c.symbol, Number(c.market_cap) || 0, c.image ?? '');
      }

      if (coins.length < 250) break;
      await new Promise((r) => setTimeout(r, 350));
    } catch {
      break;
    }
  }

  return map;
}

async function fetchFromCryptoCompare(symbols: string[]): Promise<Map<string, CoinMarketMeta>> {
  const map = new Map<string, CoinMarketMeta>();
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter(Boolean);
  if (unique.length === 0) return map;

  const batchSize = 30;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    try {
      const res = await fetch(
        `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${batch.join(',')}&tsyms=USD`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) continue;

      const json = (await res.json()) as {
        RAW?: Record<string, { USD?: { MKTCAP?: number; IMAGEURL?: string } }>;
      };

      for (const sym of batch) {
        const raw = json.RAW?.[sym]?.USD;
        const cap = Number(raw?.MKTCAP) || 0;
        if (cap <= 0) continue;
        const imageUrl = raw?.IMAGEURL ? `https://www.cryptocompare.com${raw.IMAGEURL}` : '';
        upsertMeta(map, sym, cap, imageUrl);
      }
    } catch {
      // skip batch
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return map;
}

function mergeMaps(...maps: Map<string, CoinMarketMeta>[]): Map<string, CoinMarketMeta> {
  const out = new Map<string, CoinMarketMeta>();
  for (const map of maps) {
    for (const [key, meta] of map) {
      const existing = out.get(key);
      if (!existing || meta.marketCap > existing.marketCap) {
        out.set(key, meta);
      }
    }
  }
  return out;
}

export async function fetchCoinMarketMeta(extraSymbols: string[] = []): Promise<Map<string, CoinMarketMeta>> {
  if (Date.now() - lastFetch < CACHE_TTL_MS && marketMetaCache.size > 0 && extraSymbols.length === 0) {
    return marketMetaCache;
  }

  const gecko = await fetchFromCoinGecko();
  const missing = extraSymbols
    .map((s) => s.toUpperCase())
    .filter((s) => !gecko.has(s) || (gecko.get(s)?.marketCap ?? 0) <= 0);

  const compare = missing.length > 0 ? await fetchFromCryptoCompare(missing) : new Map();
  const merged = mergeMaps(marketMetaCache, gecko, compare);

  if (merged.size > 0) {
    marketMetaCache = merged;
    lastFetch = Date.now();
  }

  return merged.size > 0 ? merged : marketMetaCache;
}

export function lookupMarketMeta(
  baseAsset: string,
  meta: Map<string, CoinMarketMeta>
): CoinMarketMeta | undefined {
  for (const key of marketSymbolLookupKeys(baseAsset)) {
    const found = meta.get(key);
    if (found && found.marketCap > 0) return found;
  }
  return undefined;
}

// Back-compat re-export for coingecko-client consumers
export async function fetchMarketCaps(): Promise<Map<string, number>> {
  const meta = await fetchCoinMarketMeta();
  const caps = new Map<string, number>();
  for (const [symbol, data] of meta) {
    caps.set(symbol, data.marketCap);
  }
  return caps;
}
