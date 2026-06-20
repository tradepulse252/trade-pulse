const LOGO_ALIASES: Record<string, string> = {
  '1000SATS': 'sats',
  '1000PEPE': 'pepe',
  '1000SHIB': 'shib',
  '1000BONK': 'bonk',
  '1000FLOKI': 'floki',
  '1000LUNC': 'lunc',
  '1000XEC': 'xec',
  BTCDOM: 'btc',
};

export function coinCapIconUrl(baseAsset: string): string {
  let symbol = baseAsset.toUpperCase().replace(/USDT$/, '');
  if (symbol.startsWith('1000')) symbol = symbol.slice(4);
  symbol = LOGO_ALIASES[symbol] ?? symbol;
  return `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;
}
