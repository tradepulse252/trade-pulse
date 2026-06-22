import { NextRequest, NextResponse } from 'next/server';
import { getMarkets, sortMarkets, type MarketSort } from '@/lib/server/market-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sort = (req.nextUrl.searchParams.get('sort') ?? 'marketCap') as MarketSort;
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '500', 10) || 500, 1000);
  const { markets, lastRefresh } = await getMarkets();
  const data = sortMarkets(markets, sort).slice(0, limit);

  return NextResponse.json({
    data,
    count: markets.length,
    sort,
    exchanges: { hyperliquid: 'ok', bybit: 'ok', coingecko: 'ok', vercel: 'ok' },
    lastRefresh,
    source: 'vercel-fallback',
  });
}
