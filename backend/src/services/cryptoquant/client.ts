import { env } from '../../config/env';

const BASE_URL = 'https://api.cryptoquant.com/v1';

interface CqStatus {
  code: number;
  message: string;
}

interface CqEnvelope<T> {
  status: CqStatus;
  result?: { data?: T[] };
}

export async function cryptoquantFetch<T extends Record<string, unknown>>(
  path: string,
  params: Record<string, string>
): Promise<T[] | null> {
  const apiKey = env.CRYPTOQUANT_API_KEY?.trim();
  if (!apiKey) return null;

  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(25_000),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      console.warn(`[cryptoquant] ${path} HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as CqEnvelope<T>;
    if (json.status?.code !== 200 || !json.result?.data?.length) {
      console.warn(`[cryptoquant] ${path} code=${json.status?.code} ${json.status?.message ?? ''}`);
      return null;
    }
    return json.result.data;
  } catch (err) {
    console.warn(`[cryptoquant] ${path} error:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** CryptoQuant asset slug for supported base assets */
export function cqAssetSlug(baseAsset: string): string | null {
  const map: Record<string, string> = {
    BTC: 'btc',
    ETH: 'eth',
  };
  return map[baseAsset.toUpperCase()] ?? null;
}

export function latestRow<T extends Record<string, unknown>>(rows: T[] | null): T | null {
  if (!rows?.length) return null;
  return rows[rows.length - 1];
}

export function numField(row: Record<string, unknown> | null, ...keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const v = row[key];
    if (v === undefined || v === null || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function pctChange(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}
