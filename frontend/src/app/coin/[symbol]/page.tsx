'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { MetricChart } from '@/components/charts/MetricChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCoinDetail, getChartData, type CoinDetail, type ChartData } from '@/lib/api';
import {
  cn,
  formatFunding,
  formatNumber,
  formatPct,
  formatPrice,
  getSignalClass,
  getSignalLabel,
} from '@/lib/utils';
import { ArrowLeft, TrendingUp, BarChart2, DollarSign, Activity, Star } from 'lucide-react';
import { useAuth, authHeaders } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TIMEFRAMES = ['5m', '15m', '30m', '1h', '2h', '4h', '24h', '7d'];

export default function CoinDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string).toUpperCase();
  const [detail, setDetail] = useState<CoinDetail | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlisted, setWatchlisted] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const [d, c] = await Promise.all([getCoinDetail(symbol), getChartData(symbol)]);
        setDetail(d);
        setCharts(c);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [symbol]);

  const addToWatchlist = async () => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    await fetch(`${API_URL}/api/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ symbol }),
    });
    setWatchlisted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground animate-pulse">
          Loading {symbol}...
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-short">Symbol not found</p>
          <Link href="/" className="text-primary text-sm mt-2 inline-block">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const signal = detail.signal;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Rankings
        </Link>

        {/* Coin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {detail.baseAsset}
              <span className="text-muted-foreground text-lg font-normal"> / {detail.quoteAsset}</span>
            </h1>
            {signal && (
              <p className="text-2xl font-mono mt-1">{formatPrice(signal.price)}</p>
            )}
          </div>
          {signal && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={addToWatchlist}
                disabled={watchlisted}
              >
                <Star className={`h-4 w-4 mr-1 ${watchlisted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {watchlisted ? 'Watchlisted' : 'Add to Watchlist'}
              </Button>
              <span className={cn('text-sm font-medium', getSignalClass(signal.signalType))}>
                {getSignalLabel(signal.signalType)}
              </span>
              <Badge variant="score" className="text-base px-3 py-1">
                Score: {signal.opportunityScore.toFixed(1)}
              </Badge>
              {signal.rank && (
                <Badge variant="neutral">Rank #{signal.rank}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Key Metrics */}
        {signal && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <BarChart2 className="h-3 w-3" /> Open Interest
                </div>
                <p className="text-lg font-mono font-semibold">${formatNumber(signal.openInterest)}</p>
                <p className={cn('text-xs font-mono', signal.oiChangePct >= 0 ? 'text-long' : 'text-short')}>
                  {formatPct(signal.oiChangePct)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Activity className="h-3 w-3" /> Volume (24h)
                </div>
                <p className="text-lg font-mono font-semibold">${formatNumber(signal.volumeUsdt)}</p>
                <p className={cn('text-xs font-mono', signal.volumeChangePct >= 0 ? 'text-long' : 'text-short')}>
                  {formatPct(signal.volumeChangePct)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <DollarSign className="h-3 w-3" /> Funding Rate
                </div>
                <p className={cn('text-lg font-mono font-semibold', signal.fundingRate < 0 ? 'text-long' : signal.fundingRate > 0.0003 ? 'text-short' : '')}>
                  {formatFunding(signal.fundingRate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3 w-3" /> Price Momentum
                </div>
                <p className={cn('text-lg font-mono font-semibold', signal.priceMomentum >= 0 ? 'text-long' : 'text-short')}>
                  {formatPct(signal.priceMomentum)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Growth Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historical Growth Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase">
                    <th className="text-left py-2 px-3">Timeframe</th>
                    <th className="text-right py-2 px-3">Price</th>
                    <th className="text-right py-2 px-3">Open Interest</th>
                    <th className="text-right py-2 px-3">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {TIMEFRAMES.map((tf) => {
                    const m = detail.growthMatrix[tf];
                    if (!m) return null;
                    return (
                      <tr key={tf} className="border-t border-border/50">
                        <td className="py-2 px-3 font-mono text-muted-foreground">{tf}</td>
                        <td className={cn('py-2 px-3 text-right font-mono', m.priceChangePct >= 0 ? 'text-long' : 'text-short')}>
                          {formatPct(m.priceChangePct)}
                        </td>
                        <td className={cn('py-2 px-3 text-right font-mono', m.oiChangePct >= 0 ? 'text-long' : 'text-short')}>
                          {formatPct(m.oiChangePct)}
                        </td>
                        <td className={cn('py-2 px-3 text-right font-mono', m.volumeChangePct >= 0 ? 'text-long' : 'text-short')}>
                          {formatPct(m.volumeChangePct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {charts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricChart title="Live Price" data={charts.price} color="#2962ff" height={220} />
            <MetricChart title="Open Interest" data={charts.openInterest} color="#00c076" height={220} formatValue={(v) => `$${formatNumber(v)}`} />
            <MetricChart title="Funding Rate" data={charts.fundingRate} color="#f0b90b" height={220} formatValue={(v) => `${(v * 100).toFixed(4)}%`} />
            <MetricChart title="Volume" data={charts.volume} color="#e040fb" height={220} formatValue={(v) => `$${formatNumber(v)}`} />
          </div>
        )}
      </main>
    </div>
  );
}
