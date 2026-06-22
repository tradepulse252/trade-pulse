import { NextRequest, NextResponse } from 'next/server';
import { getGainersLosers, getMarkets } from '@/lib/server/market-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20, 100);
  const { markets, lastRefresh } = await getMarkets();
  const { gainers, losers } = getGainersLosers(markets, limit);

  return NextResponse.json({
    gainers,
    losers,
    lastRefresh,
    source: 'vercel-fallback',
  });
}
