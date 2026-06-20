import type { AggregatedMarket } from './api';
import { FLOW_TIMEFRAMES, type FlowTimeframe } from './flow';

/** USD change from current total and % change over the window */
export function changeUsdFromPct(currentUsd: number, changePct: number): number {
  if (!currentUsd || !Number.isFinite(changePct)) return 0;
  if (changePct === 0) return 0;
  const previous = currentUsd / (1 + changePct / 100);
  return currentUsd - previous;
}

export function getTfMetric(
  growthMatrix: AggregatedMarket['growthMatrix'] | undefined,
  timeframe: string,
  totalOiUsd: number,
  totalVolUsd: number,
  fallbackOiPct = 0,
  fallbackVolPct = 0
) {
  const g = growthMatrix?.[timeframe];
  const oiChangePct = g?.oiChangePct ?? fallbackOiPct;
  const volumeChangePct = g?.volumeChangePct ?? fallbackVolPct;
  return {
    oiChangePct,
    volumeChangePct,
    oiChangeUsd: changeUsdFromPct(totalOiUsd, oiChangePct),
    volumeChangeUsd: changeUsdFromPct(totalVolUsd, volumeChangePct),
  };
}

export function getAllTfMetrics(
  market: Pick<AggregatedMarket, 'growthMatrix' | 'totalOpenInterest' | 'totalVolumeUsdt' | 'oiChangePct' | 'volumeChangePct'>
) {
  return FLOW_TIMEFRAMES.map((tf) => ({
    tf,
    ...getTfMetric(
      market.growthMatrix,
      tf,
      market.totalOpenInterest,
      market.totalVolumeUsdt,
      market.oiChangePct,
      market.volumeChangePct
    ),
  }));
}
