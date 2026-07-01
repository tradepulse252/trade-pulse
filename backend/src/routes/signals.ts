import { Router, Request, Response } from 'express';
import { SignalType } from '../lib/db/types';
import { normalizeSignalType } from '../services/scoring/opportunity-engine';
import { aggregationService } from '../services/exchanges/aggregation-service';

const router = Router();

function normalizeMarket<T extends { signalType: string }>(m: T): T {
  return { ...m, signalType: normalizeSignalType(m.signalType as SignalType) };
}

function matchesSignalFilter(signalType: string, filter: string): boolean {
  const normalized = normalizeSignalType(signalType as SignalType);
  const normalizedFilter = normalizeSignalType(filter as SignalType);
  return normalized === normalizedFilter;
}

router.get('/', (_req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(_req.query.limit ?? '500'), 10) || 500, 1000);
  const signalType = _req.query.signalType as string | undefined;

  let data = aggregationService.getSignals().map(normalizeMarket);

  if (signalType) {
    data = data.filter((s) => matchesSignalFilter(s.signalType, signalType));
  }

  res.json({
    data: data.slice(0, limit),
    count: data.length,
    lastRefresh: aggregationService.getLastRefresh(),
    source: 'aggregated-formula',
    formula:
      'Long: sideways price, OI↑↑↑, vol slightly up, inflow>outflow (4h-5m), negative funding, low long liq. Short: big move/sideways, OI↑↑↑, vol slightly down, outflow>inflow, highly positive funding, too many shorts.',
  });
});

export default router;
