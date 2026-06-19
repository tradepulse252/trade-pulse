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

const app = express();
const server = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
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
  if (await tryConnectRedis()) {
    console.log('✅ Redis connected');
  } else {
    console.warn('⚠️  Redis unavailable — caching disabled');
  }

  await ingestionService.start();
  await initPushNotifications();
  try {
    await processPushQueue();
  } catch {
    console.warn('⚠️  Push notification queue unavailable');
  }

  server.listen(env.PORT, () => {
    console.log(`🚀 Trade-Pulse API running on port ${env.PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${env.PORT}/ws`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
  });
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
