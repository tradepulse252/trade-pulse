'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Opportunity } from '@/lib/api';
import { applyOpportunityFilters } from '@/lib/filters';
import {
  sortOpportunities,
  type SortField,
  type SortOrder,
  type TimeframeKey,
} from '@/lib/sorting';

export interface DisplayOptions {
  sortBy?: SortField;
  sortOrder?: SortOrder;
  timeframe?: TimeframeKey;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
const FETCH_LIMIT = 200;

interface WsMessage {
  type: string;
  data: Opportunity[] | unknown;
  timestamp: number;
}

export function useWebSocket(onOpportunityUpdate?: (data: Opportunity[]) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const onUpdateRef = useRef(onOpportunityUpdate);

  useEffect(() => {
    onUpdateRef.current = onOpportunityUpdate;
  }, [onOpportunityUpdate]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        if (message.type === 'opportunity_update' && onUpdateRef.current) {
          onUpdateRef.current(message.data as Opportunity[]);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}

export function useOpportunities(
  initialFilters?: Record<string, string | number>,
  displayOptions?: DisplayOptions
) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number>>(() => ({
    limit: 50,
    ...initialFilters,
  }));

  const [sortBy, setSortBy] = useState<SortField>(displayOptions?.sortBy ?? 'score');
  const [sortOrder, setSortOrder] = useState<SortOrder>(displayOptions?.sortOrder ?? 'desc');
  const [timeframe, setTimeframe] = useState<TimeframeKey>(displayOptions?.timeframe ?? '1h');

  const allDataRef = useRef<Opportunity[]>([]);
  const filtersRef = useRef(filters);
  const sortRef = useRef({ sortBy, sortOrder, timeframe });
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    sortRef.current = { sortBy, sortOrder, timeframe };
  }, [sortBy, sortOrder, timeframe]);

  const refreshDisplay = useCallback(() => {
    const { sortBy: sb, sortOrder: so, timeframe: tf } = sortRef.current;
    const filtered = applyOpportunityFilters(allDataRef.current, filtersRef.current);
    const sorted = sortOpportunities(filtered, sb, so, tf);
    setOpportunities(sorted);
  }, []);

  const setAllData = useCallback(
    (data: Opportunity[]) => {
      allDataRef.current = data;
      setTotalCount(data.length);
      refreshDisplay();
    },
    [refreshDisplay]
  );

  // Always fetch the FULL list — never send user filters to the API
  const fetchFullData = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    try {
      const { getOpportunities } = await import('@/lib/api');
      const data = await getOpportunities({ limit: FETCH_LIMIT });
      if (generation !== fetchGenerationRef.current) return;
      setAllData(data);
      setError(null);
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return;
      setError((err as Error).message);
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [setAllData]);

  // Initial load
  useEffect(() => {
    fetchFullData();
  }, [fetchFullData]);

  // Filter or sort changes: client-side only
  useEffect(() => {
    refreshDisplay();
  }, [filters, sortBy, sortOrder, timeframe, refreshDisplay]);

  const handleWsUpdate = useCallback(
    (data: Opportunity[]) => {
      setAllData(data);
    },
    [setAllData]
  );

  const { connected: wsConnected } = useWebSocket(handleWsUpdate);

  // Background refresh of full dataset only (not tied to filters)
  useEffect(() => {
    const interval = setInterval(fetchFullData, wsConnected ? 60000 : 15000);
    return () => clearInterval(interval);
  }, [fetchFullData, wsConnected]);

  return {
    opportunities,
    loading,
    error,
    filters,
    setFilters,
    connected: wsConnected,
    refetch: fetchFullData,
    totalCount,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    timeframe,
    setTimeframe,
  };
}
