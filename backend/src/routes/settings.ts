import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { pingBinance, get24hTickers, isBinanceIpBanned, getBinanceBanRemainingMs } from '../services/binance/rest-client';
import { binanceWs } from '../services/binance/ws-client';
import { ingestionService } from '../services/data/ingestion-service';

const router = Router();

router.get('/binance', async (_req: Request, res: Response) => {
  const hasApiKey = Boolean(env.BINANCE_API_KEY && env.BINANCE_API_SECRET);
  const ipBanned = isBinanceIpBanned();
  const restOk = ipBanned ? false : await pingBinance();
  const wsReceiving = binanceWs.isReceiving;
  const wsConnected = binanceWs.isConnected;
  const websocketStatus = wsReceiving
    ? 'connected'
    : wsConnected
      ? 'connecting'
      : restOk
        ? 'rest-fallback'
        : 'disconnected';

  res.json({
    configured: hasApiKey,
    apiKeySet: Boolean(env.BINANCE_API_KEY),
    restApi: ipBanned ? 'rate-limited' : restOk ? 'connected' : 'disconnected',
    rateLimited: ipBanned,
    rateLimitRetryMinutes: ipBanned ? Math.ceil(getBinanceBanRemainingMs() / 60_000) : 0,
    websocket: websocketStatus,
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
    if (isBinanceIpBanned()) {
      const mins = Math.ceil(getBinanceBanRemainingMs() / 60_000);
      res.status(429).json({
        success: false,
        message: `Binance IP is temporarily rate-limited. Wait ~${mins} minute${mins === 1 ? '' : 's'} before testing again.`,
        rateLimited: true,
      });
      return;
    }

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
