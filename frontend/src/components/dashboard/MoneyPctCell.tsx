'use client';

import { cn, formatNumber, formatPct } from '@/lib/utils';

interface MoneyPctCellProps {
  /** Current total in USDT */
  totalUsd?: number;
  /** Change in USDT over the window */
  changeUsd?: number;
  /** Change % over the window */
  changePct: number;
  /** Show total on first line (default true when totalUsd set) */
  showTotal?: boolean;
  className?: string;
}

export function MoneyPctCell({
  totalUsd,
  changeUsd,
  changePct,
  showTotal = true,
  className,
}: MoneyPctCellProps) {
  const positive = changePct >= 0;
  const deltaUsd = changeUsd ?? 0;
  const showDeltaUsd = Math.abs(deltaUsd) >= 0.01;

  return (
    <div className={cn('text-right leading-tight', className)}>
      {showTotal && totalUsd !== undefined && totalUsd > 0 && (
        <p className="text-xs font-mono text-foreground tabular-nums">${formatNumber(totalUsd)}</p>
      )}
      <p className={cn('text-[11px] font-mono tabular-nums font-medium', positive ? 'text-long' : 'text-short')}>
        {showDeltaUsd && (
          <span>
            {deltaUsd >= 0 ? '+' : '-'}${formatNumber(Math.abs(deltaUsd))}{' '}
          </span>
        )}
        <span className="opacity-90">({formatPct(changePct)})</span>
      </p>
    </div>
  );
}
