import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aggregationService } from '../services/exchanges/aggregation-service';
import {
  cgPairToVenue,
  fetchCoinNetflow,
  fetchCoinPairsMarkets,
} from '../services/coinglass/service';
import type { AggregatedMarket, VenueSnapshot } from '../services/exchanges/types';

const router = Router();

const sortSchema = z.enum(['marketCap', 'volume', 'openInterest', 'funding', 'score', 'priceChange']);

function mergeVenues(primary: VenueSnapshot[], extra: VenueSnapshot[]): VenueSnapshot[] {
  const map = new Map<string, VenueSnapshot>();
  for (const v of primary) map.set(`${v.exchange}:${v.baseAsset}`, v);
  for (const v of extra) {
    const key = `${v.exchange}:${v.baseAsset}`;
    if (!map.has(key)) map.set(key, v);
  }
  return [...map.values()];
}

async function enrichWithCoinGlass(market: AggregatedMarket): Promise<AggregatedMarket> {
  const sources = [...(market.dataSources ?? [])];
  const base = market.baseAsset;

  const [flowRaw, pairs] = await Promise.all([
    fetchCoinNetflow(base),
    fetchCoinPairsMarkets(base),
  ]);

  let flowMatrix = market.flowMatrix;
  if (flowRaw && Object.keys(flowRaw).length > 0) {
    flowMatrix = flowRaw;
    if (!sources.includes('coinglass-flow')) sources.push('coinglass-flow');
  }

  let venues = market.venues ?? [];
  if (pairs.length > 0) {
    const cgVenues = pairs.map((p) => cgPairToVenue(p, base));
    venues = mergeVenues(venues, cgVenues);
    if (!sources.includes('coinglass-pairs')) sources.push('coinglass-pairs');
  }

  return {
    ...market,
    venues,
    venueCount: venues.length,
    exchanges: [...new Set(venues.map((v) => String(v.exchange)))] as AggregatedMarket['exchanges'],
    flowMatrix,
    dataSources: sources,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  const sort = sortSchema.safeParse(_req.query.sort).data ?? 'marketCap';
  const limit = Math.min(parseInt(String(_req.query.limit ?? '500'), 10) || 500, 1000);

  let data = aggregationService.getMarkets();

  switch (sort) {
    case 'volume':
      data = [...data].sort((a, b) => b.totalVolumeUsdt - a.totalVolumeUsdt);
      break;
    case 'openInterest':
      data = [...data].sort((a, b) => b.totalOpenInterest - a.totalOpenInterest);
      break;
    case 'funding':
      data = [...data].sort((a, b) => b.avgFundingRate - a.avgFundingRate);
      break;
    case 'score':
      data = [...data].sort((a, b) => b.opportunityScore - a.opportunityScore);
      break;
    case 'priceChange':
      data = [...data].sort((a, b) => b.priceChange24h - a.priceChange24h);
      break;
    default:
      data = [...data].sort((a, b) => b.marketCap - a.marketCap || b.totalVolumeUsdt - a.totalVolumeUsdt);
  }

  res.json({
    data: data.slice(0, limit),
    count: data.length,
    sort,
    exchanges: aggregationService.getExchangeStatus(),
    lastRefresh: aggregationService.getLastRefresh(),
    source: 'aggregated',
  });
});

router.get('/gainers-losers', (_req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(_req.query.limit ?? '20'), 10) || 20, 100);
  res.json({
    gainers: aggregationService.getGainers(limit),
    losers: aggregationService.getLosers(limit),
    lastRefresh: aggregationService.getLastRefresh(),
    source: 'aggregated',
  });
});

router.get('/:symbol', async (req: Request, res: Response) => {
  const raw = String(req.params.symbol).toUpperCase();
  const market = aggregationService.getMarketBySymbol(raw);
  if (!market) {
    res.status(404).json({ error: 'Market not found' });
    return;
  }

  const enriched = await enrichWithCoinGlass(market);

  res.json({
    data: enriched,
    lastRefresh: aggregationService.getLastRefresh(),
    source: 'aggregated-live',
  });
});

export default router;
