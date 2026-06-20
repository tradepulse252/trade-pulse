'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { getSignals } from '@/lib/api';
import type { AggregatedMarket } from '@/lib/api';
import { cn, formatFunding, formatNumber, formatPct, formatPrice, getSignalClass, getSignalLabel } from '@/lib/utils';
import { Loader2, ArrowUpRight } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';

export default function SignalsPage() {
  const [signals, setSignals] = useState<AggregatedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const { connected } = useOpportunities();

  useEffect(() => {
    getSignals(200)
      .then(setSignals)
      .finally(() => setLoading(false));
    const interval = setInterval(() => getSignals(200).then(setSignals), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppShell connected={connected}>
      <div className="p-5 lg:p-6 max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Signals</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Coins matching the aggregated formula: combined OI + Volume growth + Funding alignment across
            Binance, Bybit, OKX (CEX) and Hyperliquid (DEX). Sorted by opportunity score.
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading signals…
            </div>
          ) : signals.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No coins currently match the signal formula. Data refreshes every 60s.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">Coin</th>
                    <th className="text-left py-3 px-4">Signal</th>
                    <th className="text-right py-3 px-4">Score</th>
                    <th className="text-right py-3 px-4">Agg. Volume</th>
                    <th className="text-right py-3 px-4">Agg. OI</th>
                    <th className="text-right py-3 px-4">Funding</th>
                    <th className="text-right py-3 px-4">24h</th>
                    <th className="text-right py-3 px-4 pr-4">Exchanges</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s, i) => (
                    <tr key={s.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-muted-foreground">{s.rank ?? i + 1}</td>
                      <td className="py-3 px-4">
                        <Link href={`/coin/${s.symbol}`} className="font-semibold hover:text-primary inline-flex items-center gap-1">
                          {s.baseAsset}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('text-xs font-medium', getSignalClass(s.signalType))}>
                          {getSignalLabel(s.signalType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-primary font-semibold">{s.opportunityScore.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right data-cell text-muted-foreground">${formatNumber(s.totalVolumeUsdt)}</td>
                      <td className="py-3 px-4 text-right data-cell text-muted-foreground">${formatNumber(s.totalOpenInterest)}</td>
                      <td className="py-3 px-4 text-right data-cell">{formatFunding(s.avgFundingRate)}</td>
                      <td className={cn('py-3 px-4 text-right tabular-nums', s.priceChange24h >= 0 ? 'text-long' : 'text-short')}>
                        {formatPct(s.priceChange24h)}
                      </td>
                      <td className="py-3 px-4 pr-4 text-right text-xs text-muted-foreground">{s.exchanges.join(', ')}</td>
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
