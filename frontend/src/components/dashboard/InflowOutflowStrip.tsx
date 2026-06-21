'use client';

import type { AggregatedMarket } from '@/lib/api';
import {
  AGGREGATED_EXCHANGES,
  FLOW_TIMEFRAMES,
  FLOW_TIMEFRAME_LABELS,
  getFlowMetrics,
  type FlowTimeframe,
} from '@/lib/flow';
import { cn, formatNumber, formatPct } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface InflowOutflowStripProps {
  market: AggregatedMarket;
  timeframes?: readonly FlowTimeframe[];
  activeTimeframe?: FlowTimeframe;
  compact?: boolean;
  showExchangeNote?: boolean;
}

function FlowChip({
  tf,
  market,
  active,
  compact,
}: {
  tf: FlowTimeframe;
  market: AggregatedMarket;
  active?: boolean;
  compact?: boolean;
}) {
  const { netPct, netUsd, direction } = getFlowMetrics(market, tf);
  const isIn = direction === 'inflow';
  const isOut = direction === 'outflow';

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-md py-1 px-0.5 border text-center min-w-0 leading-tight',
        compact ? 'text-[8px]' : 'text-[9px]',
        isIn && 'bg-long/10 border-long/25 text-long',
        isOut && 'bg-short/10 border-short/25 text-short',
        !isIn && !isOut && 'bg-white/[0.03] border-white/[0.06] text-muted-foreground',
        active && 'ring-1 ring-primary/40 border-primary/30'
      )}
      title={`${FLOW_TIMEFRAME_LABELS[tf]} net flow from ${AGGREGATED_EXCHANGES.join(', ')}`}
    >
      <span className="font-semibold opacity-90">{FLOW_TIMEFRAME_LABELS[tf]}</span>
      <span className="flex items-center gap-0 font-semibold mt-0.5">
        {isIn && <ArrowUpRight className={cn(compact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />}
        {isOut && <ArrowDownRight className={cn(compact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />}
        {!isIn && !isOut && <Minus className={cn(compact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />}
        <span>{isIn ? 'In' : isOut ? 'Out' : '—'}</span>
      </span>
      {Math.abs(netUsd) >= 0.01 && (
        <span className="font-mono tabular-nums mt-0.5">
          {netUsd >= 0 ? '+' : '-'}${formatNumber(Math.abs(netUsd))}
        </span>
      )}
      <span className="font-mono tabular-nums opacity-90">({formatPct(netPct)})</span>
    </div>
  );
}

export function InflowOutflowStrip({
  market,
  timeframes = FLOW_TIMEFRAMES,
  activeTimeframe,
  compact,
  showExchangeNote,
}: InflowOutflowStripProps) {
  return (
    <div>
      {showExchangeNote && (
        <p className="text-[9px] text-muted-foreground mb-1 text-right">
          CEX + DEX: {market.exchanges?.join(', ') ?? AGGREGATED_EXCHANGES.join(', ')}
        </p>
      )}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${timeframes.length}, minmax(0, 1fr))` }}
      >
        {timeframes.map((tf) => (
          <FlowChip key={tf} tf={tf} market={market} active={activeTimeframe === tf} compact={compact} />
        ))}
      </div>
    </div>
  );
}

/** Single selected timeframe flow summary */
export function FlowSummaryCell({
  market,
  timeframe,
}: {
  market: AggregatedMarket;
  timeframe: FlowTimeframe;
}) {
  const { netPct, netUsd, direction, oiUsd, volUsd } = getFlowMetrics(market, timeframe);
  const isIn = direction === 'inflow';
  const isOut = direction === 'outflow';

  return (
    <div className="text-right leading-tight">
      <p
        className={cn(
          'text-xs font-semibold flex items-center justify-end gap-1',
          isIn && 'text-long',
          isOut && 'text-short',
          !isIn && !isOut && 'text-muted-foreground'
        )}
      >
        {isIn && <ArrowUpRight className="h-3.5 w-3.5" />}
        {isOut && <ArrowDownRight className="h-3.5 w-3.5" />}
        {!isIn && !isOut && <Minus className="h-3.5 w-3.5" />}
        {isIn ? 'Inflow' : isOut ? 'Outflow' : 'Neutral'}
      </p>
      <p className={cn('text-[11px] font-mono tabular-nums font-medium', isIn ? 'text-long' : isOut ? 'text-short' : '')}>
        {Math.abs(netUsd) >= 0.01 && (
          <span>
            {netUsd >= 0 ? '+' : '-'}${formatNumber(Math.abs(netUsd))}{' '}
          </span>
        )}
        <span className="opacity-90">({formatPct(netPct)})</span>
      </p>
      <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
        OI {oiUsd >= 0 ? '+' : '-'}${formatNumber(Math.abs(oiUsd))} · V {volUsd >= 0 ? '+' : '-'}$
        {formatNumber(Math.abs(volUsd))}
      </p>
    </div>
  );
}
