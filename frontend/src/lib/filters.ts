import type { Opportunity } from './api';

export function applyOpportunityFilters(
  data: Opportunity[],
  filters: Record<string, string | number>
): Opportunity[] {
  const limit = Number(filters.limit) || 50;
  const symbolQuery = filters.symbols ? String(filters.symbols).trim().toUpperCase() : '';
  const hasActiveFilters =
    symbolQuery ||
    filters.signalType ||
    filters.minScore ||
    filters.minOi ||
    filters.minVolume ||
    filters.fundingRateMin ||
    filters.fundingRateMax;

  const filtered = data.filter((item) => {
      if (filters.signalType && item.signalType !== filters.signalType) return false;

      if (filters.minScore !== undefined && filters.minScore !== '') {
        if (item.opportunityScore < Number(filters.minScore)) return false;
      }

      if (filters.minOi !== undefined && filters.minOi !== '') {
        if (item.openInterest < Number(filters.minOi)) return false;
      }

      if (filters.minVolume !== undefined && filters.minVolume !== '') {
        if (item.volumeUsdt < Number(filters.minVolume)) return false;
      }

      if (filters.fundingRateMin !== undefined && filters.fundingRateMin !== '') {
        if (item.fundingRate < Number(filters.fundingRateMin)) return false;
      }

      if (filters.fundingRateMax !== undefined && filters.fundingRateMax !== '') {
        if (item.fundingRate > Number(filters.fundingRateMax)) return false;
      }

      if (symbolQuery) {
        const terms = symbolQuery.split(',').map((t) => t.trim()).filter(Boolean);
        const matches = terms.some((term) => {
          const normalized = term.endsWith('USDT') ? term : `${term}USDT`;
          return (
            item.symbol === term ||
            item.symbol === normalized ||
            item.symbol.includes(term) ||
            item.symbol.replace('USDT', '').includes(term)
          );
        });
        if (!matches) return false;
      }

      return true;
    });

  return filtered.slice(0, hasActiveFilters ? filtered.length : limit);
}
