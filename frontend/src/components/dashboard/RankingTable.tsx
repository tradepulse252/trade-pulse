'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Opportunity } from '@/lib/api';
import {
  cn,
  formatFunding,
  formatNumber,
  formatPct,
  formatPrice,
  getSignalClass,
  getSignalLabel,
} from '@/lib/utils';
import { getGrowthForTimeframe, getTimeframeLabel, type TimeframeKey } from '@/lib/sorting';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface RankingTableProps {
  opportunities: Opportunity[];
  loading?: boolean;
  timeframe?: TimeframeKey;
  isFiltered?: boolean;
  totalCount?: number;
}

function ChangeCell({ value }: { value: number }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', value >= 0 ? 'text-long' : 'text-short')}>
      {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatPct(value)}
    </span>
  );
}

export function RankingTable({
  opportunities,
  loading,
  timeframe = '1h',
  isFiltered = false,
  totalCount = 0,
}: RankingTableProps) {
  const tfLabel = getTimeframeLabel(timeframe);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-pulse">Loading opportunities...</div>
      </div>
    );
  }

  if (opportunities.length === 0) {
    const message =
      isFiltered && totalCount > 0
        ? 'No opportunities match your filters'
        : 'Waiting for live market data from Binance…';
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {message}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-3 font-medium">#</th>
            <th className="text-left py-3 px-3 font-medium">Symbol</th>
            <th className="text-right py-3 px-3 font-medium">Price</th>
            <th className="text-right py-3 px-3 font-medium">Open Interest</th>
            <th className="text-right py-3 px-3 font-medium">
              OI Δ <span className="text-primary normal-case">{tfLabel}</span>
            </th>
            <th className="text-right py-3 px-3 font-medium">
              Vol <span className="text-primary normal-case">24hr</span>
            </th>
            <th className="text-right py-3 px-3 font-medium">
              Vol Δ <span className="text-primary normal-case">{tfLabel}</span>
            </th>
            <th className="text-right py-3 px-3 font-medium">Funding</th>
            <th className="text-center py-3 px-3 font-medium">Signal</th>
            <th className="text-right py-3 px-3 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp, idx) => {
            const growth = getGrowthForTimeframe(opp, timeframe);
            return (
              <tr
                key={opp.symbol}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="py-2.5 px-3 data-cell text-muted-foreground">
                  {opp.rank ?? idx + 1}
                </td>
                <td className="py-2.5 px-3">
                  <Link
                    href={`/coin/${opp.symbol}`}
                    className="font-semibold text-foreground hover:text-primary flex items-center gap-1 group"
                  >
                    {opp.symbol.replace('USDT', '')}
                    <span className="text-muted-foreground text-xs">/USDT</span>
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="py-2.5 px-3 text-right data-cell">{formatPrice(opp.price)}</td>
                <td className="py-2.5 px-3 text-right data-cell">${formatNumber(opp.openInterest)}</td>
                <td className="py-2.5 px-3 text-right data-cell">
                  <ChangeCell value={growth.oiChangePct} />
                </td>
                <td className="py-2.5 px-3 text-right data-cell" title="24-hour quote volume">
                  ${formatNumber(opp.volumeUsdt)}
                </td>
                <td className="py-2.5 px-3 text-right data-cell">
                  <ChangeCell value={growth.volumeChangePct} />
                </td>
                <td
                  className={cn(
                    'py-2.5 px-3 text-right data-cell',
                    opp.fundingRate < 0 ? 'text-long' : opp.fundingRate > 0.0003 ? 'text-short' : ''
                  )}
                >
                  {formatFunding(opp.fundingRate)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={cn('text-xs font-medium', getSignalClass(opp.signalType))}>
                    {getSignalLabel(opp.signalType)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <Badge
                    variant={
                      opp.signalType === 'STRONG_LONG' || opp.signalType === 'STRONG_SHORT'
                        ? opp.signalType === 'STRONG_LONG'
                          ? 'long'
                          : 'short'
                        : 'score'
                    }
                  >
                    {opp.opportunityScore.toFixed(1)}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
