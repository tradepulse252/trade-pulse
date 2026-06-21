import type { ExchangeId, VenueSnapshot } from '../exchanges/types';

const BASE_URL = 'https://api.llama.fi';
const CACHE_MS = 2 * 60 * 1000;

/** DefiLlama open-interest slug → TradePulse exchange */
const OI_SLUG_TO_EXCHANGE: Record<string, ExchangeId> = {
  'hyperliquid-perps': 'hyperliquid',
  'aster-perps': 'aster',
};

/** Optional DEX volume slug (spot/perp mix on free tier) */
const VOLUME_SLUG_TO_EXCHANGE: Record<string, ExchangeId> = {
  hyperliquid: 'hyperliquid',
  aster: 'aster',
};

export interface DefiLlamaProtocolStats {
  exchange: ExchangeId;
  slug: string;
  openInterestUsd: number;
  oiChange1d: number;
  volume24hUsd?: number;
  volumeChange1d?: number;
}

interface OiOverviewProtocol {
  slug: string;
  total24h?: number;
  change_1d?: number;
}

interface DexSummary {
  total24h?: number;
  change_1d?: number;
}

let statsCache: { stats: Map<ExchangeId, DefiLlamaProtocolStats>; expires: number } | null = null;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'application/json', 'User-Agent': 'TradePulse/1.0' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchDexVolume(slug: string): Promise<DexSummary | null> {
  return fetchJson<DexSummary>(
    `/summary/dexs/${slug}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`
  );
}

export async function fetchDefiLlamaProtocolStats(): Promise<Map<ExchangeId, DefiLlamaProtocolStats>> {
  if (statsCache && statsCache.expires > Date.now()) {
    return statsCache.stats;
  }

  const overview = await fetchJson<{ protocols: OiOverviewProtocol[] }>(
    '/overview/open-interest?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true'
  );

  const stats = new Map<ExchangeId, DefiLlamaProtocolStats>();
  if (!overview?.protocols) {
    statsCache = { stats, expires: Date.now() + 30_000 };
    return stats;
  }

  for (const p of overview.protocols) {
    const exchange = OI_SLUG_TO_EXCHANGE[p.slug];
    if (!exchange || !p.total24h || p.total24h <= 0) continue;

    stats.set(exchange, {
      exchange,
      slug: p.slug,
      openInterestUsd: p.total24h,
      oiChange1d: p.change_1d ?? 0,
    });
  }

  await Promise.all(
    [...stats.entries()].map(async ([exchange, row]) => {
      const volSlug = Object.entries(VOLUME_SLUG_TO_EXCHANGE).find(([, ex]) => ex === exchange)?.[0];
      if (!volSlug) return;
      const vol = await fetchDexVolume(volSlug);
      if (!vol?.total24h) return;
      stats.set(exchange, {
        ...row,
        volume24hUsd: vol.total24h,
        volumeChange1d: vol.change_1d,
      });
    })
  );

  statsCache = { stats, expires: Date.now() + CACHE_MS };
  return stats;
}

/** Fill missing per-coin OI on DEX venues using protocol totals + volume share */
export function enrichVenuesWithDefiLlama(
  venues: VenueSnapshot[],
  stats: Map<ExchangeId, DefiLlamaProtocolStats>
): { venues: VenueSnapshot[]; enriched: boolean } {
  if (stats.size === 0) return { venues, enriched: false };

  const byExchange = new Map<ExchangeId, VenueSnapshot[]>();
  for (const v of venues) {
    const ex = String(v.exchange) as ExchangeId;
    if (!stats.has(ex)) continue;
    const list = byExchange.get(ex) ?? [];
    list.push(v);
    byExchange.set(ex, list);
  }

  let enriched = false;

  for (const [exchange, list] of byExchange) {
    const protocol = stats.get(exchange);
    if (!protocol) continue;

    const totalVol = list.reduce((s, v) => s + v.volumeUsdt, 0);
    const totalOi = list.reduce((s, v) => s + v.openInterest, 0);
    if (totalVol <= 0) continue;

    const coverage = totalOi / protocol.openInterestUsd;
    const needsFill = coverage < 0.85 || list.some((v) => v.openInterest <= 0);

    if (!needsFill) continue;

    for (const v of list) {
      if (v.volumeUsdt <= 0) continue;
      const share = v.volumeUsdt / totalVol;
      const estimatedOi = protocol.openInterestUsd * share;
      if (v.openInterest <= 0 || v.openInterest < estimatedOi * 0.25) {
        v.openInterest = estimatedOi;
        enriched = true;
      }
    }
  }

  return { venues, enriched };
}

/** Weighted DEX OI change from DefiLlama protocol summaries */
export function weightedDexOiChange(
  venues: VenueSnapshot[],
  stats: Map<ExchangeId, DefiLlamaProtocolStats>
): number | null {
  let weighted = 0;
  let weight = 0;

  for (const v of venues) {
    const ex = String(v.exchange) as ExchangeId;
    const protocol = stats.get(ex);
    if (!protocol || v.openInterest <= 0) continue;
    weighted += protocol.oiChange1d * v.openInterest;
    weight += v.openInterest;
  }

  if (weight <= 0) return null;
  return weighted / weight;
}

export function weightedDexVolumeChange(
  venues: VenueSnapshot[],
  stats: Map<ExchangeId, DefiLlamaProtocolStats>
): number | null {
  let weighted = 0;
  let weight = 0;

  for (const v of venues) {
    const ex = String(v.exchange) as ExchangeId;
    const protocol = stats.get(ex);
    if (protocol?.volumeChange1d == null || v.volumeUsdt <= 0) continue;
    weighted += protocol.volumeChange1d * v.volumeUsdt;
    weight += v.volumeUsdt;
  }

  if (weight <= 0) return null;
  return weighted / weight;
}

export function getDefiLlamaStatsForExchanges(
  exchanges: (ExchangeId | string)[],
  stats: Map<ExchangeId, DefiLlamaProtocolStats>
): DefiLlamaProtocolStats[] {
  const out: DefiLlamaProtocolStats[] = [];
  for (const ex of exchanges) {
    const row = stats.get(ex as ExchangeId);
    if (row) out.push(row);
  }
  return out;
}
