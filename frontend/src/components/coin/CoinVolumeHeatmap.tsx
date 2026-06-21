'use client';

import { useState } from 'react';
import type { VenueSnapshot } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  hyperliquid: 'Hyperliquid',
};

const EXCHANGE_COLORS: Record<string, string> = {
  binance: 'rgba(243, 186, 47, 0.85)',
  bybit: 'rgba(247, 166, 0, 0.8)',
  okx: 'rgba(255, 255, 255, 0.75)',
  hyperliquid: 'rgba(168, 85, 247, 0.8)',
};

interface CoinVolumeHeatmapProps {
  venues: VenueSnapshot[];
  title: string;
}

export function CoinVolumeHeatmap({ venues, title }: CoinVolumeHeatmapProps) {
  const [mode, setMode] = useState<'futures' | 'spot'>('futures');
  const sorted = [...venues].sort((a, b) => b.volumeUsdt - a.volumeUsdt);
  const total = sorted.reduce((s, v) => s + v.volumeUsdt, 0);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex rounded-lg border border-white/[0.08] p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setMode('futures')}
            className={cn(
              'px-2.5 py-1 rounded-md font-medium transition-colors',
              mode === 'futures' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
            )}
          >
            Futures
          </button>
          <button
            type="button"
            onClick={() => setMode('spot')}
            className={cn(
              'px-2.5 py-1 rounded-md font-medium transition-colors',
              mode === 'spot' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
            )}
          >
            Spot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 min-h-[260px] rounded-xl overflow-hidden">
        {sorted.map((v, i) => {
          const share = total > 0 ? v.volumeUsdt / total : 1 / sorted.length;
          const isLeader = i === 0;
          return (
            <div
              key={v.exchange}
              className={cn(
                'flex flex-col justify-between p-4 text-white min-h-[100px] transition-opacity',
                isLeader && 'col-span-2 row-span-1',
                mode === 'spot' && v.marketType === 'dex' && 'opacity-40'
              )}
              style={{
                backgroundColor: EXCHANGE_COLORS[v.exchange] ?? `rgba(239, 68, 68, ${0.35 + share * 0.55})`,
                minHeight: isLeader ? 120 : 100,
              }}
            >
              <span className="font-semibold text-sm drop-shadow-sm">
                {EXCHANGE_LABELS[v.exchange] ?? v.exchange}
              </span>
              <span className="font-mono text-xl font-bold drop-shadow-sm">
                ${formatNumber(v.volumeUsdt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
