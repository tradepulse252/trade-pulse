'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ExchangePicker } from '@/components/journal/ExchangePicker';
import { cn } from '@/lib/utils';
import {
  calculateTradeMetrics,
  formatPnlPct,
  formatPnlUsd,
  getPnlColorClass,
  type TradeFormData,
} from '@/lib/journal';

interface TradeFormProps {
  form: TradeFormData;
  onChange: (form: TradeFormData) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitting?: boolean;
  editing?: boolean;
  /** When true, omits outer card wrapper (used inside modal) */
  embedded?: boolean;
}

export function TradeForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  editing,
  embedded,
}: TradeFormProps) {
  const metrics = useMemo(() => {
    const entry = Number(form.entryPrice);
    const exit = Number(form.exitPrice);
    const size = Number(form.positionSize);
    if (!entry || !exit || !size || entry <= 0 || exit <= 0 || size <= 0) return null;
    return calculateTradeMetrics(form.direction, entry, exit, size);
  }, [form.direction, form.entryPrice, form.exitPrice, form.positionSize]);

  const set = (key: keyof TradeFormData, value: string) => onChange({ ...form, [key]: value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const isValid =
    form.coin.trim() &&
    form.exchange.trim() &&
    form.entryPrice &&
    form.exitPrice &&
    form.positionSize;

  const content = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!embedded && (
        <div className="flex items-center justify-between">
          <h3 className="section-title text-base">{editing ? 'Edit Trade' : 'Add Trade'}</h3>
          {metrics && <PnlPreview metrics={metrics} />}
        </div>
      )}

      {embedded && metrics && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Live PnL preview</span>
          <PnlPreview metrics={metrics} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Trade Date">
          <Input
            type="date"
            className="dashboard-input h-10"
            value={form.tradeDate}
            onChange={(e) => set('tradeDate', e.target.value)}
            required
          />
        </Field>
        <Field label="Coin / Pair">
          <Input
            className="dashboard-input h-10 uppercase"
            placeholder="BTCUSDT"
            value={form.coin}
            onChange={(e) => set('coin', e.target.value.toUpperCase())}
            required
          />
        </Field>
        <Field label="Exchange">
          <ExchangePicker value={form.exchange} onChange={(v) => set('exchange', v)} />
        </Field>
        <Field label="Direction">
          <Select
            className="dashboard-input h-10"
            value={form.direction}
            onChange={(e) => set('direction', e.target.value)}
          >
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </Select>
        </Field>
        <Field label="Entry Price">
          <Input
            type="number"
            step="any"
            min="0"
            className="dashboard-input h-10 font-mono"
            placeholder="105200"
            value={form.entryPrice}
            onChange={(e) => set('entryPrice', e.target.value)}
            required
          />
        </Field>
        <Field label="Exit Price">
          <Input
            type="number"
            step="any"
            min="0"
            className="dashboard-input h-10 font-mono"
            placeholder="106100"
            value={form.exitPrice}
            onChange={(e) => set('exitPrice', e.target.value)}
            required
          />
        </Field>
        <Field label="Position Size ($)" className="sm:col-span-2">
          <Input
            type="number"
            step="any"
            min="0"
            className="dashboard-input h-10 font-mono"
            placeholder="1000"
            value={form.positionSize}
            onChange={(e) => set('positionSize', e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <Input
          className="dashboard-input h-10"
          placeholder="Breakout above resistance, scaled out at target"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Field>

      {metrics && (
        <div className="grid grid-cols-3 gap-3 text-sm border-t border-white/[0.06] pt-4">
          <Preview label="PnL ($)" value={formatPnlUsd(metrics.pnlUsd)} pnl={metrics.pnlUsd} />
          <Preview label="PnL (%)" value={formatPnlPct(metrics.pnlPct)} pnl={metrics.pnlPct} />
          <Preview
            label="Result"
            value={metrics.tradeResult === 'WIN' ? 'Win' : metrics.tradeResult === 'LOSS' ? 'Loss' : 'Breakeven'}
            pnl={metrics.pnlUsd}
          />
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting || !isValid}>
          {submitting ? 'Saving…' : editing ? 'Update Trade' : 'Register Trade'}
        </Button>
      </div>
    </form>
  );

  if (embedded) return content;

  return <div className="glass-card p-5">{content}</div>;
}

function PnlPreview({ metrics }: { metrics: ReturnType<typeof calculateTradeMetrics> }) {
  return (
    <div className="text-right">
      <p className={cn('text-sm font-mono font-semibold tabular-nums', getPnlColorClass(metrics.pnlUsd))}>
        {formatPnlUsd(metrics.pnlUsd)}
      </p>
      <p className={cn('text-xs font-mono tabular-nums', getPnlColorClass(metrics.pnlPct))}>
        {formatPnlPct(metrics.pnlPct)}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Preview({ label, value, pnl }: { label: string; value: string; pnl: number }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('font-mono font-medium tabular-nums text-sm mt-0.5', getPnlColorClass(pnl))}>{value}</p>
    </div>
  );
}
