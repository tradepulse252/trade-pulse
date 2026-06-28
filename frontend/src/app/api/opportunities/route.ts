import { NextRequest, NextResponse } from 'next/server';
import { getMarkets } from '@/lib/server/market-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 500);
  const signalType = req.nextUrl.searchParams.get('signalType') ?? undefined;
  const { markets, lastRefresh } = await getMarkets();

  let data = markets.map((m) => ({
    symbol: m.symbol,
    symbolId: m.symbol,
    signalType: m.signalType,
    opportunityScore: m.opportunityScore,
    price: m.price,
    openInterest: m.totalOpenInterest,
    oiChangePct: m.oiChangePct,
    volumeUsdt: m.totalVolumeUsdt,
    volumeChangePct: m.volumeChangePct,
    fundingRate: m.avgFundingRate,
    priceMomentum: m.priceMomentum,
    rank: m.rank,
    growthMatrix: m.growthMatrix,
  }));

  if (signalType) {
    data = data.filter((d) => d.signalType === signalType);
  }

  data = data.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, limit);

  return NextResponse.json({
    data,
    count: data.length,
    lastRefresh,
    source: 'vercel-fallback',
  });
}
