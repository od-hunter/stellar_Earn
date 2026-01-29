import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';

/**
 * Global cache interceptor for GET requests
 * Caches responses based on URL and query parameters
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Skip caching for requests with cache control headers
    if (request.headers['cache-control']?.includes('no-cache')) {
      return next.handle();
    }

    // Skip caching if user is authenticated with cache-bypass header
    if (request.headers['x-cache-bypass'] === 'true') {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request);

    try {
      const cachedValue = await this.cacheManager.get(cacheKey);
      if (cachedValue !== undefined) {
        return of(cachedValue);
      }
    } catch (error) {
      // Log error but don't fail the request
      console.warn('Cache get error:', error);
    }

    return next.handle().pipe(
      tap(async (value) => {
        try {
          // Default TTL is 5 minutes for GET requests
          await this.cacheManager.set(cacheKey, value, 300000);
        } catch (error) {
          // Log error but don't fail the request
          console.warn('Cache set error:', error);
        }
      }),
    );
  }

  private generateCacheKey(request: Request): string {
    const { url, headers } = request;
    const userId = (headers['user-id'] as string) || 'anonymous';

    // Create a cache key from URL, user ID, and query parameters
    const queryString = new URLSearchParams(request.query as any).toString();
    return `${userId}:${url}${queryString ? `?${queryString}` : ''}`;
  }
}
