import type { VenueSnapshot } from './types';

interface OkxTicker {
  instId: string;
  last: string;
  volCcy24h: string;
  open24h: string;
  fundingRate?: string;
  oi?: string;
  oiCcy?: string;
}

export async function fetchOkxVenues(): Promise<VenueSnapshot[]> {
  const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
  if (!res.ok) throw new Error(`OKX API ${res.status}`);
  const json = (await res.json()) as { data?: OkxTicker[] };
  const list = json.data ?? [];
  const now = Date.now();

  return list
    .filter((t) => t.instId.endsWith('-USDT-SWAP'))
    .map((t) => {
      const baseAsset = t.instId.replace('-USDT-SWAP', '');
      const price = parseFloat(t.last) || 0;
      const open = parseFloat(t.open24h) || price;
      const priceChange24h = open > 0 ? ((price - open) / open) * 100 : 0;
      const oiCcy = parseFloat(t.oiCcy ?? '0') || 0;
      const oiContracts = parseFloat(t.oi ?? '0') || 0;
      const openInterest = oiCcy > 0 ? oiCcy : oiContracts * price;

      return {
        exchange: 'okx' as const,
        marketType: 'cex' as const,
        symbol: `${baseAsset}USDT`,
        baseAsset,
        price,
        volumeUsdt: parseFloat(t.volCcy24h) || 0,
        openInterest,
        fundingRate: parseFloat(t.fundingRate ?? '0') || 0,
        priceChange24h,
        timestamp: now,
      };
    })
    .filter((v) => v.price > 0 && v.volumeUsdt > 0);
}
