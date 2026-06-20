'use client';

import { useState } from 'react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FiltersProps {
  filters: Record<string, string | number>;
  onChange: (filters: Record<string, string | number>) => void;
  alwaysOpen?: boolean;
}

export function OpportunityFilters({ filters, onChange, alwaysOpen }: FiltersProps) {
  const [expanded, setExpanded] = useState(alwaysOpen ?? false);

  const update = (key: string, value: string) => {
    const next = { ...filters };
    if (value === '') delete next[key];
    else next[key] = value;
    onChange(next);
  };

  const clearAll = () => {
    const next: Record<string, string | number> = {};
    if (filters.limit !== undefined) next.limit = filters.limit;
    onChange(next);
  };

  const hasFilters = Object.keys(filters).filter((k) => k !== 'limit').length > 0;
  const activeCount = Object.keys(filters).filter((k) => k !== 'limit').length;

  return (
    <div className="border-t border-white/[0.06] px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
              {activeCount}
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground h-8">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className={cn('grid transition-all duration-200', expanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pb-1">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Signal Type</label>
              <Select value={String(filters.signalType ?? '')} onChange={(e) => update('signalType', e.target.value)} className="dashboard-input">
                <option value="">All Signals</option>
                <option value="STRONG_LONG">Strong Long</option>
                <option value="WEAK_LONG">Weak Long</option>
                <option value="STRONG_SHORT">Strong Short</option>
                <option value="NEUTRAL">Neutral</option>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Min Score</label>
              <Input type="number" placeholder="0" value={filters.minScore ?? ''} onChange={(e) => update('minScore', e.target.value)} className="dashboard-input" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Min OI (USDT)</label>
              <Input type="number" placeholder="500000" value={filters.minOi ?? ''} onChange={(e) => update('minOi', e.target.value)} className="dashboard-input" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Min Volume</label>
              <Input type="number" placeholder="1000000" value={filters.minVolume ?? ''} onChange={(e) => update('minVolume', e.target.value)} className="dashboard-input" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Funding Min</label>
              <Input type="number" step="0.0001" placeholder="-0.01" value={filters.fundingRateMin ?? ''} onChange={(e) => update('fundingRateMin', e.target.value)} className="dashboard-input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
