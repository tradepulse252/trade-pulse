import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { CoinChartData } from '../types';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const symbols = await prisma.symbol.findMany({
    where: { isActive: true },
    orderBy: { symbol: 'asc' },
    select: { id: true, symbol: true, baseAsset: true, quoteAsset: true },
  });
  res.json({ data: symbols });
});

router.get('/:symbol', async (req: Request, res: Response) => {
  const symbolName = String(req.params.symbol).toUpperCase();
  const symbol = await prisma.symbol.findUnique({
    where: { symbol: symbolName },
    include: {
      signals: { where: { isActive: true }, take: 1, orderBy: { updatedAt: 'desc' } },
      growthMetrics: { orderBy: { timeframe: 'asc' } },
    },
  });

  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  const signal = symbol.signals[0];
  const growthMatrix: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }> = {};

  for (const gm of symbol.growthMetrics) {
    const tfMap: Record<string, string> = {
      M5: '5m', M15: '15m', M30: '30m', H1: '1h', H2: '2h', H4: '4h', H24: '24h', D7: '7d',
    };
    const key = tfMap[gm.timeframe] ?? gm.timeframe;
    growthMatrix[key] = {
      priceChangePct: Number(gm.priceChangePct),
      oiChangePct: Number(gm.oiChangePct),
      volumeChangePct: Number(gm.volumeChangePct),
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
            opportunityScore: Number(signal.opportunityScore),
            price: Number(signal.price),
            openInterest: Number(signal.openInterest),
            oiChangePct: Number(signal.oiChangePct),
            volumeUsdt: Number(signal.volumeUsdt),
            volumeChangePct: Number(signal.volumeChangePct),
            fundingRate: Number(signal.fundingRate),
            priceMomentum: Number(signal.priceMomentum),
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

  const symbol = await prisma.symbol.findUnique({ where: { symbol: symbolName } });
  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  const [prices, oi, funding, volumes] = await Promise.all([
    prisma.priceSnapshot.findMany({
      where: { symbolId: symbol.id },
      orderBy: { timestamp: 'asc' },
      take: limit,
      select: { price: true, timestamp: true },
    }),
    prisma.openInterestSnapshot.findMany({
      where: { symbolId: symbol.id },
      orderBy: { timestamp: 'asc' },
      take: limit,
      select: { openInterestValue: true, timestamp: true },
    }),
    prisma.fundingRateSnapshot.findMany({
      where: { symbolId: symbol.id },
      orderBy: { timestamp: 'asc' },
      take: limit,
      select: { fundingRate: true, timestamp: true },
    }),
    prisma.volumeSnapshot.findMany({
      where: { symbolId: symbol.id },
      orderBy: { timestamp: 'asc' },
      take: limit,
      select: { volumeUsdt: true, timestamp: true },
    }),
  ]);

  const chartData: CoinChartData = {
    price: prices.map((p) => ({ time: p.timestamp.getTime() / 1000, value: Number(p.price) })),
    openInterest: oi.map((o) => ({ time: o.timestamp.getTime() / 1000, value: Number(o.openInterestValue) })),
    fundingRate: funding.map((f) => ({ time: f.timestamp.getTime() / 1000, value: Number(f.fundingRate) })),
    volume: volumes.map((v) => ({ time: v.timestamp.getTime() / 1000, value: Number(v.volumeUsdt) })),
  };

  res.json({ data: chartData });
});

export default router;
