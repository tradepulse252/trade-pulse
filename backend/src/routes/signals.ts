import { Router, Request, Response } from 'express';
import { aggregationService } from '../services/exchanges/aggregation-service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(_req.query.limit ?? '200'), 10) || 200, 500);
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
      'Aggregated OI + Volume + Funding from Binance, Bybit, OKX (CEX) + Hyperliquid (DEX). Signal when OI↑ + Vol↑ with funding/momentum alignment.',
  });
});

export default router;
