import {
  COINGECKO_ID_BY_SYMBOL,
  coingeckoIdsForSymbols,
  marketSymbolLookupKeys,
  normalizeMarketSymbol,
} from './coin-symbols';

export interface CoinMarketMeta {
  marketCap: number;
  imageUrl: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let marketMetaCache: Map<string, CoinMarketMeta> = new Map();
let lastFetch = 0;

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  market_cap: number | null;
  image: string;
}

interface CoinGeckoSimplePrice {
  usd?: number;
  usd_market_cap?: number;
}

function upsertMeta(map: Map<string, CoinMarketMeta>, symbol: string, marketCap: number, imageUrl: string) {
  const key = symbol.toUpperCase();
  const existing = map.get(key);

  if (marketCap <= 0 && !imageUrl) return;

  if (!existing) {
    map.set(key, { marketCap: marketCap || 0, imageUrl });
    return;
  }

  const cap = marketCap > existing.marketCap ? marketCap : existing.marketCap;
  const img = imageUrl || existing.imageUrl;
  if (cap > 0 || img) {
    map.set(key, { marketCap: cap, imageUrl: img });
  }
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

/** Index meta under futures baseAsset keys so direct lookups always work */
export function indexMetaForBaseAssets(meta: Map<string, CoinMarketMeta>, baseAssets: string[]): void {
  for (const base of baseAssets) {
    const found = lookupMarketMeta(base, meta);
    if (found) {
      meta.set(base.toUpperCase().replace(/USDT$/, ''), found);
      meta.set(normalizeMarketSymbol(base), found);
    }
  }
}

async function fetchFromCoinGeckoByIds(ids: string[]): Promise<Map<string, CoinMarketMeta>> {
  const map = new Map<string, CoinMarketMeta>();
  if (ids.length === 0) return map;

  const batchSize = 100;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${batch.join(',')}&vs_currencies=usd&include_market_cap=true`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TradePulse/1.0',
          },
        }
      );
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      if (!res.ok) continue;

      const json = (await res.json()) as Record<string, CoinGeckoSimplePrice>;
      for (const [id, data] of Object.entries(json)) {
        const cap = Number(data.usd_market_cap) || 0;
        if (cap <= 0) continue;
        // Store by id and resolve to symbol via reverse lookup in markets fetch
        map.set(id, { marketCap: cap, imageUrl: '' });
      }
    } catch {
      // skip batch
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return map;
}

async function fetchFromCoinGeckoMarkets(): Promise<Map<string, CoinMarketMeta>> {
  const map = new Map<string, CoinMarketMeta>();
  const idToSymbol = new Map<string, string>();

  for (let page = 1; page <= 10; page++) {
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
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      if (!res.ok) break;

      const coins = (await res.json()) as CoinGeckoMarket[];
      if (!Array.isArray(coins) || coins.length === 0) break;

      for (const c of coins) {
        const cap = Number(c.market_cap) || 0;
        idToSymbol.set(c.id, c.symbol.toUpperCase());
        upsertMeta(map, c.symbol, cap, c.image ?? '');
        if (cap > 0) map.set(c.id, { marketCap: cap, imageUrl: c.image ?? '' });
      }

      if (coins.length < 250) break;
      await new Promise((r) => setTimeout(r, 400));
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

  const batchSize = 25;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    try {
      const res = await fetch(
        `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${batch.join(',')}&tsyms=USD`,
        { headers: { Accept: 'application/json', 'User-Agent': 'TradePulse/1.0' } }
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
    await new Promise((r) => setTimeout(r, 250));
  }

  return map;
}

function resolveIdBasedCaps(
  idCaps: Map<string, CoinMarketMeta>,
  symbols: string[]
): Map<string, CoinMarketMeta> {
  const map = new Map<string, CoinMarketMeta>();

  for (const sym of symbols) {
    const normalized = normalizeMarketSymbol(sym);
    const id = COINGECKO_ID_BY_SYMBOL[normalized];
    if (!id) continue;
    const meta = idCaps.get(id);
    if (meta && meta.marketCap > 0) {
      upsertMeta(map, normalized, meta.marketCap, meta.imageUrl);
    }
  }
  return map;
}

function symbolsMissingCap(meta: Map<string, CoinMarketMeta>, symbols: string[]): string[] {
  return [...new Set(symbols.map((s) => normalizeMarketSymbol(s).toUpperCase()))].filter((s) => {
    const found = meta.get(s);
    return !found || found.marketCap <= 0;
  });
}

export async function fetchCoinMarketMeta(baseAssets: string[] = []): Promise<Map<string, CoinMarketMeta>> {
  const normalizedSymbols = [...new Set(baseAssets.map((b) => normalizeMarketSymbol(b)))];
  const useCache = Date.now() - lastFetch < CACHE_TTL_MS && marketMetaCache.size > 0;

  let merged = useCache ? new Map(marketMetaCache) : new Map<string, CoinMarketMeta>();

  // 1) CoinGecko by known coin IDs (most reliable — fixes symbol mismatch)
  const geckoIds = coingeckoIdsForSymbols(normalizedSymbols);
  const idCaps = await fetchFromCoinGeckoByIds(geckoIds);
  merged = mergeMaps(merged, resolveIdBasedCaps(idCaps, normalizedSymbols));

  // 2) CoinGecko markets list (broad coverage + images)
  if (!useCache || merged.size < 100) {
    const markets = await fetchFromCoinGeckoMarkets();
    merged = mergeMaps(merged, markets);
  }

  // 3) CryptoCompare fallback for any still missing
  const missing = symbolsMissingCap(merged, normalizedSymbols);
  if (missing.length > 0) {
    const compare = await fetchFromCryptoCompare(missing);
    merged = mergeMaps(merged, compare);
  }

  // 4) Index under futures baseAsset keys (1000PEPE → same meta as PEPE)
  if (baseAssets.length > 0) {
    indexMetaForBaseAssets(merged, baseAssets);
  }

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

export async function fetchMarketCaps(): Promise<Map<string, number>> {
  const meta = await fetchCoinMarketMeta();
  const caps = new Map<string, number>();
  for (const [symbol, data] of meta) {
    if (data.marketCap > 0) caps.set(symbol, data.marketCap);
  }
  return caps;
}
