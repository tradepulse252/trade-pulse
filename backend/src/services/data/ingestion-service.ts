import { SignalType } from '@prisma/client';
import { env, TIMEFRAME_TO_PRISMA, TIMEFRAMES } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { cacheSet, publish } from '../../lib/redis';
import { get24hTickers, getExchangeInfo, getOpenInterest, getPremiumIndex } from '../binance/rest-client';
import { binanceWs } from '../binance/ws-client';
import { buildGrowthMatrix } from '../scoring/growth-calculator';
import {
  calculateOpportunityScore,
  classifySignal,
  rankOpportunities,
} from '../scoring/opportunity-engine';
import { alertEngine } from '../alert/alert-engine';
import { broadcastOpportunities } from '../websocket/ws-broadcast';
import { logError } from '../../utils/logger';
import { memoryStore, seedFromTicker } from './in-memory-store';
import type { MarketSnapshot, OpportunityResult } from '../../types';

class IngestionService {
  private marketData = new Map<string, MarketSnapshot>();
  private liveOpportunities: OpportunityResult[] = [];
  private isRunning = false;
  private dbEnabled = false;
  private scoringTimer: NodeJS.Timeout | null = null;
  private oiRefreshTimer: NodeJS.Timeout | null = null;
  private symbolIdMap = new Map<string, string>();
  private symbolMeta = new Map<string, { baseAsset: string }>();

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.dbEnabled = await this.checkDatabase();
    console.log(`[ingestion] Mode: ${this.dbEnabled ? 'database + live' : 'live-only (no DB)'}`);
    console.log(`[ingestion] Binance API key: ${env.BINANCE_API_KEY ? 'configured' : 'not set (using public endpoints)'}`);

