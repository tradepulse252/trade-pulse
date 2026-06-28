import { initFirebase, isFirebaseConfigured, pingFirestore } from '../firebase';
import { usersRepo } from './users';
import { symbolsRepo } from './symbols';
import { snapshotsRepo } from './snapshots';
import { growthMetricsRepo } from './growthMetrics';
import { signalsRepo } from './signals';
import { watchlistRepo } from './watchlist';
import { journalRepo } from './journal';
import { alertsRepo } from './alerts';
import { alertSettingsRepo } from './alertSettings';
import { systemHealthRepo } from './systemHealth';
import { errorLogsRepo } from './errorLogs';

export * from './types';

export const db = {
  users: usersRepo,
  symbols: symbolsRepo,
  snapshots: snapshotsRepo,
  growthMetrics: growthMetricsRepo,
  signals: signalsRepo,
  watchlist: watchlistRepo,
  journal: journalRepo,
  alerts: alertsRepo,
  alertSettings: alertSettingsRepo,
  systemHealth: systemHealthRepo,
  errorLogs: errorLogsRepo,

  async init(): Promise<boolean> {
    if (!isFirebaseConfigured()) return false;
    return initFirebase();
  },

  async ping(): Promise<boolean> {
    return pingFirestore();
  },
};

export async function ensureDb(): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  if (!(await db.init())) return false;
  return db.ping();
}
