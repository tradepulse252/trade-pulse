import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/auth';
import { initWebSocketServer } from './services/websocket/ws-broadcast';
import { ingestionService } from './services/data/ingestion-service';
import { tryConnectRedis } from './lib/redis';
import { initPushNotifications, processPushQueue } from './services/notifications/push-service';
import { aggregationService } from './services/exchanges/aggregation-service';
import { db } from './lib/db';

function corsOrigins(): string[] {
  const raw = [env.CORS_ORIGIN, env.FRONTEND_URL].filter(Boolean).join(',');
  return [...new Set(raw.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean))];
}

const app = express();
const server = createServer(app);
const allowedOrigins = corsOrigins();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalized)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use('/api', apiRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Trade-Pulse API',
    tagline: 'Real-Time Opportunity Scanner',
    version: '1.0.0',
    docs: '/api/health',
  });
});

app.use(errorHandler);

initWebSocketServer(server);

async function bootstrap() {
  const startIngestion = async () => {
    try {
      await ingestionService.start();
    } catch (err) {
      console.warn('⚠️  Binance ingestion unavailable:', (err as Error).message);
    }
  };

  // Listen immediately so Railway/Vercel health checks pass while optional services connect.
  await new Promise<void>((resolve) => {
    server.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 Trade-Pulse API running on port ${env.PORT}`);
      console.log(`📡 WebSocket available at ws://0.0.0.0:${env.PORT}/ws`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      resolve();
    });
  });

  void (async () => {
    const dbReady = await db.init();
    if (dbReady) {
      console.log('✅ Firestore connected');
    } else {
      console.warn('⚠️  Firestore unavailable — user/market persistence disabled');
    }

    if (await tryConnectRedis()) {
      console.log('✅ Redis connected');
    } else {
      console.warn('⚠️  Redis unavailable — caching disabled');
    }

    void startIngestion();
    setTimeout(() => aggregationService.start(), env.NODE_ENV === 'production' ? 3_000 : 20_000);
    setInterval(() => {
      const hasAggregation = aggregationService.getMarkets().length > 0;
      if (hasAggregation) return;
      if (ingestionService.getLiveOpportunities().length === 0) {
        ingestionService.prepareRestart();
        void startIngestion();
      }
    }, 5 * 60_000);

    await initPushNotifications();
    try {
      await processPushQueue();
    } catch {
      console.warn('⚠️  Push notification queue unavailable');
    }
  })();
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  ingestionService.stop();
  server.close();
  process.exit(0);
});
