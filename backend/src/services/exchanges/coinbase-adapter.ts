import type { VenueSnapshot } from './types';

interface CoinbaseInstrument {
  symbol: string;
  type: string;
  base_asset_name: string;
  trading_state?: string;
  notional_24hr?: string;
  open_interest?: string;
  quote?: {
    trade_price?: string;
    mark_price?: string;
    index_price?: string;
    predicted_funding?: string;
  };
}

export async function fetchCoinbaseVenues(): Promise<VenueSnapshot[]> {
  const res = await fetch('https://api.international.coinbase.com/api/v1/instruments', {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Coinbase Intl API ${res.status}`);

  const list = (await res.json()) as CoinbaseInstrument[];
  const now = Date.now();

  return list
    .filter((i) => i.type === 'PERP' && i.trading_state === 'TRADING')
    .map((i) => {
      const baseAsset = i.base_asset_name;
      const price =
        parseFloat(i.quote?.trade_price ?? '0') ||
        parseFloat(i.quote?.mark_price ?? '0') ||
        parseFloat(i.quote?.index_price ?? '0') ||
        0;
      const openInterestContracts = parseFloat(i.open_interest ?? '0') || 0;
      const indexPrice = parseFloat(i.quote?.index_price ?? '0') || price;
      const open24h = indexPrice > 0 && price > 0 ? ((price - indexPrice) / indexPrice) * 100 : 0;

      return {
        exchange: 'coinbase' as const,
        marketType: 'cex' as const,
        symbol: `${baseAsset}USDT`,
        baseAsset,
        price,
        volumeUsdt: parseFloat(i.notional_24hr ?? '0') || 0,
        openInterest: openInterestContracts * price,
        fundingRate: parseFloat(i.quote?.predicted_funding ?? '0') || 0,
        priceChange24h: open24h,
        timestamp: now,
      };
    })
    .filter((v) => v.price > 0 && v.volumeUsdt > 1_000);
}
