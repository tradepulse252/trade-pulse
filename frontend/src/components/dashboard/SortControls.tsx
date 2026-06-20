'use client';

import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  SORT_OPTIONS,
  TIMEFRAME_OPTIONS,
  type SortField,
  type SortOrder,
  type TimeframeKey,
} from '@/lib/sorting';

interface SortControlsProps {
  sortBy: SortField;
  sortOrder: SortOrder;
  timeframe: TimeframeKey;
  onSortByChange: (v: SortField) => void;
  onSortOrderChange: (v: SortOrder) => void;
  onTimeframeChange: (v: TimeframeKey) => void;
}

export function SortControls({
  sortBy,
  sortOrder,
  timeframe,
  onSortByChange,
  onSortOrderChange,
  onTimeframeChange,
}: SortControlsProps) {
  const toggleOrder = () => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc');

  return (
    <div className="flex flex-wrap items-end gap-3 px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
      <div className="min-w-[150px]">
        <label className="text-[11px] text-muted-foreground mb-1.5 block">Sort By</label>
        <Select value={sortBy} onChange={(e) => onSortByChange(e.target.value as SortField)} className="dashboard-input h-9">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="text-[11px] text-muted-foreground mb-1.5 block">Order</label>
        <Button variant="outline" size="sm" onClick={toggleOrder} className="h-9 rounded-xl border-white/10 bg-secondary/50 gap-1.5 min-w-[120px]">
          {sortOrder === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
          {sortOrder === 'desc' ? 'High → Low' : 'Low → High'}
        </Button>
      </div>
      <div className="min-w-[120px]">
        <label className="text-[11px] text-muted-foreground mb-1.5 block">Change Period</label>
        <Select value={timeframe} onChange={(e) => onTimeframeChange(e.target.value as TimeframeKey)} className="dashboard-input h-9">
          {TIMEFRAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
