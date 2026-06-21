import { env } from '../../config/env';

const BASE_URL = 'https://open-api-v4.coinglass.com';

export interface CgResponse<T> {
  code: string;
  msg: string;
  data: T;
  success?: boolean;
}

export async function coinglassFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  if (!env.COINGLASS_API_KEY) return null;

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: 'application/json',
        'CG-API-KEY': env.COINGLASS_API_KEY,
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as CgResponse<T>;
    if (json.code !== '0' || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

export const CG_EXCHANGE_LIST =
  'Binance,Bybit,OKX,MEXC,Coinbase,Kraken,Hyperliquid,Aster,Bitget,Gate';
