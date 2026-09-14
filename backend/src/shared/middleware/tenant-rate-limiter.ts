import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number; // timestamp in ms
}

/**
 * In-Memory Sliding Window Rate Limiter per Tenant and per IP
 */
class TenantRateLimiter {
  private tenantStore = new Map<string, RateLimitRecord>();
  private ipStore = new Map<string, RateLimitRecord>();

  // Default rate limits
  private defaultWindowMs = 60 * 1000; // 1 minute
  private defaultTenantMaxRequests = 300; // 300 req/min per tenant
  private defaultIpMaxRequests = 60; // 60 req/min per unauthenticated IP

  /**
   * Reset store (dùng trong unit tests)
   */
  public resetStore(): void {
    this.tenantStore.clear();
    this.ipStore.clear();
  }

  /**
   * Cấu hình giới hạn tùy chỉnh
   */
  public setLimits(tenantMax: number, ipMax: number, windowMs: number = 60000): void {
    this.defaultTenantMaxRequests = tenantMax;
    this.defaultIpMaxRequests = ipMax;
    this.defaultWindowMs = windowMs;
  }

  /**
   * Express Middleware function
   */
  public middleware(customMax?: number, customWindowMs?: number) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      const windowMs = customWindowMs || this.defaultWindowMs;
      
      const tenantId = (req as any).user?.tenantId || (req.headers['x-tenant-id'] as string);
      const isSystemAdmin = (req as any).user?.isSystemAdmin || false;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      // Bypass rate limit for system admin
      if (isSystemAdmin) {
        return next();
      }

      let key: string;
      let store: Map<string, RateLimitRecord>;
      let maxLimit: number;

      if (tenantId) {
        key = `tenant:${tenantId}`;
        store = this.tenantStore;
        maxLimit = customMax || this.defaultTenantMaxRequests;
      } else {
        key = `ip:${clientIp}`;
        store = this.ipStore;
        maxLimit = customMax || this.defaultIpMaxRequests;
      }

      let record = store.get(key);

      if (!record || now > record.resetTime) {
        record = {
          count: 1,
          resetTime: now + windowMs,
        };
        store.set(key, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, maxLimit - record.count);
      const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

      // Set standard RateLimit headers
      res.setHeader('X-RateLimit-Limit', maxLimit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds);

      if (record.count > maxLimit) {
        res.setHeader('Retry-After', resetSeconds);
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Tenant hoặc IP của bạn đã vượt quá giới hạn ${maxLimit} yêu cầu/${Math.round(windowMs / 1000)}s. Vui lòng thử lại sau ${resetSeconds} giây.`,
          retryAfter: resetSeconds,
        });
        return;
      }

      next();
    };
  }
}

export const tenantRateLimiter = new TenantRateLimiter();
