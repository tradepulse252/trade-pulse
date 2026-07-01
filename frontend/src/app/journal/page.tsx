'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOpportunities } from '@/hooks/useOpportunities';
import { JournalFiltersBar, ViewToggle } from '@/components/journal/JournalFilters';
import { PerformanceCards, SummaryStrip } from '@/components/journal/PerformanceCards';
import { TradeCalendar } from '@/components/journal/TradeCalendar';
import { TradeFormModal } from '@/components/journal/TradeFormModal';
import {
  DirectionBadge,
  PnlCell,
  PriceCell,
  ResultBadge,
} from '@/components/journal/JournalCells';
import {
  createJournalEntry,
  deleteJournalEntry,
  emptyTradeForm,
  entryToForm,
  fetchJournalEntries,
  fetchJournalStats,
  updateJournalEntry,
  type JournalEntry,
  type JournalFilters,
  type JournalStats,
  type TradeFormData,
} from '@/lib/journal';
import { getExchangeLabel } from '@/lib/exchanges';
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

const emptyStats: JournalStats = {
  daily: 0,
  weekly: 0,
  monthly: 0,
  yearly: 0,
  totalTrades: 0,
  totalPnl: 0,
  winCount: 0,
  lossCount: 0,
};

export default function TradeJournalPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { connected } = useOpportunities();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TradeFormData>(emptyTradeForm());
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filters, setFilters] = useState<JournalFilters>({
    direction: '',
    coin: '',
    result: '',
    from: '',
    to: '',
  });

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const activeFilters: JournalFilters = {
        direction: filters.direction || undefined,
        coin: filters.coin || undefined,
        result: filters.result || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      };
      const [list, summary] = await Promise.all([
        fetchJournalEntries(token, activeFilters),
        fetchJournalStats(token, activeFilters),
      ]);
      setEntries(list);
      setStats(summary);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    if (token) loadData();
    else setLoading(false);
  }, [token, loadData]);

  const displayedEntries = useMemo(() => {
    if (view === 'calendar' && selectedDate) {
      return entries.filter((e) => e.tradeDate === selectedDate);
    }
    return entries;
  }, [entries, view, selectedDate]);

  const resetForm = () => {
    setForm(emptyTradeForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await updateJournalEntry(token, editingId, form);
      } else {
        await createJournalEntry(token, form);
      }
      resetForm();
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save trade');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setForm(entryToForm(entry));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this trade?')) return;
    await deleteJournalEntry(token, id);
    if (editingId === id) resetForm();
    await loadData();
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <AppShell connected={connected}>
        <div className="p-5 lg:p-6 max-w-[1400px]">
          <div className="glass-card py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Sign in to use your Trade Journal</p>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell connected={connected}>
      <div className="p-5 lg:p-6 max-w-[1400px] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trade Journal</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Log trades, auto-calculate PnL, and review performance by day, week, month, or year.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyTradeForm());
              setShowForm(true);
            }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Trade
          </Button>
        </div>

        <PerformanceCards stats={stats} />
        <SummaryStrip stats={stats} />

        <JournalFiltersBar filters={filters} onChange={setFilters} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <ViewToggle view={view} onChange={(v) => { setView(v); setSelectedDate(null); }} />
          {view === 'calendar' && selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs text-primary hover:underline"
            >
              Clear date filter ({selectedDate})
            </button>
          )}
        </div>

        <TradeFormModal
          open={showForm}
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onClose={resetForm}
          submitting={submitting}
          editing={!!editingId}
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading journal...
          </div>
        ) : view === 'calendar' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <TradeCalendar
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <TradeTable
              entries={displayedEntries}
              onEdit={handleEdit}
              onDelete={handleDelete}
              title={selectedDate ? `Trades on ${selectedDate}` : 'Recent Trades'}
            />
          </div>
        ) : (
          <TradeTable entries={displayedEntries} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>
    </AppShell>
  );
}

function TradeTable({
  entries,
  onEdit,
  onDelete,
  title = 'All Trades',
}: {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  title?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="glass-card py-12 text-center text-muted-foreground">
        No trades found. Add your first trade or adjust filters.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="section-title text-base">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-muted-foreground text-xs">
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Coin</th>
              <th className="text-left px-4 py-3 font-medium">Exchange</th>
              <th className="text-left px-4 py-3 font-medium">Direction</th>
              <th className="text-right px-4 py-3 font-medium">Entry</th>
              <th className="text-right px-4 py-3 font-medium">Exit</th>
              <th className="text-right px-4 py-3 font-medium">Size</th>
              <th className="text-right px-4 py-3 font-medium">PnL</th>
              <th className="text-left px-4 py-3 font-medium">Result</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Notes</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs tabular-nums">{entry.tradeDate}</td>
                <td className="px-4 py-3">
                  <Link href={`/coin/${entry.coin}`} className="font-semibold hover:text-primary">
                    {entry.coin}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {entry.exchange ? getExchangeLabel(entry.exchange) : '—'}
                </td>
                <td className="px-4 py-3">
                  <DirectionBadge direction={entry.direction} />
                </td>
                <td className="px-4 py-3 text-right">
                  <PriceCell value={entry.entryPrice} />
                </td>
                <td className="px-4 py-3 text-right">
                  <PriceCell value={entry.exitPrice} />
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                  ${entry.positionSize.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <PnlCell pnlUsd={entry.pnlUsd} pnlPct={entry.pnlPct} />
                </td>
                <td className="px-4 py-3">
                  <ResultBadge result={entry.tradeResult} />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                  {entry.notes || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-short" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
