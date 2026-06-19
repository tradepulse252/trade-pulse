import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { binanceWs } from '../services/binance/ws-client';
import { getConnectedClients } from '../services/websocket/ws-broadcast';
import { ingestionService } from '../services/data/ingestion-service';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { pingBinance } from '../services/binance/rest-client';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  const [userCount, alertCount, symbolCount, recentErrors, latestHealth] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.alert.count({
      where: { triggeredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.symbol.count({ where: { isActive: true } }),
    prisma.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.systemHealth.findFirst({ orderBy: { recordedAt: 'desc' } }),
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
    prisma.errorLog.findMany({
      where: source ? { source } : undefined,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.errorLog.count({ where: source ? { source } : undefined }),
  ]);

  res.json({ data: errors, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.post('/health-snapshot', async (_req: AuthRequest, res: Response) => {
  const restHealthy = await pingBinance();
  const health = await prisma.systemHealth.create({
    data: {
      restApiStatus: restHealthy ? 'healthy' : 'down',
      wsStatus: binanceWs.isConnected ? 'healthy' : 'down',
      lastRestPing: new Date(),
      lastWsMessage: binanceWs.lastMessageTimestamp
        ? new Date(binanceWs.lastMessageTimestamp)
        : null,
      activeSymbols: await prisma.symbol.count({ where: { isActive: true } }),
      activeUsers: await prisma.user.count({ where: { isActive: true } }),
      alertsToday: await prisma.alert.count({
        where: { triggeredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    },
  });
  res.json({ data: health });
});

export default router;
