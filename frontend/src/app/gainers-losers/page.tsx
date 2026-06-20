'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { getGainersLosers } from '@/lib/api';
import type { GainerLoser } from '@/lib/api';
import { cn, formatNumber, formatPct, formatPrice } from '@/lib/utils';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';

function FullList({ items, positive, title }: { items: GainerLoser[]; positive: boolean; title: string }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        {positive ? <TrendingUp className="h-5 w-5 text-long" /> : <TrendingDown className="h-5 w-5 text-short" />}
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-white/[0.06]">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Coin</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">24h Change</th>
              <th className="text-right py-2 px-2">Volume</th>
              <th className="text-right py-2 px-2">Market Cap</th>
              <th className="text-right py-2 px-2">Exchanges</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-2 text-muted-foreground">{i + 1}</td>
                <td className="py-3 px-2">
                  <Link href={`/coin/${item.symbol}`} className="font-medium hover:text-primary">{item.baseAsset}</Link>
                </td>
                <td className="py-3 px-2 text-right data-cell">{formatPrice(item.price)}</td>
                <td className={cn('py-3 px-2 text-right font-medium tabular-nums', positive ? 'text-long' : 'text-short')}>
                  {formatPct(item.priceChange24h)}
                </td>
                <td className="py-3 px-2 text-right data-cell text-muted-foreground">${formatNumber(item.totalVolumeUsdt)}</td>
                <td className="py-3 px-2 text-right data-cell text-muted-foreground">
                  {item.marketCap > 0 ? `$${formatNumber(item.marketCap)}` : '—'}
                </td>
                <td className="py-3 px-2 text-right text-xs text-muted-foreground">{item.exchanges.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function GainersLosersPage() {
  const [gainers, setGainers] = useState<GainerLoser[]>([]);
  const [losers, setLosers] = useState<GainerLoser[]>([]);
  const [loading, setLoading] = useState(true);
  const { connected } = useOpportunities();

  useEffect(() => {
    getGainersLosers(50)
      .then(({ gainers: g, losers: l }) => {
        setGainers(g);
        setLosers(l);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell connected={connected}>
      <div className="p-5 lg:p-6 max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Top Gainers & Losers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            24h price movers aggregated across Binance, Bybit, OKX and Hyperliquid
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <FullList items={gainers} positive title="Top Gainers" />
            <FullList items={losers} positive={false} title="Top Losers" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
