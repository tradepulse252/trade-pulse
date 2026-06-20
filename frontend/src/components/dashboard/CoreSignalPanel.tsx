'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw } from 'lucide-react';

interface CoreSignalPanelProps {
  onRefresh?: () => void;
}

export function CoreSignalPanel({ onRefresh }: CoreSignalPanelProps) {
  return (
    <aside className="nebula-panel glass-card p-6 flex flex-col justify-between min-h-[320px] lg:min-h-0">
      <div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 mb-5">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground leading-snug mb-3">
          Elevating Your Entire Futures Journey
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground/90 font-medium">Core Signal:</span> Increasing Open Interest +
          Increasing Volume = New Capital Entering Market. Trade-Pulse scans Binance Futures in real time.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 mt-8">
        <Link href="/settings">
          <Button className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-medium">
            Configure API Keys
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={onRefresh}
          className="w-full rounded-xl border-white/15 bg-white/[0.03] hover:bg-white/[0.06] h-11 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Live Data
        </Button>
      </div>
    </aside>
  );
}
