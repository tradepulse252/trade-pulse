import type { AggregatedMarket } from './api';
import { changeUsdFromPct } from './metrics';

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

export const AGGREGATED_EXCHANGES = ['Binance', 'Bybit', 'OKX', 'Hyperliquid'] as const;

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

export function getFlowMetrics(
  market: Pick<
    AggregatedMarket,
    'growthMatrix' | 'totalOpenInterest' | 'totalVolumeUsdt' | 'oiChangePct' | 'volumeChangePct'
  >,
  timeframe: FlowTimeframe
) {
  const g = market.growthMatrix?.[timeframe];
  const oiPct = g?.oiChangePct ?? market.oiChangePct;
  const volPct = g?.volumeChangePct ?? market.volumeChangePct;
  const oiUsd = changeUsdFromPct(market.totalOpenInterest, oiPct);
  const volUsd = changeUsdFromPct(market.totalVolumeUsdt, volPct);
  const netPct = (oiPct + volPct) / 2;
  const netUsd = (oiUsd + volUsd) / 2;

  return {
    oiPct,
    volPct,
    oiUsd,
    volUsd,
    netPct,
    netUsd,
    direction: getFlowDirection(netPct),
  };
}

/** CoinGlass-style flow row: Inflow | Outflow | Net Inflow | Net Chg % | Net Inflow/MCap */
export function getCoinGlassFlowRow(
  market: Pick<
    AggregatedMarket,
    'growthMatrix' | 'totalOpenInterest' | 'totalVolumeUsdt' | 'oiChangePct' | 'volumeChangePct' | 'marketCap'
  >,
  timeframe: FlowTimeframe
) {
  const { oiUsd, volUsd, oiPct, volPct } = getFlowMetrics(market, timeframe);
  const inflow = (oiUsd > 0 ? oiUsd : 0) + (volUsd > 0 ? volUsd : 0);
  const outflow = (oiUsd < 0 ? -oiUsd : 0) + (volUsd < 0 ? -volUsd : 0);
  const netInflow = oiUsd + volUsd;
  const netChgPct = (oiPct + volPct) / 2;
  const netInflowMcap = market.marketCap > 0 ? (netInflow / market.marketCap) * 100 : 0;

  return { inflow, outflow, netInflow, netChgPct, netInflowMcap, oiUsd, volUsd };
}
