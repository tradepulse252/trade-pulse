import Redis from 'ioredis';
import { env } from '../config/env';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedis(): Redis | null {
  if (!redisAvailable && redis) return null;
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    redis.on('error', () => {
      redisAvailable = false;
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    if (!r) return null;
    await r.connect().catch(() => { redisAvailable = false; });
    const data = await r.get(key);
    redisAvailable = true;
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.setex(key, ttlSeconds, JSON.stringify(value));
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    const keys = await r.keys(pattern);
    if (keys.length > 0) await r.del(...keys);
  } catch {
    redisAvailable = false;
  }
}

export async function publish(channel: string, message: unknown): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.publish(channel, JSON.stringify(message));
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
}

export async function tryConnectRedis(): Promise<boolean> {
  try {
    const r = getRedis();
    if (!r) return false;
    await r.connect();
    await r.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}
