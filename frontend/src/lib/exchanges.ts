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

/** Exchanges users can pick when logging a journal trade */
export const JOURNAL_EXCHANGES = [
  'binance',
  'bybit',
  'okx',
  'hyperliquid',
  'aster',
  'mexc',
  'coinbase',
  'kraken',
] as const;

export type JournalExchangeId = (typeof JOURNAL_EXCHANGES)[number];

export function getExchangeLabel(id: string): string {
  return EXCHANGE_LABELS[id] ?? id;
}

export function searchJournalExchanges(query: string): JournalExchangeId[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...JOURNAL_EXCHANGES];
  return JOURNAL_EXCHANGES.filter(
    (id) => id.includes(q) || getExchangeLabel(id).toLowerCase().includes(q)
  );
}

export function formatExchangeList(exchanges: string[]): string {
  return exchanges.map((e) => EXCHANGE_LABELS[e] ?? e).join(', ');
}
