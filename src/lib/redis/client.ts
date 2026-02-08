import { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

export async function getRedisClient(): Promise<RedisClient> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  await redisClient.connect();
  return redisClient;
}

export async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Cache helper with TTL
 */
export class CacheService {
  private client: RedisClient | null = null;

  async getClient(): Promise<RedisClient> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    const value = await client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Set cache value with TTL
   */
  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const client = await this.getClient();
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    await client.setEx(key, ttlSeconds, stringValue);
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    await client.del(key);
  }

  /**
   * Delete keys by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const client = await this.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Increment counter
   */
  async increment(key: string, amount = 1): Promise<number> {
    const client = await this.getClient();
    return await client.incrBy(key, amount);
  }

  /**
   * Set with expiration
   */
  async setWithExpiry(key: string, value: any, expiryDate: Date): Promise<void> {
    const client = await this.getClient();
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    const ttl = Math.floor((expiryDate.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await client.setEx(key, ttl, stringValue);
    }
  }
}

export const cache = new CacheService();
