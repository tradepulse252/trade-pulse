import type { FlowTimeframeRow, GrowthTfRow } from '../exchanges/types';
import { CG_EXCHANGE_LIST, coinglassFetch } from './client';

export interface CgCoinNetflow {
  symbol: string;
  [key: string]: string | number | undefined;
}

export interface CgCoinMarket {
  symbol: string;
  current_price?: number;
  market_cap_usd?: number;
  open_interest_usd?: number;
  avg_funding_rate_by_oi?: number;
  price_change_percent_5m?: number;
  price_change_percent_15m?: number;
  price_change_percent_30m?: number;
  price_change_percent_1h?: number;
  price_change_percent_4h?: number;
  price_change_percent_24h?: number;
  open_interest_change_percent_5m?: number;
  open_interest_change_percent_15m?: number;
  open_interest_change_percent_30m?: number;
  open_interest_change_percent_1h?: number;
  open_interest_change_percent_4h?: number;
  open_interest_change_percent_24h?: number;
  volume_change_percent_5m?: number;
  volume_change_percent_15m?: number;
  volume_change_percent_30m?: number;
  volume_change_percent_1h?: number;
  volume_change_percent_4h?: number;
  volume_change_percent_24h?: number;
}

export interface CgPairMarket {
  instrument_id: string;
  exchange_name: string;
  symbol: string;
  current_price: number;
  price_change_percent_24h: number;
  volume_usd: number;
  volume_usd_change_percent_24h: number;
  open_interest_usd: number;
  open_interest_change_percent_24h: number;
  funding_rate: number;
  long_volume_usd?: number;
  short_volume_usd?: number;
}


function num(v: string | number | undefined): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function rowFromNetflow(data: CgCoinNetflow, tf: string): FlowTimeframeRow | null {
  const buy = num(data[`taker_buy_volume_usd_${tf}`]);
  const sell = num(data[`taker_sell_volume_usd_${tf}`]);
  const net = num(data[`net_flow_usd_${tf}`]);
  const chg = num(data[`net_flow_usd_change_percent_${tf}`]);
  const mcap = num(data[`net_flow_usd_${tf}_market_cap_ratio`]) * 100;

  if (buy === 0 && sell === 0 && net === 0) return null;

  return {
    inflow: buy,
    outflow: sell,
    netInflow: net,
    netChgPct: chg,
    netInflowMcap: mcap,
  };
}

export function buildFlowMatrixFromNetflow(data: CgCoinNetflow): Record<string, FlowTimeframeRow> {
  const matrix: Record<string, FlowTimeframeRow> = {};

  for (const tf of ['5m', '15m', '30m', '1h', '4h', '24h'] as const) {
    const row = rowFromNetflow(data, tf);
    if (row) matrix[tf] = row;
  }

  const h1 = matrix['1h'];
  const h4 = matrix['4h'];
  if (h1 && h4) {
    matrix['2h'] = {
      inflow: (h1.inflow + h4.inflow) / 2,
      outflow: (h1.outflow + h4.outflow) / 2,
      netInflow: (h1.netInflow + h4.netInflow) / 2,
      netChgPct: (h1.netChgPct + h4.netChgPct) / 2,
      netInflowMcap: (h1.netInflowMcap + h4.netInflowMcap) / 2,
    };
  } else if (h1) {
    matrix['2h'] = { ...h1 };
  } else if (h4) {
    matrix['2h'] = { ...h4 };
  }

  return matrix;
}

export function buildGrowthMatrixFromCoinMarket(coin: CgCoinMarket): Record<string, GrowthTfRow> {
  const pick = (prefix: 'price_change_percent' | 'open_interest_change_percent' | 'volume_change_percent', tf: string) =>
    num(coin[`${prefix}_${tf}` as keyof CgCoinMarket]);

  const matrix: Record<string, GrowthTfRow> = {};
  for (const tf of ['5m', '15m', '30m', '1h', '4h', '24h'] as const) {
    matrix[tf] = {
      priceChangePct: pick('price_change_percent', tf),
      oiChangePct: pick('open_interest_change_percent', tf),
      volumeChangePct: pick('volume_change_percent', tf),
    };
  }

  matrix['2h'] = {
    priceChangePct: (matrix['1h'].priceChangePct + matrix['4h'].priceChangePct) / 2,
    oiChangePct: (matrix['1h'].oiChangePct + matrix['4h'].oiChangePct) / 2,
    volumeChangePct: (matrix['1h'].volumeChangePct + matrix['4h'].volumeChangePct) / 2,
  };

  return matrix;
}

const CG_EXCHANGE_MAP: Record<string, string> = {
  Binance: 'binance',
  Bybit: 'bybit',
  OKX: 'okx',
  MEXC: 'mexc',
  Coinbase: 'coinbase',
  Kraken: 'kraken',
  Hyperliquid: 'hyperliquid',
  Aster: 'aster',
  Bitget: 'bybit',
  'Gate.io': 'mexc',
  Gate: 'mexc',
};

export async function fetchCoinNetflow(baseAsset: string): Promise<Record<string, FlowTimeframeRow> | null> {
  const data = await coinglassFetch<CgCoinNetflow>('/api/futures/coin/netflow', {
    symbol: baseAsset.toUpperCase(),
    exchange_list: CG_EXCHANGE_LIST,
  });
  if (!data) return null;
  return buildFlowMatrixFromNetflow(data);
}

export async function fetchCoinPairsMarkets(baseAsset: string): Promise<CgPairMarket[]> {
  const data = await coinglassFetch<CgPairMarket[]>('/api/futures/pairs-markets', {
    symbol: baseAsset.toUpperCase(),
  });
  return data ?? [];
}

export async function fetchCoinsMarketsPage(page = 1, perPage = 100): Promise<CgCoinMarket[]> {
  const data = await coinglassFetch<CgCoinMarket[]>('/api/futures/coins-markets', {
    exchange_list: CG_EXCHANGE_LIST,
    page: String(page),
    per_page: String(perPage),
  });
  return data ?? [];
}

export async function fetchAllCoinsMarkets(maxPages = 5): Promise<Map<string, CgCoinMarket>> {
  const map = new Map<string, CgCoinMarket>();
  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchCoinsMarketsPage(page, 100);
    if (batch.length === 0) break;
    for (const c of batch) {
      map.set(c.symbol.toUpperCase(), c);
    }
    if (batch.length < 100) break;
  }
  return map;
}

export function cgPairToVenue(pair: CgPairMarket, baseAsset: string) {
  const exchange = CG_EXCHANGE_MAP[pair.exchange_name] ?? pair.exchange_name.toLowerCase().replace(/\s+/g, '');
  const isDex = exchange === 'hyperliquid' || exchange === 'aster';
  return {
    exchange,
    marketType: isDex ? ('dex' as const) : ('cex' as const),
    symbol: `${baseAsset}USDT`,
    baseAsset,
    price: pair.current_price,
    volumeUsdt: pair.volume_usd,
    openInterest: pair.open_interest_usd,
    fundingRate: pair.funding_rate,
    priceChange24h: pair.price_change_percent_24h,
    timestamp: Date.now(),
  };
}
