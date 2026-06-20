import { SignalType } from '@prisma/client';
import { env, type TimeframeKey } from '../../config/env';
import { classifySignal, calculateOpportunityScore, rankOpportunities } from '../scoring/opportunity-engine';
import { buildGrowthMatrix } from '../scoring/growth-calculator';
import { fetchBinanceVenues, enrichBinanceOpenInterest } from './binance-adapter';
import { fetchBybitVenues } from './bybit-adapter';
import { fetchOkxVenues } from './okx-adapter';
import { fetchHyperliquidVenues } from './hyperliquid-adapter';
import { fetchCoinMarketMeta, type CoinMarketMeta } from './coingecko-client';
import { coinCapIconUrl } from './coin-icons';
import type { AggregatedMarket, GainerLoser, VenueSnapshot } from './types';

const REFRESH_MS = 120_000;
const MAX_HISTORY_MS = 25 * 60 * 60 * 1000;
const CARD_TIMEFRAMES: TimeframeKey[] = ['5m', '15m', '30m', '1h', '2h', '4h', '24h'];

interface PrevSnapshot {
  totalVolumeUsdt: number;
  totalOpenInterest: number;
  timestamp: number;
}

interface AssetHistory {
  price: Array<{ value: number; timestamp: Date }>;
  oi: Array<{ value: number; timestamp: Date }>;
  volume: Array<{ value: number; timestamp: Date }>;
}

class AggregationService {
  private markets: AggregatedMarket[] = [];
  private gainers: GainerLoser[] = [];
  private losers: GainerLoser[] = [];
  private signals: AggregatedMarket[] = [];
  private previousSnapshots = new Map<string, PrevSnapshot>();
  private assetHistory = new Map<string, AssetHistory>();
  private lastRefresh = 0;
  private refreshing = false;
  private exchangeStatus: Record<string, 'ok' | 'error'> = {};

  start() {
    void this.refresh();
    setInterval(() => void this.refresh(), REFRESH_MS);
  }

  getMarkets(): AggregatedMarket[] {
    return this.markets;
  }

  getSignals(): AggregatedMarket[] {
    return this.signals;
  }

  getGainers(limit = 20): GainerLoser[] {
    return this.gainers.slice(0, limit);
  }

  getLosers(limit = 20): GainerLoser[] {
    return this.losers.slice(0, limit);
  }

  getExchangeStatus() {
    return this.exchangeStatus;
  }

  getLastRefresh() {
    return this.lastRefresh;
  }

