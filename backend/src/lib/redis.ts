import Redis from 'ioredis';
import { env } from '../config/env';

type CacheBackend = 'redis' | 'memory' | 'none';

let redis: Redis | null = null;
let redisAvailable = false;
let cacheBackend: CacheBackend = 'none';

const memoryCache = new Map<string, { payload: string; expiresAt: number }>();

function useMemoryBackend(): void {
  cacheBackend = 'memory';
  redisAvailable = true;
}

function memoryGet<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(entry.payload) as T;
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
  memoryCache.set(key, {
    payload: JSON.stringify(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function shouldUseExternalRedis(): boolean {
  const url = env.REDIS_URL?.trim();
  return Boolean(url && !url.includes('localhost') && !url.includes('127.0.0.1'));
}

export function getCacheBackend(): CacheBackend {
  return cacheBackend;
}

export function getRedis(): Redis | null {
  if (!shouldUseExternalRedis()) return null;
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });
    redis.on('error', () => {
      redisAvailable = false;
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (shouldUseExternalRedis()) {
    try {
      const r = getRedis();
      if (r) {
        await r.connect().catch(() => {
          redisAvailable = false;
        });
        const data = await r.get(key);
        if (data) {
          redisAvailable = true;
          cacheBackend = 'redis';
          return JSON.parse(data) as T;
        }
      }
    } catch {
      redisAvailable = false;
    }
  }

  useMemoryBackend();
  return memoryGet<T>(key);
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  if (shouldUseExternalRedis()) {
    try {
      const r = getRedis();
      if (r) {
        await r.setex(key, ttlSeconds, JSON.stringify(value));
        redisAvailable = true;
        cacheBackend = 'redis';
        return;
      }
    } catch {
      redisAvailable = false;
    }
  }

  useMemoryBackend();
  memorySet(key, value, ttlSeconds);
}

export async function cacheDel(pattern: string): Promise<void> {
  if (shouldUseExternalRedis()) {
    try {
      const r = getRedis();
      if (r) {
        const keys = await r.keys(pattern);
        if (keys.length > 0) await r.del(...keys);
        return;
      }
    } catch {
      redisAvailable = false;
    }
  }

  if (pattern.includes('*')) {
    const prefix = pattern.replace('*', '');
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) memoryCache.delete(key);
    }
    return;
  }

  memoryCache.delete(pattern);
}

export async function publish(channel: string, message: unknown): Promise<void> {
  if (shouldUseExternalRedis()) {
    try {
      const r = getRedis();
      if (r) {
        await r.publish(channel, JSON.stringify(message));
        redisAvailable = true;
        cacheBackend = 'redis';
        return;
      }
    } catch {
      redisAvailable = false;
    }
  }

  useMemoryBackend();
}

export async function tryConnectRedis(): Promise<boolean> {
  if (!shouldUseExternalRedis()) {
    useMemoryBackend();
    console.log('[cache] Using in-memory cache (no external Redis configured)');
    return true;
  }

  try {
    const r = getRedis();
    if (!r) {
      useMemoryBackend();
      return true;
    }
    await r.connect();
    await r.ping();
    redisAvailable = true;
    cacheBackend = 'redis';
    console.log('[cache] Redis connected');
    return true;
  } catch {
    redisAvailable = false;
    useMemoryBackend();
    console.warn('[cache] Redis unavailable — using in-memory cache');
    return true;
  }
}
