'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Star,
  Settings,
  Shield,
  LogOut,
  Bell,
  Radio,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { filterNavForUser } from '@/lib/nav';
import { cn } from '@/lib/utils';

const mainNav = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/signals', label: 'Signals', icon: Radio },
  { href: '/gainers-losers', label: 'Movers', icon: TrendingUp },
  { href: '/journal', label: 'Trade Journal', icon: BookOpen },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/settings', label: 'API', icon: Settings },
  { href: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = filterNavForUser(mainNav, user);

  return (
    <aside className="hidden md:flex w-[72px] shrink-0 flex-col items-center border-r border-white/[0.06] bg-background/95 py-5 gap-2">
      <Link href="/" className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/25">
        <Activity className="h-5 w-5 text-primary" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn('sidebar-icon-btn', active && 'sidebar-icon-btn-active')}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1.5 mt-auto">
        <button type="button" title="Alerts" className="sidebar-icon-btn opacity-50 cursor-default">
          <Bell className="h-5 w-5" />
        </button>
        {user && (
          <button type="button" title="Sign out" onClick={logout} className="sidebar-icon-btn">
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
