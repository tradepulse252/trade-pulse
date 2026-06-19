import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';
import { pingBinance } from '../services/binance/rest-client';
import { binanceWs } from '../services/binance/ws-client';
import { getConnectedClients } from '../services/websocket/ws-broadcast';

const router = Router();
const startTime = Date.now();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus: 'healthy' | 'degraded' | 'down' = 'down';
  let redisStatus: 'healthy' | 'degraded' | 'down' = 'down';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'healthy';
  } catch {
    dbStatus = 'down';
  }

  try {
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      redisStatus = 'healthy';
    }
  } catch {
    redisStatus = 'down';
  }

  const restHealthy = await pingBinance();
  const wsHealthy = binanceWs.isConnected;
  const wsStale = Date.now() - binanceWs.lastMessageTimestamp > 60_000;

  res.json({
    status: dbStatus === 'healthy' && restHealthy ? 'healthy' : 'degraded',
    restApi: restHealthy ? 'healthy' : 'down',
    websocket: wsHealthy && !wsStale ? 'healthy' : wsHealthy ? 'degraded' : 'down',
    database: dbStatus,
    redis: redisStatus,
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
