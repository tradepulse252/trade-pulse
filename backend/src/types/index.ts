import { SignalType } from '../lib/db/types';
import { TimeframeKey } from '../config/env';

export interface BinanceExchangeInfo {
  symbols: BinanceSymbolInfo[];
}

export interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  contractType: string;
  filters: Array<{ filterType: string; minQty?: string; tickSize?: string }>;
}

export interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  priceChangePercent: string;
}

export interface BinanceOpenInterest {
  symbol: string;
  openInterest: string;
  time: number;
}

export interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
  markPrice: string;
}

export interface BinanceMarkPrice {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
}

export interface MarketSnapshot {
  symbol: string;
  symbolId: string;
  price: number;
  openInterest: number;
  openInterestValue: number;
  volumeUsdt: number;
  fundingRate: number;
  priceChange24h: number;
  timestamp: number;
}

export interface GrowthMatrix {
  [key: string]: {
    priceChangePct: number;
    oiChangePct: number;
    volumeChangePct: number;
  };
}

export interface OpportunityResult {
  symbol: string;
  symbolId: string;
  signalType: SignalType;
  opportunityScore: number;
  price: number;
  openInterest: number;
  oiChangePct: number;
  volumeUsdt: number;
  volumeChangePct: number;
  fundingRate: number;
  priceMomentum: number;
  growthMatrix: GrowthMatrix;
  rank?: number;
}

export interface DashboardFilters {
  signalType?: SignalType;
  minOi?: number;
  minVolume?: number;
  minScore?: number;
  fundingRateMin?: number;
  fundingRateMax?: number;
  symbols?: string[];
  limit?: number;
}

export interface ChartDataPoint {
  time: number;
  value: number;
}

export interface CoinChartData {
  price: ChartDataPoint[];
  openInterest: ChartDataPoint[];
  fundingRate: ChartDataPoint[];
  volume: ChartDataPoint[];
}

export interface WsOpportunityUpdate {
  type: 'opportunity_update';
  data: OpportunityResult[];
  timestamp: number;
}

export interface WsSymbolUpdate {
  type: 'symbol_update';
  data: MarketSnapshot;
  timestamp: number;
}

export interface WsMarketsUpdate {
  type: 'markets_update';
  data: unknown[];
  timestamp: number;
}

export interface WsPriceTickUpdate {
  type: 'price_tick';
  data: Array<{ baseAsset: string; symbol: string; price: number; priceChange24h: number }>;
  timestamp: number;
}

export interface WsAlertNotification {
  type: 'alert';
  data: {
    alertType: string;
    symbol: string;
    title: string;
    message: string;
  };
  timestamp: number;
}

export type WsMessage = WsOpportunityUpdate | WsSymbolUpdate | WsAlertNotification | WsMarketsUpdate | WsPriceTickUpdate;

export interface HealthStatus {
  restApi: 'healthy' | 'degraded' | 'down';
  websocket: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  activeSymbols: number;
  lastRestPing: string | null;
  lastWsMessage: string | null;
  uptime: number;
}

export const LOOKBACK_WINDOWS: TimeframeKey[] = ['5m', '15m', '30m', '1h', '2h', '4h', '24h', '7d'];
