import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),
  BINANCE_REST_BASE: z.string().default('https://fapi.binance.com'),
  BINANCE_WS_BASE: z.string().default('wss://fstream.binance.com'),
  MIN_VOLUME_USDT: z.coerce.number().default(1_000_000),
  MIN_OPEN_INTEREST_USDT: z.coerce.number().default(500_000),
  SCORING_INTERVAL_MS: z.coerce.number().default(5000),
  OI_REFRESH_INTERVAL_MS: z.coerce.number().default(60_000),
  METRICS_RETENTION_DAYS: z.coerce.number().default(30),
  OI_SPIKE_THRESHOLD_PCT: z.coerce.number().default(5),
  VOLUME_SPIKE_THRESHOLD_PCT: z.coerce.number().default(10),
  FUNDING_FLIP_THRESHOLD: z.coerce.number().default(0.0001),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const TIMEFRAMES = ['5m', '15m', '30m', '1h', '2h', '4h', '24h', '7d'] as const;
export type TimeframeKey = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_MS: Record<TimeframeKey, number> = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

export const TIMEFRAME_TO_PRISMA = {
  '5m': 'M5',
  '15m': 'M15',
  '30m': 'M30',
  '1h': 'H1',
  '2h': 'H2',
  '4h': 'H4',
  '24h': 'H24',
  '7d': 'D7',
} as const;
