import { SignalType } from '@prisma/client';
import { env, type TimeframeKey } from '../../config/env';
import { classifySignal, calculateOpportunityScore, rankOpportunities, evaluateSignal } from '../scoring/opportunity-engine';
import { buildGrowthMatrix } from '../scoring/growth-calculator';
import { fetchBinanceVenues, enrichBinanceOpenInterest } from './binance-adapter';
import { fetchBybitVenues } from './bybit-adapter';
import { fetchOkxVenues } from './okx-adapter';
import { fetchHyperliquidVenues } from './hyperliquid-adapter';
import { fetchAsterVenues } from './aster-adapter';
import { fetchMexcVenues } from './mexc-adapter';
import { fetchKrakenVenues } from './kraken-adapter';
import { fetchCoinbaseVenues } from './coinbase-adapter';
import { fetchCoinGeckoDerivativeVenues } from './coingecko-derivatives-adapter';
import {
  buildGrowthMatrixFromCoinMarket,
  fetchAllCoinsMarkets,
} from '../coinglass/service';
import { isBinanceIpBanned } from '../binance/rest-client';
import { fetchCoinMarketMeta, lookupMarketMeta, type CoinMarketMeta } from './market-meta';
import { coinCapIconUrl } from './coin-icons';
import { broadcastMarkets } from '../websocket/ws-broadcast';
import type { AggregatedMarket, GainerLoser, VenueSnapshot, ExchangeId } from './types';

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
  private exchangeStatus: Record<string, 'ok' | 'error' | 'rate-limited' | 'aggregator'> = {};

  start() {
    void this.refresh();
    setInterval(() => void this.refresh(), env.AGGREGATION_REFRESH_MS);
  }

  getMarkets(): AggregatedMarket[] {
    return this.markets;
  }

  getMarketBySymbol(symbol: string): AggregatedMarket | undefined {
    const upper = symbol.toUpperCase();
    const withUsdt = upper.endsWith('USDT') ? upper : `${upper}USDT`;
    return (
      this.markets.find((m) => m.symbol === withUsdt || m.symbol === upper) ??
      this.signals.find((m) => m.symbol === withUsdt || m.symbol === upper)
    );
  }

  /** Merge live Binance ticker prices between aggregation refreshes */
  patchLivePrice(baseAsset: string, price: number, priceChange24h?: number): void {
    if (!price || price <= 0) return;
    const idx = this.markets.findIndex((m) => m.baseAsset === baseAsset);
    if (idx < 0) return;
    const m = this.markets[idx];
    this.markets[idx] = {
      ...m,
      price,
      priceChange24h: priceChange24h ?? m.priceChange24h,
    };
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
    volumeChangePct: number,
    cgGrowth?: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }>
  ) {
    if (cgGrowth && Object.keys(cgGrowth).length > 0) {
      return cgGrowth;
    }

    const h = this.assetHistory.get(baseAsset);
    let matrix: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }>;

    if (h && h.price.length >= 2) {
      matrix = buildGrowthMatrix(price, totalOi, totalVolume, h.price, h.oi, h.volume, CARD_TIMEFRAMES);
      const g24 = matrix['24h'];
      if (g24 && g24.oiChangePct === 0 && g24.volumeChangePct === 0 && (oiChangePct !== 0 || volumeChangePct !== 0)) {
        matrix['24h'] = {
          priceChangePct: priceChange24h,
          oiChangePct,
          volumeChangePct,
        };
      }
      return matrix;
    }

    matrix = {};
    for (const tf of CARD_TIMEFRAMES) {
      const scale =
        tf === '24h' ? 1 : tf === '4h' ? 4 / 24 : tf === '2h' ? 2 / 24 : tf === '1h' ? 1 / 24 : 0.5 / 24;
      matrix[tf] = {
        priceChangePct: priceChange24h * scale,
        oiChangePct: oiChangePct * scale,
        volumeChangePct: volumeChangePct * scale,
      };
    }
    return matrix;
  }

  private cgCoinsCache: Map<string, ReturnType<typeof buildGrowthMatrixFromCoinMarket>> = new Map();
  private lastCgFetch = 0;

  private async refreshCoinGlassBulk() {
    if (!env.COINGLASS_API_KEY) return;
    const now = Date.now();
    if (now - this.lastCgFetch < 120_000 && this.cgCoinsCache.size > 0) return;

    const coins = await fetchAllCoinsMarkets(3);
    if (coins.size === 0) return;

    for (const [sym, coin] of coins) {
      this.cgCoinsCache.set(sym, buildGrowthMatrixFromCoinMarket(coin));
    }
    this.lastCgFetch = now;
    this.exchangeStatus.coinglass = 'ok';
  }

  private aggregateVenues(
    venues: VenueSnapshot[],
    marketMeta: Map<string, CoinMarketMeta>
  ): AggregatedMarket[] {
    const byBase = new Map<string, VenueSnapshot[]>();

    for (const v of venues) {
      if (v.price <= 0) continue;
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

      if (totalVolume <= 0 && list.every((v) => v.volumeUsdt <= 0)) continue;

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
        volumeChangePct,
        this.cgCoinsCache.get(baseAsset)
      );

      const dataSources: string[] = ['aggregated'];
      if (this.cgCoinsCache.has(baseAsset)) dataSources.push('coinglass');

      const { signalType, conditions } = evaluateSignal(
        growthMatrix['1h']?.oiChangePct ?? oiChangePct,
        growthMatrix['1h']?.volumeChangePct ?? volumeChangePct,
        avgFundingRate
      );
      const { score, priceMomentum } = calculateOpportunityScore(
        growthMatrix,
        avgFundingRate,
        signalType,
        conditions.matchCount
      );

      const meta = lookupMarketMeta(baseAsset, marketMeta);

      results.push({
        baseAsset,
        symbol: `${baseAsset}USDT`,
        price,
        totalVolumeUsdt: totalVolume,
        totalOpenInterest: totalOi,
        avgFundingRate,
        marketCap: Number(meta?.marketCap) || 0,
        iconUrl: meta?.imageUrl || coinCapIconUrl(baseAsset),
        priceChange24h,
        oiChangePct,
        volumeChangePct,
        priceMomentum,
        signalType,
        opportunityScore: score,
        signalConditions: conditions,
        venueCount: list.length,
        exchanges: [...new Set(list.map((v) => v.exchange))],
        venues: list,
        growthMatrix,
        dataSources,
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

  private venueKey(v: VenueSnapshot) {
    return `${v.exchange}:${v.baseAsset}`;
  }

  private mergeVenueLists(primary: VenueSnapshot[], supplemental: VenueSnapshot[]) {
    const map = new Map<string, VenueSnapshot>();
    for (const v of primary) map.set(this.venueKey(v), v);
    for (const v of supplemental) {
      const key = this.venueKey(v);
      if (!map.has(key)) map.set(key, v);
    }
    return [...map.values()];
  }

  private lastBinanceSource: 'direct' | 'aggregator' | 'rate-limited' = 'direct';

  private async fetchBinanceVenuesWithFallback(): Promise<VenueSnapshot[]> {
    if (isBinanceIpBanned()) {
      this.lastBinanceSource = 'rate-limited';
      return fetchCoinGeckoDerivativeVenues(['binance']);
    }

    try {
      const venues = await enrichBinanceOpenInterest(await fetchBinanceVenues());
      if (venues.length > 0) {
        this.lastBinanceSource = 'direct';
        return venues;
      }
    } catch {
      // fall through to aggregator
    }

    this.lastBinanceSource = 'aggregator';
    return fetchCoinGeckoDerivativeVenues(['binance']);
  }

  async refresh() {
    if (this.refreshing) return;
    this.refreshing = true;

    try {
      const fetchers: { name: ExchangeId; fn: () => Promise<VenueSnapshot[]> }[] = [
        { name: 'binance', fn: () => this.fetchBinanceVenuesWithFallback() },
        { name: 'bybit', fn: fetchBybitVenues },
        { name: 'okx', fn: fetchOkxVenues },
        { name: 'hyperliquid', fn: fetchHyperliquidVenues },
        { name: 'aster', fn: fetchAsterVenues },
        { name: 'mexc', fn: fetchMexcVenues },
        { name: 'coinbase', fn: fetchCoinbaseVenues },
        { name: 'kraken', fn: fetchKrakenVenues },
      ];

      const allVenues: VenueSnapshot[] = [];
      const failed: ExchangeId[] = [];

      await Promise.all(
        fetchers.map(async ({ name, fn }) => {
          try {
            const data = await fn();
            allVenues.push(...data);
            if (name === 'binance') {
              this.exchangeStatus.binance =
                this.lastBinanceSource === 'direct' ? 'ok' : this.lastBinanceSource;
            } else {
              this.exchangeStatus[name] = 'ok';
            }
          } catch {
            this.exchangeStatus[name] = 'error';
            failed.push(name);
          }
        })
      );

      if (failed.length > 0) {
        try {
          const cgVenues = await fetchCoinGeckoDerivativeVenues(failed);
          const merged = this.mergeVenueLists(allVenues, cgVenues);
          allVenues.length = 0;
          allVenues.push(...merged);
          if (cgVenues.length > 0) {
            this.exchangeStatus.coingecko = 'ok';
          }
        } catch {
          this.exchangeStatus.coingecko = 'error';
        }
      }

      await this.refreshCoinGlassBulk();

      const baseAssets = [...new Set(allVenues.map((v) => v.baseAsset))];
      const marketMeta = await fetchCoinMarketMeta(baseAssets);
      const aggregated = this.aggregateVenues(allVenues, marketMeta);

      aggregated.sort((a, b) => b.marketCap - a.marketCap || b.totalVolumeUsdt - a.totalVolumeUsdt);

      this.markets = aggregated;
      this.signals = aggregated
        .filter((m) => m.signalType !== SignalType.NEUTRAL)
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .map((m, i) => ({ ...m, rank: i + 1 }));

      this.buildGainersLosers(aggregated);
      this.lastRefresh = Date.now();
      broadcastMarkets(this.markets);
    } finally {
      this.refreshing = false;
    }
  }
}

export const aggregationService = new AggregationService();
