import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { TradeDirection, TradeResult } from '../lib/db/types';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateTradeMetrics } from '../services/journal/trade-metrics';

const router = Router();

router.use(authenticate);

const entrySchema = z.object({
  tradeDate: z.string(),
  coin: z.string().min(1),
  direction: z.nativeEnum(TradeDirection),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive(),
  positionSize: z.number().positive(),
  notes: z.string().optional().nullable(),
});

function parseFilters(query: AuthRequest['query']) {
  const from = query.from ? new Date(String(query.from)) : undefined;
  const to = query.to ? new Date(String(query.to)) : undefined;

  return {
    direction: query.direction ? String(query.direction) : undefined,
    coin: query.coin ? String(query.coin) : undefined,
    result: query.result ? String(query.result) : undefined,
    fromDate: from && !Number.isNaN(from.getTime()) ? from : undefined,
    toDate: to && !Number.isNaN(to.getTime()) ? to : undefined,
  };
}

function serializeEntry(entry: {
  id: string;
  tradeDate: Date;
  coin: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  pnlUsd: number;
  pnlPct: number;
  tradeResult: TradeResult;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    tradeDate: entry.tradeDate.toISOString().slice(0, 10),
    coin: entry.coin,
    direction: entry.direction,
    entryPrice: entry.entryPrice,
    exitPrice: entry.exitPrice,
    positionSize: entry.positionSize,
    pnlUsd: entry.pnlUsd,
    pnlPct: entry.pnlPct,
    tradeResult: entry.tradeResult,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function computeStats(entries: { tradeDate: Date; pnlUsd: number }[]) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const sumInRange = (start: Date, end: Date) =>
    entries
      .filter((e) => e.tradeDate >= start && e.tradeDate <= end)
      .reduce((acc, e) => acc + e.pnlUsd, 0);

  const daily = sumInRange(todayStart, todayEnd);
  const weekly = sumInRange(weekStart, todayEnd);
  const monthly = sumInRange(monthStart, todayEnd);
  const yearly = sumInRange(yearStart, todayEnd);

  return {
    daily: Math.round(daily * 100) / 100,
    weekly: Math.round(weekly * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
    yearly: Math.round(yearly * 100) / 100,
    totalTrades: entries.length,
    totalPnl: Math.round(entries.reduce((acc, e) => acc + e.pnlUsd, 0) * 100) / 100,
    winCount: entries.filter((e) => e.pnlUsd > 0).length,
    lossCount: entries.filter((e) => e.pnlUsd < 0).length,
  };
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const filters = parseFilters(req.query);
  const entries = await db.journal.findByUserId(req.userId!, filters);
  res.json({ data: entries.map(serializeEntry) });
});

router.get('/stats', async (req: AuthRequest, res: Response) => {
  const filters = parseFilters(req.query);
  const entries = await db.journal.findByUserId(req.userId!, filters);
  res.json({ data: computeStats(entries) });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const tradeDate = new Date(parsed.data.tradeDate);
  if (Number.isNaN(tradeDate.getTime())) {
    res.status(400).json({ error: 'Invalid trade date' });
    return;
  }

  const metrics = calculateTradeMetrics(
    parsed.data.direction,
    parsed.data.entryPrice,
    parsed.data.exitPrice,
    parsed.data.positionSize
  );

  const entry = await db.journal.create(req.userId!, {
    tradeDate,
    coin: parsed.data.coin.toUpperCase(),
    direction: parsed.data.direction,
    entryPrice: parsed.data.entryPrice,
    exitPrice: parsed.data.exitPrice,
    positionSize: parsed.data.positionSize,
    notes: parsed.data.notes ?? null,
    ...metrics,
  });

  res.status(201).json({ data: serializeEntry(entry) });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const tradeDate = new Date(parsed.data.tradeDate);
  if (Number.isNaN(tradeDate.getTime())) {
    res.status(400).json({ error: 'Invalid trade date' });
    return;
  }

  const metrics = calculateTradeMetrics(
    parsed.data.direction,
    parsed.data.entryPrice,
    parsed.data.exitPrice,
    parsed.data.positionSize
  );

  const entry = await db.journal.update(req.userId!, String(req.params.id), {
    tradeDate,
    coin: parsed.data.coin.toUpperCase(),
    direction: parsed.data.direction,
    entryPrice: parsed.data.entryPrice,
    exitPrice: parsed.data.exitPrice,
    positionSize: parsed.data.positionSize,
    notes: parsed.data.notes ?? null,
    ...metrics,
  });

  if (!entry) {
    res.status(404).json({ error: 'Trade not found' });
    return;
  }

  res.json({ data: serializeEntry(entry) });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const deleted = await db.journal.delete(req.userId!, String(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: 'Trade not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
