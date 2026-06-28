import { TradeDirection, TradeResult } from '../../lib/db/types';

export function calculateTradeMetrics(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number,
  positionSize: number
) {
  const priceChangePct =
    direction === TradeDirection.LONG
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;

  const pnlPct = Math.round(priceChangePct * 100) / 100;
  const pnlUsd = Math.round(((positionSize * priceChangePct) / 100) * 100) / 100;

  let tradeResult: TradeResult;
  if (pnlUsd > 0) tradeResult = TradeResult.WIN;
  else if (pnlUsd < 0) tradeResult = TradeResult.LOSS;
  else tradeResult = TradeResult.BREAKEVEN;

  return { pnlUsd, pnlPct, tradeResult };
}
