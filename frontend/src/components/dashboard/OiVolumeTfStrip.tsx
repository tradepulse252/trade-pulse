'use client';

import type { AggregatedMarket } from '@/lib/api';
import { FLOW_TIMEFRAMES, FLOW_TIMEFRAME_LABELS, type FlowTimeframe } from '@/lib/flow';
import { getTfMetric } from '@/lib/metrics';
import { cn, formatNumber, formatPct } from '@/lib/utils';

const DEFAULT_TFS: FlowTimeframe[] = [...FLOW_TIMEFRAMES];

interface OiVolumeTfStripProps {
  market: Pick<
    AggregatedMarket,
    'growthMatrix' | 'totalOpenInterest' | 'totalVolumeUsdt' | 'oiChangePct' | 'volumeChangePct'
  >;
  /** Show OI row, volume row, or both per timeframe */
  mode?: 'both' | 'oi' | 'volume';
  timeframes?: readonly FlowTimeframe[];
  compact?: boolean;
}

function DeltaLine({
  label,
  usd,
  pct,
  compact,
}: {
  label: string;
  usd: number;
  pct: number;
  compact?: boolean;
}) {
  const positive = pct >= 0;
  const showUsd = Math.abs(usd) >= 0.01 || pct !== 0;

  return (
    <div className={cn('tabular-nums', positive ? 'text-long' : 'text-short', compact ? 'text-[8px]' : 'text-[9px]')}>
      <span className="text-muted-foreground mr-0.5">{label}</span>
      {showUsd && (
        <span className="font-medium">
          {usd >= 0 ? '+' : '-'}${formatNumber(Math.abs(usd))}{' '}
        </span>
      )}
      <span>({formatPct(pct)})</span>
    </div>
  );
}

export function OiVolumeTfStrip({
  market,
  mode = 'both',
  timeframes = DEFAULT_TFS,
  compact,
}: OiVolumeTfStripProps) {
  return (
    <div
      className={cn(
        'grid gap-1',
        compact ? `grid-cols-${timeframes.length}` : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7'
      )}
      style={{ gridTemplateColumns: `repeat(${timeframes.length}, minmax(0, 1fr))` }}
    >
      {timeframes.map((tf) => {
        const m = getTfMetric(
          market.growthMatrix,
          tf,
          market.totalOpenInterest,
          market.totalVolumeUsdt,
          market.oiChangePct,
          market.volumeChangePct
        );

        return (
          <div
            key={tf}
            className={cn(
              'rounded-md border border-white/[0.06] bg-white/[0.02] px-1 py-1 text-center min-w-0',
              compact ? 'py-0.5' : 'py-1'
            )}
            title={`${FLOW_TIMEFRAME_LABELS[tf]} OI / Volume`}
          >
            <div className="text-[9px] font-semibold text-muted-foreground mb-0.5">{FLOW_TIMEFRAME_LABELS[tf]}</div>
            {(mode === 'both' || mode === 'oi') && (
              <DeltaLine label="OI" usd={m.oiChangeUsd} pct={m.oiChangePct} compact={compact} />
            )}
            {(mode === 'both' || mode === 'volume') && (
              <DeltaLine label="V" usd={m.volumeChangeUsd} pct={m.volumeChangePct} compact={compact} />
            )}
          </div>
        );
      })}
    </div>
  );
}
