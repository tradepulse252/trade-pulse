import { SignalType } from '../../lib/db/types';
import { GrowthMatrix } from '../../types';
import type { FlowTimeframeRow, OnChainMetrics } from '../exchanges/types';
import { getPrimaryLookback } from './growth-calculator';

const FLOW_TFS = ['5m', '15m', '30m', '1h', '2h', '4h'] as const;

const THRESHOLDS = {
  strongOiPct: 3,
  priceSidewaysPct: 2,
  priceBigMovePct: 4,
  volumeSlightUpMin: 0.3,
  volumeSlightUpMax: 5,
  volumeSlightDownMin: -5,
  volumeSlightDownMax: -0.3,
  fundingSlightNegative: -0.00005,
  fundingHighlyPositive: 0.0003,
  longLiqShareMax: 0.45,
  longShortRatioMax: 0.92,
  flowDominanceRatio: 0.6,
} as const;

const WEIGHTS = {
  oi: 0.25,
  volume: 0.2,
  funding: 0.15,
  price: 0.15,
  flow: 0.15,
  positioning: 0.1,
} as const;

export type FundingBand =
  | 'strong_negative'
  | 'slight_negative'
  | 'flat'
  | 'slight_positive'
  | 'strong_positive';

export interface SignalConditions {
  priceSideways: boolean;
  priceBigMove: boolean;
  strongOi: boolean;
  volumeSlightlyUp: boolean;
  volumeSlightlyDown: boolean;
  inflowDominant: boolean;
  outflowDominant: boolean;
  fundingLong: boolean;
  fundingShort: boolean;
  lowLongLiq: boolean;
  tooManyShort: boolean;
  matchCount: number;
  longMatchCount: number;
  shortMatchCount: number;
  fundingBand: FundingBand;
}

export interface SignalEvalInput {
  growthMatrix: GrowthMatrix;
  fundingRate: number;
  priceChange24h: number;
  totalVolumeUsdt?: number;
  flowMatrix?: Record<string, FlowTimeframeRow>;
  onChain?: OnChainMetrics;
}

function tfRow(
  growthMatrix: GrowthMatrix,
  tf: string
): { priceChangePct: number; oiChangePct: number; volumeChangePct: number } {
  return growthMatrix[tf] ?? { priceChangePct: 0, oiChangePct: 0, volumeChangePct: 0 };
}

function flowRowFromGrowth(growthMatrix: GrowthMatrix, tf: string): FlowTimeframeRow {
  const g = tfRow(growthMatrix, tf);
  const inflow = Math.max(g.oiChangePct, 0) + Math.max(g.volumeChangePct, 0);
  const outflow = Math.max(-g.oiChangePct, 0) + Math.max(-g.volumeChangePct, 0);
  return {
    inflow,
    outflow,
    netInflow: g.oiChangePct + g.volumeChangePct,
    netChgPct: (g.oiChangePct + g.volumeChangePct) / 2,
    netInflowMcap: 0,
  };
}

function resolveFlowRow(
  growthMatrix: GrowthMatrix,
  flowMatrix: Record<string, FlowTimeframeRow> | undefined,
  tf: string
): FlowTimeframeRow {
  const api = flowMatrix?.[tf];
  if (api && (api.inflow > 0 || api.outflow > 0 || Math.abs(api.netInflow) > 0)) return api;
  return flowRowFromGrowth(growthMatrix, tf);
}

function maxAbsPriceMove(growthMatrix: GrowthMatrix, tfs: readonly string[]): number {
  return Math.max(...tfs.map((tf) => Math.abs(tfRow(growthMatrix, tf).priceChangePct)), 0);
}

function maxOiChange(growthMatrix: GrowthMatrix): number {
  return Math.max(...FLOW_TFS.map((tf) => tfRow(growthMatrix, tf).oiChangePct), 0);
}

function primaryVolumeChange(growthMatrix: GrowthMatrix): number {
  const h1 = tfRow(growthMatrix, '1h').volumeChangePct;
  const h4 = tfRow(growthMatrix, '4h').volumeChangePct;
  return h1 !== 0 ? h1 : h4;
}

function flowDominance(
  growthMatrix: GrowthMatrix,
  flowMatrix: Record<string, FlowTimeframeRow> | undefined,
  direction: 'inflow' | 'outflow'
): boolean {
  const checks = FLOW_TFS.map((tf) => resolveFlowRow(growthMatrix, flowMatrix, tf)).filter(
    (r) => r.inflow > 0 || r.outflow > 0 || Math.abs(r.netInflow) > 0
  );
  if (checks.length === 0) {
    const onChain = flowMatrix == null;
    if (onChain) return false;
    return false;
  }
  const hits =
    direction === 'inflow'
      ? checks.filter((r) => r.inflow > r.outflow).length
      : checks.filter((r) => r.outflow > r.inflow).length;
  return hits / checks.length >= THRESHOLDS.flowDominanceRatio;
}

