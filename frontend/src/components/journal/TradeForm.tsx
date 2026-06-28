'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
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
}

export function TradeForm({ form, onChange, onSubmit, onCancel, submitting, editing }: TradeFormProps) {
  const metrics = useMemo(() => {
    const entry = Number(form.entryPrice);
    const exit = Number(form.exitPrice);
    const size = Number(form.positionSize);
    if (!entry || !exit || !size || entry <= 0 || exit <= 0 || size <= 0) return null;
    return calculateTradeMetrics(form.direction, entry, exit, size);
  }, [form.direction, form.entryPrice, form.exitPrice, form.positionSize]);

  const set = (key: keyof TradeFormData, value: string) => onChange({ ...form, [key]: value });

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title text-base">{editing ? 'Edit Trade' : 'Add Trade'}</h3>
        {metrics && (
          <div className="text-right">
            <p className={cn('text-sm font-mono font-semibold tabular-nums', getPnlColorClass(metrics.pnlUsd))}>
              {formatPnlUsd(metrics.pnlUsd)}
            </p>
            <p className={cn('text-xs font-mono tabular-nums', getPnlColorClass(metrics.pnlPct))}>
              {formatPnlPct(metrics.pnlPct)}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Date">
          <Input
            type="date"
            className="dashboard-input h-10"
            value={form.tradeDate}
            onChange={(e) => set('tradeDate', e.target.value)}
          />
        </Field>
        <Field label="Coin">
          <Input
            className="dashboard-input h-10 uppercase"
            placeholder="BTCUSDT"
            value={form.coin}
            onChange={(e) => set('coin', e.target.value.toUpperCase())}
          />
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
            className="dashboard-input h-10 font-mono"
            placeholder="105200"
            value={form.entryPrice}
            onChange={(e) => set('entryPrice', e.target.value)}
          />
        </Field>
        <Field label="Exit Price">
          <Input
            type="number"
            step="any"
            className="dashboard-input h-10 font-mono"
            placeholder="106100"
            value={form.exitPrice}
            onChange={(e) => set('exitPrice', e.target.value)}
          />
        </Field>
        <Field label="Position Size ($)">
          <Input
            type="number"
            step="any"
            className="dashboard-input h-10 font-mono"
            placeholder="1000"
            value={form.positionSize}
            onChange={(e) => set('positionSize', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Notes">
        <Input
          className="dashboard-input h-10"
          placeholder="Breakout above resistance"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Field>

      {metrics && (
        <div className="flex flex-wrap gap-4 text-sm border-t border-white/[0.06] pt-3">
          <Preview label="PnL ($)" value={formatPnlUsd(metrics.pnlUsd)} pnl={metrics.pnlUsd} />
          <Preview label="PnL (%)" value={formatPnlPct(metrics.pnlPct)} pnl={metrics.pnlPct} />
          <Preview
            label="Result"
            value={metrics.tradeResult === 'WIN' ? 'Win' : metrics.tradeResult === 'LOSS' ? 'Loss' : 'Breakeven'}
            pnl={metrics.pnlUsd}
          />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button
          onClick={onSubmit}
          disabled={
            submitting ||
            !form.coin.trim() ||
            !form.entryPrice ||
            !form.exitPrice ||
            !form.positionSize
          }
        >
          {submitting ? 'Saving...' : editing ? 'Update Trade' : 'Add Trade'}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Preview({ label, value, pnl }: { label: string; value: string; pnl: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-mono font-medium tabular-nums', getPnlColorClass(pnl))}>{value}</p>
    </div>
  );
}
