import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aggregationService } from '../services/exchanges/aggregation-service';

const router = Router();

const sortSchema = z.enum(['marketCap', 'volume', 'openInterest', 'funding', 'score', 'priceChange']);

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

export default router;