  private pctChange(current: number, previous: number): number {
    if (previous <= 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private pushAssetHistory(baseAsset: string, price: number, oi: number, volume: number) {
    const now = new Date();
    const cutoff = now.getTime() - MAX_HISTORY_MS;
    let h = this.assetHistory.get(baseAsset) ?? { price: [], oi: [], volume: [] };

    h.price.push({ value: price, timestamp: now });
    h.oi.push({ value: oi, timestamp: now });
    h.volume.push({ value: volume, timestamp: now });

    h.price = h.price.filter((s) => s.timestamp.getTime() > cutoff);
    h.oi = h.oi.filter((s) => s.timestamp.getTime() > cutoff);
    h.volume = h.volume.filter((s) => s.timestamp.getTime() > cutoff);

    this.assetHistory.set(baseAsset, h);
  }

  private buildAssetGrowthMatrix(
    baseAsset: string,
    price: number,
    totalOi: number,
    totalVolume: number,
    priceChange24h: number,
    oiChangePct: number,
    volumeChangePct: number
  ) {
    const h = this.assetHistory.get(baseAsset);
    if (h && h.price.length >= 2) {
      return buildGrowthMatrix(price, totalOi, totalVolume, h.price, h.oi, h.volume, CARD_TIMEFRAMES);
    }
    // Bootstrap until history accumulates (~few refresh cycles)
    const matrix: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }> = {};
    for (const tf of CARD_TIMEFRAMES) {
      const scale = tf === '24h' ? 1 : tf === '4h' ? 4 / 24 : tf === '2h' ? 2 / 24 : tf === '1h' ? 1 / 24 : 0.5 / 24;
      matrix[tf] = {
        priceChangePct: priceChange24h * scale,
        oiChangePct: oiChangePct * scale,
        volumeChangePct: volumeChangePct * scale,
      };
    }
    return matrix;
  }

  private aggregateVenues(venues: VenueSnapshot[], marketMeta: Map<string, CoinMarketMeta>): AggregatedMarket[] {
    const byBase = new Map<string, VenueSnapshot[]>();

    for (const v of venues) {
      if (v.volumeUsdt < env.MIN_VOLUME_USDT / 4) continue;
      const list = byBase.get(v.baseAsset) ?? [];
      list.push(v);
      byBase.set(v.baseAsset, list);
    }

    const results: AggregatedMarket[] = [];

    for (const [baseAsset, list] of byBase) {
      let totalVolume = 0;
      let totalOi = 0;
      let fundingWeightedSum = 0;
      let priceWeightedSum = 0;
      let changeWeightedSum = 0;
      let weightSum = 0;

      for (const v of list) {
        totalVolume += v.volumeUsdt;
        totalOi += v.openInterest;
        if (v.openInterest > 0) {
          fundingWeightedSum += v.fundingRate * v.openInterest;
        }
        priceWeightedSum += v.price * v.volumeUsdt;
        changeWeightedSum += v.priceChange24h * v.volumeUsdt;
        weightSum += v.volumeUsdt;
      }

      if (totalVolume < env.MIN_VOLUME_USDT) continue;

      const price = weightSum > 0 ? priceWeightedSum / weightSum : list[0].price;
      const priceChange24h = weightSum > 0 ? changeWeightedSum / weightSum : 0;
      const avgFundingRate = totalOi > 0 ? fundingWeightedSum / totalOi : list[0].fundingRate;

      const prev = this.previousSnapshots.get(baseAsset);
      const oiChangePct = prev ? this.pctChange(totalOi, prev.totalOpenInterest) : 0;
      const volumeChangePct = prev ? this.pctChange(totalVolume, prev.totalVolumeUsdt) : 0;

      this.pushAssetHistory(baseAsset, price, totalOi, totalVolume);

      const growthMatrix = this.buildAssetGrowthMatrix(
        baseAsset,
        price,
        totalOi,
        totalVolume,
        priceChange24h,
        oiChangePct,
        volumeChangePct
      );

      const signalType = classifySignal(
        growthMatrix['1h']?.oiChangePct ?? oiChangePct,
        growthMatrix['1h']?.volumeChangePct ?? volumeChangePct,
        avgFundingRate,
        growthMatrix['1h']?.priceChangePct ?? priceChange24h / 24
      );
      const { score, priceMomentum } = calculateOpportunityScore(growthMatrix, avgFundingRate, signalType);

      const meta = marketMeta.get(baseAsset);

      results.push({
        baseAsset,
        symbol: `${baseAsset}USDT`,
        price,
        totalVolumeUsdt: totalVolume,
        totalOpenInterest: totalOi,
        avgFundingRate,
        marketCap: meta?.marketCap ?? 0,
        iconUrl: meta?.imageUrl ?? coinCapIconUrl(baseAsset),
        priceChange24h,
        oiChangePct,
        volumeChangePct,
        priceMomentum,
        signalType,
        opportunityScore: score,
        venueCount: list.length,
        exchanges: [...new Set(list.map((v) => v.exchange))],
        venues: list,
        growthMatrix,
      });

      this.previousSnapshots.set(baseAsset, {
        totalVolumeUsdt: totalVolume,
        totalOpenInterest: totalOi,
        timestamp: Date.now(),
      });
    }

    return rankOpportunities(results);
  }

  private buildGainersLosers(markets: AggregatedMarket[]) {
    const mapped: GainerLoser[] = markets.map((m) => ({
      baseAsset: m.baseAsset,
      symbol: m.symbol,
      price: m.price,
      priceChange24h: m.priceChange24h,
      totalVolumeUsdt: m.totalVolumeUsdt,
      marketCap: m.marketCap,
      exchanges: m.exchanges,
    }));

    this.gainers = [...mapped].sort((a, b) => b.priceChange24h - a.priceChange24h);
    this.losers = [...mapped].sort((a, b) => a.priceChange24h - b.priceChange24h);
  }

  async refresh() {
    if (this.refreshing) return;
    this.refreshing = true;

    try {
      const fetchers: { name: string; fn: () => Promise<VenueSnapshot[]> }[] = [
        { name: 'binance', fn: async () => enrichBinanceOpenInterest(await fetchBinanceVenues()) },
        { name: 'bybit', fn: fetchBybitVenues },
        { name: 'okx', fn: fetchOkxVenues },
        { name: 'hyperliquid', fn: fetchHyperliquidVenues },
      ];

      const allVenues: VenueSnapshot[] = [];

      await Promise.all(
        fetchers.map(async ({ name, fn }) => {
          try {
            const data = await fn();
            allVenues.push(...data);
            this.exchangeStatus[name] = 'ok';
          } catch {
            this.exchangeStatus[name] = 'error';
          }
        })
      );

      const marketMeta = await fetchCoinMarketMeta();
      const aggregated = this.aggregateVenues(allVenues, marketMeta);

      aggregated.sort((a, b) => b.marketCap - a.marketCap || b.totalVolumeUsdt - a.totalVolumeUsdt);

      this.markets = aggregated;
      this.signals = aggregated
        .filter((m) => m.signalType !== SignalType.NEUTRAL)
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .map((m, i) => ({ ...m, rank: i + 1 }));

      this.buildGainersLosers(aggregated);
      this.lastRefresh = Date.now();
    } finally {
      this.refreshing = false;
    }
  }
}

export const aggregationService = new AggregationService();
