/** Map futures contract names to canonical market-cap / logo symbols */
const SYMBOL_ALIASES: Record<string, string> = {
  '1000SATS': 'SATS',
  '1000PEPE': 'PEPE',
  '1000SHIB': 'SHIB',
  '1000BONK': 'BONK',
  '1000FLOKI': 'FLOKI',
  '1000LUNC': 'LUNC',
  '1000XEC': 'XEC',
  '1000RATS': 'RATS',
  '1000CAT': 'CAT',
  BTCDOM: 'BTC',
};

/** Resolve a futures baseAsset to the symbol used by market-data APIs */
export function normalizeMarketSymbol(baseAsset: string): string {
  let s = baseAsset.toUpperCase().replace(/USDT$/, '');
  if (SYMBOL_ALIASES[s]) return SYMBOL_ALIASES[s];
  if (s.startsWith('1000')) s = s.slice(4);
  return s;
}

/** Keys to try when looking up market meta for a baseAsset */
export function marketSymbolLookupKeys(baseAsset: string): string[] {
  const upper = baseAsset.toUpperCase().replace(/USDT$/, '');
  const normalized = normalizeMarketSymbol(baseAsset);
  return [...new Set([upper, normalized])];
}
