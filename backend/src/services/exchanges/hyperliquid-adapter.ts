import type { VenueSnapshot } from './types';

interface HlAssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  markPx: string;
}

export async function fetchHyperliquidVenues(): Promise<VenueSnapshot[]> {
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
  });
  if (!res.ok) throw new Error(`Hyperliquid API ${res.status}`);
  const json = (await res.json()) as [{ universe: { name: string }[] }, HlAssetCtx[]];
  const universe = json[0]?.universe ?? [];
  const contexts = json[1] ?? [];
  const now = Date.now();

  const results: VenueSnapshot[] = [];

  for (let i = 0; i < universe.length; i++) {
    const asset = universe[i];
    const ctx = contexts[i];
    if (!ctx) continue;
    const baseAsset = asset.name;
    const price = parseFloat(ctx.markPx) || 0;
    const prev = parseFloat(ctx.prevDayPx) || price;
    const priceChange24h = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    const openInterest = parseFloat(ctx.openInterest) || 0;
    const volumeUsdt = parseFloat(ctx.dayNtlVlm) || 0;

    if (price <= 0 || volumeUsdt <= 100_000) continue;

    results.push({
      exchange: 'hyperliquid',
      marketType: 'dex',
      symbol: `${baseAsset}USDT`,
      baseAsset,
      price,
      volumeUsdt,
      openInterest: openInterest * price,
      fundingRate: parseFloat(ctx.funding) || 0,
      priceChange24h,
      timestamp: now,
    });
  }

  return results;
}
