import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import type { CoinChartData } from '../types';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const symbols = await db.symbols.findManyActive();
  res.json({
    data: symbols.map((s) => ({
      id: s.id,
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
    })),
  });
});

router.get('/:symbol', async (req: Request, res: Response) => {
  const symbolName = String(req.params.symbol).toUpperCase();
  const symbol = await db.symbols.findBySymbol(symbolName);

  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  const [signal, growthMetrics] = await Promise.all([
    db.signals.findActiveBySymbolIdOrdered(symbol.id),
    db.growthMetrics.findBySymbolId(symbol.id),
  ]);

  const growthMatrix: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }> = {};

  for (const gm of growthMetrics) {
    const tfMap: Record<string, string> = {
      M5: '5m', M15: '15m', M30: '30m', H1: '1h', H2: '2h', H4: '4h', H24: '24h', D7: '7d',
    };
    const key = tfMap[gm.timeframe] ?? gm.timeframe;
    growthMatrix[key] = {
      priceChangePct: gm.priceChangePct,
      oiChangePct: gm.oiChangePct,
      volumeChangePct: gm.volumeChangePct,
    };
  }

  res.json({
    data: {
      symbol: symbol.symbol,
      baseAsset: symbol.baseAsset,
      quoteAsset: symbol.quoteAsset,
      signal: signal
        ? {
            signalType: signal.signalType,
            opportunityScore: signal.opportunityScore,
            price: signal.price,
            openInterest: signal.openInterest,
            oiChangePct: signal.oiChangePct,
            volumeUsdt: signal.volumeUsdt,
            volumeChangePct: signal.volumeChangePct,
            fundingRate: signal.fundingRate,
            priceMomentum: signal.priceMomentum,
            rank: signal.rank,
          }
        : null,
      growthMatrix,
    },
  });
});

router.get('/:symbol/charts', async (req: Request, res: Response) => {
  const symbolName = String(req.params.symbol).toUpperCase();
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);

  const symbol = await db.symbols.findBySymbol(symbolName);
  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  const [prices, oi, funding, volumes] = await Promise.all([
    db.snapshots.findPrices(symbol.id, limit, 'asc'),
    db.snapshots.findOpenInterest(symbol.id, limit, 'asc'),
    db.snapshots.findFundingRates(symbol.id, limit, 'asc'),
    db.snapshots.findVolumes(symbol.id, limit, 'asc'),
  ]);

  const chartData: CoinChartData = {
    price: prices.map((p) => ({ time: p.timestamp.getTime() / 1000, value: p.price })),
    openInterest: oi.map((o) => ({ time: o.timestamp.getTime() / 1000, value: o.openInterestValue })),
    fundingRate: funding.map((f) => ({ time: f.timestamp.getTime() / 1000, value: f.fundingRate })),
    volume: volumes.map((v) => ({ time: v.timestamp.getTime() / 1000, value: v.volumeUsdt })),
  };

  res.json({ data: chartData });
});

export default router;
