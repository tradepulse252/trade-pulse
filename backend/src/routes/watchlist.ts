import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const items = await prisma.watchlistItem.findMany({
    where: { userId: req.userId },
    include: {
      symbol: {
        include: {
          signals: { where: { isActive: true }, take: 1, orderBy: { opportunityScore: 'desc' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    data: items.map((item) => ({
      id: item.id,
      symbol: item.symbol.symbol,
      notes: item.notes,
      signal: item.symbol.signals[0]
        ? {
            signalType: item.symbol.signals[0].signalType,
            opportunityScore: Number(item.symbol.signals[0].opportunityScore),
            rank: item.symbol.signals[0].rank,
          }
        : null,
      addedAt: item.createdAt,
    })),
  });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({ symbol: z.string(), notes: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const symbol = await prisma.symbol.findUnique({
    where: { symbol: parsed.data.symbol.toUpperCase() },
  });
  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  const item = await prisma.watchlistItem.upsert({
    where: { userId_symbolId: { userId: req.userId!, symbolId: symbol.id } },
    update: { notes: parsed.data.notes },
    create: { userId: req.userId!, symbolId: symbol.id, notes: parsed.data.notes },
  });

  res.status(201).json({ data: item });
});

router.delete('/:symbol', async (req: AuthRequest, res: Response) => {
  const symbol = await prisma.symbol.findUnique({
    where: { symbol: String(req.params.symbol).toUpperCase() },
  });
  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  await prisma.watchlistItem.deleteMany({
    where: { userId: req.userId, symbolId: symbol.id },
  });

  res.json({ success: true });
});

export default router;
