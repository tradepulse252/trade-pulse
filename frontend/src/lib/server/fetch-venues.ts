import type { VenueSnapshot } from './types';

const CG_MARKET_TO_EXCHANGE: Record<string, string> = {
  'Binance (Futures)': 'binance',
  Bybit: 'bybit',
  OKX: 'okx',
  Hyperliquid: 'hyperliquid',
  'MEXC (Futures)': 'mexc',
  Kraken: 'kraken',
  'Coinbase International Exchange': 'coinbase',
  Aster: 'aster',
};

const DEX = new Set(['hyperliquid', 'aster']);

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json', 'User-Agent': 'TradePulse/1.0', ...init?.headers },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchHyperliquidVenues(): Promise<VenueSnapshot[]> {
  const json = await fetchJson<[{ universe: { name: string }[] }, Array<{
    funding: string;
    openInterest: string;
    prevDayPx: string;
    dayNtlVlm: string;
    markPx: string;
  }>]>('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
  });
  const universe = json[0]?.universe ?? [];
  const contexts = json[1] ?? [];
  const now = Date.now();
  const results: VenueSnapshot[] = [];

  for (let i = 0; i < universe.length; i++) {
    const ctx = contexts[i];
    if (!ctx) continue;
    const baseAsset = universe[i].name;
    const price = parseFloat(ctx.markPx) || 0;
    const prev = parseFloat(ctx.prevDayPx) || price;
    const volumeUsdt = parseFloat(ctx.dayNtlVlm) || 0;
    if (price <= 0 || volumeUsdt <= 5_000) continue;
    results.push({
      exchange: 'hyperliquid',
      marketType: 'dex',
      symbol: `${baseAsset}USDT`,
      baseAsset,
      price,
      volumeUsdt,
      openInterest: (parseFloat(ctx.openInterest) || 0) * price,
      fundingRate: parseFloat(ctx.funding) || 0,
      priceChange24h: prev > 0 ? ((price - prev) / prev) * 100 : 0,
      timestamp: now,
    });
  }
  return results;
}

export async function fetchBybitVenues(): Promise<VenueSnapshot[]> {
  const json = await fetchJson<{ result?: { list?: Array<{
    symbol: string;
    lastPrice: string;
    turnover24h: string;
    price24hPcnt: string;
    fundingRate?: string;
    openInterest?: string;
    openInterestValue?: string;
  }> } }>('https://api.bybit.com/v5/market/tickers?category=linear');
  const now = Date.now();
  return (json.result?.list ?? [])
    .filter((t) => t.symbol.endsWith('USDT'))
    .map((t) => {
      const baseAsset = t.symbol.replace('USDT', '');
      const price = parseFloat(t.lastPrice) || 0;
      const oiValue = parseFloat(t.openInterestValue ?? '0') || parseFloat(t.openInterest ?? '0') * price;
      return {
        exchange: 'bybit',
        marketType: 'cex' as const,
        symbol: t.symbol,
        baseAsset,
        price,
        volumeUsdt: parseFloat(t.turnover24h) || 0,
        openInterest: oiValue,
        fundingRate: parseFloat(t.fundingRate ?? '0') || 0,
        priceChange24h: (parseFloat(t.price24hPcnt) || 0) * 100,
        timestamp: now,
      };
    })
    .filter((v) => v.price > 0 && v.volumeUsdt > 0);
}

export async function fetchCoinGeckoVenues(): Promise<VenueSnapshot[]> {
  const tickers = await fetchJson<Array<{
    market: string;
    symbol: string;
    index_id: string;
    price: string;
    price_percentage_change_24h: number;
    funding_rate: number;
    open_interest: number;
    volume_24h: number;
  }>>('https://api.coingecko.com/api/v3/derivatives?include_tickers=unexpired');
  const now = Date.now();
  const venues: VenueSnapshot[] = [];
  for (const t of tickers) {
    const exchange = CG_MARKET_TO_EXCHANGE[t.market];
    if (!exchange) continue;
    if (!t.symbol.includes('USDT')) continue;
    const baseAsset = t.index_id || t.symbol.replace('USDT', '');
    const price = parseFloat(t.price) || 0;
    if (price <= 0 || t.volume_24h <= 0) continue;
    venues.push({
      exchange,
      marketType: DEX.has(exchange) ? 'dex' : 'cex',
      symbol: t.symbol.endsWith('USDT') ? t.symbol : `${baseAsset}USDT`,
      baseAsset,
      price,
      volumeUsdt: t.volume_24h,
      openInterest: t.open_interest,
      fundingRate: (t.funding_rate ?? 0) / 100,
      priceChange24h: t.price_percentage_change_24h ?? 0,
      timestamp: now,
    });
  }
  return venues;
}

export async function fetchMarketCaps(): Promise<Map<string, { marketCap: number; imageUrl: string }>> {
  const map = new Map<string, { marketCap: number; imageUrl: string }>();
  try {
    const coins = await fetchJson<Array<{ symbol: string; market_cap: number; image: string }>>(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false'
    );
    for (const c of coins) {
      map.set(c.symbol.toUpperCase(), { marketCap: c.market_cap ?? 0, imageUrl: c.image ?? '' });
    }
  } catch {
    // optional enrichment
  }
  return map;
}

export async function fetchAllVenues(): Promise<VenueSnapshot[]> {
  const results = await Promise.allSettled([
    fetchHyperliquidVenues(),
    fetchBybitVenues(),
    fetchCoinGeckoVenues(),
  ]);
  const venues: VenueSnapshot[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const v of r.value) {
      const key = `${v.exchange}:${v.baseAsset}`;
      if (seen.has(key)) continue;
      seen.add(key);
      venues.push(v);
    }
  }
  return venues;
}
