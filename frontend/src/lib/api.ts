const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Opportunity {
  symbol: string;
  symbolId: string;
  signalType: string;
  opportunityScore: number;
  price: number;
  openInterest: number;
  oiChangePct: number;
  volumeUsdt: number;
  volumeChangePct: number;
  fundingRate: number;
  priceMomentum: number;
  rank?: number;
  growthMatrix?: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }>;
}

export interface AggregatedMarket {
  baseAsset: string;
  symbol: string;
  price: number;
  totalVolumeUsdt: number;
  totalOpenInterest: number;
  avgFundingRate: number;
  marketCap: number;
  priceChange24h: number;
  oiChangePct: number;
  volumeChangePct: number;
  priceMomentum: number;
  signalType: string;
  opportunityScore: number;
  rank?: number;
  venueCount: number;
  exchanges: string[];
  growthMatrix?: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }>;
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

export interface OpportunityFilters {
  signalType?: string;
  minOi?: number;
  minVolume?: number;
  minScore?: number;
  fundingRateMin?: number;
  fundingRateMax?: number;
  symbols?: string;
  limit?: number;
}

export interface CoinDetail {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  signal: {
    signalType: string;
    opportunityScore: number;
    price: number;
    openInterest: number;
    oiChangePct: number;
    volumeUsdt: number;
    volumeChangePct: number;
    fundingRate: number;
    priceMomentum: number;
    rank: number | null;
  } | null;
  growthMatrix: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }>;
}

export interface ChartDataPoint {
  time: number;
  value: number;
}

export interface ChartData {
  price: ChartDataPoint[];
  openInterest: ChartDataPoint[];
  fundingRate: ChartDataPoint[];
  volume: ChartDataPoint[];
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getOpportunities(filters?: OpportunityFilters): Promise<Opportunity[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
  }
  const qs = params.toString();
  const result = await fetchApi<{ data: Opportunity[] }>(`/opportunities${qs ? `?${qs}` : ''}`);
  return result.data;
}

export type MarketSort = 'marketCap' | 'volume' | 'openInterest' | 'funding' | 'score' | 'priceChange';

export async function getAggregatedMarkets(sort: MarketSort = 'marketCap', limit = 200): Promise<AggregatedMarket[]> {
  const result = await fetchApi<{ data: AggregatedMarket[] }>(`/markets?sort=${sort}&limit=${limit}`);
  return result.data;
}

export async function getSignals(limit = 200, signalType?: string): Promise<AggregatedMarket[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (signalType) params.set('signalType', signalType);
  const result = await fetchApi<{ data: AggregatedMarket[] }>(`/signals?${params}`);
  return result.data;
}

export async function getGainersLosers(limit = 15): Promise<{ gainers: GainerLoser[]; losers: GainerLoser[] }> {
  const result = await fetchApi<{ gainers: GainerLoser[]; losers: GainerLoser[] }>(`/markets/gainers-losers?limit=${limit}`);
  return { gainers: result.gainers, losers: result.losers };
}

export async function getCoinDetail(symbol: string): Promise<CoinDetail> {
  const result = await fetchApi<{ data: CoinDetail }>(`/symbols/${symbol}`);
  return result.data;
}

export async function getChartData(symbol: string, limit = 200): Promise<ChartData> {
  const result = await fetchApi<{ data: ChartData }>(`/symbols/${symbol}/charts?limit=${limit}`);
  return result.data;
}

export async function getHealth(): Promise<{
  status: string;
  restApi: string;
  websocket: string;
  database: string;
  redis: string;
  activeSymbols: number;
  connectedClients: number;
  uptime: number;
  timestamp: string;
}> {
  return fetchApi('/health');
}
