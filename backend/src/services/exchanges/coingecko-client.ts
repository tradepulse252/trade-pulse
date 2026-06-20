const CACHE_TTL_MS = 5 * 60 * 1000;
let marketCapCache: Map<string, number> = new Map();
let lastFetch = 0;

interface CoinGeckoMarket {
  symbol: string;
  market_cap: number;
}

export async function fetchMarketCaps(): Promise<Map<string, number>> {
  if (Date.now() - lastFetch < CACHE_TTL_MS && marketCapCache.size > 0) {
    return marketCapCache;
  }

  const map = new Map<string, number>();

  try {
    for (let page = 1; page <= 4; page++) {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) break;
      const coins = (await res.json()) as CoinGeckoMarket[];
      for (const c of coins) {
        map.set(c.symbol.toUpperCase(), c.market_cap);
      }
      if (coins.length < 250) break;
    }
    marketCapCache = map;
    lastFetch = Date.now();
  } catch {
    return marketCapCache.size > 0 ? marketCapCache : map;
  }

  return map;
}
