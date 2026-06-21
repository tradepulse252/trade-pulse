'use client';

import { useEffect, useId, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
  exchange?: 'BINANCE' | 'BYBIT' | 'OKX';
  height?: number;
}

export function TradingViewChart({ symbol, exchange = 'BINANCE', height = 480 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useId().replace(/:/g, '');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    el.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `${exchange}:${symbol}`,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: 'rgba(10, 10, 12, 1)',
      gridColor: 'rgba(255, 255, 255, 0.06)',
      support_host: 'https://www.tradingview.com',
    });
    el.appendChild(script);

    return () => {
      el.innerHTML = '';
    };
  }, [symbol, exchange, widgetId]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full rounded-xl overflow-hidden border border-white/[0.06]"
      style={{ height }}
    />
  );
}
