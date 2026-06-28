'use client';

import { Input, Select } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { JournalFilters } from '@/lib/journal';

interface JournalFiltersBarProps {
  filters: JournalFilters;
  onChange: (filters: JournalFilters) => void;
}

export function JournalFiltersBar({ filters, onChange }: JournalFiltersBarProps) {
  const set = (key: keyof JournalFilters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <FilterField label="Direction">
        <Select
          className="dashboard-input h-10"
          value={filters.direction ?? ''}
          onChange={(e) => set('direction', e.target.value)}
        >
          <option value="">All</option>
          <option value="LONG">Long</option>
          <option value="SHORT">Short</option>
        </Select>
      </FilterField>

      <FilterField label="Pair">
        <Input
          className="dashboard-input h-10 uppercase"
          placeholder="BTCUSDT"
          value={filters.coin ?? ''}
          onChange={(e) => set('coin', e.target.value.toUpperCase())}
        />
      </FilterField>

      <FilterField label="Result">
        <Select
          className="dashboard-input h-10"
          value={filters.result ?? ''}
          onChange={(e) => set('result', e.target.value)}
        >
          <option value="">All</option>
          <option value="WIN">Win only</option>
          <option value="LOSS">Loss only</option>
          <option value="BREAKEVEN">Breakeven</option>
        </Select>
      </FilterField>

      <FilterField label="From">
        <Input
          type="date"
          className="dashboard-input h-10"
          value={filters.from ?? ''}
          onChange={(e) => set('from', e.target.value)}
        />
      </FilterField>

      <FilterField label="To">
        <Input
          type="date"
          className="dashboard-input h-10"
          value={filters.to ?? ''}
          onChange={(e) => set('to', e.target.value)}
        />
      </FilterField>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: 'table' | 'calendar';
  onChange: (view: 'table' | 'calendar') => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-full bg-secondary/50 border border-white/[0.06] w-fit">
      {(['table', 'calendar'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn('pill-tab capitalize', view === v && 'pill-tab-active')}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
