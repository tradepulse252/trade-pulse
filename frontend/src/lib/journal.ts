export type TradeDirection = 'LONG' | 'SHORT';
export type TradeResult = 'WIN' | 'LOSS' | 'BREAKEVEN';

export interface JournalEntry {
  id: string;
  tradeDate: string;
  coin: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  pnlUsd: number;
  pnlPct: number;
  tradeResult: TradeResult;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  totalTrades: number;
  totalPnl: number;
  winCount: number;
  lossCount: number;
}

export interface JournalFilters {
  direction?: TradeDirection | '';
  coin?: string;
  result?: TradeResult | '';
  from?: string;
  to?: string;
}

export interface TradeFormData {
  tradeDate: string;
  coin: string;
  direction: TradeDirection;
  entryPrice: string;
  exitPrice: string;
  positionSize: string;
  notes: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function calculateTradeMetrics(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number,
  positionSize: number
) {
  const priceChangePct =
    direction === 'LONG'
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;

  const pnlPct = Math.round(priceChangePct * 100) / 100;
  const pnlUsd = Math.round(((positionSize * priceChangePct) / 100) * 100) / 100;

  let tradeResult: TradeResult;
  if (pnlUsd > 0) tradeResult = 'WIN';
  else if (pnlUsd < 0) tradeResult = 'LOSS';
  else tradeResult = 'BREAKEVEN';

  return { pnlUsd, pnlPct, tradeResult };
}

export function getPnlColorClass(value: number): string {
  if (value > 0) return 'text-long';
  if (value < 0) return 'text-short';
  return 'text-neutral';
}

export function formatPnlUsd(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPnlPct(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function buildQuery(filters?: JournalFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.coin?.trim()) params.set('coin', filters.coin.trim());
  if (filters.result) params.set('result', filters.result);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchJournalEntries(
  token: string,
  filters?: JournalFilters
): Promise<JournalEntry[]> {
  const res = await fetch(`${API_URL}/api/journal${buildQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load journal entries');
  const json = await res.json();
  return json.data;
}

export async function fetchJournalStats(
  token: string,
  filters?: JournalFilters
): Promise<JournalStats> {
  const res = await fetch(`${API_URL}/api/journal/stats${buildQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load journal stats');
  const json = await res.json();
  return json.data;
}

export async function createJournalEntry(
  token: string,
  data: TradeFormData
): Promise<JournalEntry> {
  const res = await fetch(`${API_URL}/api/journal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tradeDate: data.tradeDate,
      coin: data.coin.toUpperCase(),
      direction: data.direction,
      entryPrice: Number(data.entryPrice),
      exitPrice: Number(data.exitPrice),
      positionSize: Number(data.positionSize),
      notes: data.notes || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create trade');
  }
  const json = await res.json();
  return json.data;
}

export async function updateJournalEntry(
  token: string,
  id: string,
  data: TradeFormData
): Promise<JournalEntry> {
  const res = await fetch(`${API_URL}/api/journal/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tradeDate: data.tradeDate,
      coin: data.coin.toUpperCase(),
      direction: data.direction,
      entryPrice: Number(data.entryPrice),
      exitPrice: Number(data.exitPrice),
      positionSize: Number(data.positionSize),
      notes: data.notes || null,
    }),
  });
  if (!res.ok) throw new Error('Failed to update trade');
  const json = await res.json();
  return json.data;
}

export async function deleteJournalEntry(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/journal/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete trade');
}

export function emptyTradeForm(): TradeFormData {
  return {
    tradeDate: new Date().toISOString().slice(0, 10),
    coin: '',
    direction: 'LONG',
    entryPrice: '',
    exitPrice: '',
    positionSize: '',
    notes: '',
  };
}

export function entryToForm(entry: JournalEntry): TradeFormData {
  return {
    tradeDate: entry.tradeDate,
    coin: entry.coin,
    direction: entry.direction,
    entryPrice: String(entry.entryPrice),
    exitPrice: String(entry.exitPrice),
    positionSize: String(entry.positionSize),
    notes: entry.notes ?? '',
  };
}

export function groupEntriesByDate(entries: JournalEntry[]): Map<string, JournalEntry[]> {
  const map = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.tradeDate) ?? [];
    list.push(entry);
    map.set(entry.tradeDate, list);
  }
  return map;
}

export function dailyPnlForDate(entries: JournalEntry[], dateKey: string): number {
  return entries
    .filter((e) => e.tradeDate === dateKey)
    .reduce((sum, e) => sum + e.pnlUsd, 0);
}
