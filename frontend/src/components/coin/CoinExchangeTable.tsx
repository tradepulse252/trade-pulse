'use client';

import { useState } from 'react';
import type { AggregatedMarket, VenueSnapshot } from '@/lib/api';
import {
  longShortLabel,
  venueOiChangeUsd,
  venueVolChangeUsd,
} from '@/lib/liquidations';
import { cn, formatNumber, formatPct, formatPrice } from '@/lib/utils';

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  hyperliquid: 'Hyperliquid',
};

function ExchangeRow({
  venue,
  rank,
  market,
}: {
  venue: VenueSnapshot;
  rank: number;
  market: AggregatedMarket;
}) {
  const positive = venue.priceChange24h >= 0;
  const volChgUsd = venueVolChangeUsd(market, venue.volumeUsdt);
  const oiChgUsd = venueOiChangeUsd(market, venue.openInterest);
  const volPositive = market.volumeChangePct >= 0;
  const oiPositive = market.oiChangePct >= 0;
  const quote = venue.symbol.replace(venue.baseAsset, '') || 'USDT';

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
      <td className="py-3 px-3 text-muted-foreground tabular-nums text-xs w-10">{rank}</td>
      <td className="py-3 px-3 text-xs font-semibold">
        {EXCHANGE_LABELS[venue.exchange] ?? venue.exchange}
      </td>
      <td className="py-3 px-3 font-mono text-xs text-muted-foreground">
        {venue.baseAsset}/{quote}
      </td>
      <td className="py-3 px-3 text-right font-mono text-xs">{formatPrice(venue.price)}</td>
      <td className={cn('py-3 px-3 text-right font-mono text-xs font-medium', positive ? 'text-long' : 'text-short')}>
        {formatPct(venue.priceChange24h)}
      </td>
      <td className="py-3 px-3 text-right">
        <p className="font-mono text-xs">${formatNumber(venue.volumeUsdt)}</p>
        <p className={cn('font-mono text-[10px]', volPositive ? 'text-long' : 'text-short')}>
          {volPositive ? '+' : '-'}${formatNumber(Math.abs(volChgUsd))} ({formatPct(market.volumeChangePct)})
        </p>
      </td>
      <td className="py-3 px-3 text-right">
        <p className="font-mono text-xs">
          {venue.openInterest > 0 ? `$${formatNumber(venue.openInterest)}` : '—'}
        </p>
        {venue.openInterest > 0 && (
          <p className={cn('font-mono text-[10px]', oiPositive ? 'text-long' : 'text-short')}>
            {oiPositive ? '+' : '-'}${formatNumber(Math.abs(oiChgUsd))} ({formatPct(market.oiChangePct)})
          </p>
        )}
      </td>
      <td className="py-3 px-3 text-right font-mono text-xs text-muted-foreground pr-3">
        {longShortLabel(venue.fundingRate)}
      </td>
    </tr>
  );
}

export function CoinExchangeTable({ market }: { market: AggregatedMarket }) {
  const [mode, setMode] = useState<'futures' | 'spot'>('futures');
  const venues = [...(market.venues ?? [])].sort((a, b) => b.volumeUsdt - a.volumeUsdt);

  if (venues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No exchange venue data for {market.baseAsset}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold">{market.baseAsset} Markets</h2>
        <div className="flex rounded-lg border border-white/[0.08] p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setMode('futures')}
            className={cn(
              'px-2.5 py-1 rounded-md font-medium',
              mode === 'futures' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
            )}
          >
            Futures
          </button>
          <button
            type="button"
            onClick={() => setMode('spot')}
            className={cn(
              'px-2.5 py-1 rounded-md font-medium',
              mode === 'spot' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
            )}
          >
            Spot
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] text-muted-foreground uppercase tracking-wide">
              <th className="text-left py-2.5 px-3 font-medium w-10">#</th>
              <th className="text-left py-2.5 px-3 font-medium">Exchanges</th>
              <th className="text-left py-2.5 px-3 font-medium">Pair</th>
              <th className="text-right py-2.5 px-3 font-medium">Price</th>
              <th className="text-right py-2.5 px-3 font-medium">Price (24h%)</th>
              <th className="text-right py-2.5 px-3 font-medium">Volume (24h)</th>
              <th className="text-right py-2.5 px-3 font-medium">Open Interest</th>
              <th className="text-right py-2.5 px-3 font-medium pr-3">Long/Short</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v, i) => (
              <ExchangeRow key={`${v.exchange}-${v.symbol}`} venue={v} rank={i + 1} market={market} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
