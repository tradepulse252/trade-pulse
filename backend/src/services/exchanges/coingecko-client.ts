const CACHE_TTL_MS = 5 * 60 * 1000;

export interface CoinMarketMeta {
  marketCap: number;
  imageUrl: string;
}

let marketMetaCache: Map<string, CoinMarketMeta> = new Map();
let lastFetch = 0;

interface CoinGeckoMarket {
  symbol: string;
  market_cap: number;
  image: string;
}

export async function fetchMarketCaps(): Promise<Map<string, number>> {
  const meta = await fetchCoinMarketMeta();
  const caps = new Map<string, number>();
  for (const [symbol, data] of meta) {
    caps.set(symbol, data.marketCap);
  }
  return caps;
}

export async function fetchCoinMarketMeta(): Promise<Map<string, CoinMarketMeta>> {
  if (Date.now() - lastFetch < CACHE_TTL_MS && marketMetaCache.size > 0) {
    return marketMetaCache;
  }

  const map = new Map<string, CoinMarketMeta>();

  try {
    for (let page = 1; page <= 4; page++) {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TradePulse/1.0',
          },
        }
      );
      if (!res.ok) break;
      const coins = (await res.json()) as CoinGeckoMarket[];
      for (const c of coins) {
        map.set(c.symbol.toUpperCase(), {
          marketCap: c.market_cap,
          imageUrl: c.image,
        });
      }
      if (coins.length < 250) break;
    }
    marketMetaCache = map;
    lastFetch = Date.now();
  } catch {
    return marketMetaCache.size > 0 ? marketMetaCache : map;
  }

  return map;
}
