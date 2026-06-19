import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { pingBinance, get24hTickers } from '../services/binance/rest-client';
import { binanceWs } from '../services/binance/ws-client';
import { ingestionService } from '../services/data/ingestion-service';

const router = Router();

router.get('/binance', async (_req: Request, res: Response) => {
  const hasApiKey = Boolean(env.BINANCE_API_KEY && env.BINANCE_API_SECRET);
  const restOk = await pingBinance();
  const wsReceiving = binanceWs.isReceiving;

  res.json({
    configured: hasApiKey,
    apiKeySet: Boolean(env.BINANCE_API_KEY),
    restApi: restOk ? 'connected' : 'disconnected',
    websocket: wsReceiving ? 'connected' : restOk ? 'rest-fallback' : 'disconnected',
    lastWsMessage: binanceWs.lastMessageTimestamp
      ? new Date(binanceWs.lastMessageTimestamp).toISOString()
      : null,
    trackedSymbols: ingestionService.getTrackedSymbolCount(),
    liveOpportunities: ingestionService.getLiveOpportunities().length,
    mode: ingestionService.getMode(),
  });
});

router.post('/binance/test', async (_req: Request, res: Response) => {
  try {
    const tickers = await get24hTickers();
    const usdtCount = tickers.filter((t) => t.symbol.endsWith('USDT')).length;
    res.json({
      success: true,
      message: `Connected to Binance Futures — ${usdtCount} USDT pairs available`,
      apiKeyUsed: Boolean(env.BINANCE_API_KEY),
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      message: (error as Error).message,
    });
  }
});

export default router;
