import { NextRequest, NextResponse } from 'next/server';
import { getMarkets, getSignals } from '@/lib/server/market-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '500', 10) || 500, 1000);
  const signalType = req.nextUrl.searchParams.get('signalType') ?? undefined;
  const { markets, lastRefresh } = await getMarkets();
  let data = getSignals(markets);
  if (signalType) data = data.filter((s) => s.signalType === signalType);

  return NextResponse.json({
    data: data.slice(0, limit),
    count: data.length,
    lastRefresh,
    source: 'vercel-fallback',
  });
}
