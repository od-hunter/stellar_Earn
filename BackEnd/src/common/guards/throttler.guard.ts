import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';

import { UserRole } from '../../modules/auth/enums/user-role.enum';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const { req } = this.getRequestResponse(context);
    if (req?.user?.role === UserRole.ADMIN) {
      return true;
    }

    const authHeader = req?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token) as { role?: string };
        return payload?.role === UserRole.ADMIN;
      } catch {
        return false;
      }
    }

    return false;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req?.user?.id ?? req?.user?.stellarAddress ?? req?.user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    const authHeader = req?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token) as {
          sub?: string;
          stellarAddress?: string;
        };
        const jwtUserId = payload?.sub ?? payload?.stellarAddress;
        if (jwtUserId) {
          return `user:${jwtUserId}`;
        }
      } catch {
        // ignore invalid tokens and fall back to IP
      }
    }

    const forwarded = req.headers?.['x-forwarded-for'];
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return `ip:${forwarded[0]}`;
    }

    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return `ip:${forwarded.split(',')[0].trim()}`;
    }

    if (Array.isArray(req?.ips) && req.ips.length > 0) {
      return `ip:${req.ips[0]}`;
    }

    if (typeof req?.ip === 'string' && req.ip.length > 0) {
      return `ip:${req.ip}`;
    }

    return 'ip:unknown';
  }
}
