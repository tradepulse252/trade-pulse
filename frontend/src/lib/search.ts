export function matchSymbolSearch(query: string, baseAsset: string, symbol: string): boolean {
  const q = query.trim().toUpperCase();
  if (!q) return true;

  const base = baseAsset.toUpperCase();
  const sym = symbol.toUpperCase();
  const bare = sym.replace(/USDT$/, '');

  return (
    base.includes(q) ||
    sym.includes(q) ||
    bare === q ||
    sym === `${q}USDT` ||
    base === q
  );
}
