'use client';

import { TIMEFRAME_OPTIONS, type TimeframeKey } from '@/lib/sorting';
import { cn } from '@/lib/utils';

interface TimeframeSelectorProps {
  value: TimeframeKey;
  onChange: (tf: TimeframeKey) => void;
  className?: string;
  label?: string;
}

export function TimeframeSelector({ value, onChange, className, label = 'Timeframe' }: TimeframeSelectorProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {TIMEFRAME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn('pill-tab text-xs px-2.5 py-1', value === opt.value && 'pill-tab-active')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
