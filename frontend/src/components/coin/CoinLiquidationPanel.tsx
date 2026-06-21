'use client';

import type { AggregatedMarket } from '@/lib/api';
import { estimateLiquidations } from '@/lib/liquidations';
import { formatNumber } from '@/lib/utils';

function LiqCell({
  tf,
  total,
  long,
  short,
}: {
  tf: string;
  total: number;
  long: number;
  short: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-xs text-muted-foreground mb-1">
        {tf} Rekt <span className="text-foreground font-semibold">${formatNumber(total)}</span>
      </p>
      <div className="flex justify-between mt-3 gap-4">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Long</p>
          <p className="text-sm font-mono font-semibold text-long">${formatNumber(long)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Short</p>
          <p className="text-sm font-mono font-semibold text-short">${formatNumber(short)}</p>
        </div>
      </div>
    </div>
  );
}

export function CoinLiquidationPanel({ market }: { market: AggregatedMarket }) {
  const rows = estimateLiquidations(market);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">{market.baseAsset} Liquidation</h2>
      <div className="grid grid-cols-2 gap-3">
        {rows.map((r) => (
          <LiqCell key={r.tf} tf={r.tf} total={r.total} long={r.long} short={r.short} />
        ))}
      </div>
    </div>
  );
}
