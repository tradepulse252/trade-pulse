'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dailyPnlForDate,
  formatPnlUsd,
  getPnlColorClass,
  type JournalEntry,
} from '@/lib/journal';

interface TradeCalendarProps {
  entries: JournalEntry[];
  onSelectDate?: (dateKey: string) => void;
  selectedDate?: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function TradeCalendar({ entries, onSelectDate, selectedDate }: TradeCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateKey: string | null }> = [];

    for (let i = 0; i < startOffset; i++) cells.push({ day: null, dateKey: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateKey: toDateKey(viewYear, viewMonth, d) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title text-base">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={prevMonth} className="sidebar-icon-btn h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={nextMonth} className="sidebar-icon-btn h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, idx) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dateKey = cell.dateKey;
          const dayEntries = entries.filter((e) => e.tradeDate === dateKey);
          const pnl = dailyPnlForDate(entries, dateKey);
          const hasTrades = dayEntries.length > 0;
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === today.toISOString().slice(0, 10);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate?.(dateKey)}
              className={cn(
                'aspect-square rounded-xl border p-1 flex flex-col items-center justify-center transition-colors text-left',
                isSelected
                  ? 'border-primary/40 bg-primary/10'
                  : hasTrades
                    ? 'border-white/10 bg-white/[0.03] hover:border-primary/25'
                    : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]',
                isToday && !isSelected && 'ring-1 ring-primary/30'
              )}
            >
              <span className="text-xs font-medium">{cell.day}</span>
              {hasTrades && (
                <>
                  <span className={cn('text-[10px] font-mono tabular-nums mt-0.5', getPnlColorClass(pnl))}>
                    {formatPnlUsd(pnl)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{dayEntries.length} trade{dayEntries.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
