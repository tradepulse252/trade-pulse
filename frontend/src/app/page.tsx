'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useSearch } from '@/contexts/SearchContext';
import { AggregatedMarketsTable } from '@/components/dashboard/AggregatedMarketsTable';
import { AggregatedTrendingCard } from '@/components/dashboard/AggregatedTrendingCard';
import { GainersLosersPanel } from '@/components/dashboard/GainersLosersPanel';
import { InsightStatCard } from '@/components/dashboard/InsightStatCard';
import { useAggregatedMarkets } from '@/hooks/useAggregatedMarkets';
import { useOpportunities } from '@/hooks/useOpportunities';
import { cn, normalizeSignalType } from '@/lib/utils';
import { ArrowRight, RefreshCw, TrendingUp, Zap, Target } from 'lucide-react';

export default function DashboardPage() {
  const { search } = useSearch();
  const [refreshing, setRefreshing] = useState(false);

  const { markets, gainers, losers, loading, error, refetch, liveConnected } = useAggregatedMarkets('marketCap');
  const { connected } = useOpportunities({ limit: 50 });

  const topByMarketCap = useMemo(
    () => [...markets].sort((a, b) => b.marketCap - a.marketCap).slice(0, 5),
    [markets]
  );

  const longOpportunities = markets.filter(
    (m) => normalizeSignalType(m.signalType) === 'WEAK_LONG'
  ).length;
  const shortOpportunities = markets.filter(
    (m) => normalizeSignalType(m.signalType) === 'WEAK_SHORT'
  ).length;
  const avgScore =
    markets.length > 0 ? markets.reduce((s, m) => s + m.opportunityScore, 0) / markets.length : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <AppShell connected={connected}>
      <div className="p-5 lg:p-6 space-y-8 max-w-[1500px]">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Top by Market Cap</h2>
              <p className="text-xs text-muted-foreground mt-1">Largest cryptocurrencies by market capitalization</p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {loading && topByMarketCap.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="glass-card h-[120px] animate-pulse bg-white/[0.02]" />
                ))
              : topByMarketCap.map((m) => <AggregatedTrendingCard key={m.symbol} market={m} />)}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">Market Insights</h2>
              <p className="text-xs text-muted-foreground mt-1">
                All cryptocurrencies sorted by market cap · CoinGecko / CoinMarketCap style
                {liveConnected && (
                  <span className="ml-2 inline-flex items-center gap-1 text-long">
                    <span className="h-1.5 w-1.5 rounded-full bg-long animate-pulse" />
                    Live prices
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/[0.05]"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
            <div className="glass-card overflow-hidden min-w-0">
              {error && markets.length === 0 && !loading ? (
                <div className="p-10 text-center space-y-4">
                  <p className="text-short font-medium">{error}</p>
                  <p className="text-sm text-muted-foreground">
                    API: {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
                  </p>
                  {error.includes('503') || error.includes('suspended') ? (
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Northflank backend may be starting. Market data should load via Vercel fallback automatically on retry.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/[0.05]"
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    Retry connection
                  </button>
                </div>
              ) : (
                <AggregatedMarketsTable markets={markets} loading={loading} search={search} />
              )}
            </div>

            <GainersLosersPanel gainers={gainers} losers={losers} loading={loading} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Signal Insights</h2>
            <Link
              href="/signals"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-white/[0.05]"
            >
              View Signals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InsightStatCard label="Long Opportunities" value={String(longOpportunities)} icon={TrendingUp} accent="long" />
            <InsightStatCard label="Short Opportunities" value={String(shortOpportunities)} icon={Zap} accent="short" />
            <InsightStatCard label="Avg Score" value={avgScore.toFixed(1)} icon={Target} accent="primary" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
