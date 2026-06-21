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

const TF_MINUTES: Record<FlowTimeframe, number> = {
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '4h': 240,
  '24h': 1440,
};

export const AGGREGATED_EXCHANGES = ['Binance', 'Bybit', 'OKX', 'Hyperliquid', 'Aster'] as const;

/** Per-timeframe OI/vol % — never reuse the same fallback for every row */
export function getTfGrowthPct(
  growthMatrix: AggregatedMarket['growthMatrix'] | undefined,
  timeframe: FlowTimeframe,
  fallbackOi = 0,
  fallbackVol = 0
) {
  const g = growthMatrix?.[timeframe];
  if (g && (g.oiChangePct !== 0 || g.volumeChangePct !== 0)) {
    return { oiChangePct: g.oiChangePct, volumeChangePct: g.volumeChangePct };
  }

  const g24 = growthMatrix?.['24h'];
  if (g24 && (g24.oiChangePct !== 0 || g24.volumeChangePct !== 0) && timeframe !== '24h') {
    const scale = TF_MINUTES[timeframe] / TF_MINUTES['24h'];
    return {
      oiChangePct: g24.oiChangePct * scale,
      volumeChangePct: g24.volumeChangePct * scale,
    };
  }

  if (timeframe === '24h') {
    return { oiChangePct: fallbackOi, volumeChangePct: fallbackVol };
  }

  if (g) {
    return { oiChangePct: g.oiChangePct, volumeChangePct: g.volumeChangePct };
  }

  return { oiChangePct: 0, volumeChangePct: 0 };
}

export function getNetFlow(
  growthMatrix: AggregatedMarket['growthMatrix'] | undefined,
  timeframe: FlowTimeframe,
  fallbackOi = 0,
  fallbackVol = 0
): number {
  const { oiChangePct, volumeChangePct } = getTfGrowthPct(growthMatrix, timeframe, fallbackOi, fallbackVol);
  return (oiChangePct + volumeChangePct) / 2;
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
  const { oiChangePct, volumeChangePct } = getTfGrowthPct(
    market.growthMatrix,
    timeframe,
    market.oiChangePct,
    market.volumeChangePct
  );
  const oiUsd = changeUsdFromPct(market.totalOpenInterest, oiChangePct);
  const volUsd = changeUsdFromPct(market.totalVolumeUsdt, volumeChangePct);
  const netPct = (oiChangePct + volumeChangePct) / 2;
  const netUsd = (oiUsd + volUsd) / 2;

  return {
    oiChangePct,
    volumeChangePct,
    oiPct: oiChangePct,
    volPct: volumeChangePct,
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
  const { oiUsd, volUsd, oiChangePct, volumeChangePct } = getFlowMetrics(market, timeframe);
  const inflow = (oiUsd > 0 ? oiUsd : 0) + (volUsd > 0 ? volUsd : 0);
  const outflow = (oiUsd < 0 ? -oiUsd : 0) + (volUsd < 0 ? -volUsd : 0);
  const netInflow = oiUsd + volUsd;
  const netChgPct = (oiChangePct + volumeChangePct) / 2;
  const netInflowMcap = market.marketCap > 0 ? (netInflow / market.marketCap) * 100 : 0;

  return { inflow, outflow, netInflow, netChgPct, netInflowMcap, oiUsd, volUsd };
}
