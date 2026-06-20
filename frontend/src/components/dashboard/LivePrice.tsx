'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatPrice } from '@/lib/utils';

interface LivePriceProps {
  price: number;
  className?: string;
}

export function LivePrice({ price, className }: LivePriceProps) {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(price);

  useEffect(() => {
    if (prevRef.current !== price) {
      prevRef.current = price;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 350);
      return () => clearTimeout(t);
    }
  }, [price]);

  return (
    <span
      className={cn(
        'tabular-nums transition-colors duration-300',
        flash && 'text-primary',
        className
      )}
    >
      {formatPrice(price)}
    </span>
  );
}
