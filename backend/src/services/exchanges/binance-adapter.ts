import { env } from '../../config/env';
import { getOpenInterestBatch, isBinanceIpBanned } from '../binance/rest-client';
import { ingestionService } from '../data/ingestion-service';
import type { VenueSnapshot } from './types';

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  quoteVolume: string;
  priceChangePercent: string;
}

interface BinancePremium {
  symbol: string;
  lastFundingRate: string;
}

/** Direct public REST — avoids shared rate-limiter IP bans on cloud hosts */
async function fetchBinancePublicTickers(): Promise<{ tickers: BinanceTicker[]; funding: Map<string, number> }> {
  const base = env.BINANCE_REST_BASE;
  const [tickersRes, premiumRes] = await Promise.all([
    fetch(`${base}/fapi/v1/ticker/24hr`, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'application/json' },
    }),
    fetch(`${base}/fapi/v1/premiumIndex`, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'application/json' },
    }),
  ]);

  if (!tickersRes.ok) throw new Error(`Binance ticker API ${tickersRes.status}`);

  const tickers = (await tickersRes.json()) as BinanceTicker[];
  const premium = premiumRes.ok ? ((await premiumRes.json()) as BinancePremium[]) : [];
  const fundingMap = new Map(premium.map((p) => [p.symbol, parseFloat(p.lastFundingRate) || 0]));

  return { tickers, funding: fundingMap };
}

export async function fetchBinanceVenues(): Promise<VenueSnapshot[]> {
  const { tickers, funding: fundingMap } = await fetchBinancePublicTickers();
  const now = Date.now();

  const venues = tickers
    .filter((t) => t.symbol.endsWith('USDT'))
    .map((t) => {
      const baseAsset = t.symbol.replace('USDT', '');
      const price = parseFloat(t.lastPrice) || 0;
      return {
        exchange: 'binance' as const,
        marketType: 'cex' as const,
        symbol: t.symbol,
        baseAsset,
        price,
        volumeUsdt: parseFloat(t.quoteVolume) || 0,
        openInterest: 0,
        fundingRate: fundingMap.get(t.symbol) ?? 0,
        priceChange24h: parseFloat(t.priceChangePercent) || 0,
        timestamp: now,
      };
    })
    .filter((v) => v.price > 0 && v.volumeUsdt > 0);

  return enrichBinanceOpenInterest(venues);
}

export async function enrichBinanceOpenInterest(venues: VenueSnapshot[]): Promise<VenueSnapshot[]> {
  const oiFromIngestion = new Map(
    ingestionService.getMarketData().map((m) => [m.symbol, m.openInterestValue])
  );

  for (const v of venues) {
    const cached = oiFromIngestion.get(v.symbol);
    if (cached && cached > 0) {
      v.openInterest = cached;
    }
  }

  if (isBinanceIpBanned()) {
    return venues;
  }

  const missing = venues
    .filter((v) => v.openInterest <= 0)
    .sort((a, b) => b.volumeUsdt - a.volumeUsdt)
    .slice(0, 30);

  if (missing.length === 0) {
    return venues;
  }

  try {
    const oiMap = await getOpenInterestBatch(
      missing.map((v) => v.symbol),
      { batchSize: 5, batchDelayMs: 350, maxSymbols: 30 }
    );

    for (const v of missing) {
      const oi = oiMap.get(v.symbol);
      if (!oi) continue;
      const contracts = parseFloat(oi.openInterest) || 0;
      v.openInterest = contracts * v.price;
    }
  } catch {
    // OI enrichment optional — tickers still usable
  }

  return venues;
}
