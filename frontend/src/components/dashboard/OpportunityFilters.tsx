'use client';

import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X } from 'lucide-react';

interface FiltersProps {
  filters: Record<string, string | number>;
  onChange: (filters: Record<string, string | number>) => void;
}

export function OpportunityFilters({ filters, onChange }: FiltersProps) {
  const update = (key: string, value: string) => {
    const next = { ...filters };
    if (value === '') delete next[key];
    else next[key] = value;
    onChange(next);
  };

  const clearAll = () => onChange({});

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Signal Type</label>
            <Select value={String(filters.signalType ?? '')} onChange={(e) => update('signalType', e.target.value)}>
              <option value="">All Signals</option>
              <option value="STRONG_LONG">🔥 Strong Long</option>
              <option value="WEAK_LONG">🟢 Weak Long</option>
              <option value="STRONG_SHORT">🔴 Strong Short</option>
              <option value="NEUTRAL">Neutral</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Min Score</label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              max={100}
              value={filters.minScore ?? ''}
              onChange={(e) => update('minScore', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Min OI (USDT)</label>
            <Input
              type="number"
              placeholder="500000"
              value={filters.minOi ?? ''}
              onChange={(e) => update('minOi', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Min Volume (USDT)</label>
            <Input
              type="number"
              placeholder="1000000"
              value={filters.minVolume ?? ''}
              onChange={(e) => update('minVolume', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Funding Min</label>
            <Input
              type="number"
              step="0.0001"
              placeholder="-0.01"
              value={filters.fundingRateMin ?? ''}
              onChange={(e) => update('fundingRateMin', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Search Symbol</label>
            <Input
              placeholder="BTC or BTCUSDT"
              value={filters.symbols ?? ''}
              onChange={(e) => update('symbols', e.target.value.toUpperCase())}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
