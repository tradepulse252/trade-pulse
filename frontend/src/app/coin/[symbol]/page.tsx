'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { CoinLogo } from '@/components/ui/CoinLogo';
import { CoinGlassFlowTable } from '@/components/coin/CoinGlassFlowTable';
import { CoinExchangeTable } from '@/components/coin/CoinExchangeTable';
import { LivePrice } from '@/components/dashboard/LivePrice';
import { getAggregatedMarket, type AggregatedMarket } from '@/lib/api';
import { changeUsdFromPct } from '@/lib/metrics';
import { cn, formatFunding, formatNumber, formatPct, formatPrice, getSignalClass, getSignalLabel } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';

type TabKey = 'overview' | 'flows' | 'exchanges';

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 min-w-[140px]">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-semibold font-mono tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CoinDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string).toUpperCase();
  const ref = searchParams.get('ref');
  const backHref = ref === 'signals' ? '/signals' : '/';
  const backLabel = ref === 'signals' ? 'Back to Signals' : 'Back to Market';

  const [market, setMarket] = useState<AggregatedMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('flows');
  const { connected } = useOpportunities();

  useEffect(() => {
    const load = () =>
      getAggregatedMarket(symbol)
        .then(setMarket)
        .finally(() => setLoading(false));
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [symbol]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'flows', label: 'Futures Flows' },
    { key: 'exchanges', label: 'Exchanges' },
  ];

  if (loading) {
    return (
      <AppShell connected={connected}>
        <div className="flex items-center justify-center h-96 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Loading {symbol}…
        </div>
      </AppShell>
    );
  }

  if (!market) {
    return (
      <AppShell connected={connected}>
        <div className="p-6 text-center space-y-3">
          <p className="text-short font-medium">Coin not found</p>
          <Link href={backHref} className="text-primary text-sm inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
        </div>
      </AppShell>
    );
  }

  const priceDeltaUsd = changeUsdFromPct(market.price, market.priceChange24h);
  const positive = market.priceChange24h >= 0;

  return (
    <AppShell connected={connected}>
      <div className="p-5 lg:p-6 max-w-[1400px] space-y-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>

        {/* CoinGlass-style header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <CoinLogo baseAsset={market.baseAsset} iconUrl={market.iconUrl} size={56} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{market.baseAsset}</h1>
                <span className="text-muted-foreground text-sm font-mono">{market.symbol}</span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md', getSignalClass(market.signalType))}>
                  {getSignalLabel(market.signalType)}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-2 flex-wrap">
                <LivePrice price={market.price} className="text-3xl font-bold font-mono" />
                <span className={cn('text-sm font-mono font-semibold', positive ? 'text-long' : 'text-short')}>
                  {positive ? '+' : ''}
                  {formatPrice(Math.abs(priceDeltaUsd))} ({formatPct(market.priceChange24h)})
                </span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Score {market.opportunityScore.toFixed(1)}</p>
            <p className="mt-0.5">{market.venueCount} exchanges · live aggregated</p>
          </div>
        </div>

        {/* Stats bar — CoinGlass style */}
        <div className="flex flex-wrap gap-3">
          <StatBox
            label="Market Cap"
            value={market.marketCap > 0 ? `$${formatNumber(market.marketCap)}` : '—'}
          />
          <StatBox
            label="Open Interest"
            value={`$${formatNumber(market.totalOpenInterest)}`}
          />
          <StatBox
            label="Futures Vol (24h)"
            value={`$${formatNumber(market.totalVolumeUsdt)}`}
          />
          <StatBox label="Avg Funding" value={formatFunding(market.avgFundingRate)} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/[0.06]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="glass-card overflow-hidden">
          {tab === 'overview' && (
            <div className="p-5 space-y-6">
              <div>
                <h2 className="text-sm font-semibold mb-3">Aggregated Futures Flows</h2>
                <CoinGlassFlowTable market={market} />
              </div>
              <div>
                <h2 className="text-sm font-semibold mb-3">{market.baseAsset} Markets</h2>
                <CoinExchangeTable market={market} />
              </div>
            </div>
          )}

          {tab === 'flows' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">{market.baseAsset} Futures Flows</h2>
                <p className="text-[10px] text-muted-foreground">CEX + DEX: {market.exchanges.join(', ')}</p>
              </div>
              <CoinGlassFlowTable market={market} />
              <p className="text-[10px] text-muted-foreground mt-4 px-1">
                Inflow / outflow derived from aggregated OI and volume changes across Binance, Bybit, OKX, and
                Hyperliquid. Refreshes every 30s.
              </p>
            </div>
          )}

          {tab === 'exchanges' && (
            <div className="p-5">
              <h2 className="text-sm font-semibold mb-4">{market.baseAsset} Markets</h2>
              <CoinExchangeTable market={market} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
