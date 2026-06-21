import type { VenueSnapshot } from './types';

const ASTER_FAPI = 'https://fapi.asterdex.com';

interface AsterTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

interface AsterPremium {
  symbol: string;
  lastFundingRate: string;
}

interface AsterOi {
  symbol: string;
  openInterest: string;
}

export async function fetchAsterVenues(): Promise<VenueSnapshot[]> {
  const [tickersRes, premiumRes] = await Promise.all([
    fetch(`${ASTER_FAPI}/fapi/v1/ticker/24hr`, { signal: AbortSignal.timeout(15_000) }),
    fetch(`${ASTER_FAPI}/fapi/v1/premiumIndex`, { signal: AbortSignal.timeout(15_000) }),
  ]);

  if (!tickersRes.ok) throw new Error(`Aster ticker API ${tickersRes.status}`);

  const tickers = (await tickersRes.json()) as AsterTicker[];
  const premium = premiumRes.ok ? ((await premiumRes.json()) as AsterPremium[]) : [];
  const fundingMap = new Map(premium.map((p) => [p.symbol, parseFloat(p.lastFundingRate) || 0]));
  const now = Date.now();

  const venues: VenueSnapshot[] = tickers
    .filter((t) => t.symbol.endsWith('USDT'))
    .map((t) => {
      const baseAsset = t.symbol.replace('USDT', '');
      const price = parseFloat(t.lastPrice) || 0;
      return {
        exchange: 'aster' as const,
        marketType: 'dex' as const,
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
    .filter((v) => v.price > 0 && v.volumeUsdt > 10_000)
    .sort((a, b) => b.volumeUsdt - a.volumeUsdt)
    .slice(0, 200);

  const top = venues.slice(0, 40);
  await Promise.all(
    top.map(async (v) => {
      try {
        const res = await fetch(`${ASTER_FAPI}/fapi/v1/openInterest?symbol=${v.symbol}`, {
          signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) return;
        const json = (await res.json()) as AsterOi;
        const contracts = parseFloat(json.openInterest) || 0;
        v.openInterest = contracts * v.price;
      } catch {
        // skip OI for this symbol
      }
    })
  );

  return venues;
}
