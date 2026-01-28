import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { getCacheConfig } from '../../config/cache.config';
import { CacheService } from './cache.service';
import { CacheController } from './cache.controller';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: getCacheConfig,
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
  controllers: [CacheController],
})
export class CacheModule {}
