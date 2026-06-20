'use client';

import Link from 'next/link';
import type { Opportunity } from '@/lib/api';
import { formatPct, formatPrice, getSignalLabel } from '@/lib/utils';
import { getGrowthForTimeframe, type TimeframeKey } from '@/lib/sorting';
import { Sparkline, getOpportunitySparkline } from '@/components/charts/Sparkline';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendingCardProps {
  opportunity: Opportunity;
  timeframe: TimeframeKey;
}

function SymbolAvatar({ symbol }: { symbol: string }) {
  const base = symbol.replace('USDT', '');
  const initials = base.slice(0, 2).toUpperCase();
  const hue = (base.charCodeAt(0) * 17 + (base.charCodeAt(1) || 0) * 7) % 360;

  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: `hsl(${hue} 55% 45%)` }}
    >
      {initials}
    </div>
  );
}

export function TrendingCard({ opportunity, timeframe }: TrendingCardProps) {
  const growth = getGrowthForTimeframe(opportunity, timeframe);
  const sparkValues = getOpportunitySparkline(opportunity.growthMatrix, opportunity.priceMomentum);
  const positive = growth.priceChangePct >= 0;
  const base = opportunity.symbol.replace('USDT', '');

  return (
    <Link href={`/coin/${opportunity.symbol}`} className="block group">
      <article className="glass-card-hover p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <SymbolAvatar symbol={opportunity.symbol} />
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{base}</p>
              <p className="text-xs text-muted-foreground truncate">[{base}]</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>

        <p className="text-[11px] text-muted-foreground mb-1">{getSignalLabel(opportunity.signalType)}</p>
        <p className="text-xs text-muted-foreground mb-0.5">Token Price</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums mb-1">{formatPrice(opportunity.price)}</p>
        <p className={cn('text-sm font-medium tabular-nums mb-4', positive ? 'text-primary' : 'text-short')}>
          {formatPct(growth.priceChangePct)}
        </p>

        <div className="mt-auto -mx-1 -mb-1">
          <Sparkline values={sparkValues} width={200} height={56} positive={positive} />
        </div>
      </article>
    </Link>
  );
}
