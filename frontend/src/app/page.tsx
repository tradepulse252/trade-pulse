'use client';

import { Header } from '@/components/layout/Header';
import { OpportunityFilters } from '@/components/dashboard/OpportunityFilters';
import { SortControls } from '@/components/dashboard/SortControls';
import { RankingTable } from '@/components/dashboard/RankingTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpportunities } from '@/hooks/useOpportunities';
import { SORT_OPTIONS } from '@/lib/sorting';
import { TrendingUp, Zap, Target } from 'lucide-react';

export default function DashboardPage() {
  const {
    opportunities,
    loading,
    error,
    filters,
    setFilters,
    connected,
    totalCount,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    timeframe,
    setTimeframe,
  } = useOpportunities({ limit: 50 });

  const isFiltered = Boolean(
    filters.symbols || filters.signalType || filters.minScore || filters.minOi || filters.minVolume
  );

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Score';

  const strongLongs = opportunities.filter((o) => o.signalType === 'STRONG_LONG').length;
  const strongShorts = opportunities.filter((o) => o.signalType === 'STRONG_SHORT').length;
  const avgScore =
    opportunities.length > 0
      ? opportunities.reduce((sum, o) => sum + o.opportunityScore, 0) / opportunities.length
      : 0;

  return (
    <div className="min-h-screen">
      <Header connected={connected} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-long/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-long" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Strong Longs</p>
                <p className="text-2xl font-bold text-long">{strongLongs}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-short/15 flex items-center justify-center">
                <Zap className="h-5 w-5 text-short" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Strong Shorts</p>
                <p className="text-2xl font-bold text-short">{strongShorts}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Opportunity Score</p>
                <p className="text-2xl font-bold font-mono">{avgScore.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="glass rounded-lg px-4 py-3 border-l-4 border-l-primary">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Core Signal:</span>{' '}
            Increasing Open Interest + Increasing Volume = New Capital Entering Market
          </p>
        </div>

        <OpportunityFilters filters={filters} onChange={setFilters} />

        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          timeframe={timeframe}
          onSortByChange={setSortBy}
          onSortOrderChange={setSortOrder}
          onTimeframeChange={setTimeframe}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Opportunity Rankings</span>
              <span className="text-xs font-normal text-muted-foreground">
                {isFiltered
                  ? `${opportunities.length} of ${totalCount} pairs (filtered)`
                  : `${opportunities.length} pairs`}{' '}
                · sorted by {sortLabel}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-short font-medium">Cannot reach backend API</p>
                <p className="text-sm text-muted-foreground">
                  Start the backend:{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">cd backend && npm run dev</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  API: {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
                </p>
              </div>
            ) : (
              <RankingTable
                opportunities={opportunities}
                loading={loading}
                timeframe={timeframe}
                isFiltered={isFiltered}
                totalCount={totalCount}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