    try {
      await this.syncSymbols();
      await this.initialDataLoad();
      await this.refreshOpenInterest();
      await this.runScoringCycle();

      binanceWs.subscribeTicker((ticker) => this.handleTickerUpdate(ticker));
      binanceWs.subscribeMarkPrice((mark) => this.handleMarkPriceUpdate(mark));
      binanceWs.connect();

      this.scoringTimer = setInterval(() => this.runScoringCycle(), env.SCORING_INTERVAL_MS);
      this.oiRefreshTimer = setInterval(() => this.refreshOpenInterest(), env.OI_REFRESH_INTERVAL_MS);
      this.isRunning = true;
      console.log(`[ingestion] Live — tracking ${this.symbolIdMap.size} symbols from Binance`);
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.scoringTimer) clearInterval(this.scoringTimer);
    if (this.oiRefreshTimer) clearInterval(this.oiRefreshTimer);
    binanceWs.disconnect(true);
  }

  getMode(): string {
    return this.dbEnabled ? 'database' : 'live-only';
  }

  getTrackedSymbolCount(): number {
    return this.symbolIdMap.size;
  }

  getLiveOpportunities(): OpportunityResult[] {
    return this.liveOpportunities;
  }

  getMarketData(): MarketSnapshot[] {
    return Array.from(this.marketData.values());
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async syncSymbols(): Promise<void> {
    const [exchangeInfo, tickers] = await Promise.all([getExchangeInfo(), get24hTickers()]);
    const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));

    const activeSymbols = exchangeInfo.symbols.filter(
      (s) => s.status === 'TRADING' && s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT'
    );

    for (const sym of activeSymbols) {
      const ticker = tickerMap.get(sym.symbol);
      const volumeUsdt = ticker ? parseFloat(ticker.quoteVolume) : 0;
      if (volumeUsdt < env.MIN_VOLUME_USDT) continue;

      let symbolId = sym.symbol;

      if (this.dbEnabled) {
        try {
          const lotSizeFilter = sym.filters.find((f) => f.filterType === 'LOT_SIZE');
          const priceFilter = sym.filters.find((f) => f.filterType === 'PRICE_FILTER');
          const record = await prisma.symbol.upsert({
            where: { symbol: sym.symbol },
            update: { isActive: true },
            create: {
              symbol: sym.symbol,
              baseAsset: sym.baseAsset,
              quoteAsset: sym.quoteAsset,
              minQty: lotSizeFilter?.minQty ? parseFloat(lotSizeFilter.minQty) : undefined,
              tickSize: priceFilter?.tickSize ? parseFloat(priceFilter.tickSize) : undefined,
            },
          });
          symbolId = record.id;
        } catch {
          // fall back to symbol name as id
        }
      }

      this.symbolIdMap.set(sym.symbol, symbolId);
      this.symbolMeta.set(sym.symbol, { baseAsset: sym.baseAsset });
    }
  }

  private async initialDataLoad(): Promise<void> {
    const [tickers, markPrices] = await Promise.all([get24hTickers(), getPremiumIndex()]);
    const markMap = new Map(markPrices.map((m) => [m.symbol, m]));

    for (const ticker of tickers) {
      const symbolId = this.symbolIdMap.get(ticker.symbol);
      if (!symbolId) continue;

      const mark = markMap.get(ticker.symbol);
      const price = parseFloat(ticker.lastPrice);
      const volumeUsdt = parseFloat(ticker.quoteVolume);
      const fundingRate = mark ? parseFloat(mark.lastFundingRate) : 0;
      const priceChange24h = parseFloat(ticker.priceChangePercent);

      const snapshot: MarketSnapshot = {
        symbol: ticker.symbol,
        symbolId,
        price,
        openInterest: 0,
        openInterestValue: 0,
        volumeUsdt,
        fundingRate,
        priceChange24h,
        timestamp: Date.now(),
      };

      this.marketData.set(ticker.symbol, snapshot);
      seedFromTicker(ticker.symbol, price, volumeUsdt, priceChange24h);

      if (this.dbEnabled) {
        await this.persistSnapshot(snapshot).catch(() => {});
      }
    }
  }

  private async refreshOpenInterest(): Promise<void> {
    const symbols = Array.from(this.symbolIdMap.keys());
    if (symbols.length === 0) return;

    const batchSize = 10;
    let refreshed = 0;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((s) => getOpenInterest(s)));

      for (let j = 0; j < batch.length; j++) {
        const result = results[j];
        if (result.status !== 'fulfilled') continue;

        const symbol = batch[j];
        const symbolId = this.symbolIdMap.get(symbol)!;
        const oiBase = parseFloat(result.value.openInterest);
        const existing = this.marketData.get(symbol);
        const price = existing?.price ?? 0;
        const oiValue = oiBase * price;

        const updated: MarketSnapshot = {
          symbol,
          symbolId,
          price,
          openInterest: oiBase,
          openInterestValue: oiValue,
          volumeUsdt: existing?.volumeUsdt ?? 0,
          fundingRate: existing?.fundingRate ?? 0,
          priceChange24h: existing?.priceChange24h ?? 0,
          timestamp: Date.now(),
        };

        this.marketData.set(symbol, updated);
        memoryStore.push(symbol, 'oi', oiValue);
        refreshed++;

        if (this.dbEnabled) {
          await prisma.openInterestSnapshot
            .create({
              data: { symbolId, openInterest: oiBase, openInterestValue: oiValue, timestamp: new Date() },
            })
            .catch(() => {});
        }
      }
    }

    console.log(`[ingestion] OI refreshed for ${refreshed}/${symbols.length} symbols`);
  }

  private handleTickerUpdate(ticker: {
    symbol: string;
    price: number;
    quoteVolume: number;
    priceChangePercent: number;
    eventTime: number;
  }): void {
    const symbolId = this.symbolIdMap.get(ticker.symbol);
    if (!symbolId) return;

    const existing = this.marketData.get(ticker.symbol);
    const snapshot: MarketSnapshot = {
      symbol: ticker.symbol,
      symbolId,
      price: ticker.price,
      openInterest: existing?.openInterest ?? 0,
      openInterestValue: existing?.openInterestValue ?? 0,
      volumeUsdt: ticker.quoteVolume,
      fundingRate: existing?.fundingRate ?? 0,
      priceChange24h: ticker.priceChangePercent,
      timestamp: ticker.eventTime,
    };

    this.marketData.set(ticker.symbol, snapshot);
    memoryStore.push(ticker.symbol, 'price', ticker.price, new Date(ticker.eventTime));
    memoryStore.push(ticker.symbol, 'volume', ticker.quoteVolume, new Date(ticker.eventTime));
  }

  private handleMarkPriceUpdate(mark: {
    symbol: string;
    markPrice: number;
    fundingRate: number;
    eventTime: number;
  }): void {
    const existing = this.marketData.get(mark.symbol);
    if (!existing) return;

    existing.fundingRate = mark.fundingRate;
    existing.price = mark.markPrice;
    existing.timestamp = mark.eventTime;
    if (existing.openInterest > 0) {
      existing.openInterestValue = existing.openInterest * mark.markPrice;
    }
    this.marketData.set(mark.symbol, existing);
  }

  private async persistSnapshot(snapshot: MarketSnapshot): Promise<void> {
    const now = new Date();
    await Promise.all([
      prisma.priceSnapshot.create({
        data: { symbolId: snapshot.symbolId, price: snapshot.price, timestamp: now },
      }),
      prisma.volumeSnapshot.create({
        data: { symbolId: snapshot.symbolId, volume: 0, volumeUsdt: snapshot.volumeUsdt, timestamp: now },
      }),
      prisma.fundingRateSnapshot.create({
        data: {
          symbolId: snapshot.symbolId,
          fundingRate: snapshot.fundingRate,
          markPrice: snapshot.price,
          timestamp: now,
        },
      }),
    ]);
  }

  private async getHistory(symbol: string, symbolId: string) {
    if (this.dbEnabled) {
      try {
        const [priceHistory, oiHistory, volumeHistory] = await Promise.all([
          prisma.priceSnapshot.findMany({
            where: { symbolId },
            orderBy: { timestamp: 'desc' },
            take: 500,
            select: { price: true, timestamp: true },
          }),
          prisma.openInterestSnapshot.findMany({
            where: { symbolId },
            orderBy: { timestamp: 'desc' },
            take: 500,
            select: { openInterestValue: true, timestamp: true },
          }),
          prisma.volumeSnapshot.findMany({
            where: { symbolId },
            orderBy: { timestamp: 'desc' },
            take: 500,
            select: { volumeUsdt: true, timestamp: true },
          }),
        ]);

        if (priceHistory.length > 2) {
          return {
            price: priceHistory.map((p) => ({ value: Number(p.price), timestamp: p.timestamp })),
            oi: oiHistory.map((o) => ({ value: Number(o.openInterestValue), timestamp: o.timestamp })),
            volume: volumeHistory.map((v) => ({ value: Number(v.volumeUsdt), timestamp: v.timestamp })),
          };
        }
      } catch {
        // fall through to memory
      }
    }

    return {
      price: memoryStore.getHistory(symbol, 'price'),
      oi: memoryStore.getHistory(symbol, 'oi'),
      volume: memoryStore.getHistory(symbol, 'volume'),
    };
  }

  private async runScoringCycle(): Promise<void> {
    try {
      const opportunities: OpportunityResult[] = [];

      for (const [symbol, snapshot] of this.marketData) {
        if (snapshot.volumeUsdt < env.MIN_VOLUME_USDT) continue;

        const history = await this.getHistory(symbol, snapshot.symbolId);

        const growthMatrix = buildGrowthMatrix(
          snapshot.price,
          snapshot.openInterestValue,
          snapshot.volumeUsdt,
          history.price,
          history.oi,
          history.volume,
          [...TIMEFRAMES]
        );

        // Use 24h ticker change as fallback when no intraday history yet
        const primary = growthMatrix['1h'];
        if (primary && primary.priceChangePct === 0 && snapshot.priceChange24h !== 0) {
          primary.priceChangePct = snapshot.priceChange24h;
        }
        const lookback = primary ?? { priceChangePct: snapshot.priceChange24h, oiChangePct: 0, volumeChangePct: 0 };

        const signalType = classifySignal(
          lookback.oiChangePct,
          lookback.volumeChangePct,
          snapshot.fundingRate,
          lookback.priceChangePct
        );

        const { score, priceMomentum, oiChangePct, volumeChangePct } = calculateOpportunityScore(
          growthMatrix,
          snapshot.fundingRate,
          signalType
        );

        const opportunity: OpportunityResult = {
          symbol,
          symbolId: snapshot.symbolId,
          signalType,
          opportunityScore: score,
          price: snapshot.price,
          openInterest: snapshot.openInterestValue,
          oiChangePct,
          volumeUsdt: snapshot.volumeUsdt,
          volumeChangePct,
          fundingRate: snapshot.fundingRate,
          priceMomentum: priceMomentum || snapshot.priceChange24h,
          growthMatrix,
        };

        opportunities.push(opportunity);

        if (this.dbEnabled) {
          await this.persistSignal(snapshot, opportunity, lookback, growthMatrix).catch(() => {});
        }
      }

      const ranked = rankOpportunities(opportunities);
      this.liveOpportunities = ranked;

      await cacheSet('opportunities:latest', ranked, 30).catch(() => {});
      await publish('opportunities', ranked).catch(() => {});
      broadcastOpportunities(ranked);
    } catch (error) {
      await logError('scoring-engine', 'Scoring cycle failed', {}, (error as Error).stack);
    }
  }

  private async persistSignal(
    snapshot: MarketSnapshot,
    opportunity: OpportunityResult,
    primary: { oiChangePct: number; volumeChangePct: number },
    growthMatrix: OpportunityResult['growthMatrix']
  ): Promise<void> {
    for (const tf of TIMEFRAMES) {
      const metrics = growthMatrix[tf];
      if (!metrics) continue;
      await prisma.growthMetric.upsert({
        where: { symbolId_timeframe: { symbolId: snapshot.symbolId, timeframe: TIMEFRAME_TO_PRISMA[tf] } },
        update: {
          priceChangePct: metrics.priceChangePct,
          oiChangePct: metrics.oiChangePct,
          volumeChangePct: metrics.volumeChangePct,
          calculatedAt: new Date(),
        },
        create: {
          symbolId: snapshot.symbolId,
          timeframe: TIMEFRAME_TO_PRISMA[tf],
          priceChangePct: metrics.priceChangePct,
          oiChangePct: metrics.oiChangePct,
          volumeChangePct: metrics.volumeChangePct,
        },
      });
    }

    const signalData = {
      signalType: opportunity.signalType,
      opportunityScore: opportunity.opportunityScore,
      price: snapshot.price,
      openInterest: snapshot.openInterestValue,
      oiChangePct: opportunity.oiChangePct,
      volumeUsdt: snapshot.volumeUsdt,
      volumeChangePct: opportunity.volumeChangePct,
      fundingRate: snapshot.fundingRate,
      priceMomentum: opportunity.priceMomentum,
      isActive: true,
    };

    const existingSignal = await prisma.signal.findFirst({
      where: { symbolId: snapshot.symbolId, isActive: true },
    });

    if (existingSignal) {
      await prisma.signal.update({ where: { id: existingSignal.id }, data: signalData });
    } else {
      await prisma.signal.create({ data: { symbolId: snapshot.symbolId, ...signalData } });
    }

    await alertEngine.evaluate(snapshot, opportunity, primary);
  }
}

export const ingestionService = new IngestionService();
