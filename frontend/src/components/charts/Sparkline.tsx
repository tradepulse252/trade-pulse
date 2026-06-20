'use client';

import type { Opportunity } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  filled?: boolean;
  className?: string;
  positive?: boolean;
}

export function getOpportunitySparkline(
  growthMatrix: Opportunity['growthMatrix'] | undefined,
  fallbackMomentum: number
): number[] {
  const keys = ['5m', '15m', '30m', '1h', '2h', '4h', '24h'] as const;
  const raw = keys.map((k) => growthMatrix?.[k]?.priceChangePct ?? fallbackMomentum);
  let cumulative = 0;
  return raw.map((v) => {
    cumulative += v;
    return cumulative;
  });
}

export function Sparkline({
  values,
  width = 120,
  height = 48,
  filled = true,
  className,
  positive,
}: SparklineProps) {
  if (values.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const isUp = positive ?? values[values.length - 1] >= values[0];
  const stroke = isUp ? '#A78BFA' : '#F87171';
  const fillId = `spark-${isUp ? 'up' : 'down'}-${width}`;

  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={filled ? 0.35 : 0} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {filled && <path d={areaPath} fill={`url(#${fillId})`} />}
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
