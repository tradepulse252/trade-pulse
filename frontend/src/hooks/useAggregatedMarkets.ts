'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AggregatedMarket, GainerLoser, MarketSort } from '@/lib/api';
import { getAggregatedMarkets, getGainersLosers } from '@/lib/api';

export function useAggregatedMarkets(sort: MarketSort = 'marketCap') {
  const [markets, setMarkets] = useState<AggregatedMarket[]>([]);
  const [gainers, setGainers] = useState<GainerLoser[]>([]);
  const [losers, setLosers] = useState<GainerLoser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [marketData, gl] = await Promise.all([
        getAggregatedMarkets(sort, 200),
        getGainersLosers(12),
      ]);
      setMarkets(marketData);
      setGainers(gl.gainers);
      setLosers(gl.losers);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { markets, gainers, losers, loading, error, refetch: fetchAll };
}
