'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { OpportunityFilters } from '@/components/dashboard/OpportunityFilters';
import { SortControls } from '@/components/dashboard/SortControls';
import { AggregatedMarketsTable } from '@/components/dashboard/AggregatedMarketsTable';
import { AggregatedTrendingCard } from '@/components/dashboard/AggregatedTrendingCard';
import { GainersLosersPanel } from '@/components/dashboard/GainersLosersPanel';
import { InsightStatCard } from '@/components/dashboard/InsightStatCard';
import { useAggregatedMarkets } from '@/hooks/useAggregatedMarkets';
import { useOpportunities } from '@/hooks/useOpportunities';
import { applyAggregatedFilters } from '@/lib/filters';
import { cn } from '@/lib/utils';
import { ArrowRight, RefreshCw, TrendingUp, Zap, Target } from 'lucide-react';
import type { MarketSort } from '@/lib/api';

const SORT_OPTIONS: { value: MarketSort; label: string }[] = [
  { value: 'marketCap', label: 'Market Cap' },
  { value: 'volume', label: 'Total Volume' },
  { value: 'openInterest', label: 'Open Interest' },
  { value: 'funding', label: 'Funding Rate' },
  { value: 'score', label: 'Opportunity Score' },
];

export default function DashboardPage() {
  const [sort, setSort] = useState<MarketSort>('marketCap');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { markets, gainers, losers, loading, error, refetch } = useAggregatedMarkets(sort);
  const { connected, filters, setFilters, sortBy, setSortBy, sortOrder, setSortOrder, timeframe, setTimeframe } =
    useOpportunities({ limit: 50 });

  const filteredMarkets = useMemo(
    () => applyAggregatedFilters(markets, filters),
    [markets, filters]
  );

  const trendingTop = useMemo(() => filteredMarkets.slice(0, 3), [filteredMarkets]);

  const strongLongs = markets.filter((m) => m.signalType === 'STRONG_LONG').length;
  const strongShorts = markets.filter((m) => m.signalType === 'STRONG_SHORT').length;
  const avgScore =
    markets.length > 0 ? markets.reduce((s, m) => s + m.opportunityScore, 0) / markets.length : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <AppShell connected={connected} searchValue={search} onSearchChange={setSearch}>
      <div className="p-5 lg:p-6 space-y-8 max-w-[1500px]">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Trending Opportunities</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Aggregated from Binance, Bybit, OKX (CEX) + Hyperliquid (DEX)
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading && trendingTop.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card h-[220px] animate-pulse bg-white/[0.02]" />
                ))
              : trendingTop.map((m) => <AggregatedTrendingCard key={m.symbol} market={m} />)}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">Market Insights</h2>
              <p className="text-xs text-muted-foreground mt-1">
                All coins · sorted by {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSort(opt.value)}
                  className={cn('pill-tab text-xs', sort === opt.value && 'pill-tab-active')}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={cn('pill-tab text-xs', filtersOpen && 'pill-tab-active')}
              >
                Advanced Filters
              </button>
              <button type="button" onClick={handleRefresh} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/[0.05]">
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
            <div className="glass-card overflow-hidden min-w-0">
              {filtersOpen && (
                <>
                  <OpportunityFilters filters={filters} onChange={setFilters} alwaysOpen />
                  <SortControls
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    timeframe={timeframe}
                    onSortByChange={setSortBy}
                    onSortOrderChange={setSortOrder}
                    onTimeframeChange={setTimeframe}
                  />
                </>
              )}

              {error ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-short font-medium">Cannot reach backend API</p>
                  <p className="text-sm text-muted-foreground">
                    API: {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
                  </p>
                </div>
              ) : (
                <AggregatedMarketsTable markets={filteredMarkets} loading={loading} search={search} />
              )}
            </div>

            <GainersLosersPanel gainers={gainers} losers={losers} loading={loading} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Signal Insights</h2>
            <Link href="/signals" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-white/[0.05]">
              View Signals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InsightStatCard label="Strong Longs" value={String(strongLongs)} icon={TrendingUp} accent="long" />
            <InsightStatCard label="Strong Shorts" value={String(strongShorts)} icon={Zap} accent="short" />
            <InsightStatCard label="Avg Score" value={avgScore.toFixed(1)} icon={Target} accent="primary" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
