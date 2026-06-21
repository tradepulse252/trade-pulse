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

export interface GrowthTfRow {
  priceChangePct: number;
  oiChangePct: number;
  volumeChangePct: number;
}

export interface FlowTimeframeRow {
  inflow: number;
  outflow: number;
  netInflow: number;
  netChgPct: number;
  netInflowMcap: number;
}

export interface VenueSnapshot {
  exchange: ExchangeId | string;
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
  exchanges: (ExchangeId | string)[];
  venues: VenueSnapshot[];
  growthMatrix: Record<string, GrowthTfRow>;
  flowMatrix?: Record<string, FlowTimeframeRow>;
  dataSources?: string[];
  defillamaStats?: Array<{
    exchange: string;
    slug: string;
    openInterestUsd: number;
    oiChange1d: number;
    volume24hUsd?: number;
    volumeChange1d?: number;
  }>;
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
  exchanges: (ExchangeId | string)[];
}
