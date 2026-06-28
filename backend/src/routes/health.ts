import { Router, Request, Response } from 'express';
import { db, ensureDb } from '../lib/db';
import { getCacheBackend, tryConnectRedis } from '../lib/redis';
import { pingBinance } from '../services/binance/rest-client';
import { binanceWs } from '../services/binance/ws-client';
import { getConnectedClients } from '../services/websocket/ws-broadcast';

const router = Router();
const startTime = Date.now();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus: 'healthy' | 'degraded' | 'down' = 'down';

  try {
    const ok = await ensureDb();
    dbStatus = ok ? 'healthy' : 'down';
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

  let activeSymbols = 0;
  try {
    activeSymbols = await db.symbols.countActive();
  } catch {
    // Firestore unavailable
  }

  res.json({
    status: dbStatus === 'healthy' && restHealthy ? 'healthy' : 'degraded',
    restApi: restHealthy ? 'healthy' : 'down',
    websocket: wsStatus,
    database: dbStatus,
    redis: redisStatus,
    cacheBackend: backend === 'none' ? null : backend,
    activeSymbols,
    connectedClients: getConnectedClients(),
    lastWsMessage: binanceWs.lastMessageTimestamp
      ? new Date(binanceWs.lastMessageTimestamp).toISOString()
      : null,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

export default router;