function onChainInflowDominant(onChain?: OnChainMetrics): boolean {
  if (!onChain) return false;
  return onChain.netflow < 0 || onChain.exchangeOutflow > onChain.exchangeInflow;
}

function onChainOutflowDominant(onChain?: OnChainMetrics): boolean {
  if (!onChain) return false;
  return onChain.netflow > 0 || onChain.exchangeInflow > onChain.exchangeOutflow;
}

export function getFundingBand(fundingRate: number): FundingBand {
  if (fundingRate <= -0.0001) return 'strong_negative';
  if (fundingRate < -0.00005) return 'slight_negative';
  if (fundingRate <= 0.00005) return 'flat';
  if (fundingRate < THRESHOLDS.fundingHighlyPositive) return 'slight_positive';
  return 'strong_positive';
}

export function longShortRatio(fundingRate: number): number {
  if (fundingRate < -0.0002) return 1.24;
  if (fundingRate > THRESHOLDS.fundingHighlyPositive) return 0.76;
  if (fundingRate > 0.0001) return 0.92;
  return 1.0;
}

function estimateLongLiqShare(priceChange24h: number): number {
  if (priceChange24h < 0) return 0.55 + Math.min(Math.abs(priceChange24h) / 50, 0.35);
  return 0.25 + Math.max(0, priceChange24h / 100);
}

function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/** New signal formula — Long / Short opportunity only */
export function evaluateSignal(input: SignalEvalInput): { signalType: SignalType; conditions: SignalConditions } {
  const { growthMatrix, fundingRate, priceChange24h, flowMatrix, onChain } = input;
  const fundingBand = getFundingBand(fundingRate);
  const volChange = primaryVolumeChange(growthMatrix);
  const priceMove4hTo5m = maxAbsPriceMove(growthMatrix, FLOW_TFS);

  const priceSideways = priceMove4hTo5m <= THRESHOLDS.priceSidewaysPct;
  const priceBigMove = priceMove4hTo5m >= THRESHOLDS.priceBigMovePct;
  const strongOi = maxOiChange(growthMatrix) >= THRESHOLDS.strongOiPct;
  const volumeSlightlyUp =
    volChange >= THRESHOLDS.volumeSlightUpMin && volChange <= THRESHOLDS.volumeSlightUpMax;
  const volumeSlightlyDown =
    volChange <= THRESHOLDS.volumeSlightDownMax && volChange >= THRESHOLDS.volumeSlightDownMin;

  let inflowDominant = flowDominance(growthMatrix, flowMatrix, 'inflow');
  let outflowDominant = flowDominance(growthMatrix, flowMatrix, 'outflow');
  if (!inflowDominant && onChainInflowDominant(onChain)) inflowDominant = true;
  if (!outflowDominant && onChainOutflowDominant(onChain)) outflowDominant = true;

  const fundingLong = fundingRate <= THRESHOLDS.fundingSlightNegative;
  const fundingShort = fundingRate >= THRESHOLDS.fundingHighlyPositive;
  const lowLongLiq = estimateLongLiqShare(priceChange24h) <= THRESHOLDS.longLiqShareMax;
  const tooManyShort = longShortRatio(fundingRate) <= THRESHOLDS.longShortRatioMax;

  const longChecks = [
    priceSideways,
    strongOi,
    volumeSlightlyUp,
    inflowDominant,
    fundingLong,
    lowLongLiq,
  ];
  const shortChecks = [
    priceBigMove || priceSideways,
    strongOi,
    volumeSlightlyDown,
    outflowDominant,
    fundingShort,
    tooManyShort,
  ];

  const longMatchCount = longChecks.filter(Boolean).length;
  const shortMatchCount = shortChecks.filter(Boolean).length;

  const conditions: SignalConditions = {
    priceSideways,
    priceBigMove,
    strongOi,
    volumeSlightlyUp,
    volumeSlightlyDown,
    inflowDominant,
    outflowDominant,
    fundingLong,
    fundingShort,
    lowLongLiq,
    tooManyShort,
    longMatchCount,
    shortMatchCount,
    matchCount: Math.max(longMatchCount, shortMatchCount),
    fundingBand,
  };

  const minRequired = 5;

  if (longMatchCount >= minRequired && longMatchCount > shortMatchCount) {
    return { signalType: SignalType.WEAK_LONG, conditions };
  }
  if (shortMatchCount >= minRequired && shortMatchCount > longMatchCount) {
    return { signalType: SignalType.WEAK_SHORT, conditions };
  }
  if (longMatchCount >= 4 && longMatchCount > shortMatchCount && strongOi && fundingLong) {
    return { signalType: SignalType.WEAK_LONG, conditions };
  }
  if (shortMatchCount >= 4 && shortMatchCount > longMatchCount && strongOi && fundingShort) {
    return { signalType: SignalType.WEAK_SHORT, conditions };
  }

  return { signalType: SignalType.NEUTRAL, conditions };
}

