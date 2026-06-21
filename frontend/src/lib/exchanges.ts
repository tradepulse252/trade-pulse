export const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  hyperliquid: 'Hyperliquid',
  aster: 'Aster',
  mexc: 'MEXC',
  coinbase: 'Coinbase',
  kraken: 'Kraken',
  coingecko: 'CoinGecko',
};

export function formatExchangeList(exchanges: string[]): string {
  return exchanges.map((e) => EXCHANGE_LABELS[e] ?? e).join(', ');
}
