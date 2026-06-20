'use client';

import Link from 'next/link';
import type { AggregatedMarket } from '@/lib/api';
import { cn, formatFunding, formatNumber, formatPct, formatPrice, getSignalLabel } from '@/lib/utils';
import { Sparkline, getOpportunitySparkline } from '@/components/charts/Sparkline';
import { Loader2 } from 'lucide-react';

import { CoinLogo } from '@/components/ui/CoinLogo';

interface AggregatedMarketsTableProps {
  markets: AggregatedMarket[];
  loading?: boolean;
  search?: string;
}

function PctCell({ value }: { value: number }) {
  return (
    <span className={cn('tabular-nums font-medium', value >= 0 ? 'text-long' : 'text-short')}>
      {formatPct(value)}
    </span>
  );
}

export function AggregatedMarketsTable({ markets, loading, search }: AggregatedMarketsTableProps) {
  const filtered = search
    ? markets.filter(
        (m) =>
          m.baseAsset.includes(search.toUpperCase()) ||
          m.symbol.toUpperCase().includes(search.toUpperCase())
      )
    : markets;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading aggregated market data…</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-muted-foreground">
        <p className="text-sm">No markets match your search</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-muted-foreground text-xs">
            <th className="text-left py-3.5 px-4 font-medium w-12">#</th>
            <th className="text-left py-3.5 px-4 font-medium">Name</th>
            <th className="text-right py-3.5 px-4 font-medium">Market Cap</th>
            <th className="text-right py-3.5 px-4 font-medium">Price</th>
            <th className="text-right py-3.5 px-4 font-medium">24h</th>
            <th className="text-right py-3.5 px-4 font-medium">Agg. Volume</th>
            <th className="text-right py-3.5 px-4 font-medium">Agg. OI</th>
            <th className="text-right py-3.5 px-4 font-medium">Avg Funding</th>
            <th className="text-right py-3.5 px-4 font-medium">Exchanges</th>
            <th className="text-right py-3.5 px-4 font-medium pr-5">Score</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((m, idx) => {
            const sparkValues = getOpportunitySparkline(m.growthMatrix, m.priceChange24h);
            return (
              <tr key={m.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="py-4 px-4 text-muted-foreground tabular-nums">{m.rank ?? idx + 1}</td>
                <td className="py-4 px-4">
                  <Link href={`/coin/${m.symbol}`} className="flex items-center gap-3">
                    <CoinLogo baseAsset={m.baseAsset} iconUrl={m.iconUrl} size={32} />
                    <div>
                      <p className="font-medium text-foreground">{m.baseAsset}</p>
                      <p className="text-xs text-muted-foreground">{getSignalLabel(m.signalType)}</p>
                    </div>
                  </Link>
                </td>
                <td className="py-4 px-4 text-right data-cell text-muted-foreground">
                  {m.marketCap > 0 ? `$${formatNumber(m.marketCap)}` : '—'}
                </td>
                <td className="py-4 px-4 text-right data-cell">{formatPrice(m.price)}</td>
                <td className="py-4 px-4 text-right"><PctCell value={m.priceChange24h} /></td>
                <td className="py-4 px-4 text-right data-cell text-muted-foreground">${formatNumber(m.totalVolumeUsdt)}</td>
                <td className="py-4 px-4 text-right data-cell text-muted-foreground">${formatNumber(m.totalOpenInterest)}</td>
                <td className="py-4 px-4 text-right data-cell">{formatFunding(m.avgFundingRate)}</td>
                <td className="py-4 px-4 text-right">
                  <span className="text-xs text-muted-foreground">{m.venueCount} ({m.exchanges.join(', ')})</span>
                </td>
                <td className="py-4 px-4 pr-5 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex rounded-lg bg-primary/15 border border-primary/25 px-2 py-0.5 text-xs font-mono text-primary">
                      {m.opportunityScore.toFixed(1)}
                    </span>
                    <Sparkline values={sparkValues} width={72} height={24} filled={false} positive={m.priceChange24h >= 0} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
