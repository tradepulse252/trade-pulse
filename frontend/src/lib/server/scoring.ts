import type { GrowthTfRow } from './types';

const TIMEFRAMES = ['5m', '15m', '30m', '1h', '2h', '4h', '24h'] as const;
const FLOW_TFS = ['5m', '15m', '30m', '1h', '2h', '4h'] as const;

export function buildGrowthMatrix(priceChange24h: number): Record<string, GrowthTfRow> {
  const matrix: Record<string, GrowthTfRow> = {};
  for (const tf of TIMEFRAMES) {
    const scale =
      tf === '24h' ? 1 : tf === '4h' ? 4 / 24 : tf === '2h' ? 2 / 24 : tf === '1h' ? 1 / 24 : 0.5 / 24;
    matrix[tf] = {
      priceChangePct: priceChange24h * scale,
      oiChangePct: 0,
      volumeChangePct: 0,
    };
  }
  return matrix;
}

function maxAbsPrice(matrix: Record<string, GrowthTfRow>): number {
  return Math.max(...FLOW_TFS.map((tf) => Math.abs(matrix[tf]?.priceChangePct ?? 0)), 0);
}

function longShortRatio(fundingRate: number): number {
  if (fundingRate < -0.0002) return 1.24;
  if (fundingRate > 0.0003) return 0.76;
  if (fundingRate > 0.0001) return 0.92;
  return 1.0;
}

export function evaluateSignal(
  oiChangePct: number,
  volumeChangePct: number,
  fundingRate: number,
  priceChange24h = 0
): { signalType: string; matchCount: number } {
  const matrix = buildGrowthMatrix(priceChange24h);
  matrix['1h'] = { priceChangePct: priceChange24h / 24, oiChangePct, volumeChangePct };
  matrix['4h'] = { priceChangePct: (priceChange24h * 4) / 24, oiChangePct, volumeChangePct };

  const priceSideways = maxAbsPrice(matrix) <= 2;
  const priceBigMove = maxAbsPrice(matrix) >= 4;
  const strongOi = oiChangePct >= 3;
  const volumeSlightlyUp = volumeChangePct >= 0.3 && volumeChangePct <= 5;
  const volumeSlightlyDown = volumeChangePct <= -0.3 && volumeChangePct >= -5;
  const fundingLong = fundingRate <= -0.00005;
  const fundingShort = fundingRate >= 0.0003;
  const lowLongLiq = priceChange24h >= 0 ? 0.25 + priceChange24h / 100 <= 0.45 : false;
  const tooManyShort = longShortRatio(fundingRate) <= 0.92;

  const longMatch =
    (priceSideways ? 1 : 0) +
    (strongOi ? 1 : 0) +
    (volumeSlightlyUp ? 1 : 0) +
    (fundingLong ? 1 : 0) +
    (lowLongLiq ? 1 : 0);
  const shortMatch =
    (priceBigMove || priceSideways ? 1 : 0) +
    (strongOi ? 1 : 0) +
    (volumeSlightlyDown ? 1 : 0) +
    (fundingShort ? 1 : 0) +
    (tooManyShort ? 1 : 0);

  if (longMatch >= 4 && longMatch > shortMatch) return { signalType: 'WEAK_LONG', matchCount: longMatch };
  if (shortMatch >= 4 && shortMatch > longMatch) return { signalType: 'WEAK_SHORT', matchCount: shortMatch };
  return { signalType: 'NEUTRAL', matchCount: Math.max(longMatch, shortMatch) };
}

export function opportunityScore(
  priceChange24h: number,
  fundingRate: number,
  signalType: string,
  matchCount: number
): number {
  const normalized =
    signalType === 'STRONG_LONG' ? 'WEAK_LONG' : signalType === 'STRONG_SHORT' ? 'WEAK_SHORT' : signalType;
  const base = Math.min(100, Math.abs(priceChange24h) * 3 + Math.abs(fundingRate) * 50_000);
  const mult = normalized.startsWith('WEAK') ? 1.05 : 0.8;
  const matchMult = matchCount >= 5 ? 1 : matchCount >= 4 ? 0.85 : 0.7;
  return Math.round(base * mult * matchMult * 100) / 100;
}
