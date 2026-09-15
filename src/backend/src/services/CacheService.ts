import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const redisClient: RedisClientType = createClient({
  url: env.REDIS_URL,
}) as RedisClientType;

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis client error');
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
}

export class CacheService {
  private readonly ttl: number;

  constructor(ttlSeconds: number = env.RISK_SCORE_CACHE_TTL_SECONDS) {
    this.ttl = ttlSeconds;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await redisClient.set(key, JSON.stringify(value), {
      EX: ttlSeconds ?? this.ttl,
    });
  }

  async del(key: string): Promise<void> {
    await redisClient.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const count = await redisClient.exists(key);
    return count > 0;
  }
}
