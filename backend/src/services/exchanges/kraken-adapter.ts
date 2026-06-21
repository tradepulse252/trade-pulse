import type { VenueSnapshot } from './types';

interface KrakenTicker {
  symbol: string;
  tag?: string;
  markPrice?: number;
  last?: number;
  vol24h?: number;
  volumeQuote?: number;
  openInterest?: number;
  fundingRate?: number;
  change24h?: number;
  suspended?: boolean;
}

const KRAKEN_BASE_MAP: Record<string, string> = {
  XBT: 'BTC',
};

function krakenBaseAsset(symbol: string): string | null {
  if (!symbol.startsWith('PF_') || !symbol.endsWith('USD')) return null;
  const raw = symbol.slice(3, -3);
  return KRAKEN_BASE_MAP[raw] ?? raw;
}

export async function fetchKrakenVenues(): Promise<VenueSnapshot[]> {
  const res = await fetch('https://futures.kraken.com/derivatives/api/v3/tickers', {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Kraken Futures API ${res.status}`);

  const json = (await res.json()) as { tickers?: KrakenTicker[] };
  const list = json.tickers ?? [];
  const now = Date.now();
  const venues: VenueSnapshot[] = [];

  for (const t of list) {
    const baseAsset = krakenBaseAsset(t.symbol);
    if (!baseAsset || t.suspended) continue;
    const price = t.markPrice ?? t.last ?? 0;
    if (price <= 0) continue;
    const volumeUsdt = t.volumeQuote ?? (t.vol24h ?? 0) * price;
    if (volumeUsdt <= 100) continue;
    const oiContracts = t.openInterest ?? 0;

    venues.push({
      exchange: 'kraken',
      marketType: 'cex',
      symbol: `${baseAsset}USDT`,
      baseAsset,
      price,
      volumeUsdt,
      openInterest: oiContracts * price,
      fundingRate: t.fundingRate ?? 0,
      priceChange24h: t.change24h ?? 0,
      timestamp: now,
    });
  }

  return venues;
}
