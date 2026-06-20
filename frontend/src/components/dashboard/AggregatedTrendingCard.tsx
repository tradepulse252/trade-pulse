'use client';

import Link from 'next/link';
import type { AggregatedMarket } from '@/lib/api';
import { formatPct, formatPrice, getSignalLabel } from '@/lib/utils';
import { Sparkline, getOpportunitySparkline } from '@/components/charts/Sparkline';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AggregatedTrendingCard({ market }: { market: AggregatedMarket }) {
  const sparkValues = getOpportunitySparkline(market.growthMatrix, market.priceChange24h);
  const positive = market.priceChange24h >= 0;

  return (
    <Link href={`/coin/${market.symbol}`} className="block group">
      <article className="glass-card-hover p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <p className="font-semibold text-foreground">{market.baseAsset}</p>
            <p className="text-xs text-muted-foreground">{market.venueCount} exchanges · agg. data</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <p className="text-[11px] text-muted-foreground mb-1">{getSignalLabel(market.signalType)}</p>
        <p className="text-xs text-muted-foreground mb-0.5">Aggregated Price</p>
        <p className="text-2xl font-semibold tabular-nums mb-1">{formatPrice(market.price)}</p>
        <p className={cn('text-sm font-medium tabular-nums mb-4', positive ? 'text-primary' : 'text-short')}>
          {formatPct(market.priceChange24h)}
        </p>

        <div className="mt-auto -mx-1 -mb-1">
          <Sparkline values={sparkValues} width={200} height={56} positive={positive} />
        </div>
      </article>
    </Link>
  );
}
