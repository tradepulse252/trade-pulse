import { Router, Request, Response } from 'express';
import { SignalType } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { cacheGet } from '../lib/redis';
import { ingestionService } from '../services/data/ingestion-service';
import type { DashboardFilters, OpportunityResult } from '../types';

const router = Router();

const filterSchema = z.object({
  signalType: z.nativeEnum(SignalType).optional(),
  minOi: z.coerce.number().optional(),
  minVolume: z.coerce.number().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  fundingRateMin: z.coerce.number().optional(),
  fundingRateMax: z.coerce.number().optional(),
  symbols: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
});

router.get('/', async (req: Request, res: Response) => {
  const parsed = filterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { symbols: symbolsParam, ...rest } = parsed.data;
  const filters: DashboardFilters = {
    ...rest,
    symbols: symbolsParam
      ? symbolsParam.split(',').map((s) => s.trim().toUpperCase())
      : undefined,
  };

  // Live in-memory feed (always freshest from Binance)
  void ingestionService.ensureLiveFeed().catch(() => {});

  const live = ingestionService.getLiveOpportunities();
  if (live.length > 0) {
    const filtered = applyFilters(live, filters);
    res.json({ data: filtered, source: 'live', count: filtered.length });
    return;
  }

  const quick = ingestionService.getQuickOpportunities();
  if (quick.length > 0) {
    const filtered = applyFilters(quick, filters);
    res.json({ data: filtered, source: 'live', count: filtered.length });
    return;
  }

  // Try Redis cache
  const cached = await cacheGet<OpportunityResult[]>('opportunities:latest');
  if (cached) {
    const filtered = applyFilters(cached, filters);
    res.json({ data: filtered, source: 'cache', count: filtered.length });
    return;
  }

  // No live Binance feed — return aggregated multi-exchange data (no DB)
  const { aggregationService } = await import('../services/exchanges/aggregation-service');
  const agg: OpportunityResult[] = aggregationService.getMarkets().map((m) => ({
    symbol: m.symbol,
    symbolId: m.symbol,
    signalType: m.signalType as OpportunityResult['signalType'],
    opportunityScore: m.opportunityScore,
    price: m.price,
    openInterest: m.totalOpenInterest,
    oiChangePct: m.oiChangePct,
    volumeUsdt: m.totalVolumeUsdt,
    volumeChangePct: m.volumeChangePct,
    fundingRate: m.avgFundingRate,
    priceMomentum: m.priceMomentum,
    rank: m.rank,
    growthMatrix: m.growthMatrix,
  }));
  if (agg.length > 0) {
    const filtered = applyFilters(agg, filters);
    res.json({ data: filtered, source: 'aggregated-live', count: filtered.length });
    return;
  }

  if (!env.PERSIST_MARKET_DATA) {
    res.json({ data: [], source: 'live', count: 0 });
    return;
  }

  const where: Record<string, unknown> = { isActive: true };
  if (filters.signalType) where.signalType = filters.signalType;
  if (filters.minScore) where.opportunityScore = { gte: filters.minScore };
  if (filters.minOi) where.openInterest = { gte: filters.minOi };
  if (filters.minVolume) where.volumeUsdt = { gte: filters.minVolume };
  if (filters.fundingRateMin !== undefined || filters.fundingRateMax !== undefined) {
    where.fundingRate = {
      ...(filters.fundingRateMin !== undefined && { gte: filters.fundingRateMin }),
      ...(filters.fundingRateMax !== undefined && { lte: filters.fundingRateMax }),
    };
  }

  const signals = await prisma.signal.findMany({
    where,
    include: { symbol: { select: { symbol: true, baseAsset: true } } },
    orderBy: { opportunityScore: 'desc' },
    take: filters.limit ?? 50,
  });

  let results = signals.map((s) => ({
    symbol: s.symbol.symbol,
    symbolId: s.symbolId,
    signalType: s.signalType,
    opportunityScore: Number(s.opportunityScore),
    price: Number(s.price),
    openInterest: Number(s.openInterest),
    oiChangePct: Number(s.oiChangePct),
    volumeUsdt: Number(s.volumeUsdt),
    volumeChangePct: Number(s.volumeChangePct),
    fundingRate: Number(s.fundingRate),
    priceMomentum: Number(s.priceMomentum),
    rank: s.rank ?? undefined,
    growthMatrix: {},
  }));

  if (filters.symbols?.length) {
    results = results.filter((r) => filters.symbols!.includes(r.symbol));
  }

  res.json({ data: results, source: 'database', count: results.length });
});

function applyFilters(data: OpportunityResult[], filters: DashboardFilters): OpportunityResult[] {
  return data
    .filter((item) => {
      if (filters.signalType && item.signalType !== filters.signalType) return false;
      if (filters.minScore && item.opportunityScore < filters.minScore) return false;
      if (filters.minOi && item.openInterest < filters.minOi) return false;
      if (filters.minVolume && item.volumeUsdt < filters.minVolume) return false;
      if (filters.fundingRateMin !== undefined && item.fundingRate < filters.fundingRateMin) return false;
      if (filters.fundingRateMax !== undefined && item.fundingRate > filters.fundingRateMax) return false;
      if (filters.symbols?.length) {
        const terms = filters.symbols.map((t) => t.trim().toUpperCase()).filter(Boolean);
        const matches = terms.some((term) => {
          const withUsdt = term.endsWith('USDT') ? term : `${term}USDT`;
          return (
            item.symbol === term ||
            item.symbol === withUsdt ||
            item.symbol.includes(term) ||
            item.symbol.replace('USDT', '').startsWith(term)
          );
        });
        if (!matches) return false;
      }
      return true;
    })
    .slice(0, filters.limit ?? 50);
}

export default router;
