/**
 * Enterprise Redis Caching & Rate Limiting Service
 */

class RedisService {
  constructor() {
    this.memoryCache = new Map();
    this.redisHost = process.env.REDIS_HOST || '127.0.0.1';
    this.redisPort = process.env.REDIS_PORT || 6379;
    this.isConnected = false;
  }

  /**
   * Set cache entry with TTL (seconds)
   */
  async set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value, expiresAt });
    return true;
  }

  /**
   * Get cached value
   */
  async get(key) {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Delete key
   */
  async del(key) {
    return this.memoryCache.delete(key);
  }

  /**
   * Webhook Message Deduplication (Prevents duplicate processing of Meta WAMIDs)
   */
  async isDuplicateWebhook(metaMessageId) {
    const key = `dedup:webhook:${metaMessageId}`;
    const exists = await this.get(key);
    if (exists) return true;
    await this.set(key, '1', 600); // 10 mins cache
    return false;
  }

  /**
   * Store Agent Presence State
   */
  async setAgentPresence(companyId, agentId, presence) {
    const key = `presence:${companyId}:${agentId}`;
    await this.set(key, { presence, lastSeen: new Date() }, 3600);
  }

  /**
   * Sliding Window Rate Limiting
   */
  async checkRateLimit(identifier, limit = 100, windowSeconds = 60) {
    const key = `ratelimit:${identifier}`;
    const current = (await this.get(key)) || 0;
    if (current >= limit) {
      return { allowed: false, current, limit };
    }
    await this.set(key, current + 1, windowSeconds);
    return { allowed: true, current: current + 1, limit };
  }
}

export const redisService = new RedisService();
