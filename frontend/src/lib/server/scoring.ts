import type { GrowthTfRow } from './types';

const TIMEFRAMES = ['5m', '15m', '30m', '1h', '2h', '4h', '24h'] as const;

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

export function evaluateSignal(
  oiChangePct: number,
  volumeChangePct: number,
  fundingRate: number
): { signalType: string; matchCount: number } {
  const highOi = oiChangePct >= 3;
  const highVol = volumeChangePct >= 5;
  const fundingMatch = Math.abs(fundingRate) >= 0.00005;
  const matchCount = (highOi ? 1 : 0) + (highVol ? 1 : 0) + (fundingMatch ? 1 : 0);
  if (matchCount === 0) return { signalType: 'NEUTRAL', matchCount: 0 };

  const longBias = fundingRate < 0;
  const shortBias = fundingRate > 0.0001;
  if (highOi && highVol && fundingMatch) {
    if (fundingRate <= -0.0001) return { signalType: 'STRONG_LONG', matchCount: 3 };
    if (fundingRate < 0) return { signalType: 'WEAK_LONG', matchCount: 3 };
    if (fundingRate >= 0.0003) return { signalType: 'STRONG_SHORT', matchCount: 3 };
    if (fundingRate > 0) return { signalType: 'WEAK_SHORT', matchCount: 3 };
  }
  if (longBias) return { signalType: 'WEAK_LONG', matchCount };
  if (shortBias) return { signalType: 'WEAK_SHORT', matchCount };
  return { signalType: 'NEUTRAL', matchCount };
}

export function opportunityScore(
  priceChange24h: number,
  fundingRate: number,
  signalType: string,
  matchCount: number
): number {
  const base = Math.min(100, Math.abs(priceChange24h) * 4 + Math.abs(fundingRate) * 50_000);
  const mult =
    signalType.startsWith('STRONG') ? 1.15 : signalType.startsWith('WEAK') ? 1.05 : 0.8;
  const matchMult = matchCount === 3 ? 1 : matchCount === 2 ? 0.85 : 0.7;
  return Math.round(base * mult * matchMult * 100) / 100;
}
