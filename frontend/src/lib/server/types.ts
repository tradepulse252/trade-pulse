export interface VenueSnapshot {
  exchange: string;
  marketType: 'cex' | 'dex';
  symbol: string;
  baseAsset: string;
  price: number;
  volumeUsdt: number;
  openInterest: number;
  fundingRate: number;
  priceChange24h: number;
  timestamp: number;
}

export interface GrowthTfRow {
  priceChangePct: number;
  oiChangePct: number;
  volumeChangePct: number;
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
  exchanges: string[];
  venues: VenueSnapshot[];
  growthMatrix: Record<string, GrowthTfRow>;
  dataSources?: string[];
}

export interface GainerLoser {
  baseAsset: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  totalVolumeUsdt: number;
  marketCap: number;
  exchanges: string[];
}
