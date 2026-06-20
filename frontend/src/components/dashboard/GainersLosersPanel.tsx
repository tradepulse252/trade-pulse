'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { GainerLoser } from '@/lib/api';
import { cn, formatNumber, formatPct, formatPrice } from '@/lib/utils';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

interface GainersLosersPanelProps {
  gainers: GainerLoser[];
  losers: GainerLoser[];
  loading?: boolean;
}

function Row({ item, positive }: { item: GainerLoser; positive: boolean }) {
  return (
    <Link
      href={`/coin/${item.symbol}`}
      className="flex items-center justify-between py-2.5 px-1 hover:bg-white/[0.03] rounded-lg transition-colors group"
    >
      <div className="min-w-0">
        <p className="font-medium text-sm text-foreground group-hover:text-primary truncate">{item.baseAsset}</p>
        <p className="text-[10px] text-muted-foreground truncate">{item.exchanges.join(' · ')}</p>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className={cn('text-sm font-semibold tabular-nums', positive ? 'text-long' : 'text-short')}>
          {formatPct(item.priceChange24h)}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">{formatPrice(item.price)}</p>
      </div>
    </Link>
  );
}

export function GainersLosersPanel({ gainers, losers, loading }: GainersLosersPanelProps) {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');

  return (
    <aside className="glass-card p-5 flex flex-col min-h-[420px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Top Movers</h3>
        <Link href="/gainers-losers" className="text-xs text-primary hover:underline flex items-center gap-1">
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('gainers')}
          className={cn('pill-tab flex-1 flex items-center justify-center gap-1.5 text-xs', tab === 'gainers' && 'pill-tab-active')}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Gainers
        </button>
        <button
          type="button"
          onClick={() => setTab('losers')}
          className={cn('pill-tab flex-1 flex items-center justify-center gap-1.5 text-xs', tab === 'losers' && 'pill-tab-active')}
        >
          <TrendingDown className="h-3.5 w-3.5" /> Losers
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Aggregated 24h change · Binance, Bybit, OKX, Hyperliquid
      </p>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
          Loading…
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {(tab === 'gainers' ? gainers : losers).slice(0, 10).map((item) => (
            <Row key={item.symbol} item={item} positive={tab === 'gainers'} />
          ))}
        </div>
      )}
    </aside>
  );
}
