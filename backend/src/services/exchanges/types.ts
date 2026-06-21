export type ExchangeId =
  | 'binance'
  | 'bybit'
  | 'okx'
  | 'hyperliquid'
  | 'aster'
  | 'mexc'
  | 'coinbase'
  | 'kraken';
export type MarketType = 'cex' | 'dex';

export interface VenueSnapshot {
  exchange: ExchangeId;
  marketType: MarketType;
  symbol: string;
  baseAsset: string;
  price: number;
  volumeUsdt: number;
  openInterest: number;
  fundingRate: number;
  priceChange24h: number;
  timestamp: number;
}

export interface AggregatedMarket {
  baseAsset: string;
  symbol: string;
  price: number;
  totalVolumeUsdt: number;
  totalOpenInterest: number;
  avgFundingRate: number;
  marketCap: number;
  iconUrl?: string;
  priceChange24h: number;
  oiChangePct: number;
  volumeChangePct: number;
  priceMomentum: number;
  signalType: string;
  opportunityScore: number;
  rank?: number;
  venueCount: number;
  exchanges: ExchangeId[];
  venues: VenueSnapshot[];
  growthMatrix: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }>;
  signalConditions?: {
    highOi: boolean;
    highVolume: boolean;
    fundingMatch: boolean;
    matchCount: number;
    fundingBand: string;
  };
}

export interface GainerLoser {
  baseAsset: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  totalVolumeUsdt: number;
  marketCap: number;
  exchanges: ExchangeId[];
}
