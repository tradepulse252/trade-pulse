import { normalizeSignalType } from './utils';

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
  growthMatrix?: Record<string, { priceChangePct: number; oiChangePct: number; volumeChangePct: number }>;
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
    highOi?: boolean;
    highVolume?: boolean;
    fundingMatch?: boolean;
    onChainLong?: boolean;
    onChainShort?: boolean;
  };
  onChainMetrics?: {
    exchangeInflow: number;
    exchangeOutflow: number;
    netflow: number;
    whaleRatio: number;
    stablecoinInflow: number;
    exchangeReserve: number;
    reserveChangePct: number;
    source: string;
  };
  venues?: VenueSnapshot[];
  flowMatrix?: Record<string, { inflow: number; outflow: number; netInflow: number; netChgPct: number; netInflowMcap: number }>;
  dataSources?: string[];
  defillamaStats?: Array<{
    exchange: string;
    slug: string;
    openInterestUsd: number;
    oiChange1d: number;
    volume24hUsd?: number;
    volumeChange1d?: number;
  }>;
}

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

function getFallbackBase(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return '';
}

function apiErrorMessage(status: number): string {
  if (status === 503) {
    return 'Backend unavailable (503) — using fallback API.';
  }
  if (status === 502) {
    return 'Backend starting up (502) — please wait and retry.';
  }
  return `API error: ${status}`;
}

async function fetchFromBase<T>(base: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${base}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(apiErrorMessage(res.status));
  return res.json();
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const bases = [API_URL];
  const fallback = getFallbackBase();
  if (fallback && fallback.replace(/\/$/, '') !== API_URL.replace(/\/$/, '')) {
    bases.push(fallback.replace(/\/$/, ''));
  }

  let lastError: Error | null = null;
  for (const base of bases) {
    try {
      return await fetchFromBase<T>(base, path, options);
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw lastError ?? new Error('Cannot reach backend API');
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

function normalizeMarketSignals<T extends { signalType: string }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    signalType: normalizeSignalType(item.signalType),
  }));
}

function opportunityToAggregated(opp: Opportunity): AggregatedMarket {
  const baseAsset = opp.symbol.replace('USDT', '');
  return {
    baseAsset,
    symbol: opp.symbol,
    price: opp.price,
    totalVolumeUsdt: opp.volumeUsdt,
    totalOpenInterest: opp.openInterest,
    avgFundingRate: opp.fundingRate,
    marketCap: 0,
    priceChange24h: opp.priceMomentum,
    oiChangePct: opp.oiChangePct,
    volumeChangePct: opp.volumeChangePct,
    priceMomentum: opp.priceMomentum,
    signalType: normalizeSignalType(opp.signalType),
    opportunityScore: opp.opportunityScore,
    rank: opp.rank,
    venueCount: 1,
    exchanges: ['binance'],
    growthMatrix: opp.growthMatrix,
  };
}

function sortAggregated(data: AggregatedMarket[], sort: MarketSort): AggregatedMarket[] {
  const sorted = [...data];
  switch (sort) {
    case 'volume':
      return sorted.sort((a, b) => b.totalVolumeUsdt - a.totalVolumeUsdt);
    case 'openInterest':
      return sorted.sort((a, b) => b.totalOpenInterest - a.totalOpenInterest);
    case 'funding':
      return sorted.sort((a, b) => b.avgFundingRate - a.avgFundingRate);
    case 'score':
      return sorted.sort((a, b) => b.opportunityScore - a.opportunityScore);
    case 'priceChange':
      return sorted.sort((a, b) => b.priceChange24h - a.priceChange24h);
    default:
      return sorted.sort((a, b) => b.marketCap - a.marketCap || b.totalVolumeUsdt - a.totalVolumeUsdt);
  }
}

export async function getAggregatedMarkets(sort: MarketSort = 'marketCap', limit = 500): Promise<AggregatedMarket[]> {
  try {
    const result = await fetchApi<{ data: AggregatedMarket[] }>(`/markets?sort=${sort}&limit=${limit}`);
    return normalizeMarketSignals(result.data);
  } catch (err) {
    const msg = (err as Error).message;
    if (!msg.includes('404')) throw err;
    const opps = await getOpportunities({ limit });
    return sortAggregated(opps.map(opportunityToAggregated), sort).slice(0, limit);
  }
}

export async function getSignals(limit = 200, signalType?: string): Promise<AggregatedMarket[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (signalType) params.set('signalType', signalType);
    const result = await fetchApi<{ data: AggregatedMarket[] }>(`/signals?${params}`);
    return normalizeMarketSignals(result.data);
  } catch (err) {
    const msg = (err as Error).message;
    if (!msg.includes('404')) throw err;
    const opps = await getOpportunities({ limit });
    return normalizeMarketSignals(
      opps
        .filter((o) => normalizeSignalType(o.signalType) !== 'NEUTRAL')
        .filter((o) => !signalType || normalizeSignalType(o.signalType) === signalType)
        .map(opportunityToAggregated)
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
    );
  }
}

export async function getGainersLosers(limit = 15): Promise<{ gainers: GainerLoser[]; losers: GainerLoser[] }> {
  try {
    const result = await fetchApi<{ gainers: GainerLoser[]; losers: GainerLoser[] }>(`/markets/gainers-losers?limit=${limit}`);
    return { gainers: result.gainers, losers: result.losers };
  } catch (err) {
    const msg = (err as Error).message;
    if (!msg.includes('404')) throw err;
    const opps = await getOpportunities({ limit: 200 });
    const mapped: GainerLoser[] = opps.map((o) => ({
      baseAsset: o.symbol.replace('USDT', ''),
      symbol: o.symbol,
      price: o.price,
      priceChange24h: o.priceMomentum,
      totalVolumeUsdt: o.volumeUsdt,
      marketCap: 0,
      exchanges: ['binance'],
    }));
    return {
      gainers: [...mapped].sort((a, b) => b.priceChange24h - a.priceChange24h).slice(0, limit),
      losers: [...mapped].sort((a, b) => a.priceChange24h - b.priceChange24h).slice(0, limit),
    };
  }
}

export async function getAggregatedMarket(symbol: string): Promise<AggregatedMarket | null> {
  const normalized = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
  try {
    const result = await fetchApi<{ data: AggregatedMarket }>(`/markets/${normalized}`);
    return result.data;
  } catch (err) {
    const msg = (err as Error).message;
    if (!msg.includes('404')) throw err;
    const markets = await getAggregatedMarkets('marketCap', 1000);
    return markets.find((m) => m.symbol === normalized) ?? null;
  }
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
  source?: string;
}> {
  return fetchApi('/health');
}
