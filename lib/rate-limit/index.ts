import { Redis } from '@upstash/redis';

import { config } from '@/config';

type RateLimitResult = { allowed: boolean; remaining: number };

class MemoryStore {
  private hits = new Map<string, number[]>();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) {
      this.hits.set(key, arr);
      return { allowed: false, remaining: 0 };
    }
    arr.push(now);
    this.hits.set(key, arr);
    return { allowed: true, remaining: Math.max(0, limit - arr.length) };
  }
}

const memory = new MemoryStore();
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = config.UPSTASH.REDIS_REST_URL;
  const token = config.UPSTASH.REDIS_REST_TOKEN;
  if (url && token) {
    try {
      redis = new Redis({ url, token });
      return redis;
    } catch {
      redis = null;
      return null;
    }
  }
  return null;
}

export async function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const r = getRedis();
  if (r) {
    try {
      const windowSec = Math.ceil(windowMs / 1000);
      const redisKey = `rl:${key}`;
      const count = await r.incr(redisKey);
      if (count === 1) {
        await r.expire(redisKey, windowSec);
      }
      if (count > limit) {
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: Math.max(0, limit - count) };
    } catch {
      // fallback to memory
      return memory.check(key, limit, windowMs);
    }
  }
  return memory.check(key, limit, windowMs);
}
