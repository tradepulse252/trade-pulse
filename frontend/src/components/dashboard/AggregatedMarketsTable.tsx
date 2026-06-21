'use client';

import Link from 'next/link';
import type { AggregatedMarket } from '@/lib/api';
import { cn, formatNumber, formatPct, formatPrice } from '@/lib/utils';
import { matchSymbolSearch } from '@/lib/search';
import { Loader2 } from 'lucide-react';
import { CoinLogo } from '@/components/ui/CoinLogo';
import { LivePrice } from '@/components/dashboard/LivePrice';

interface AggregatedMarketsTableProps {
  markets: AggregatedMarket[];
  loading?: boolean;
  search?: string;
}

function ChangeCell({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-end min-w-[72px] rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
        positive ? 'bg-long/10 text-long' : 'bg-short/10 text-short'
      )}
    >
      {formatPct(value)}
    </span>
  );
}

export function AggregatedMarketsTable({ markets, loading, search }: AggregatedMarketsTableProps) {
  const ranked = [...markets]
    .filter((m) => matchSymbolSearch(search ?? '', m.baseAsset, m.symbol))
    .sort((a, b) => b.marketCap - a.marketCap || b.priceChange24h - a.priceChange24h);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading cryptocurrencies…</p>
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-muted-foreground">
        <p className="text-sm">No coins match your search</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left py-3.5 px-4 font-medium w-14">#</th>
            <th className="text-left py-3.5 px-4 font-medium min-w-[200px]">Name</th>
            <th className="text-right py-3.5 px-4 font-medium">Price</th>
            <th className="text-right py-3.5 px-4 font-medium">24h %</th>
            <th className="text-right py-3.5 px-4 font-medium pr-5">Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((m, idx) => (
            <tr
              key={m.symbol}
              className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
            >
              <td className="py-3.5 px-4 text-muted-foreground tabular-nums text-xs">{idx + 1}</td>
              <td className="py-3.5 px-4">
                <Link href={`/coin/${m.symbol}`} className="flex items-center gap-3 group">
                  <CoinLogo baseAsset={m.baseAsset} iconUrl={m.iconUrl} size={36} />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {m.baseAsset}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.symbol}</p>
                  </div>
                </Link>
              </td>
              <td className="py-3.5 px-4 text-right">
                <LivePrice price={m.price} className="font-medium text-foreground" />
              </td>
              <td className="py-3.5 px-4 text-right">
                <ChangeCell value={m.priceChange24h} />
              </td>
              <td className="py-3.5 px-4 pr-5 text-right font-medium text-foreground tabular-nums">
                {Number(m.marketCap) > 0 ? `$${formatNumber(Number(m.marketCap))}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground px-4 py-3 border-t border-white/[0.04]">
        {ranked.length} cryptocurrencies · sorted by market cap · data from CoinGecko + live exchange prices
      </p>
    </div>
  );
}
