'use client';

import type { AggregatedMarket } from '@/lib/api';
import { FLOW_TIMEFRAMES, getCoinGlassFlowRow, type FlowTimeframe } from '@/lib/flow';
import { cn, formatNumber, formatPct } from '@/lib/utils';

function FlowAmount({ value, variant }: { value: number; variant: 'in' | 'out' }) {
  if (!Number.isFinite(value) || value <= 0) {
    return <span className="font-mono tabular-nums text-xs text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        'font-mono tabular-nums text-xs',
        variant === 'in' ? 'text-long' : 'text-short'
      )}
    >
      ${formatNumber(value)}
    </span>
  );
}

export function CoinGlassFlowTable({ market }: { market: AggregatedMarket }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-[11px] text-muted-foreground uppercase tracking-wide">
            <th className="text-left py-3 px-4 font-medium">Time</th>
            <th className="text-right py-3 px-4 font-medium">Inflow</th>
            <th className="text-right py-3 px-4 font-medium">Outflow</th>
            <th className="text-right py-3 px-4 font-medium">Net Inflow</th>
            <th className="text-right py-3 px-4 font-medium">Net Chg %</th>
            <th className="text-right py-3 px-4 font-medium pr-4">Net Inflow/MCap</th>
          </tr>
        </thead>
        <tbody>
          {FLOW_TIMEFRAMES.map((tf) => {
            const row = getCoinGlassFlowRow(market, tf as FlowTimeframe);
            const netPositive = row.netInflow >= 0;
            return (
              <tr key={tf} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-mono text-muted-foreground text-xs">{tf}</td>
                <td className="py-3 px-4 text-right">
                  <FlowAmount value={row.inflow} variant="in" />
                </td>
                <td className="py-3 px-4 text-right">
                  <FlowAmount value={row.outflow} variant="out" />
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      'font-mono tabular-nums text-xs',
                      netPositive ? 'text-long' : 'text-short'
                    )}
                  >
                    {Math.abs(row.netInflow) <= 0
                      ? '—'
                      : `${netPositive ? '+' : '-'}$${formatNumber(Math.abs(row.netInflow))}`}
                  </span>
                </td>
                <td
                  className={cn(
                    'py-3 px-4 text-right font-mono tabular-nums text-xs',
                    row.netChgPct >= 0 ? 'text-long' : 'text-short'
                  )}
                >
                  {formatPct(row.netChgPct)}
                </td>
                <td className="py-3 px-4 pr-4 text-right font-mono tabular-nums text-xs text-muted-foreground">
                  {Math.abs(row.netInflowMcap) >= 0.0001 ? formatPct(row.netInflowMcap) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
