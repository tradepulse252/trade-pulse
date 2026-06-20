import { normalizeMarketSymbol } from './coin-symbols';

export function coinCapIconUrl(baseAsset: string): string {
  const symbol = normalizeMarketSymbol(baseAsset).toLowerCase();
  return `https://assets.coincap.io/assets/icons/${symbol}@2x.png`;
}
