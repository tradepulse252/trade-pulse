import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 2): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(decimals)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(decimals)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(decimals)}K`;
  return n.toFixed(decimals);
}

export function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function formatFunding(rate: number): string {
  return `${(rate * 100).toFixed(4)}%`;
}

export function getSignalLabel(type: string): string {
  const labels: Record<string, string> = {
    STRONG_LONG: '🔥 Strong Long',
    WEAK_LONG: '🟢 Weak Long',
    STRONG_SHORT: '🔴 Strong Short',
    NEUTRAL: '— Neutral',
  };
  return labels[type] ?? type;
}

export function getSignalClass(type: string): string {
  const classes: Record<string, string> = {
    STRONG_LONG: 'signal-strong-long',
    WEAK_LONG: 'signal-weak-long',
    STRONG_SHORT: 'signal-strong-short',
    NEUTRAL: 'signal-neutral',
  };
  return classes[type] ?? 'signal-neutral';
}
