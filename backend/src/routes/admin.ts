import { Router, Response } from 'express';
import { db } from '../lib/db';
import { binanceWs } from '../services/binance/ws-client';
import { getConnectedClients } from '../services/websocket/ws-broadcast';
import { ingestionService } from '../services/data/ingestion-service';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { pingBinance } from '../services/binance/rest-client';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [userCount, alertCount, symbolCount, recentErrors, latestHealth] = await Promise.all([
    db.users.countActive(),
    db.alerts.countSince(since24h),
    db.symbols.countActive(),
    db.errorLogs.findMany({ limit: 20 }),
    db.systemHealth.findLatest(),
  ]);

  const restHealthy = await pingBinance();

  res.json({
    users: { active: userCount },
    alerts: { last24h: alertCount },
    symbols: { active: symbolCount },
    connections: { wsClients: getConnectedClients() },
    services: {
      restApi: restHealthy ? 'healthy' : 'down',
      binanceWs: binanceWs.isConnected ? 'healthy' : 'down',
      lastWsMessage: binanceWs.lastMessageTimestamp
        ? new Date(binanceWs.lastMessageTimestamp).toISOString()
        : null,
      marketSnapshots: ingestionService.getMarketData().length,
    },
    latestHealth,
    recentErrors: recentErrors.map((e) => ({
      id: e.id,
      source: e.source,
      level: e.level,
      message: e.message,
      createdAt: e.createdAt,
    })),
  });
});

router.get('/errors', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const source = req.query.source as string | undefined;

  const [errors, total] = await Promise.all([
    db.errorLogs.findMany({ source, limit, skip: (page - 1) * limit }),
    db.errorLogs.count(source),
  ]);

  res.json({ data: errors, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.post('/health-snapshot', async (_req: AuthRequest, res: Response) => {
  const restHealthy = await pingBinance();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const health = await db.systemHealth.create({
    restApiStatus: restHealthy ? 'healthy' : 'down',
    wsStatus: binanceWs.isConnected ? 'healthy' : 'down',
    lastRestPing: new Date(),
    lastWsMessage: binanceWs.lastMessageTimestamp
      ? new Date(binanceWs.lastMessageTimestamp)
      : null,
    activeSymbols: await db.symbols.countActive(),
    activeUsers: await db.users.countActive(),
    alertsToday: await db.alerts.countSince(since24h),
  });
  res.json({ data: health });
});

export default router;
