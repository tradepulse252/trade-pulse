const LOGO_ALIASES: Record<string, string> = {
  '1000sats': 'sats',
  '1000pepe': 'pepe',
  '1000shib': 'shib',
  '1000bonk': 'bonk',
  '1000floki': 'floki',
  '1000lunc': 'lunc',
  '1000xec': 'xec',
  '1000rats': 'rats',
  '1000cat': 'cat',
  btcdom: 'btc',
  shib1000: 'shib',
  luna2: 'luna',
  dodox: 'dodo',
  ronin: 'ron',
  beamx: 'beam',
};

export function normalizeCoinSymbol(baseAsset: string): string {
  let s = baseAsset.toLowerCase().replace(/usdt$/, '');
  if (LOGO_ALIASES[s]) return LOGO_ALIASES[s];
  if (s.startsWith('1000')) s = s.slice(4);
  return s;
}

/** Ordered logo sources — first match wins */
export function getCoinLogoUrls(baseAsset: string, iconUrl?: string): string[] {
  const symbol = normalizeCoinSymbol(baseAsset);
  const urls: string[] = [];

  if (iconUrl) urls.push(iconUrl);

  urls.push(
    `https://assets.coincap.io/assets/icons/${symbol}@2x.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${symbol}.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${symbol}.png`,
    `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${symbol}.svg`
  );

  return [...new Set(urls)];
}

export function getCoinCapIconUrl(baseAsset: string): string {
  return `https://assets.coincap.io/assets/icons/${normalizeCoinSymbol(baseAsset)}@2x.png`;
}
