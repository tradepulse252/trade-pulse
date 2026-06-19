'use client';

import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  const needsTimeframe = sortBy === 'oiChange' || sortBy === 'volumeChange';

  const toggleOrder = () => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc');

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Sort By</label>
            <Select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortField)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Order</label>
            <Button variant="outline" size="sm" onClick={toggleOrder} className="h-9 gap-1.5">
              {sortOrder === 'desc' ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
              {sortOrder === 'desc' ? 'High → Low' : 'Low → High'}
            </Button>
          </div>

          <div className="min-w-[120px]">
            <label className="text-xs text-muted-foreground mb-1 block">
              Change Period {needsTimeframe ? '' : '(for Δ columns)'}
            </label>
            <Select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value as TimeframeKey)}
            >
              {TIMEFRAME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>
              Vol = 24h absolute · Δ = change over selected period
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
