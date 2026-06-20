'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AggregatedMarket, GainerLoser, MarketSort } from '@/lib/api';
import { getAggregatedMarkets, getGainersLosers } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
const FETCH_LIMIT = 500;

interface PriceTick {
  baseAsset: string;
  symbol: string;
  price: number;
  priceChange24h: number;
}

function sortMarkets(data: AggregatedMarket[], sort: MarketSort): AggregatedMarket[] {
  const sorted = [...data];
  switch (sort) {
    case 'volume':
      return sorted.sort((a, b) => b.totalVolumeUsdt - a.totalVolumeUsdt);
    case 'openInterest':
      return sorted.sort((a, b) => b.totalOpenInterest - a.totalOpenInterest);
    case 'funding':
      return sorted.sort((a, b) => b.avgFundingRate - a.avgFundingRate);
    case 'score':
      return sorted.sort((a, b) => b.opportunityScore - a.opportunityScore);
    case 'priceChange':
      return sorted.sort((a, b) => b.priceChange24h - a.priceChange24h);
    default:
      return sorted.sort((a, b) => b.marketCap - a.marketCap || b.totalVolumeUsdt - a.totalVolumeUsdt);
  }
}

function applyPriceTicks(markets: AggregatedMarket[], ticks: PriceTick[]): AggregatedMarket[] {
  if (ticks.length === 0) return markets;
  const byBase = new Map(ticks.map((t) => [t.baseAsset, t]));
  return markets.map((m) => {
    const tick = byBase.get(m.baseAsset);
    if (!tick) return m;
    return { ...m, price: tick.price, priceChange24h: tick.priceChange24h };
  });
}

export function useAggregatedMarkets(sort: MarketSort = 'marketCap') {
  const [markets, setMarkets] = useState<AggregatedMarket[]>([]);
  const [gainers, setGainers] = useState<GainerLoser[]>([]);
  const [losers, setLosers] = useState<GainerLoser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const sortRef = useRef(sort);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    sortRef.current = sort;
  }, [sort]);

  const fetchAll = useCallback(async () => {
    try {
      const [marketData, gl] = await Promise.all([
        getAggregatedMarkets(sortRef.current, FETCH_LIMIT),
        getGainersLosers(12),
      ]);
      setMarkets(sortMarkets(marketData, sortRef.current));
      setGainers(gl.gainers);
      setLosers(gl.losers);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, liveConnected ? 60_000 : 15_000);
    return () => clearInterval(interval);
  }, [fetchAll, liveConnected]);

  useEffect(() => {
    fetchAll();
  }, [sort, fetchAll]);

  useEffect(() => {
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveConnected(true);
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as {
            type: string;
            data: AggregatedMarket[] | PriceTick[];
          };
          if (message.type === 'markets_update' && Array.isArray(message.data)) {
            setMarkets(sortMarkets(message.data as AggregatedMarket[], sortRef.current));
          }
          if (message.type === 'price_tick' && Array.isArray(message.data)) {
            setMarkets((prev) => applyPriceTicks(prev, message.data as PriceTick[]));
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setLiveConnected(false);
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30_000);
        reconnectAttempts++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  return { markets, gainers, losers, loading, error, refetch: fetchAll, liveConnected };
}
