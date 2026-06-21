import type { ExchangeId, VenueSnapshot } from './types';

interface CgDerivativeTicker {
  market: string;
  symbol: string;
  index_id: string;
  price: string;
  price_percentage_change_24h: number;
  funding_rate: number;
  open_interest: number;
  volume_24h: number;
}

/** CoinGecko market label → our exchange id */
const CG_MARKET_TO_EXCHANGE: Record<string, ExchangeId> = {
  'Binance (Futures)': 'binance',
  Bybit: 'bybit',
  OKX: 'okx',
  Hyperliquid: 'hyperliquid',
  'MEXC (Futures)': 'mexc',
  Kraken: 'kraken',
  'Coinbase International Exchange': 'coinbase',
  Aster: 'aster',
};

const DEX_EXCHANGES = new Set<ExchangeId>(['hyperliquid', 'aster']);

const CACHE_MS = 2 * 60 * 1000;
let venueCache: { venues: VenueSnapshot[]; expires: number } | null = null;

function mapTickers(tickers: CgDerivativeTicker[], exchangeFilter?: ExchangeId[]): VenueSnapshot[] {
  const now = Date.now();
  const allowed = exchangeFilter ? new Set(exchangeFilter) : null;
  const venues: VenueSnapshot[] = [];

  for (const t of tickers) {
    const exchange = CG_MARKET_TO_EXCHANGE[t.market];
    if (!exchange) continue;
    if (allowed && !allowed.has(exchange)) continue;
    if (!t.symbol.endsWith('USDT') && !t.symbol.includes('USDT')) continue;

    const baseAsset = t.index_id || t.symbol.replace('USDT', '');
    const price = parseFloat(t.price) || 0;
    if (price <= 0 || t.volume_24h <= 0) continue;

    venues.push({
      exchange,
      marketType: DEX_EXCHANGES.has(exchange) ? 'dex' : 'cex',
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

export async function fetchCoinGeckoDerivativeVenues(
  exchangeFilter?: ExchangeId[]
): Promise<VenueSnapshot[]> {
  if (venueCache && venueCache.expires > Date.now()) {
    const cached = venueCache.venues;
    if (!exchangeFilter) return cached;
    const allowed = new Set(exchangeFilter);
    return cached.filter((v) => allowed.has(v.exchange));
  }

  const res = await fetch('https://api.coingecko.com/api/v3/derivatives?include_tickers=unexpired', {
    signal: AbortSignal.timeout(25_000),
    headers: { Accept: 'application/json', 'User-Agent': 'TradePulse/1.0' },
  });
  if (!res.ok) throw new Error(`CoinGecko derivatives ${res.status}`);

  const tickers = (await res.json()) as CgDerivativeTicker[];
  const venues = mapTickers(tickers, exchangeFilter);

  venueCache = { venues: mapTickers(tickers), expires: Date.now() + CACHE_MS };

  return venues;
}
