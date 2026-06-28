'use client';

import { Calendar, CalendarDays, CalendarRange, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPnlUsd, getPnlColorClass, type JournalStats } from '@/lib/journal';

interface PerformanceCardsProps {
  stats: JournalStats;
}

const cards = [
  { key: 'daily' as const, label: 'Daily PnL', icon: Calendar },
  { key: 'weekly' as const, label: 'Weekly PnL', icon: CalendarDays },
  { key: 'monthly' as const, label: 'Monthly PnL', icon: CalendarRange },
  { key: 'yearly' as const, label: 'Yearly PnL', icon: TrendingUp },
];

export function PerformanceCards({ stats }: PerformanceCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ key, label, icon: Icon }) => {
        const value = stats[key];
        const color = getPnlColorClass(value);
        return (
          <article key={key} className="glass-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className={cn('text-xl font-bold font-mono tabular-nums', color)}>{formatPnlUsd(value)}</p>
          </article>
        );
      })}
    </div>
  );
}

export function SummaryStrip({ stats }: PerformanceCardsProps) {
  return (
    <div className="glass-card p-4 flex flex-wrap gap-6 text-sm">
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Total PnL</p>
        <p className={cn('font-mono font-semibold tabular-nums', getPnlColorClass(stats.totalPnl))}>
          {formatPnlUsd(stats.totalPnl)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Trades</p>
        <p className="font-mono font-semibold tabular-nums">{stats.totalTrades}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Wins</p>
        <p className="font-mono font-semibold tabular-nums text-long">{stats.winCount}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Losses</p>
        <p className="font-mono font-semibold tabular-nums text-short">{stats.lossCount}</p>
      </div>
    </div>
  );
}
