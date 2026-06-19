'use client';

import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import type { ChartDataPoint } from '@/lib/api';

interface MetricChartProps {
  title: string;
  data: ChartDataPoint[];
  color: string;
  formatValue?: (v: number) => string;
  height?: number;
}

export function MetricChart({ title, data, color, formatValue, height = 200 }: MetricChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#848e9c',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      rightPriceScale: { borderColor: 'rgba(42, 46, 57, 0.8)' },
      timeScale: { borderColor: 'rgba(42, 46, 57, 0.8)', timeVisible: true },
      crosshair: { mode: 0 },
    });

    const series = chart.addAreaSeries({
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}05`,
      lineWidth: 2,
      priceFormat: formatValue
        ? { type: 'custom', formatter: formatValue }
        : { type: 'price', precision: 4, minMove: 0.0001 },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [color, height, formatValue]);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    seriesRef.current.setData(
      data.map((d) => ({ time: d.time as unknown as import('lightweight-charts').UTCTimestamp, value: d.value }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="glass rounded-lg p-3">
      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{title}</h4>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
