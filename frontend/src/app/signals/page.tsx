'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { getSignals } from '@/lib/api';
import type { AggregatedMarket } from '@/lib/api';
import { cn, formatFunding, formatNumber, formatPct, getSignalClass, getSignalEmoji, getSignalLabel } from '@/lib/utils';
import { Loader2, ArrowUpRight, Check, X } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';

const SIGNAL_FILTERS = [
  { key: 'ALL', label: 'All Signals' },
  { key: 'STRONG_LONG', label: 'Strong Long' },
  { key: 'WEAK_LONG', label: 'Slightly Long' },
  { key: 'STRONG_SHORT', label: 'Strong Short' },
  { key: 'WEAK_SHORT', label: 'Slightly Short' },
] as const;

const FORMULA_ROWS = [
  { signal: 'Strong Long', rule: 'High OI + High Volume + Negative funding', type: 'STRONG_LONG' },
  { signal: 'Slightly Long', rule: 'High OI + High Volume + Slightly negative funding', type: 'WEAK_LONG' },
  { signal: 'Strong Short', rule: 'High OI + High Volume + Positive funding', type: 'STRONG_SHORT' },
  { signal: 'Slightly Short', rule: 'High OI + High Volume + Slightly positive funding', type: 'WEAK_SHORT' },
] as const;

function ConditionBadge({ met, label }: { met: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium border',
        met
          ? 'border-long/30 bg-long/10 text-long'
          : 'border-white/10 bg-white/[0.03] text-muted-foreground'
      )}
      title={met ? `${label} condition met` : `${label} not met`}
    >
      {met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5 opacity-50" />}
      {label}
    </span>
  );
}

function SignalConditions({ market }: { market: AggregatedMarket }) {
  const c = market.signalConditions;
  if (!c) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        <ConditionBadge met={market.oiChangePct >= 3} label="OI" />
        <ConditionBadge met={market.volumeChangePct >= 5} label="Vol" />
        <ConditionBadge met={Math.abs(market.avgFundingRate) >= 0.00005} label="Fund" />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <ConditionBadge met={c.highOi} label="OI" />
      <ConditionBadge met={c.highVolume} label="Vol" />
      <ConditionBadge met={c.fundingMatch} label="Fund" />
      <span className="text-[10px] text-muted-foreground self-center">{c.matchCount}/3</span>
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<AggregatedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const { connected } = useOpportunities();

  useEffect(() => {
    getSignals(500)
      .then(setSignals)
      .finally(() => setLoading(false));
    const interval = setInterval(() => getSignals(500).then(setSignals), 30_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(
    () => (filter === 'ALL' ? signals : signals.filter((s) => s.signalType === filter)),
    [signals, filter]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: signals.length };
    for (const s of signals) {
      map[s.signalType] = (map[s.signalType] ?? 0) + 1;
    }
    return map;
  }, [signals]);

  return (
    <AppShell connected={connected}>
      <div className="p-5 lg:p-6 max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Signals</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            High OI + High Volume + Funding direction. Filter by Strong or Slightly Long/Short.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FORMULA_ROWS.map((row) => (
            <div key={row.type} className="glass-card p-4 text-xs">
              <p className={cn('font-semibold mb-1', getSignalClass(row.type))}>
                {getSignalEmoji(row.type)} {row.signal}
              </p>
              <p className="text-muted-foreground leading-relaxed">{row.rule}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">{counts[row.type] ?? 0} coins</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {SIGNAL_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn('pill-tab text-xs', filter === key && 'pill-tab-active')}
            >
              {label} ({counts[key] ?? 0})
            </button>
          ))}
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading signals…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No coins match this filter. Data refreshes every 30s.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">Coin</th>
                    <th className="text-left py-3 px-4">Signal</th>
                    <th className="text-left py-3 px-4">Conditions</th>
                    <th className="text-right py-3 px-4">Score</th>
                    <th className="text-right py-3 px-4">OI Δ</th>
                    <th className="text-right py-3 px-4">Vol Δ</th>
                    <th className="text-right py-3 px-4">Funding</th>
                    <th className="text-right py-3 px-4 pr-4">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-muted-foreground">{s.rank ?? i + 1}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/coin/${s.symbol}`}
                          className="font-semibold hover:text-primary inline-flex items-center gap-1"
                        >
                          {s.baseAsset}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('text-xs font-semibold', getSignalClass(s.signalType))}>
                          {getSignalEmoji(s.signalType)} {getSignalLabel(s.signalType)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <SignalConditions market={s} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-primary font-semibold">
                        {s.opportunityScore.toFixed(1)}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-4 text-right tabular-nums text-xs',
                          s.oiChangePct >= 0 ? 'text-long' : 'text-short'
                        )}
                      >
                        {formatPct(s.oiChangePct)}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-4 text-right tabular-nums text-xs',
                          s.volumeChangePct >= 0 ? 'text-long' : 'text-short'
                        )}
                      >
                        {formatPct(s.volumeChangePct)}
                      </td>
                      <td className="py-3 px-4 text-right data-cell text-xs">{formatFunding(s.avgFundingRate)}</td>
                      <td
                        className={cn(
                          'py-3 px-4 pr-4 text-right tabular-nums text-xs',
                          s.priceChange24h >= 0 ? 'text-long' : 'text-short'
                        )}
                      >
                        {formatPct(s.priceChange24h)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
