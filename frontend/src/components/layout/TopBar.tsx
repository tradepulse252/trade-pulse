'use client';

import Link from 'next/link';
import { Globe, LogIn, Search, User, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSearch } from '@/contexts/SearchContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopBarProps {
  connected?: boolean;
}

export function TopBar({ connected }: TopBarProps) {
  const { user } = useAuth();
  const { search, setSearch } = useSearch();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-background/80 px-5 backdrop-blur-xl">
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol (BTC, ETH…)"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            className="dashboard-input h-11 pl-10 pr-12 rounded-2xl bg-secondary/50"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 items-center rounded-md border border-white/10 bg-white/5 px-1.5 text-[10px] text-muted-foreground">
            /
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button type="button" className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors">
          <Globe className="h-4 w-4" />
        </button>

        {!user && (
          <Link href="/login">
            <Button variant="outline" size="sm" className="rounded-xl border-white/10 bg-transparent hover:bg-white/[0.05] gap-1.5">
              <LogIn className="h-4 w-4" />
              Log In
            </Button>
          </Link>
        )}

        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/30 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>

        <div
          className={cn(
            'hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border ml-1',
            connected ? 'bg-long/10 text-long border-long/25' : 'bg-short/10 text-short border-short/25'
          )}
        >
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>
    </header>
  );
}
