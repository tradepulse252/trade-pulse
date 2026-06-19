'use client';

import Link from 'next/link';
import { Activity, BarChart3, Shield, Wifi, WifiOff, Star, LogIn, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  connected?: boolean;
}

export function Header({ connected }: HeaderProps) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-foreground tracking-tight">Trade-Pulse</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Real-Time Opportunity Scanner</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/watchlist"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Watchlist</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">API</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <div className="ml-2 flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  <LogIn className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-long" />
                <span className="text-long">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-short" />
                <span className="text-short">Offline</span>
              </>
            )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
