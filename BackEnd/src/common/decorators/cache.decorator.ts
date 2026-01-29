import {
  UseInterceptors,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface CacheDecoratorOptions {
  ttl?: number;
  key?: string | ((args: any[]) => string);
}

/**
 * Caching interceptor for method results
 * Usage: @Cacheable({ ttl: 300, key: 'quest_detail_{{id}}' })
 */
@Injectable()
export class CacheableInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const options: CacheDecoratorOptions = Reflect.getMetadata(
      'cache:options',
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(options, context);
    const cachedValue = await this.cacheManager.get(cacheKey);

    if (cachedValue !== undefined) {
      return of(cachedValue);
    }

    return next.handle().pipe(
      tap(async (value) => {
        await this.cacheManager.set(cacheKey, value, options.ttl);
      }),
    );
  }

  private generateCacheKey(
    options: CacheDecoratorOptions,
    context: ExecutionContext,
  ): string {
    if (typeof options.key === 'function') {
      const args = context.getArgs();
      return options.key(args);
    }

    if (typeof options.key === 'string') {
      const args = context.getArgs();
      let key = options.key;

      // Simple template replacement for {{0}}, {{1}}, etc.
      key = key.replace(/\{\{(\d+)\}\}/g, (match, index) => {
        const argIndex = parseInt(index);
        return args[argIndex]?.toString() || '';
      });

      // Replace {{param_name}} with value from request params
      const request = context.switchToHttp().getRequest();
      if (request.params) {
        Object.keys(request.params).forEach((param) => {
          key = key.replace(`{{${param}}}`, request.params[param]);
        });
      }

      return key;
    }

    return `cache_${Date.now()}`;
  }
}

/**
 * Decorator for caching method results
 * @example
 * @Cacheable({ ttl: 300, key: 'quests_{{status}}' })
 * async findByStatus(status: string) { ... }
 */
export function Cacheable(options: CacheDecoratorOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata('cache:options', options, descriptor.value);
    UseInterceptors(CacheableInterceptor)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * Invalidate cache by key pattern
 * Usage at method level to invalidate cache after mutations
 */
@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const patterns: string[] = Reflect.getMetadata(
      'cache:invalidate',
      context.getHandler(),
    );

    if (!patterns) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        try {
          const keys = await (this.cacheManager as any).store?.getKeys?.();
          if (keys) {
            const keysToInvalidate = keys.filter((key: string) =>
              patterns.some((pattern) => key.startsWith(pattern)),
            );
            await Promise.all(
              keysToInvalidate.map((key: string) =>
                this.cacheManager.del(key),
              ),
            );
          }
        } catch (error) {
          console.warn('Cache invalidation error:', error);
          // Continue without caching
        }
      }),
    );
  }
}

/**
 * Decorator for invalidating cache after mutations
 * @example
 * @CacheInvalidate(['quests_', 'quest_detail_'])
 * async updateQuest(id: string, dto: UpdateQuestDto) { ... }
 */
export function CacheInvalidate(patterns: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata('cache:invalidate', patterns, descriptor.value);
    UseInterceptors(CacheInvalidateInterceptor)(target, propertyKey, descriptor);
    return descriptor;
  };
}
