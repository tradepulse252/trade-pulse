'use client';

import { cn, formatPrice } from '@/lib/utils';
import {
  formatPnlPct,
  formatPnlUsd,
  getPnlColorClass,
  type JournalEntry,
  type TradeDirection,
} from '@/lib/journal';

interface PnlCellProps {
  pnlUsd: number;
  pnlPct: number;
  className?: string;
}

export function PnlCell({ pnlUsd, pnlPct, className }: PnlCellProps) {
  const color = getPnlColorClass(pnlUsd);
  return (
    <div className={cn('text-right leading-tight', className)}>
      <p className={cn('text-sm font-mono tabular-nums font-medium', color)}>{formatPnlUsd(pnlUsd)}</p>
      <p className={cn('text-xs font-mono tabular-nums opacity-90', color)}>{formatPnlPct(pnlPct)}</p>
    </div>
  );
}

export function DirectionBadge({ direction }: { direction: TradeDirection }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border',
        direction === 'LONG'
          ? 'border-long/30 bg-long/10 text-long'
          : 'border-short/30 bg-short/10 text-short'
      )}
    >
      {direction === 'LONG' ? 'Long' : 'Short'}
    </span>
  );
}

export function ResultBadge({ result }: { result: JournalEntry['tradeResult'] }) {
  const styles =
    result === 'WIN'
      ? 'border-long/30 bg-long/10 text-long'
      : result === 'LOSS'
        ? 'border-short/30 bg-short/10 text-short'
        : 'border-neutral/30 bg-neutral/10 text-neutral';

  const label = result === 'WIN' ? 'Win' : result === 'LOSS' ? 'Loss' : 'Breakeven';

  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border', styles)}>
      {label}
    </span>
  );
}

export function PriceCell({ value }: { value: number }) {
  return <span className="font-mono tabular-nums text-sm">{formatPrice(value)}</span>;
}
