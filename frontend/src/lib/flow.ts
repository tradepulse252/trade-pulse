'use client';

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

export interface FlowTimeframeRow {
  inflow: number;
  outflow: number;
  netInflow: number;
  netChgPct: number;
  netInflowMcap: number;
}

export const AGGREGATED_EXCHANGES = [
  'Binance',
  'Bybit',
  'OKX',
  'MEXC',
  'Coinbase',
  'Kraken',
  'Hyperliquid',
  'Aster',
  'CoinGlass',
] as const;

function interpolate2h(matrix: AggregatedMarket['growthMatrix']) {
  const h1 = matrix?.['1h'];
  const h4 = matrix?.['4h'];
  if (!h1 && !h4) return null;
  if (h1 && h4) {
    return {
      oiChangePct: (h1.oiChangePct + h4.oiChangePct) / 2,
      volumeChangePct: (h1.volumeChangePct + h4.volumeChangePct) / 2,
    };
  }
  return h1 ?? h4 ?? null;
}

/** Per-timeframe OI/vol % with CoinGlass + scaled fallbacks */
export function getTfGrowthPct(
  growthMatrix: AggregatedMarket['growthMatrix'] | undefined,
  timeframe: FlowTimeframe,
  fallbackOi = 0,
  fallbackVol = 0
) {
  if (timeframe === '2h') {
    const interp = interpolate2h(growthMatrix);
    if (interp) return interp;
  }

  const g = growthMatrix?.[timeframe];
  if (g) {
    return { oiChangePct: g.oiChangePct ?? 0, volumeChangePct: g.volumeChangePct ?? 0 };
  }

  const g24 = growthMatrix?.['24h'];
  const baseOi = g24?.oiChangePct ?? fallbackOi;
  const baseVol = g24?.volumeChangePct ?? fallbackVol;

  if (timeframe === '24h') {
    return { oiChangePct: baseOi, volumeChangePct: baseVol };
  }

  if (baseOi !== 0 || baseVol !== 0) {
    const scale = TF_MINUTES[timeframe] / TF_MINUTES['24h'];
    return { oiChangePct: baseOi * scale, volumeChangePct: baseVol * scale };
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

function computedFlowRow(
  market: Pick<
    AggregatedMarket,
    'growthMatrix' | 'totalOpenInterest' | 'totalVolumeUsdt' | 'oiChangePct' | 'volumeChangePct' | 'marketCap'
  >,
  timeframe: FlowTimeframe
): FlowTimeframeRow {
  const { oiUsd, volUsd, oiChangePct, volumeChangePct } = getFlowMetrics(market, timeframe);
  const inflow = Math.max(oiUsd, 0) + Math.max(volUsd, 0);
  const outflow = Math.max(-oiUsd, 0) + Math.max(-volUsd, 0);
  const netInflow = oiUsd + volUsd;
  const netChgPct = (oiChangePct + volumeChangePct) / 2;
  const netInflowMcap = market.marketCap > 0 ? (netInflow / market.marketCap) * 100 : 0;
  return { inflow, outflow, netInflow, netChgPct, netInflowMcap };
}

/** CoinGlass flow row — prefers API flowMatrix, falls back to computed OI/vol */
export function getCoinGlassFlowRow(
  market: Pick<
    AggregatedMarket,
    | 'growthMatrix'
    | 'flowMatrix'
    | 'totalOpenInterest'
    | 'totalVolumeUsdt'
    | 'oiChangePct'
    | 'volumeChangePct'
    | 'marketCap'
  >,
  timeframe: FlowTimeframe
): FlowTimeframeRow & { oiUsd: number; volUsd: number } {
  const cg = market.flowMatrix?.[timeframe];
  if (cg && (cg.inflow > 0 || cg.outflow > 0 || Math.abs(cg.netInflow) > 0)) {
    const { oiUsd, volUsd } = getFlowMetrics(market, timeframe);
    return { ...cg, oiUsd, volUsd };
  }

  const computed = computedFlowRow(market, timeframe);
  const { oiUsd, volUsd } = getFlowMetrics(market, timeframe);
  return { ...computed, oiUsd, volUsd };
}
