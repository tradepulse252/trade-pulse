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

/** CryptoQuant / on-chain exchange flow metrics */
export interface OnChainMetrics {
  exchangeInflow: number;
  exchangeOutflow: number;
  netflow: number;
  whaleRatio: number;
  stablecoinInflow: number;
  exchangeReserve: number;
  reserveChangePct: number;
  netflowChangePct?: number;
  source: 'cryptoquant' | 'coinglass' | 'none';
  updatedAt: number;
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
  onChainMetrics?: OnChainMetrics;
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
    priceSideways?: boolean;
    priceBigMove?: boolean;
    strongOi?: boolean;
    volumeSlightlyUp?: boolean;
    volumeSlightlyDown?: boolean;
    inflowDominant?: boolean;
    outflowDominant?: boolean;
    fundingLong?: boolean;
    fundingShort?: boolean;
    lowLongLiq?: boolean;
    tooManyShort?: boolean;
    longMatchCount?: number;
    shortMatchCount?: number;
    matchCount: number;
    fundingBand: string;
    /** @deprecated legacy fields */
    highOi?: boolean;
    highVolume?: boolean;
    fundingMatch?: boolean;
    onChainLong?: boolean;
    onChainShort?: boolean;
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
