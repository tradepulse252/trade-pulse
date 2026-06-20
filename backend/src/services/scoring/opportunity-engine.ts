import { SignalType } from '@prisma/client';
import { GrowthMatrix } from '../../types';
import { getPrimaryLookback } from './growth-calculator';

const WEIGHTS = {
  oiGrowth: 0.4,
  volumeGrowth: 0.3,
  fundingRate: 0.2,
  priceMomentum: 0.1,
} as const;

/** High OI / volume = significant growth vs prior snapshot */
const THRESHOLDS = {
  highOiGrowth: 3,
  highVolumeGrowth: 5,
  moderateOiGrowth: 1,
  moderateVolumeGrowth: 2,
  strongNegativeFunding: -0.0001,
  slightNegativeFunding: 0,
  slightPositiveFunding: 0.0001,
  strongPositiveFunding: 0.0003,
  minFundingMagnitude: 0.00005,
} as const;

export type FundingBand =
  | 'strong_negative'
  | 'slight_negative'
  | 'flat'
  | 'slight_positive'
  | 'strong_positive';

export interface SignalConditions {
  highOi: boolean;
  highVolume: boolean;
  fundingMatch: boolean;
  matchCount: number;
  fundingBand: FundingBand;
}

function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

function scoreOiGrowth(oiChangePct: number): number {
  return normalizeScore(oiChangePct, 0, 20);
}

function scoreVolumeGrowth(volumeChangePct: number): number {
  return normalizeScore(volumeChangePct, 0, 30);
}

function scoreFundingRate(fundingRate: number, signalBias: 'long' | 'short' | 'neutral'): number {
  if (signalBias === 'long') {
    return fundingRate < 0
      ? normalizeScore(Math.abs(fundingRate), 0, 0.001) * 1.2
      : normalizeScore(-fundingRate, 0, 0.001) * 0.5;
  }
  if (signalBias === 'short') {
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

export function getFundingBand(fundingRate: number): FundingBand {
  if (fundingRate <= THRESHOLDS.strongNegativeFunding) return 'strong_negative';
  if (fundingRate < -THRESHOLDS.minFundingMagnitude) return 'slight_negative';
  if (fundingRate <= THRESHOLDS.minFundingMagnitude) return 'flat';
  if (fundingRate < THRESHOLDS.strongPositiveFunding) return 'slight_positive';
  return 'strong_positive';
}

function isHighOi(oiChangePct: number): boolean {
  return oiChangePct >= THRESHOLDS.highOiGrowth;
}

function isHighVolume(volumeChangePct: number): boolean {
  return volumeChangePct >= THRESHOLDS.highVolumeGrowth;
}

function isModerateOi(oiChangePct: number): boolean {
  return oiChangePct > 0 && oiChangePct >= THRESHOLDS.moderateOiGrowth;
}

function isModerateVolume(volumeChangePct: number): boolean {
  return volumeChangePct > 0 && volumeChangePct >= THRESHOLDS.moderateVolumeGrowth;
}

function isFundingMatch(fundingRate: number): boolean {
  return Math.abs(fundingRate) >= THRESHOLDS.minFundingMagnitude;
}

/** OI high + Volume high + Funding → Strong/Weak Long or Short (1–3 conditions). */
export function evaluateSignal(
  oiChangePct: number,
  volumeChangePct: number,
  fundingRate: number
): { signalType: SignalType; conditions: SignalConditions } {
  const fundingBand = getFundingBand(fundingRate);
  const highOi = isHighOi(oiChangePct);
  const highVolume = isHighVolume(volumeChangePct);
  const fundingMatch = isFundingMatch(fundingRate);

  const strictCount = (highOi ? 1 : 0) + (highVolume ? 1 : 0) + (fundingMatch ? 1 : 0);
  const moderateOi = isModerateOi(oiChangePct);
  const moderateVolume = isModerateVolume(volumeChangePct);
  const partialCount =
    (highOi || moderateOi ? 1 : 0) + (highVolume || moderateVolume ? 1 : 0) + (fundingMatch ? 1 : 0);

  const matchCount = strictCount > 0 ? strictCount : partialCount;

  const conditions: SignalConditions = {
    highOi: highOi || moderateOi,
    highVolume: highVolume || moderateVolume,
    fundingMatch,
    matchCount,
    fundingBand,
  };

  if (matchCount === 0) {
    return { signalType: SignalType.NEUTRAL, conditions };
  }

  const longBias =
    fundingBand === 'strong_negative' ||
    fundingBand === 'slight_negative' ||
    (fundingBand === 'flat' && fundingRate <= 0);
  const shortBias =
    fundingBand === 'strong_positive' ||
    fundingBand === 'slight_positive' ||
    (fundingBand === 'flat' && fundingRate > 0);

  // All three strict: Strong / Weak by funding magnitude
  if (highOi && highVolume && fundingMatch) {
    if (fundingBand === 'strong_negative') {
      return { signalType: SignalType.STRONG_LONG, conditions: { ...conditions, matchCount: 3 } };
    }
    if (fundingBand === 'slight_negative') {
      return { signalType: SignalType.WEAK_LONG, conditions: { ...conditions, matchCount: 3 } };
    }
    if (fundingBand === 'strong_positive') {
      return { signalType: SignalType.STRONG_SHORT, conditions: { ...conditions, matchCount: 3 } };
    }
    if (fundingBand === 'slight_positive') {
      return { signalType: SignalType.WEAK_SHORT, conditions: { ...conditions, matchCount: 3 } };
    }
  }

  // One or two conditions (or 3 with moderate OI/vol): assign weak sign
  if (longBias || (!shortBias && (conditions.highOi || conditions.highVolume))) {
    return { signalType: SignalType.WEAK_LONG, conditions };
  }
  if (shortBias) {
    return { signalType: SignalType.WEAK_SHORT, conditions };
  }

  return { signalType: SignalType.NEUTRAL, conditions };
}

export function classifySignal(
  oiChangePct: number,
  volumeChangePct: number,
  fundingRate: number,
  _priceMomentum?: number
): SignalType {
  return evaluateSignal(oiChangePct, volumeChangePct, fundingRate).signalType;
}

export function calculateOpportunityScore(
  growthMatrix: GrowthMatrix,
  fundingRate: number,
  signalType: SignalType,
  matchCount = 3
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
    case SignalType.WEAK_SHORT:
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

  const signalMultiplier =
    signalType === SignalType.STRONG_LONG || signalType === SignalType.STRONG_SHORT
      ? 1.15
      : signalType === SignalType.WEAK_LONG || signalType === SignalType.WEAK_SHORT
        ? 1.05
        : 0.8;

  const matchMultiplier = matchCount === 3 ? 1 : matchCount === 2 ? 0.85 : 0.7;

  const score = Math.min(100, Math.round(rawScore * signalMultiplier * matchMultiplier * 100) / 100);

  return { score, priceMomentum, oiChangePct, volumeChangePct };
}

export function rankOpportunities<T extends { opportunityScore: number }>(items: T[]): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => b.opportunityScore - a.opportunityScore);
  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
