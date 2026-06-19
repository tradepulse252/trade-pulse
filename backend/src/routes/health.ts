import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getCacheBackend, tryConnectRedis } from '../lib/redis';
import { pingBinance } from '../services/binance/rest-client';
import { binanceWs } from '../services/binance/ws-client';
import { getConnectedClients } from '../services/websocket/ws-broadcast';

const router = Router();
const startTime = Date.now();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus: 'healthy' | 'degraded' | 'down' = 'down';
  let redisStatus: 'healthy' | 'degraded' | 'down' | 'memory' = 'down';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'healthy';
  } catch {
    dbStatus = 'down';
  }

  await tryConnectRedis();
  const backend = getCacheBackend();
  const redisStatus =
    backend === 'redis' || backend === 'memory' ? 'healthy' : 'down';

  const restHealthy = await pingBinance();
  const wsReceiving = binanceWs.isReceiving;
  const wsConnected = binanceWs.isConnected;
  const wsStatus: 'healthy' | 'degraded' | 'down' = wsReceiving
    ? 'healthy'
    : wsConnected || restHealthy
      ? 'degraded'
      : 'down';

  res.json({
    status: dbStatus === 'healthy' && restHealthy ? 'healthy' : 'degraded',
    restApi: restHealthy ? 'healthy' : 'down',
    websocket: wsStatus,
    database: dbStatus,
    redis: redisStatus,
    cacheBackend: backend === 'none' ? null : backend,
    activeSymbols: await prisma.symbol.count({ where: { isActive: true } }),
    connectedClients: getConnectedClients(),
    lastWsMessage: binanceWs.lastMessageTimestamp
      ? new Date(binanceWs.lastMessageTimestamp).toISOString()
      : null,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

export default router;
