import { TIMEFRAME_MS, TimeframeKey } from '../../config/env';
import { GrowthMatrix } from '../../types';

export function calculateGrowthPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function findHistoricalValue(
  snapshots: Array<{ value: number; timestamp: Date }>,
  lookbackMs: number,
  now: Date = new Date()
): number | null {
  const targetTime = now.getTime() - lookbackMs;
  let closest: { value: number; timestamp: Date } | null = null;
  let closestDiff = Infinity;

  for (const snap of snapshots) {
    const diff = Math.abs(snap.timestamp.getTime() - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = snap;
    }
  }

  // Accept snapshot within 20% of lookback window
  if (closest && closestDiff <= lookbackMs * 0.2) {
    return closest.value;
  }
  return null;
}

export function buildGrowthMatrix(
  currentPrice: number,
  currentOi: number,
  currentVolume: number,
  priceHistory: Array<{ value: number; timestamp: Date }>,
  oiHistory: Array<{ value: number; timestamp: Date }>,
  volumeHistory: Array<{ value: number; timestamp: Date }>,
  timeframes: TimeframeKey[]
): GrowthMatrix {
  const matrix: GrowthMatrix = {};
  const now = new Date();

  for (const tf of timeframes) {
    const lookbackMs = TIMEFRAME_MS[tf];

    const prevPrice = findHistoricalValue(priceHistory, lookbackMs, now);
    const prevOi = findHistoricalValue(oiHistory, lookbackMs, now);
    const prevVolume = findHistoricalValue(volumeHistory, lookbackMs, now);

    matrix[tf] = {
      priceChangePct: prevPrice !== null ? calculateGrowthPct(currentPrice, prevPrice) : 0,
      oiChangePct: prevOi !== null ? calculateGrowthPct(currentOi, prevOi) : 0,
      volumeChangePct: prevVolume !== null ? calculateGrowthPct(currentVolume, prevVolume) : 0,
    };
  }

  return matrix;
}

export function getPrimaryLookback(matrix: GrowthMatrix, preferred: TimeframeKey = '1h'): {
  priceChangePct: number;
  oiChangePct: number;
  volumeChangePct: number;
} {
  return matrix[preferred] ?? matrix['1h'] ?? { priceChangePct: 0, oiChangePct: 0, volumeChangePct: 0 };
}
