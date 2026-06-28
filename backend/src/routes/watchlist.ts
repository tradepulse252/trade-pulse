import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const items = await db.watchlist.findByUserId(req.userId!);

  const data = await Promise.all(
    items.map(async (item) => {
      const symbol = await db.symbols.findById(item.symbolId);
      const signal = symbol ? await db.signals.findActiveBySymbolIdOrdered(symbol.id) : null;
      return {
        id: item.id,
        symbol: symbol?.symbol ?? item.symbolId,
        notes: item.notes,
        signal: signal
          ? {
              signalType: signal.signalType,
              opportunityScore: signal.opportunityScore,
              rank: signal.rank,
            }
          : null,
        addedAt: item.createdAt,
      };
    })
  );

  res.json({ data });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({ symbol: z.string(), notes: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const symbol = await db.symbols.findBySymbol(parsed.data.symbol.toUpperCase());
  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  const item = await db.watchlist.upsert(req.userId!, symbol.id, parsed.data.notes);
  res.status(201).json({ data: item });
});

router.delete('/:symbol', async (req: AuthRequest, res: Response) => {
  const symbol = await db.symbols.findBySymbol(String(req.params.symbol).toUpperCase());
  if (!symbol) {
    res.status(404).json({ error: 'Symbol not found' });
    return;
  }

  await db.watchlist.deleteByUserAndSymbol(req.userId!, symbol.id);
  res.json({ success: true });
});

export default router;
