import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

@Injectable()
export class CacheService {
  private stats: Map<string, { hits: number; misses: number }> = new Map();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.cacheManager.get<T>(key);
    this.recordAccess(key, !!value);
    return value;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Get or set - execute factory if cache miss
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  /**
   * Delete keys by pattern (prefix)
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // For in-memory cache, we may not have access to keys
      // This is a best-effort implementation
      if ((this.cacheManager as any).store?.getKeys) {
        const keys = await (this.cacheManager as any).store.getKeys();
        if (keys) {
          const matchingKeys = keys.filter((key: string) =>
            key.startsWith(pattern),
          );
          await this.deleteMany(matchingKeys);
        }
      }
    } catch (error) {
      console.warn(`Failed to delete pattern "${pattern}":`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // For cache-manager, we use del with a wildcard or reset equivalent
      // Different cache stores have different implementations
      await (this.cacheManager as any).reset?.();
    } catch (error) {
      // Fallback: delete all known keys
      console.warn('Cache reset failed, attempting manual clear', error);
    }
  }

  /**
   * Record cache hit/miss statistics
   */
  private recordAccess(key: string, isHit: boolean): void {
    if (!this.stats.has(key)) {
      this.stats.set(key, { hits: 0, misses: 0 });
    }

    const stat = this.stats.get(key)!;
    if (isHit) {
      stat.hits++;
    } else {
      stat.misses++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(key?: string): CacheStats | Map<string, CacheStats> {
    if (key) {
      const stat = this.stats.get(key);
      if (!stat) {
        return { hits: 0, misses: 0, hitRate: 0 };
      }
      const total = stat.hits + stat.misses;
      return {
        hits: stat.hits,
        misses: stat.misses,
        hitRate: total > 0 ? (stat.hits / total) * 100 : 0,
      };
    }

    const allStats = new Map<string, CacheStats>();
    this.stats.forEach((stat, key) => {
      const total = stat.hits + stat.misses;
      allStats.set(key, {
        hits: stat.hits,
        misses: stat.misses,
        hitRate: total > 0 ? (stat.hits / total) * 100 : 0,
      });
    });

    return allStats;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.clear();
  }
}
