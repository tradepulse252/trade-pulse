import type { Timestamp } from 'firebase-admin/firestore';

export function newId(): string {
  return crypto.randomUUID();
}

export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

export function docWithId<T extends object>(id: string, data: T): T & { id: string } {
  const mapped: Record<string, unknown> = { id };
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') {
      mapped[key] = (val as Timestamp).toDate();
    } else {
      mapped[key] = val;
    }
  }
  return mapped as T & { id: string };
}

export function watchlistDocId(userId: string, symbolId: string): string {
  return `${userId}__${symbolId}`;
}

export function growthMetricDocId(symbolId: string, timeframe: string): string {
  return `${symbolId}__${timeframe}`;
}

export const DEFAULT_ALERT_SETTINGS = {
  enableStrongLong: true,
  enableStrongShort: true,
  enableOiSpike: true,
  enableVolumeSpike: true,
  enableFundingFlip: true,
  minOpportunityScore: 70,
  oiSpikeThresholdPct: 5,
  volumeSpikeThresholdPct: 10,
} as const;
