import { SignalType } from '@prisma/client';
import { GrowthMatrix } from '../../types';
import { getPrimaryLookback } from './growth-calculator';

// Scoring weights per spec
const WEIGHTS = {
  oiGrowth: 0.4,
  volumeGrowth: 0.3,
  fundingRate: 0.2,
  priceMomentum: 0.1,
} as const;

// Signal classification thresholds
const THRESHOLDS = {
  significantOiGrowth: 3,      // % OI increase
  significantVolumeGrowth: 5,  // % volume increase
  negativeFunding: -0.0001,
  slightlyPositiveFunding: 0.0001,
  stronglyPositiveFunding: 0.0003,
  priceMomentumUp: 0.5,
  priceMomentumDown: -0.5,
} as const;

function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

function scoreOiGrowth(oiChangePct: number): number {
  // OI growth is the primary signal — scale 0-20% to 0-100
  return normalizeScore(oiChangePct, 0, 20);
}

function scoreVolumeGrowth(volumeChangePct: number): number {
  return normalizeScore(volumeChangePct, 0, 30);
}

function scoreFundingRate(fundingRate: number, signalBias: 'long' | 'short' | 'neutral'): number {
  if (signalBias === 'long') {
    // Negative funding is bullish for longs
    return fundingRate < 0
      ? normalizeScore(Math.abs(fundingRate), 0, 0.001) * 1.2
      : normalizeScore(-fundingRate, 0, 0.001) * 0.5;
  }
  if (signalBias === 'short') {
    // Positive funding is bearish (overcrowded longs)
    return fundingRate > 0
      ? normalizeScore(fundingRate, 0, 0.001) * 1.2
      : normalizeScore(-fundingRate, 0, 0.001) * 0.5;
  }
  return 50;
}

function scorePriceMomentum(priceChangePct: number, direction: 'up' | 'down' | 'any'): number {
  if (direction === 'up') {
    return priceChangePct > 0 ? normalizeScore(priceChangePct, 0, 10) : normalizeScore(priceChangePct, -5, 0) * 0.3;
  }
  if (direction === 'down') {
    return priceChangePct < 0 ? normalizeScore(Math.abs(priceChangePct), 0, 10) : normalizeScore(priceChangePct, 0, 5) * 0.3;
  }
  return normalizeScore(Math.abs(priceChangePct), 0, 10);
}

export function classifySignal(
  oiChangePct: number,
  volumeChangePct: number,
  fundingRate: number,
  priceMomentum: number
): SignalType {
  const significantOi = oiChangePct >= THRESHOLDS.significantOiGrowth;
  const significantVolume = volumeChangePct >= THRESHOLDS.significantVolumeGrowth;
  const oiIncreasing = oiChangePct > 0;
  const volumeIncreasing = volumeChangePct > 0;

  // Strong Long: OI↑ + Volume↑ + Negative funding + Price stable/up
  if (
    significantOi &&
    significantVolume &&
    fundingRate <= THRESHOLDS.negativeFunding &&
    priceMomentum >= THRESHOLDS.priceMomentumUp
  ) {
    return SignalType.STRONG_LONG;
  }

  // Strong Short: OI↑ + Volume↑ + Strongly positive funding + Price weakening
  if (
    significantOi &&
    significantVolume &&
    fundingRate >= THRESHOLDS.stronglyPositiveFunding &&
    priceMomentum <= THRESHOLDS.priceMomentumDown
  ) {
    return SignalType.STRONG_SHORT;
  }

  // Weak Long: OI↑ + Volume↑ + Slightly positive funding
  if (
    oiIncreasing &&
    volumeIncreasing &&
    fundingRate >= THRESHOLDS.slightlyPositiveFunding &&
    fundingRate < THRESHOLDS.stronglyPositiveFunding
  ) {
    return SignalType.WEAK_LONG;
  }

  return SignalType.NEUTRAL;
}

export function calculateOpportunityScore(
  growthMatrix: GrowthMatrix,
  fundingRate: number,
  signalType: SignalType
): { score: number; priceMomentum: number; oiChangePct: number; volumeChangePct: number } {
  const primary = getPrimaryLookback(growthMatrix, '1h');
  const { oiChangePct, volumeChangePct, priceChangePct } = primary;
  const priceMomentum = priceChangePct;

  let signalBias: 'long' | 'short' | 'neutral' = 'neutral';
  let momentumDirection: 'up' | 'down' | 'any' = 'any';

  switch (signalType) {
    case SignalType.STRONG_LONG:
    case SignalType.WEAK_LONG:
      signalBias = 'long';
      momentumDirection = 'up';
      break;
    case SignalType.STRONG_SHORT:
      signalBias = 'short';
      momentumDirection = 'down';
      break;
  }

  const oiScore = scoreOiGrowth(Math.max(0, oiChangePct));
  const volumeScore = scoreVolumeGrowth(Math.max(0, volumeChangePct));
  const fundingScore = scoreFundingRate(fundingRate, signalBias);
  const momentumScore = scorePriceMomentum(priceMomentum, momentumDirection);

  const rawScore =
    oiScore * WEIGHTS.oiGrowth +
    volumeScore * WEIGHTS.volumeGrowth +
    fundingScore * WEIGHTS.fundingRate +
    momentumScore * WEIGHTS.priceMomentum;

  // Boost actionable signals
  const signalMultiplier =
    signalType === SignalType.STRONG_LONG || signalType === SignalType.STRONG_SHORT
      ? 1.15
      : signalType === SignalType.WEAK_LONG
        ? 1.05
        : 0.8;

  const score = Math.min(100, Math.round(rawScore * signalMultiplier * 100) / 100);

  return { score, priceMomentum, oiChangePct, volumeChangePct };
}

export function rankOpportunities<T extends { opportunityScore: number }>(items: T[]): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => b.opportunityScore - a.opportunityScore);
  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
