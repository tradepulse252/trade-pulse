import { NextRequest, NextResponse } from 'next/server';
import { getMarkets } from '@/lib/server/market-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const raw = symbol.toUpperCase();
  const withUsdt = raw.endsWith('USDT') ? raw : `${raw}USDT`;
  const { markets, lastRefresh } = await getMarkets();
  const market = markets.find((m) => m.symbol === withUsdt || m.symbol === raw);

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  return NextResponse.json({
    data: market,
    lastRefresh,
    source: 'vercel-fallback',
  });
}
