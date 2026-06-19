import type { Opportunity } from './api';

export type SortField =
  | 'score'
  | 'openInterest'
  | 'volume'
  | 'funding'
  | 'oiChange'
  | 'volumeChange';

export type SortOrder = 'asc' | 'desc';

export type TimeframeKey = '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '24h';

export const TIMEFRAME_OPTIONS: { value: TimeframeKey; label: string }[] = [
  { value: '5m', label: '5min' },
  { value: '15m', label: '15min' },
  { value: '30m', label: '30min' },
  { value: '1h', label: '1hr' },
  { value: '2h', label: '2hr' },
  { value: '4h', label: '4hr' },
  { value: '24h', label: '24hr' },
];

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'score', label: 'Opportunity Score' },
  { value: 'openInterest', label: 'Open Interest' },
  { value: 'volume', label: 'Volume (24h)' },
  { value: 'funding', label: 'Funding Rate' },
  { value: 'oiChange', label: 'OI Change %' },
  { value: 'volumeChange', label: 'Volume Change %' },
];

export function getGrowthForTimeframe(opp: Opportunity, timeframe: TimeframeKey) {
  const m = opp.growthMatrix?.[timeframe];
  return {
    priceChangePct: m?.priceChangePct ?? opp.priceMomentum ?? 0,
    oiChangePct: m?.oiChangePct ?? opp.oiChangePct ?? 0,
    volumeChangePct: m?.volumeChangePct ?? opp.volumeChangePct ?? 0,
  };
}

export function sortOpportunities(
  data: Opportunity[],
  sortBy: SortField,
  sortOrder: SortOrder,
  timeframe: TimeframeKey
): Opportunity[] {
  const sorted = [...data].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    switch (sortBy) {
      case 'score':
        aVal = a.opportunityScore;
        bVal = b.opportunityScore;
        break;
      case 'openInterest':
        aVal = a.openInterest;
        bVal = b.openInterest;
        break;
      case 'volume':
        aVal = a.volumeUsdt;
        bVal = b.volumeUsdt;
        break;
      case 'funding':
        aVal = a.fundingRate;
        bVal = b.fundingRate;
        break;
      case 'oiChange':
        aVal = getGrowthForTimeframe(a, timeframe).oiChangePct;
        bVal = getGrowthForTimeframe(b, timeframe).oiChangePct;
        break;
      case 'volumeChange':
        aVal = getGrowthForTimeframe(a, timeframe).volumeChangePct;
        bVal = getGrowthForTimeframe(b, timeframe).volumeChangePct;
        break;
    }

    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: sortBy === 'score' ? item.rank ?? index + 1 : index + 1,
  }));
}

export function getTimeframeLabel(tf: TimeframeKey): string {
  return TIMEFRAME_OPTIONS.find((o) => o.value === tf)?.label ?? tf;
}
