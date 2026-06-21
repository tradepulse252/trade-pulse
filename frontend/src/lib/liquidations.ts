import type { AggregatedMarket } from '@/lib/api';
import { changeUsdFromPct } from '@/lib/metrics';

export type LiqTimeframe = '1h' | '4h' | '12h' | '24h';

const TF_SCALE: Record<LiqTimeframe, number> = {
  '1h': 1 / 24,
  '4h': 4 / 24,
  '12h': 12 / 24,
  '24h': 1,
};

/** Estimate liquidations from live vol, OI, and price action (proxy until liq feed) */
export function estimateLiquidations(market: AggregatedMarket): Array<{
  tf: LiqTimeframe;
  total: number;
  long: number;
  short: number;
}> {
  const vol = market.totalVolumeUsdt;
  const priceChg = market.priceChange24h;
  const volatility = Math.min(Math.abs(priceChg) / 8, 1);
  const base24h = vol * (0.001 + volatility * 0.004);

  const longShare =
    priceChg < 0 ? 0.55 + Math.min(Math.abs(priceChg) / 50, 0.35) : 0.25 + Math.max(0, priceChg / 100);
  const shortShare = 1 - longShare;

  return (['1h', '4h', '12h', '24h'] as LiqTimeframe[]).map((tf) => {
    const total = base24h * TF_SCALE[tf];
    return {
      tf,
      total,
      long: total * longShare,
      short: total * shortShare,
    };
  });
}

export function longShortLabel(fundingRate: number): string {
  if (fundingRate < -0.0002) return '1.24';
  if (fundingRate > 0.0003) return '0.76';
  if (fundingRate > 0.0001) return '0.92';
  return '1.00';
}

export function venueVolumeChangePct(market: AggregatedMarket): number {
  return market.volumeChangePct;
}

export function venueOiChangePct(market: AggregatedMarket): number {
  return market.oiChangePct;
}

export function venueVolChangeUsd(market: AggregatedMarket, venueVol: number): number {
  return changeUsdFromPct(venueVol, market.volumeChangePct);
}

export function venueOiChangeUsd(market: AggregatedMarket, venueOi: number): number {
  return changeUsdFromPct(venueOi, market.oiChangePct);
}
