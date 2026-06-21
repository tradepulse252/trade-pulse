'use client';

import type { AggregatedMarket, VenueSnapshot } from '@/lib/api';
import { cn, formatFunding, formatNumber, formatPct, formatPrice } from '@/lib/utils';

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  hyperliquid: 'Hyperliquid',
};

function ExchangeRow({ venue }: { venue: VenueSnapshot }) {
  const positive = venue.priceChange24h >= 0;
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
      <td className="py-3 px-4 text-xs font-medium capitalize">
        {EXCHANGE_LABELS[venue.exchange] ?? venue.exchange}
        <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">{venue.marketType}</span>
      </td>
      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{venue.symbol}</td>
      <td className="py-3 px-4 text-right font-mono text-xs">{formatPrice(venue.price)}</td>
      <td className={cn('py-3 px-4 text-right font-mono text-xs', positive ? 'text-long' : 'text-short')}>
        {formatPct(venue.priceChange24h)}
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs">${formatNumber(venue.volumeUsdt)}</td>
      <td className="py-3 px-4 text-right font-mono text-xs">
        {venue.openInterest > 0 ? `$${formatNumber(venue.openInterest)}` : '—'}
      </td>
      <td
        className={cn(
          'py-3 px-4 pr-4 text-right font-mono text-xs',
          venue.fundingRate < 0 ? 'text-long' : venue.fundingRate > 0.0003 ? 'text-short' : 'text-muted-foreground'
        )}
      >
        {formatFunding(venue.fundingRate)}
      </td>
    </tr>
  );
}

export function CoinExchangeTable({ market }: { market: AggregatedMarket }) {
  const venues = market.venues ?? [];

  if (venues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No exchange venue data for {market.baseAsset}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-[11px] text-muted-foreground uppercase tracking-wide">
            <th className="text-left py-3 px-4 font-medium">Exchange</th>
            <th className="text-left py-3 px-4 font-medium">Pair</th>
            <th className="text-right py-3 px-4 font-medium">Price</th>
            <th className="text-right py-3 px-4 font-medium">24h %</th>
            <th className="text-right py-3 px-4 font-medium">Volume (24h)</th>
            <th className="text-right py-3 px-4 font-medium">Open Interest</th>
            <th className="text-right py-3 px-4 font-medium pr-4">Funding</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => (
            <ExchangeRow key={`${v.exchange}-${v.symbol}`} venue={v} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
