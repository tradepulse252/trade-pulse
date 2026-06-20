import { SignalType } from '@prisma/client';
import { env, TIMEFRAME_TO_PRISMA, TIMEFRAMES } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { cacheSet, publish } from '../../lib/redis';
import { get24hTickers, getExchangeInfo, getPremiumIndex } from '../binance/rest-client';
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
  private starting = false;
  private dbEnabled = false;
  private scoringTimer: NodeJS.Timeout | null = null;
  private oiRefreshTimer: NodeJS.Timeout | null = null;
  private restFallbackTimer: NodeJS.Timeout | null = null;
  private symbolIdMap = new Map<string, string>();
  private symbolMeta = new Map<string, { baseAsset: string }>();

  async start(): Promise<void> {
    if (this.isRunning || this.starting) return;
    this.starting = true;

    this.dbEnabled = await this.checkDatabase();
    console.log(`[ingestion] Mode: ${this.dbEnabled ? 'database + live' : 'live-only (no DB)'}`);
    console.log(`[ingestion] Binance API key: ${env.BINANCE_API_KEY ? 'configured' : 'not set (using public endpoints)'}`);

    // WebSocket is independent of REST — register streams and connect first
    binanceWs.subscribeTicker((ticker) => this.handleTickerUpdate(ticker));
    binanceWs.subscribeMarkPrice((mark) => this.handleMarkPriceUpdate(mark));
    binanceWs.connect();
    this.startRestFallback();

    try {
      await this.syncSymbols();
    } catch (error) {
      console.warn('[ingestion] Symbol sync skipped:', (error as Error).message);
    }

    try {
      await this.initialDataLoad();
    } catch (error) {
      console.warn('[ingestion] Initial REST load skipped:', (error as Error).message);
    }

    try {
      await this.refreshOpenInterest();
    } catch (error) {
      console.warn('[ingestion] OI refresh skipped:', (error as Error).message);
    }

    try {
      await this.runScoringCycle();
    } catch (error) {
      console.warn('[ingestion] Scoring cycle skipped:', (error as Error).message);
    }

    this.scoringTimer = setInterval(() => this.runScoringCycle(), env.SCORING_INTERVAL_MS);
    this.oiRefreshTimer = setInterval(() => this.refreshOpenInterest(), env.OI_REFRESH_INTERVAL_MS);
    this.isRunning = true;
    console.log(`[ingestion] Live — tracking ${this.symbolIdMap.size} symbols from Binance`);
    this.starting = false;
  }

  stop(): void {
    this.isRunning = false;
    if (this.scoringTimer) clearInterval(this.scoringTimer);
    if (this.oiRefreshTimer) clearInterval(this.oiRefreshTimer);
    if (this.restFallbackTimer) clearInterval(this.restFallbackTimer);
    this.scoringTimer = null;
    this.oiRefreshTimer = null;
    this.restFallbackTimer = null;
    binanceWs.disconnect(true);
  }

  private startRestFallback(): void {
    if (this.restFallbackTimer) clearInterval(this.restFallbackTimer);
    this.restFallbackTimer = setInterval(() => {
      if (!binanceWs.isReceiving) {
        void this.pollRestMarketData();
      }
    }, 10_000);
  }

  private async pollRestMarketData(): Promise<void> {
    try {
      const [tickers, markPrices] = await Promise.all([get24hTickers(), getPremiumIndex()]);
      const markMap = new Map(markPrices.map((m) => [m.symbol, m]));

      for (const ticker of tickers) {
        const symbolId = this.symbolIdMap.get(ticker.symbol);
        if (!symbolId) continue;

        this.handleTickerUpdate({
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          quoteVolume: parseFloat(ticker.quoteVolume),
          priceChangePercent: parseFloat(ticker.priceChangePercent),
          eventTime: Date.now(),
        });

        const mark = markMap.get(ticker.symbol);
        if (mark) {
          this.handleMarkPriceUpdate({
            symbol: ticker.symbol,
            markPrice: parseFloat(mark.markPrice),
            fundingRate: parseFloat(mark.lastFundingRate),
            eventTime: Date.now(),
          });
        }
      }

      binanceWs.noteActivity();
    } catch (error) {
      await logError('ingestion', 'REST fallback poll failed', {}, (error as Error).stack);
    }
  }

  /** Reset partial startup state so ingestion can retry cleanly. */
  prepareRestart(): void {
    this.stop();
    this.symbolIdMap.clear();
    this.symbolMeta.clear();
    this.marketData.clear();
    this.liveOpportunities = [];
  }

  isActive(): boolean {
    return this.isRunning;
  }

  /** Ensure ranked opportunities are available (re-score or restart ingestion). */
  async ensureLiveFeed(): Promise<void> {
    if (this.liveOpportunities.length > 0) return;

    if (this.marketData.size > 0) {
      await this.runScoringCycle();
      return;
    }

    if (!this.isRunning && !this.starting) {
      this.prepareRestart();
      await this.start();
    }
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

  /** Fast in-memory scoring without database history lookups. */
  getQuickOpportunities(): OpportunityResult[] {
    const opportunities: OpportunityResult[] = [];

    for (const [symbol, snapshot] of this.marketData) {
      if (snapshot.volumeUsdt < env.MIN_VOLUME_USDT) continue;

      const history = {
        price: memoryStore.getHistory(symbol, 'price'),
        oi: memoryStore.getHistory(symbol, 'oi'),
        volume: memoryStore.getHistory(symbol, 'volume'),
      };

      const growthMatrix = buildGrowthMatrix(
        snapshot.price,
        snapshot.openInterestValue,
        snapshot.volumeUsdt,
        history.price,
        history.oi,
        history.volume,
        [...TIMEFRAMES]
      );

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

      opportunities.push({
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
      });
    }

    return rankOpportunities(opportunities);
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
    const symbols = Array.from(this.symbolIdMap.keys())
      .map((symbol) => ({ symbol, volume: this.marketData.get(symbol)?.volumeUsdt ?? 0 }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 50)
      .map((s) => s.symbol);

    if (symbols.length === 0) return;

    const { getOpenInterestBatch, isBinanceIpBanned } = await import('../binance/rest-client');
    if (isBinanceIpBanned()) {
      console.warn('[ingestion] Skipping OI refresh — Binance IP rate-limited');
      return;
    }

    const oiMap = await getOpenInterestBatch(symbols, {
      batchSize: 5,
      batchDelayMs: 350,
      maxSymbols: 50,
    });

    let refreshed = 0;

    for (const symbol of symbols) {
      const oi = oiMap.get(symbol);
      if (!oi) continue;

      const symbolId = this.symbolIdMap.get(symbol)!;
      const oiBase = parseFloat(oi.openInterest);
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

    console.log(`[ingestion] OI refreshed for ${refreshed}/${symbols.length} top symbols`);
  }

  private ensureSymbol(symbol: string): string {
    let symbolId = this.symbolIdMap.get(symbol);
    if (!symbolId) {
      symbolId = symbol;
      this.symbolIdMap.set(symbol, symbolId);
      this.symbolMeta.set(symbol, { baseAsset: symbol.replace(/USDT$/, '') });
    }
    return symbolId;
  }

  private handleTickerUpdate(ticker: {
    symbol: string;
    price: number;
    quoteVolume: number;
    priceChangePercent: number;
    eventTime: number;
  }): void {
    if (!ticker.symbol.endsWith('USDT')) return;
    const symbolId = this.ensureSymbol(ticker.symbol);

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
    if (!mark.symbol.endsWith('USDT')) return;

    let existing = this.marketData.get(mark.symbol);
    if (!existing) {
      const symbolId = this.ensureSymbol(mark.symbol);
      existing = {
        symbol: mark.symbol,
        symbolId,
        price: mark.markPrice,
        openInterest: 0,
        openInterestValue: 0,
        volumeUsdt: 0,
        fundingRate: mark.fundingRate,
        priceChange24h: 0,
        timestamp: mark.eventTime,
      };
    }

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
