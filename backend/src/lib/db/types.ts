/** Firestore document types — mirrors former Prisma/RDMS schema with explicit FK fields. */

export enum SignalType {
  STRONG_LONG = 'STRONG_LONG',
  WEAK_LONG = 'WEAK_LONG',
  STRONG_SHORT = 'STRONG_SHORT',
  WEAK_SHORT = 'WEAK_SHORT',
  NEUTRAL = 'NEUTRAL',
}

export enum AlertType {
  NEW_STRONG_LONG = 'NEW_STRONG_LONG',
  NEW_STRONG_SHORT = 'NEW_STRONG_SHORT',
  OI_SPIKE = 'OI_SPIKE',
  VOLUME_SPIKE = 'VOLUME_SPIKE',
  FUNDING_FLIP = 'FUNDING_FLIP',
  SCORE_THRESHOLD = 'SCORE_THRESHOLD',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum Timeframe {
  M5 = 'M5',
  M15 = 'M15',
  M30 = 'M30',
  H1 = 'H1',
  H2 = 'H2',
  H4 = 'H4',
  H24 = 'H24',
  D7 = 'D7',
}

export interface UserDoc {
  email: string;
  passwordHash: string;
  name: string | null;
  role: UserRole;
  fcmToken: string | null;
  isActive: boolean;
  emailVerified: boolean;
  verifyToken: string | null;
  verifyCode: string | null;
  verifyExpiresAt: Date | null;
  resetToken: string | null;
  resetCode: string | null;
  resetExpiresAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SymbolDoc {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  isActive: boolean;
  minQty: number | null;
  tickSize: number | null;
  contractSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceSnapshotDoc {
  symbolId: string;
  price: number;
  timestamp: Date;
}

export interface OpenInterestSnapshotDoc {
  symbolId: string;
  openInterest: number;
  openInterestValue: number;
  timestamp: Date;
}

export interface VolumeSnapshotDoc {
  symbolId: string;
  volume: number;
  volumeUsdt: number;
  timestamp: Date;
}

export interface FundingRateSnapshotDoc {
  symbolId: string;
  fundingRate: number;
  markPrice: number | null;
  timestamp: Date;
}

export interface GrowthMetricDoc {
  symbolId: string;
  timeframe: Timeframe;
  priceChangePct: number;
  oiChangePct: number;
  volumeChangePct: number;
  calculatedAt: Date;
}

export interface SignalDoc {
  symbolId: string;
  signalType: SignalType;
  opportunityScore: number;
  price: number;
  openInterest: number;
  oiChangePct: number;
  volumeUsdt: number;
  volumeChangePct: number;
  fundingRate: number;
  priceMomentum: number;
  rank: number | null;
  isActive: boolean;
  detectedAt: Date;
  updatedAt: Date;
}

export enum TradeDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum TradeResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAKEVEN = 'BREAKEVEN',
}

export interface JournalEntryDoc {
  userId: string;
  tradeDate: Date;
  coin: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  pnlUsd: number;
  pnlPct: number;
  tradeResult: TradeResult;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistItemDoc {
  userId: string;
  symbolId: string;
  notes: string | null;
  createdAt: Date;
}

export interface AlertDoc {
  userId: string;
  symbolId: string | null;
  alertType: AlertType;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  isPushed: boolean;
  triggeredAt: Date;
}

export interface AlertSettingDoc {
  userId: string;
  enableStrongLong: boolean;
  enableStrongShort: boolean;
  enableOiSpike: boolean;
  enableVolumeSpike: boolean;
  enableFundingFlip: boolean;
  minOpportunityScore: number;
  oiSpikeThresholdPct: number;
  volumeSpikeThresholdPct: number;
}

export interface SystemHealthDoc {
  restApiStatus: string;
  wsStatus: string;
  lastRestPing: Date | null;
  lastWsMessage: Date | null;
  activeSymbols: number;
  activeUsers: number;
  alertsToday: number;
  errorCount: number;
  recordedAt: Date;
}

export interface ErrorLogDoc {
  source: string;
  level: string;
  message: string;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/** Collection names (top-level Firestore collections). */
export const COLLECTIONS = {
  users: 'users',
  symbols: 'symbols',
  priceSnapshots: 'price_snapshots',
  openInterestSnapshots: 'open_interest_snapshots',
  volumeSnapshots: 'volume_snapshots',
  fundingRateSnapshots: 'funding_rate_snapshots',
  growthMetrics: 'growth_metrics',
  signals: 'signals',
  watchlistItems: 'watchlist_items',
  journalEntries: 'journal_entries',
  alerts: 'alerts',
  alertSettings: 'alert_settings',
  systemHealth: 'system_health',
  errorLogs: 'error_logs',
} as const;