export function classifySignal(
  oiChangePct: number,
  volumeChangePct: number,
  fundingRate: number,
  onChain?: OnChainMetrics
): SignalType {
  const matrix: GrowthMatrix = {
    '1h': { priceChangePct: 0, oiChangePct, volumeChangePct },
    '4h': { priceChangePct: 0, oiChangePct, volumeChangePct },
  };
  return evaluateSignal({
    growthMatrix: matrix,
    fundingRate,
    priceChange24h: 0,
    onChain,
  }).signalType;
}

export function normalizeSignalType(signalType: SignalType | string): SignalType {
  if (signalType === SignalType.STRONG_LONG) return SignalType.WEAK_LONG;
  if (signalType === SignalType.STRONG_SHORT) return SignalType.WEAK_SHORT;
  return signalType as SignalType;
}

export function calculateOpportunityScore(
  growthMatrix: GrowthMatrix,
  fundingRate: number,
  signalType: SignalType,
  matchCount = 3,
  onChain?: OnChainMetrics
): { score: number; priceMomentum: number; oiChangePct: number; volumeChangePct: number } {
  const normalizedType = normalizeSignalType(signalType);
  const primary = getPrimaryLookback(growthMatrix, '1h');
  const { oiChangePct, volumeChangePct, priceChangePct } = primary;
  const priceMomentum = priceChangePct;

  const oiScore = normalizeScore(Math.max(0, maxOiChange(growthMatrix)), 0, 20);
  const volScore =
    normalizedType === SignalType.WEAK_SHORT
      ? normalizeScore(Math.abs(Math.min(0, primaryVolumeChange(growthMatrix))), 0, 5)
      : normalizeScore(Math.max(0, primaryVolumeChange(growthMatrix)), 0, 5);
  const fundingScore =
    normalizedType === SignalType.WEAK_LONG
      ? fundingRate <= 0
        ? normalizeScore(Math.abs(fundingRate), 0, 0.001)
        : 30
      : normalizedType === SignalType.WEAK_SHORT
        ? fundingRate >= THRESHOLDS.fundingHighlyPositive
          ? normalizeScore(fundingRate, 0, 0.001)
          : 30
        : 50;
  const priceScore =
    normalizedType === SignalType.WEAK_LONG
      ? normalizeScore(THRESHOLDS.priceSidewaysPct - Math.abs(priceChangePct), 0, THRESHOLDS.priceSidewaysPct)
      : normalizeScore(Math.abs(priceChangePct), 0, 10);
  const flowScore = onChain ? (onChain.netflow < 0 ? 70 : 30) : 50;
  const price24h = growthMatrix['24h']?.priceChangePct ?? priceChangePct;
  const positioningScore =
    normalizedType === SignalType.WEAK_SHORT
      ? longShortRatio(fundingRate) <= 0.92
        ? 85
        : 40
      : estimateLongLiqShare(price24h) <= THRESHOLDS.longLiqShareMax
        ? 80
        : 40;

  const rawScore =
    oiScore * WEIGHTS.oi +
    volScore * WEIGHTS.volume +
    fundingScore * WEIGHTS.funding +
    priceScore * WEIGHTS.price +
    flowScore * WEIGHTS.flow +
    positioningScore * WEIGHTS.positioning;

  const signalMultiplier =
    normalizedType === SignalType.WEAK_LONG || normalizedType === SignalType.WEAK_SHORT ? 1.05 : 0.8;
  const matchMultiplier = matchCount >= 6 ? 1 : matchCount >= 5 ? 0.95 : matchCount >= 4 ? 0.85 : 0.7;

  const score = Math.min(100, Math.round(rawScore * signalMultiplier * matchMultiplier * 100) / 100);

  return { score, priceMomentum, oiChangePct, volumeChangePct };
}

export function rankOpportunities<T extends { opportunityScore: number }>(items: T[]): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => b.opportunityScore - a.opportunityScore);
  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
