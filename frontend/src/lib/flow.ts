import type { AggregatedMarket } from './api';

export const FLOW_TIMEFRAMES = ['5m', '15m', '30m', '1h', '2h', '4h', '24h'] as const;
export type FlowTimeframe = (typeof FLOW_TIMEFRAMES)[number];

export const FLOW_TIMEFRAME_LABELS: Record<FlowTimeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '24h': '24h',
};

/** Net capital flow from aggregated OI + volume change (inflow vs outflow) */
export function getNetFlow(
  growthMatrix: AggregatedMarket['growthMatrix'] | undefined,
  timeframe: FlowTimeframe,
  fallbackOi = 0,
  fallbackVol = 0
): number {
  const g = growthMatrix?.[timeframe];
  const oi = g?.oiChangePct ?? fallbackOi;
  const vol = g?.volumeChangePct ?? fallbackVol;
  return (oi + vol) / 2;
}

export type FlowDirection = 'inflow' | 'outflow' | 'neutral';

export function getFlowDirection(netFlow: number, threshold = 0.3): FlowDirection {
  if (netFlow >= threshold) return 'inflow';
  if (netFlow <= -threshold) return 'outflow';
  return 'neutral';
}
