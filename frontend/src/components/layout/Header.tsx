'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Shield, Wifi, WifiOff, Star, LogIn, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  connected?: boolean;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/settings', label: 'API', icon: Settings },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export function Header({ connected }: HeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-14 max-w-[1400px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/25 shrink-0">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-foreground tracking-tight">Trade-Pulse</span>
            <span className="hidden md:inline text-xs text-muted-foreground ml-2">
              Real-Time Opportunity Scanner
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'text-foreground bg-secondary/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          <div className="ml-2 pl-2 border-l border-border/60 flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground max-w-[140px] truncate">
                  <User className="h-3 w-3 shrink-0" />
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Sign In</span>
                </Button>
              </Link>
            )}

            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                connected
                  ? 'bg-long/10 text-long border-long/25'
                  : 'bg-short/10 text-short border-short/25'
              )}
            >
              {connected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span className="hidden xs:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden xs:inline">Offline</span>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
