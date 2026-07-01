import { NextRequest, NextResponse } from 'next/server';
import { getMarkets, getSignals } from '@/lib/server/market-service';
import { normalizeSignalType } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '500', 10) || 500, 1000);
  const signalType = req.nextUrl.searchParams.get('signalType') ?? undefined;
  const { markets, lastRefresh } = await getMarkets();
  let data = getSignals(markets).map((s) => ({ ...s, signalType: normalizeSignalType(s.signalType) }));
  if (signalType) {
    const filter = normalizeSignalType(signalType);
    data = data.filter((s) => s.signalType === filter);
  }

  return NextResponse.json({
    data: data.slice(0, limit),
    count: data.length,
    lastRefresh,
    source: 'vercel-fallback',
  });
}
