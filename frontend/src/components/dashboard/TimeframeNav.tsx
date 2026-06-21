'use client';

import { FLOW_TIMEFRAMES, FLOW_TIMEFRAME_LABELS, type FlowTimeframe } from '@/lib/flow';
import { cn } from '@/lib/utils';

interface TimeframeNavProps {
  value: FlowTimeframe;
  onChange: (tf: FlowTimeframe) => void;
  timeframes?: readonly FlowTimeframe[];
  className?: string;
}

export function TimeframeNav({
  value,
  onChange,
  timeframes = FLOW_TIMEFRAMES,
  className,
}: TimeframeNavProps) {
  return (
    <div
      className={cn('flex gap-1', className)}
      role="tablist"
      aria-label="Select timeframe"
    >
      {timeframes.map((tf) => (
        <button
          key={tf}
          type="button"
          role="tab"
          aria-selected={value === tf}
          onClick={() => onChange(tf)}
          className={cn(
            'flex-1 min-w-0 rounded-md border px-1.5 py-1.5 text-center text-[9px] font-semibold transition-colors',
            'border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
            value === tf && 'border-primary/35 bg-primary/5 text-primary ring-1 ring-primary/25'
          )}
        >
          {FLOW_TIMEFRAME_LABELS[tf]}
        </button>
      ))}
    </div>
  );
}
