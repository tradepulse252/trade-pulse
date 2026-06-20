import { Router, Request, Response } from 'express';
import { aggregationService } from '../services/exchanges/aggregation-service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(_req.query.limit ?? '500'), 10) || 500, 1000);
  const signalType = _req.query.signalType as string | undefined;

  let data = aggregationService.getSignals();

  if (signalType) {
    data = data.filter((s) => s.signalType === signalType);
  }

  res.json({
    data: data.slice(0, limit),
    count: data.length,
    lastRefresh: aggregationService.getLastRefresh(),
    source: 'aggregated-formula',
    formula:
      'High OI + High Volume + Funding: negative=Strong Long, slightly negative=Weak Long, positive=Strong Short, slightly positive=Weak Short. Shows coins with 1–3 conditions met.',
  });
});

export default router;
