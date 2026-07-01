import { fetchAllVenues, fetchMarketCaps } from './fetch-venues';
import { buildGrowthMatrix, evaluateSignal, opportunityScore } from './scoring';
import { normalizeSignalType } from '@/lib/utils';
import type { AggregatedMarket, GainerLoser } from './types';

const CACHE_MS = 90_000;
let cache: { markets: AggregatedMarket[]; lastRefresh: number } | null = null;
let refreshing = false;

function aggregate(venues: Awaited<ReturnType<typeof fetchAllVenues>>, caps: Map<string, { marketCap: number; imageUrl: string }>): AggregatedMarket[] {
  const byBase = new Map<string, typeof venues>();
  for (const v of venues) {
    if (v.price <= 0) continue;
    const list = byBase.get(v.baseAsset) ?? [];
    list.push(v);
    byBase.set(v.baseAsset, list);
  }

  const results: AggregatedMarket[] = [];
  for (const [baseAsset, list] of byBase) {
    let totalVolume = 0;
    let totalOi = 0;
    let fundingWeightedSum = 0;
    let priceWeightedSum = 0;
    let changeWeightedSum = 0;
    let weightSum = 0;

    for (const v of list) {
      totalVolume += v.volumeUsdt;
      totalOi += v.openInterest;
      if (v.openInterest > 0) fundingWeightedSum += v.fundingRate * v.openInterest;
      priceWeightedSum += v.price * v.volumeUsdt;
      changeWeightedSum += v.priceChange24h * v.volumeUsdt;
      weightSum += v.volumeUsdt;
    }
    if (totalVolume <= 0) continue;

    const price = weightSum > 0 ? priceWeightedSum / weightSum : list[0].price;
    const priceChange24h = weightSum > 0 ? changeWeightedSum / weightSum : 0;
    const avgFundingRate = totalOi > 0 ? fundingWeightedSum / totalOi : list[0].fundingRate;
    const growthMatrix = buildGrowthMatrix(priceChange24h);
    const { signalType, matchCount } = evaluateSignal(0, 0, avgFundingRate);
    const score = opportunityScore(priceChange24h, avgFundingRate, signalType, matchCount);
    const meta = caps.get(baseAsset.toUpperCase());

    results.push({
      baseAsset,
      symbol: `${baseAsset}USDT`,
      price,
      totalVolumeUsdt: totalVolume,
      totalOpenInterest: totalOi,
      avgFundingRate,
      marketCap: meta?.marketCap ?? 0,
      iconUrl: meta?.imageUrl,
      priceChange24h,
      oiChangePct: 0,
      volumeChangePct: 0,
      priceMomentum: priceChange24h,
      signalType: normalizeSignalType(signalType),
      opportunityScore: score,
      venueCount: list.length,
      exchanges: [...new Set(list.map((v) => v.exchange))],
      venues: list,
      growthMatrix,
      dataSources: ['vercel-fallback'],
    });
  }

  return results.sort((a, b) => b.marketCap - a.marketCap || b.totalVolumeUsdt - a.totalVolumeUsdt);
}

export async function getMarkets(): Promise<{ markets: AggregatedMarket[]; lastRefresh: number }> {
  const now = Date.now();
  if (cache && now - cache.lastRefresh < CACHE_MS) {
    return cache;
  }
  if (refreshing && cache) return cache;

  refreshing = true;
  try {
    const [venues, caps] = await Promise.all([fetchAllVenues(), fetchMarketCaps()]);
    const markets = aggregate(venues, caps);
    cache = { markets, lastRefresh: now };
    return cache;
  } finally {
    refreshing = false;
  }
}

export function getSignals(markets: AggregatedMarket[]): AggregatedMarket[] {
  return markets
    .filter((m) => m.signalType !== 'NEUTRAL')
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .map((m, i) => ({ ...m, rank: i + 1 }));
}

export function getGainersLosers(markets: AggregatedMarket[], limit: number): { gainers: GainerLoser[]; losers: GainerLoser[] } {
  const mapped: GainerLoser[] = markets.map((m) => ({
    baseAsset: m.baseAsset,
    symbol: m.symbol,
    price: m.price,
    priceChange24h: m.priceChange24h,
    totalVolumeUsdt: m.totalVolumeUsdt,
    marketCap: m.marketCap,
    exchanges: m.exchanges,
  }));
  return {
    gainers: [...mapped].sort((a, b) => b.priceChange24h - a.priceChange24h).slice(0, limit),
    losers: [...mapped].sort((a, b) => a.priceChange24h - b.priceChange24h).slice(0, limit),
  };
}

export type MarketSort = 'marketCap' | 'volume' | 'openInterest' | 'funding' | 'score' | 'priceChange';

export function sortMarkets(markets: AggregatedMarket[], sort: MarketSort): AggregatedMarket[] {
  const sorted = [...markets];
  switch (sort) {
    case 'volume':
      return sorted.sort((a, b) => b.totalVolumeUsdt - a.totalVolumeUsdt);
    case 'openInterest':
      return sorted.sort((a, b) => b.totalOpenInterest - a.totalOpenInterest);
    case 'funding':
      return sorted.sort((a, b) => b.avgFundingRate - a.avgFundingRate);
    case 'score':
      return sorted.sort((a, b) => b.opportunityScore - a.opportunityScore);
    case 'priceChange':
      return sorted.sort((a, b) => b.priceChange24h - a.priceChange24h);
    default:
      return sorted.sort((a, b) => b.marketCap - a.marketCap || b.totalVolumeUsdt - a.totalVolumeUsdt);
  }
}
