'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getExchangeLabel, searchJournalExchanges } from '@/lib/exchanges';

interface ExchangePickerProps {
  value: string;
  onChange: (exchange: string) => void;
}

export function ExchangePicker({ value, onChange }: ExchangePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchJournalExchanges(query), [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleOpen = () => {
    setQuery('');
    setOpen(true);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            readOnly
            className="dashboard-input h-10 w-full pr-8 cursor-pointer"
            placeholder="Select exchange"
            value={value ? getExchangeLabel(value) : ''}
            onClick={handleOpen}
          />
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-white/[0.08] bg-white/[0.04] text-sm font-medium hover:bg-white/[0.08] transition-colors shrink-0"
          aria-label="Search exchanges"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/[0.1] bg-[#0d1117]/98 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                className="dashboard-input h-9 w-full pl-9 pr-8 text-sm"
                placeholder="Search all exchanges…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground text-center">No exchanges match</li>
            ) : (
              results.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(id)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors flex items-center justify-between',
                      value === id && 'bg-primary/10 text-primary'
                    )}
                  >
                    <span>{getExchangeLabel(id)}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{id}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
