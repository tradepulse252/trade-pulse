'use client';

import type { AggregatedMarket } from '@/lib/api';
import {
  FLOW_TIMEFRAMES,
  FLOW_TIMEFRAME_LABELS,
  getFlowDirection,
  getNetFlow,
} from '@/lib/flow';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface InflowOutflowStripProps {
  market: AggregatedMarket;
  compact?: boolean;
}

export function InflowOutflowStrip({ market, compact }: InflowOutflowStripProps) {
  return (
    <div className={cn('grid gap-1', compact ? 'grid-cols-7' : 'grid-cols-4 sm:grid-cols-7')}>
      {FLOW_TIMEFRAMES.map((tf) => {
        const net = getNetFlow(market.growthMatrix, tf, market.oiChangePct, market.volumeChangePct);
        const dir = getFlowDirection(net);
        const isIn = dir === 'inflow';
        const isOut = dir === 'outflow';

        return (
          <div
            key={tf}
            className={cn(
              'flex flex-col items-center rounded-md py-1 px-0.5 border text-[9px] leading-tight',
              isIn && 'bg-long/10 border-long/25 text-long',
              isOut && 'bg-short/10 border-short/25 text-short',
              !isIn && !isOut && 'bg-white/[0.03] border-white/[0.06] text-muted-foreground'
            )}
            title={`${FLOW_TIMEFRAME_LABELS[tf]}: OI+Vol net ${net.toFixed(2)}%`}
          >
            <span className="font-medium opacity-80">{FLOW_TIMEFRAME_LABELS[tf]}</span>
            <span className="flex items-center gap-0 font-semibold">
              {isIn && (
                <>
                  <ArrowUpRight className="h-2.5 w-2.5" />
                  <span>In</span>
                </>
              )}
              {isOut && (
                <>
                  <ArrowDownRight className="h-2.5 w-2.5" />
                  <span>Out</span>
                </>
              )}
              {!isIn && !isOut && <Minus className="h-2.5 w-2.5" />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
