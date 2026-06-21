'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { CoinLogo } from '@/components/ui/CoinLogo';
import { CoinGlassFlowTable } from '@/components/coin/CoinGlassFlowTable';
import { CoinExchangeTable } from '@/components/coin/CoinExchangeTable';
import { CoinLiquidationPanel } from '@/components/coin/CoinLiquidationPanel';
import { CoinVolumeHeatmap } from '@/components/coin/CoinVolumeHeatmap';
import { TradingViewChart } from '@/components/coin/TradingViewChart';
import { LivePrice } from '@/components/dashboard/LivePrice';
import { getAggregatedMarket, type AggregatedMarket } from '@/lib/api';
import { changeUsdFromPct } from '@/lib/metrics';
import { cn, formatFunding, formatNumber, formatPct, formatPrice, getSignalClass, getSignalLabel } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';

type TabKey = 'overview' | 'flows';

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 min-w-[130px]">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-semibold font-mono tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export default function CoinDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string).toUpperCase();
  const tvSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
  const ref = searchParams.get('ref');
  const backHref = ref === 'signals' ? '/signals' : '/';
  const backLabel = ref === 'signals' ? 'Back to Signals' : 'Back to Market';

  const [market, setMarket] = useState<AggregatedMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
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
  const venues = market.venues ?? [];

  return (
    <AppShell connected={connected}>
      <div className="p-5 lg:p-6 max-w-[1500px] space-y-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>

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
        </div>

        <div className="flex flex-wrap gap-3">
          <StatBox label="Market Cap" value={market.marketCap > 0 ? `$${formatNumber(market.marketCap)}` : '—'} />
          <StatBox label="Open Interest" value={`$${formatNumber(market.totalOpenInterest)}`} />
          <StatBox label="Futures Vol (24h)" value={`$${formatNumber(market.totalVolumeUsdt)}`} />
          <StatBox label="Avg Funding" value={formatFunding(market.avgFundingRate)} />
        </div>

        <div className="flex gap-1 border-b border-white/[0.06]">
          {(['overview', 'flows'] as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {key === 'flows' ? 'Futures Flows' : 'Overview'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
            <div className="space-y-4 min-w-0">
              <div className="glass-card overflow-hidden">
                <CoinExchangeTable market={market} />
              </div>

              <div className="glass-card p-4">
                <h2 className="text-sm font-semibold mb-3">{market.baseAsset} Live Chart</h2>
                <TradingViewChart symbol={tvSymbol} height={500} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-4">
                <CoinLiquidationPanel market={market} />
              </div>
              <div className="glass-card p-4">
                <CoinVolumeHeatmap venues={venues} title={`${market.baseAsset} Volume Heatmap`} />
              </div>
            </div>
          </div>
        )}

        {tab === 'flows' && (
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold mb-4">{market.baseAsset} Futures Flows</h2>
            <CoinGlassFlowTable market={market} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
