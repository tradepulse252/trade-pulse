'use client';

import { useMemo, useState } from 'react';
import { getCoinLogoUrls } from '@/lib/coinLogoUrls';
import { cn } from '@/lib/utils';

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
  const sources = useMemo(() => getCoinLogoUrls(baseAsset, iconUrl), [baseAsset, iconUrl]);
  const [index, setIndex] = useState(0);

  if (index >= sources.length) {
    return <FallbackAvatar baseAsset={baseAsset} size={size} />;
  }

  return (
    <img
      key={sources[index]}
      src={sources[index]}
      alt={`${baseAsset} logo`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn('rounded-full shrink-0 bg-white/5 object-cover', className)}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
