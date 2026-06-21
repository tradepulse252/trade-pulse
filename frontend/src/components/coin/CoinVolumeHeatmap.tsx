'use client';

import { useMemo, useState } from 'react';
import type { VenueSnapshot } from '@/lib/api';
import { cn, formatNumber, formatPct } from '@/lib/utils';

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  hyperliquid: 'Hyperliquid',
  aster: 'Aster',
};

function heatColor(changePct: number, intensity: number): string {
  const alpha = 0.45 + Math.min(intensity, 0.5);
  if (changePct >= 0) {
    return `rgba(0, 192, 118, ${alpha})`;
  }
  return `rgba(246, 70, 93, ${alpha})`;
}

interface CoinVolumeHeatmapProps {
  venues: VenueSnapshot[];
  title: string;
}

export function CoinVolumeHeatmap({ venues, title }: CoinVolumeHeatmapProps) {
  const [mode, setMode] = useState<'futures' | 'spot'>('futures');

  const filtered = useMemo(() => {
    const list = [...venues];
    if (mode === 'spot') {
      return list.filter((v) => v.marketType === 'cex');
    }
    return list;
  }, [venues, mode]);

  const sorted = [...filtered].sort((a, b) => b.volumeUsdt - a.volumeUsdt);
  const total = sorted.reduce((s, v) => s + v.volumeUsdt, 0);

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground py-6 text-center">No venue data for this mode</p>
      </div>
    );
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
          const positive = v.priceChange24h >= 0;
          return (
            <div
              key={`${v.exchange}-${v.symbol}`}
              className={cn(
                'flex flex-col justify-between p-4 text-white min-h-[100px]',
                isLeader && 'col-span-2'
              )}
              style={{
                backgroundColor: heatColor(v.priceChange24h, share),
                minHeight: isLeader ? 120 : 100,
              }}
            >
              <div>
                <span className="font-semibold text-sm drop-shadow-sm">
                  {EXCHANGE_LABELS[v.exchange] ?? v.exchange}
                </span>
                <span className="ml-1.5 text-[9px] uppercase opacity-80">{v.marketType}</span>
              </div>
              <div>
                <span className="font-mono text-xl font-bold drop-shadow-sm block">
                  ${formatNumber(v.volumeUsdt)}
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px] font-medium',
                    positive ? 'text-white/95' : 'text-white/90'
                  )}
                >
                  {formatPct(v.priceChange24h)} 24h
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
