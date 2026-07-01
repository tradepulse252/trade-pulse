import type { FlowTimeframeRow, OnChainMetrics } from '../exchanges/types';
import {
  cryptoquantFetch,
  cqAssetSlug,
  latestRow,
  numField,
  pctChange,
} from './client';

const EXCHANGE = 'all_exchange';
const WINDOW = 'day';

let stablecoinCache: { inflow: number; updatedAt: number } | null = null;

async function fetchStablecoinInflow(): Promise<number> {
  const now = Date.now();
  if (stablecoinCache && now - stablecoinCache.updatedAt < 120_000) {
    return stablecoinCache.inflow;
  }

  const rows = await cryptoquantFetch<Record<string, unknown>>('/stablecoin/exchange-flows/inflow', {
    token: 'usdt',
    exchange: EXCHANGE,
    window: WINDOW,
    limit: '1',
  });

  const inflow = numField(latestRow(rows), 'inflow_total', 'inflow');
  stablecoinCache = { inflow, updatedAt: now };
  return inflow;
}

async function fetchAssetFlows(slug: string) {
  const [inflowRows, outflowRows, netflowRows, reserveRows, whaleRows] = await Promise.all([
    cryptoquantFetch<Record<string, unknown>>(`/${slug}/exchange-flows/inflow`, {
      exchange: EXCHANGE,
      window: WINDOW,
      limit: '2',
    }),
    cryptoquantFetch<Record<string, unknown>>(`/${slug}/exchange-flows/outflow`, {
      exchange: EXCHANGE,
      window: WINDOW,
      limit: '2',
    }),
    cryptoquantFetch<Record<string, unknown>>(`/${slug}/exchange-flows/netflow`, {
      exchange: EXCHANGE,
      window: WINDOW,
      limit: '2',
    }),
    cryptoquantFetch<Record<string, unknown>>(`/${slug}/exchange-flows/reserve`, {
      exchange: EXCHANGE,
      window: WINDOW,
      limit: '2',
    }),
    cryptoquantFetch<Record<string, unknown>>(`/${slug}/flow-indicator/exchange-whale-ratio`, {
      exchange: 'binance',
      window: WINDOW,
      limit: '1',
    }),
  ]);

  const inLatest = latestRow(inflowRows);
  const inPrev = inflowRows && inflowRows.length > 1 ? inflowRows[inflowRows.length - 2] : null;
  const outLatest = latestRow(outflowRows);
  const netLatest = latestRow(netflowRows);
  const resLatest = latestRow(reserveRows);
  const resPrev = reserveRows && reserveRows.length > 1 ? reserveRows[reserveRows.length - 2] : null;
  const whaleLatest = latestRow(whaleRows);

  const exchangeInflow = numField(inLatest, 'inflow_total', 'inflow');
  const exchangeOutflow = numField(outLatest, 'outflow_total', 'outflow');
  const netflow = numField(netLatest, 'netflow_total', 'netflow');
  const exchangeReserve = numField(resLatest, 'reserve', 'reserve_usd');
  const reservePrev = numField(resPrev, 'reserve', 'reserve_usd');
  const whaleRatio = numField(whaleLatest, 'exchange_whale_ratio', 'whale_ratio', 'ratio');

  if (exchangeInflow === 0 && exchangeOutflow === 0 && netflow === 0 && exchangeReserve === 0) {
    return null;
  }

  return {
    exchangeInflow,
    exchangeOutflow,
    netflow,
    whaleRatio,
    exchangeReserve,
    reserveChangePct: pctChange(exchangeReserve, reservePrev),
    inflowChangePct: pctChange(exchangeInflow, numField(inPrev, 'inflow_total', 'inflow')),
  };
}

function fromCoinGlassFlow(flow: FlowTimeframeRow | undefined, stablecoinInflow: number): OnChainMetrics | null {
  if (!flow || (flow.inflow === 0 && flow.outflow === 0)) return null;
  return {
    exchangeInflow: flow.inflow,
    exchangeOutflow: flow.outflow,
    netflow: flow.netInflow,
    whaleRatio: 0,
    stablecoinInflow,
    exchangeReserve: 0,
    reserveChangePct: 0,
    netflowChangePct: flow.netChgPct,
    source: 'coinglass',
    updatedAt: Date.now(),
  };
}

export async function fetchOnChainMetrics(
  baseAsset: string,
  flowFallback?: FlowTimeframeRow
): Promise<OnChainMetrics | null> {
  const stablecoinInflow = await fetchStablecoinInflow();
  const slug = cqAssetSlug(baseAsset);

  if (slug) {
    const flows = await fetchAssetFlows(slug);
    if (flows) {
      return {
        exchangeInflow: flows.exchangeInflow,
        exchangeOutflow: flows.exchangeOutflow,
        netflow: flows.netflow,
        whaleRatio: flows.whaleRatio,
        stablecoinInflow,
        exchangeReserve: flows.exchangeReserve,
        reserveChangePct: flows.reserveChangePct,
        netflowChangePct: 0,
        source: 'cryptoquant',
        updatedAt: Date.now(),
      };
    }
  }

  return fromCoinGlassFlow(flowFallback, stablecoinInflow);
}

/** Bulk fetch BTC + ETH metrics for aggregation refresh */
export async function fetchCryptoQuantBulk(): Promise<Map<string, OnChainMetrics>> {
  const map = new Map<string, OnChainMetrics>();
  const stablecoinInflow = await fetchStablecoinInflow();

  for (const base of ['BTC', 'ETH']) {
    const slug = cqAssetSlug(base);
    if (!slug) continue;
    const flows = await fetchAssetFlows(slug);
    if (!flows) continue;
    map.set(base, {
      exchangeInflow: flows.exchangeInflow,
      exchangeOutflow: flows.exchangeOutflow,
      netflow: flows.netflow,
      whaleRatio: flows.whaleRatio,
      stablecoinInflow,
      exchangeReserve: flows.exchangeReserve,
      reserveChangePct: flows.reserveChangePct,
      netflowChangePct: 0,
      source: 'cryptoquant',
      updatedAt: Date.now(),
    });
  }

  if (stablecoinInflow > 0 && !map.has('BTC')) {
    map.set('_macro', {
      exchangeInflow: 0,
      exchangeOutflow: 0,
      netflow: 0,
      whaleRatio: 0,
      stablecoinInflow,
      exchangeReserve: 0,
      reserveChangePct: 0,
      netflowChangePct: 0,
      source: 'cryptoquant',
      updatedAt: Date.now(),
    });
  }

  return map;
}
