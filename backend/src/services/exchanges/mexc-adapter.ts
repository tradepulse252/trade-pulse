import type { VenueSnapshot } from './types';

interface MexcTicker {
  symbol: string;
  lastPrice: number | string;
  amount24: number | string;
  holdVol: number | string;
  fundingRate: number | string;
  riseFallRate: number | string;
  fairPrice?: number | string;
}

export async function fetchMexcVenues(): Promise<VenueSnapshot[]> {
  const res = await fetch('https://contract.mexc.com/api/v1/contract/ticker', {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`MEXC API ${res.status}`);

  const json = (await res.json()) as { data?: MexcTicker[] };
  const list = json.data ?? [];
  const now = Date.now();

  return list
    .filter((t) => t.symbol.endsWith('_USDT'))
    .map((t) => {
      const baseAsset = t.symbol.replace('_USDT', '');
      const price = parseFloat(String(t.lastPrice)) || parseFloat(String(t.fairPrice)) || 0;
      const holdVol = parseFloat(String(t.holdVol)) || 0;
      return {
        exchange: 'mexc' as const,
        marketType: 'cex' as const,
        symbol: `${baseAsset}USDT`,
        baseAsset,
        price,
        volumeUsdt: parseFloat(String(t.amount24)) || 0,
        openInterest: holdVol * price,
        fundingRate: parseFloat(String(t.fundingRate)) || 0,
        priceChange24h: (parseFloat(String(t.riseFallRate)) || 0) * 100,
        timestamp: now,
      };
    })
    .filter((v) => v.price > 0 && v.volumeUsdt > 5_000);
}
