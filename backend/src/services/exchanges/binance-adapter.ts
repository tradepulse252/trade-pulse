import { get24hTickers, getPremiumIndex } from '../binance/rest-client';
import type { VenueSnapshot } from './types';

export async function fetchBinanceVenues(): Promise<VenueSnapshot[]> {
  const [tickers, premium] = await Promise.all([get24hTickers(), getPremiumIndex()]);
  const fundingMap = new Map(premium.map((p) => [p.symbol, parseFloat(p.lastFundingRate) || 0]));
  const now = Date.now();

  return tickers
    .filter((t) => t.symbol.endsWith('USDT'))
    .map((t) => {
      const baseAsset = t.symbol.replace('USDT', '');
      const price = parseFloat(t.lastPrice) || 0;
      return {
        exchange: 'binance' as const,
        marketType: 'cex' as const,
        symbol: t.symbol,
        baseAsset,
        price,
        volumeUsdt: parseFloat(t.quoteVolume) || 0,
        openInterest: 0,
        fundingRate: fundingMap.get(t.symbol) ?? 0,
        priceChange24h: parseFloat(t.priceChangePercent) || 0,
        timestamp: now,
      };
    })
    .filter((v) => v.price > 0 && v.volumeUsdt > 0);
}

export async function enrichBinanceOpenInterest(venues: VenueSnapshot[]): Promise<VenueSnapshot[]> {
  const { getOpenInterest } = await import('../binance/rest-client');
  const top = [...venues].sort((a, b) => b.volumeUsdt - a.volumeUsdt).slice(0, 80);

  await Promise.allSettled(
    top.map(async (v) => {
      try {
        const oi = await getOpenInterest(v.symbol);
        const contracts = parseFloat(oi.openInterest) || 0;
        v.openInterest = contracts * v.price;
      } catch {
        // keep 0
      }
    })
  );

  return venues;
}
