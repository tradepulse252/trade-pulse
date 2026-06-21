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
  defillama: 'DefiLlama',
  coinglass: 'CoinGlass',
  'coinglass-flow': 'CoinGlass Flow',
  'coinglass-pairs': 'CoinGlass Pairs',
};

export function formatExchangeList(exchanges: string[]): string {
  return exchanges.map((e) => EXCHANGE_LABELS[e] ?? e).join(', ');
}
