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
    highOi: boolean;
    highVolume: boolean;
    fundingMatch: boolean;
    matchCount: number;
    fundingBand: string;
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

function apiErrorMessage(status: number): string {
  if (status === 503) {
    return 'Backend unavailable (503) — Render may be waking up or the service is suspended. Retry in a moment.';
  }
  if (status === 502) {
    return 'Backend starting up (502) — please wait and retry.';
  }
  return `API error: ${status}`;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const maxAttempts = 4;
  let lastStatus = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`${API_URL}/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
      lastStatus = res.status;
      if (res.ok) return res.json();

      if ((res.status === 502 || res.status === 503) && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      throw new Error(apiErrorMessage(res.status));
    } catch (err) {
      if (attempt < maxAttempts - 1 && (err as Error).name === 'TypeError') {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      if ((err as Error).message.startsWith('API error') || (err as Error).message.includes('Backend')) {
        throw err;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      throw new Error(lastStatus ? apiErrorMessage(lastStatus) : 'Cannot reach backend API');
    }
  }

  throw new Error(lastStatus ? apiErrorMessage(lastStatus) : 'Cannot reach backend API');
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
    signalType: opp.signalType,
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
    return result.data;
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
    return result.data;
  } catch (err) {
    const msg = (err as Error).message;
    if (!msg.includes('404')) throw err;
    const opps = await getOpportunities({ limit });
    return opps
      .filter((o) => o.signalType !== 'NEUTRAL')
      .filter((o) => !signalType || o.signalType === signalType)
      .map(opportunityToAggregated)
      .sort((a, b) => b.opportunityScore - a.opportunityScore);
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
}> {
  return fetchApi('/health');
}
