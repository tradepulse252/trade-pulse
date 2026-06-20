'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Star, Settings, Shield, Radio, TrendingUp } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  connected?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const mobileNav = [
  { href: '/', label: 'Home', icon: BarChart3 },
  { href: '/signals', label: 'Signals', icon: Radio },
  { href: '/gainers-losers', label: 'Movers', icon: TrendingUp },
  { href: '/watchlist', label: 'Watch', icon: Star },
  { href: '/settings', label: 'API', icon: Settings },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export function AppShell({ children, connected, searchValue, onSearchChange }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar connected={connected} searchValue={searchValue} onSearchChange={onSearchChange} />
        <nav className="md:hidden flex border-b border-white/[0.06] bg-background/95 px-2 py-1.5 gap-1 overflow-x-auto">
          {mobileNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                pathname === href ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
