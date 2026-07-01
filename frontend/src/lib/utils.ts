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

export function normalizeSignalType(type: string): string {
  if (type === 'STRONG_LONG') return 'WEAK_LONG';
  if (type === 'STRONG_SHORT') return 'WEAK_SHORT';
  return type;
}

export function getSignalLabel(type: string): string {
  const normalized = normalizeSignalType(type);
  const labels: Record<string, string> = {
    WEAK_LONG: 'Long Opportunity',
    WEAK_SHORT: 'Short Opportunity',
    NEUTRAL: 'Neutral',
  };
  return labels[normalized] ?? normalized;
}

export function getSignalClass(type: string): string {
  const normalized = normalizeSignalType(type);
  const classes: Record<string, string> = {
    WEAK_LONG: 'signal-weak-long',
    WEAK_SHORT: 'signal-weak-short',
    NEUTRAL: 'signal-neutral',
  };
  return classes[normalized] ?? 'signal-neutral';
}

export function getSignalEmoji(type: string): string {
  const normalized = normalizeSignalType(type);
  const emojis: Record<string, string> = {
    WEAK_LONG: '🟢',
    WEAK_SHORT: '🟠',
    NEUTRAL: '—',
  };
  return emojis[normalized] ?? '';
}
