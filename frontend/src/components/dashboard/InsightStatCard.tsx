'use client';

import { cn } from '@/lib/utils';
import { formatPct } from '@/lib/utils';
import { TrendingUp, Zap, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface InsightStatCardProps {
  label: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  accent: 'long' | 'short' | 'primary';
}

const accentStyles = {
  long: {
    icon: 'bg-long/15 text-long border-long/25',
    value: 'text-long',
    spark: '#00c076',
  },
  short: {
    icon: 'bg-short/15 text-short border-short/25',
    value: 'text-short',
    spark: '#f6465d',
  },
  primary: {
    icon: 'bg-primary/15 text-primary border-primary/25',
    value: 'text-foreground',
    spark: '#A78BFA',
  },
};

export function InsightStatCard({ label, value, change, icon: Icon, accent }: InsightStatCardProps) {
  const styles = accentStyles[accent];

  return (
    <article className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-xl border flex items-center justify-center', styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Futures Scanner</p>
            <p className="font-semibold text-foreground">{label}</p>
          </div>
        </div>
        {change !== undefined && (
          <span className={cn('text-sm font-medium tabular-nums', change >= 0 ? 'text-long' : 'text-short')}>
            {formatPct(change)}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Total Count</p>
        <p className={cn('text-2xl font-bold tabular-nums', styles.value)}>{value}</p>
      </div>

      <div className="h-10 flex items-end">
        <svg width="100%" height="32" viewBox="0 0 120 32" preserveAspectRatio="none" className="opacity-60">
          <path
            d="M0,24 C20,8 40,28 60,16 S100,4 120,12 L120,32 L0,32 Z"
            fill={styles.spark}
            fillOpacity={0.15}
          />
          <path
            d="M0,24 C20,8 40,28 60,16 S100,4 120,12"
            fill="none"
            stroke={styles.spark}
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </article>
  );
}
