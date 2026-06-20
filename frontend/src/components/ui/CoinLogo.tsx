'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const LOGO_ALIASES: Record<string, string> = {
  '1000sats': 'sats',
  '1000pepe': 'pepe',
  '1000shib': 'shib',
  '1000bonk': 'bonk',
  '1000floki': 'floki',
  '1000lunc': 'lunc',
  '1000xec': 'xec',
  btcdom: 'btc',
};

function normalizeSymbol(baseAsset: string): string {
  let s = baseAsset.toLowerCase().replace(/usdt$/, '');
  if (s.startsWith('1000')) s = s.slice(4);
  return LOGO_ALIASES[s] ?? s;
}

function logoUrl(baseAsset: string): string {
  const symbol = normalizeSymbol(baseAsset);
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${symbol}.png`;
}

function FallbackAvatar({ baseAsset, size }: { baseAsset: string; size: number }) {
  const initials = baseAsset.replace(/USDT$/, '').slice(0, 2).toUpperCase();
  const hue = (baseAsset.charCodeAt(0) * 17 + (baseAsset.charCodeAt(1) || 0) * 7) % 360;
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35, background: `hsl(${hue} 55% 45%)` }}
    >
      {initials}
    </div>
  );
}

interface CoinLogoProps {
  baseAsset: string;
  iconUrl?: string;
  size?: number;
  className?: string;
}

export function CoinLogo({ baseAsset, iconUrl, size = 28, className }: CoinLogoProps) {
  const [stage, setStage] = useState<'primary' | 'cdn' | 'fallback'>(iconUrl ? 'primary' : 'cdn');

  if (stage === 'fallback') {
    return <FallbackAvatar baseAsset={baseAsset} size={size} />;
  }

  const src = stage === 'primary' && iconUrl ? iconUrl : logoUrl(baseAsset);

  return (
    <img
      src={src}
      alt={`${baseAsset} logo`}
      width={size}
      height={size}
      className={cn('rounded-full shrink-0 bg-white/5 object-cover', className)}
      onError={() => {
        if (stage === 'primary') setStage('cdn');
        else setStage('fallback');
      }}
    />
  );
}
