'use client';

import Link from 'next/link';
import type { AggregatedMarket } from '@/lib/api';
import { CoinLogo } from '@/components/ui/CoinLogo';
import { OiVolumeTfStrip } from '@/components/dashboard/OiVolumeTfStrip';
import { formatPct, formatPrice } from '@/lib/utils';
import { Sparkline, getOpportunitySparkline } from '@/components/charts/Sparkline';
import { cn } from '@/lib/utils';

export function AggregatedTrendingCard({ market }: { market: AggregatedMarket }) {
  const sparkValues = getOpportunitySparkline(market.growthMatrix, market.priceChange24h);
  const positive = market.priceChange24h >= 0;

  return (
    <Link href={`/coin/${market.symbol}`} className="block group">
      <article className="glass-card-hover p-3 h-full flex flex-col gap-2.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <CoinLogo baseAsset={market.baseAsset} iconUrl={market.iconUrl} size={32} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate leading-tight">{market.baseAsset}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {market.venueCount} exch · score {market.opportunityScore.toFixed(0)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold tabular-nums">{formatPrice(market.price)}</p>
            <p className={cn('text-[10px] font-medium tabular-nums', positive ? 'text-long' : 'text-short')}>
              {formatPct(market.priceChange24h)}
            </p>
          </div>
        </div>

        <Sparkline values={sparkValues} width={160} height={28} positive={positive} className="w-full" />

        <div>
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1.5">
            OI & Volume · 5m → 24h ($ and %)
          </p>
          <OiVolumeTfStrip market={market} mode="both" compact />
        </div>
      </article>
    </Link>
  );
}
