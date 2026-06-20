import type { VenueSnapshot } from './types';

interface BybitTicker {
  symbol: string;
  lastPrice: string;
  turnover24h: string;
  price24hPcnt: string;
  fundingRate?: string;
  openInterest?: string;
  openInterestValue?: string;
}

export async function fetchBybitVenues(): Promise<VenueSnapshot[]> {
  const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
  if (!res.ok) throw new Error(`Bybit API ${res.status}`);
  const json = (await res.json()) as { result?: { list?: BybitTicker[] } };
  const list = json.result?.list ?? [];
  const now = Date.now();

  return list
    .filter((t) => t.symbol.endsWith('USDT'))
    .map((t) => {
      const baseAsset = t.symbol.replace('USDT', '');
      const price = parseFloat(t.lastPrice) || 0;
      const oiValue = parseFloat(t.openInterestValue ?? '0') || parseFloat(t.openInterest ?? '0') * price;
      return {
        exchange: 'bybit' as const,
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
