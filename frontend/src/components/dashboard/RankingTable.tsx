'use client';

import Link from 'next/link';
import type { Opportunity } from '@/lib/api';
import {
  cn,
  formatFunding,
  formatNumber,
  formatPct,
  formatPrice,
  getSignalLabel,
} from '@/lib/utils';
import { MoneyPctCell } from '@/components/dashboard/MoneyPctCell';
import { getGrowthForTimeframe, getTimeframeLabel, type TimeframeKey } from '@/lib/sorting';
import { getTfMetric } from '@/lib/metrics';
import { Sparkline, getOpportunitySparkline } from '@/components/charts/Sparkline';
import { Loader2 } from 'lucide-react';

interface RankingTableProps {
  opportunities: Opportunity[];
  loading?: boolean;
  timeframe?: TimeframeKey;
  isFiltered?: boolean;
  totalCount?: number;
}

function SymbolAvatar({ symbol }: { symbol: string }) {
  const base = symbol.replace('USDT', '');
  const initials = base.slice(0, 2).toUpperCase();
  const hue = (base.charCodeAt(0) * 17 + (base.charCodeAt(1) || 0) * 7) % 360;

  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ background: `hsl(${hue} 55% 45%)` }}
    >
      {initials}
    </div>
  );
}

export function RankingTable({
  opportunities,
  loading,
  timeframe = '1h',
  isFiltered = false,
  totalCount = 0,
}: RankingTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading opportunities...</p>
      </div>
    );
  }

  if (opportunities.length === 0) {
    const message =
      isFiltered && totalCount > 0
        ? 'No opportunities match your filters'
        : 'Waiting for live market data from Binance…';
    return (
      <div className="flex items-center justify-center h-80 text-muted-foreground">
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-muted-foreground text-xs">
            <th className="text-left py-3.5 px-4 font-medium w-12">#</th>
            <th className="text-left py-3.5 px-4 font-medium min-w-[140px]">Name</th>
            <th className="text-right py-3.5 px-4 font-medium">Price</th>
            <th className="text-right py-3.5 px-4 font-medium min-w-[110px]">Open Interest</th>
            <th className="text-right py-3.5 px-4 font-medium min-w-[110px]">Volume</th>
            <th className="text-right py-3.5 px-4 font-medium">Funding</th>
            <th className="text-right py-3.5 px-4 font-medium">Score</th>
            <th className="text-right py-3.5 px-4 font-medium pr-5 min-w-[100px]">Trend</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp, idx) => {
            const growth = getGrowthForTimeframe(opp, timeframe);
            const tf = getTfMetric(
              opp.growthMatrix,
              timeframe,
              opp.openInterest,
              opp.volumeUsdt,
              opp.oiChangePct,
              opp.volumeChangePct
            );
            const rank = opp.rank ?? idx + 1;
            const base = opp.symbol.replace('USDT', '');
            const sparkValues = getOpportunitySparkline(opp.growthMatrix, opp.priceMomentum);
            const trendUp = growth.priceChangePct >= 0;

            return (
              <tr
                key={opp.symbol}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
              >
                <td className="py-4 px-4 text-muted-foreground tabular-nums">{rank}</td>
                <td className="py-4 px-4">
                  <Link href={`/coin/${opp.symbol}`} className="flex items-center gap-3 group/link">
                    <SymbolAvatar symbol={opp.symbol} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground group-hover/link:text-primary transition-colors truncate">
                        {base}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{getSignalLabel(opp.signalType)}</p>
                    </div>
                  </Link>
                </td>
                <td className="py-4 px-4 text-right data-cell text-foreground">{formatPrice(opp.price)}</td>
                <td className="py-4 px-4 text-right">
                  <MoneyPctCell
                    totalUsd={opp.openInterest}
                    changeUsd={tf.oiChangeUsd}
                    changePct={growth.oiChangePct}
                  />
                </td>
                <td className="py-4 px-4 text-right">
                  <MoneyPctCell
                    totalUsd={opp.volumeUsdt}
                    changeUsd={tf.volumeChangeUsd}
                    changePct={growth.volumeChangePct}
                  />
                </td>
                <td
                  className={cn(
                    'py-4 px-4 text-right data-cell',
                    opp.fundingRate < 0 ? 'text-long' : opp.fundingRate > 0.0003 ? 'text-short' : 'text-muted-foreground'
                  )}
                >
                  {formatFunding(opp.fundingRate)}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="inline-flex items-center rounded-lg bg-primary/15 border border-primary/25 px-2.5 py-1 text-xs font-mono font-semibold text-primary">
                    {opp.opportunityScore.toFixed(1)}
                  </span>
                </td>
                <td className="py-4 px-4 pr-5 text-right">
                  <Sparkline values={sparkValues} width={88} height={32} filled={false} positive={trendUp} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
