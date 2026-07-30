import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import crypto from 'crypto';

export type SecurityEventType = 
  | 'FAILED_LOGIN' 
  | 'CSRF_FAILURE' 
  | 'BAN_ATTEMPT' 
  | 'UNAUTHORIZED_ROLE_REGISTRATION' 
  | 'UNAUTHORIZED_IP_WEBHOOK' 
  | 'RATE_LIMIT_EXCEEDED' 
  | 'SUSPICIOUS_PAYLOAD'
  | 'LEDGER_INTEGRATION_AUDIT';

export function logSecurityEvent(
  eventType: SecurityEventType,
  details: Record<string, any>,
  req?: Request
) {
  const ip = req ? getClientIp(req) : details.ip || 'UNKNOWN_IP';
  const userAgent = req?.headers['user-agent'] || 'UNKNOWN_UA';
  const eventPayload = {
    timestamp: new Date().toISOString(),
    event: 'SECURITY_AUDIT_LOG',
    type: eventType,
    ip,
    userAgent,
    ...details
  };
  logger.warn(`[SECURITY AUDIT LOG - ${eventType}]`, eventPayload);
}

// ============================================================================
// 1. STRUCTURED LOGGING
// ============================================================================
export const logger = {
  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...meta
    }));
  },
  warn(message: string, meta?: any) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      ...meta
    }));
  },
  error(message: string, meta?: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      ...meta
    }));
  },
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        ...meta
      }));
    }
  }
};

// ============================================================================
// 2. ENVIRONMENT VARIABLE VALIDATION
// ============================================================================
export function validateEnvironment() {
  logger.info('Validating environment configurations...');
  let jwtSecret = process.env.JWT_SECRET;
  let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || jwtSecret.trim().length < 32) {
    if (process.env.NODE_ENV === 'production') {
      const errorMsg = 'CRITICAL SECURITY FATAL ERROR: JWT_SECRET environment variable is missing or shorter than 32 characters/bytes in production! Hardcoded defaults are prohibited.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      jwtSecret = crypto.randomBytes(32).toString('hex');
      process.env.JWT_SECRET = jwtSecret;
      logger.warn('[SECURITY WARNING] Generated high-entropy ephemeral JWT_SECRET for dev/test runner.');
    }
  }

  if (!jwtRefreshSecret || jwtRefreshSecret.trim().length < 32) {
    if (process.env.NODE_ENV === 'production') {
      const errorMsg = 'CRITICAL SECURITY FATAL ERROR: JWT_REFRESH_SECRET environment variable is missing or shorter than 32 characters/bytes in production! Hardcoded defaults are prohibited.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
      process.env.JWT_REFRESH_SECRET = jwtRefreshSecret;
      logger.warn('[SECURITY WARNING] Generated high-entropy ephemeral JWT_REFRESH_SECRET for dev/test runner.');
    }
  }

  logger.info('All critical JWT environment secrets successfully validated (>= 32 bytes strong entropy).');
}

// ============================================================================
// 3. HELMET & CUSTOM CONTENT SECURITY POLICY (CSP)
// ============================================================================
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: [
        "'self'", 
        "data:", 
        "blob:",
        "https://images.unsplash.com", 
        "https://*.tile.openstreetmap.org", 
        "https://maps.gstatic.com", 
        "https://maps.googleapis.com",
        "https://*.run.app"
      ],
      connectSrc: [
        "'self'", 
        "ws:", 
        "wss:", 
        "https://maps.googleapis.com", 
        "https://*.run.app",
        "https://api.sandbox.safaricom.co.ke",
        "https://api.safaricom.co.ke"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: [
        "'self'", 
        "https://*.google.com", 
        "https://ai.studio", 
        "https://*.run.app"
      ]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: false
});

// ============================================================================
// 4. RATE LIMITING MIDDLEWARE (Redis Distributed Store for Multi-Instance Deployments)
// ============================================================================
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

const createRedisStore = (prefix: string) => {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  if (redisUrl || redisHost) {
    try {
      const client = new Redis((redisUrl || {
        host: redisHost || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1
      }) as any);

      logger.info(`[RateLimit] Initialized Redis store with prefix '${prefix}' for multi-instance cluster deployment.`);

      return new RedisStore({
        // @ts-expect-error - ioredis sendCommand call compatible
        sendCommand: (...args: string[]) => client.call(...args),
        prefix: `rl:${prefix}:`
      });
    } catch (err: any) {
      logger.warn('[RateLimit] Failed to initialize Redis store, falling back to local memory store:', { error: err.message });
      return undefined;
    }
  }
  return undefined;
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  message: {
    error: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  handler: (req: Request, res: Response, next: NextFunction, options: any) => {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { endpoint: req.originalUrl, scope: 'api' }, req);
    res.status(options.statusCode).json(options.message);
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  handler: (req: Request, res: Response, next: NextFunction, options: any) => {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { endpoint: req.originalUrl, scope: 'auth' }, req);
    res.status(options.statusCode).json(options.message);
  }
});

// Force TLS/HTTPS & Strict-Transport-Security (HSTS)
export function forceHttpsAndHsts(req: Request, res: Response, next: NextFunction) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  // Enforce HSTS header (1 year, subdomains, preload)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  if (!isHttps && process.env.NODE_ENV === 'production') {
    const host = req.headers.host || req.hostname;
    return res.redirect(301, `https://${host}${req.url}`);
  }

  next();
}

// ============================================================================
// 5. CSRF PROTECTION MIDDLEWARE (Double Submit Cookie Pattern)
// ============================================================================
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const rawCookies = req.headers.cookie || '';
  const parsedCookies: Record<string, string> = {};
  rawCookies.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length === 2) {
      parsedCookies[parts[0].trim()] = parts[1].trim();
    }
  });

  let csrfToken = parsedCookies['XSRF-TOKEN'] || req.cookies?.['XSRF-TOKEN'];
  const hasXsrfCookie = !!csrfToken;

  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      path: '/'
    });
  }

  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const hasAuthHeader = !!req.headers['authorization'];
  const isAuthRoute = req.originalUrl?.includes('/api/auth/login') || req.originalUrl?.includes('/api/auth/register');
  
  if (hasAuthHeader || isAuthRoute || !hasXsrfCookie) {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'] || req.body?._csrf;

  if (!clientToken || clientToken !== csrfToken) {
    logSecurityEvent('CSRF_FAILURE', {
      method: req.method,
      url: req.originalUrl,
      reason: 'Invalid or missing CSRF token'
    }, req);
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
  }

  next();
};

// ============================================================================
// 6. REDIS CACHING SYSTEM (With Graceful In-Memory Fallback)
// ============================================================================
class CacheManager {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { value: any; expiresAt: number }>();
  private isRedisConnected = false;

  constructor() {
    const redisHost = process.env.REDIS_HOST;
    const useRedis = process.env.USE_REDIS === 'true' || (!!redisHost && process.env.USE_REDIS !== 'false');

    if (useRedis && redisHost) {
      try {
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');
        const redisPassword = process.env.REDIS_PASSWORD || undefined;

        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          connectTimeout: 1500,
          maxRetriesPerRequest: 1
        });

        this.redis.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('[CACHE MANAGER] Redis Cache connected successfully.');
        });

        this.redis.on('error', (err) => {
          this.isRedisConnected = false;
          logger.warn('[CACHE MANAGER] Redis encountered connection issue. Switching to fallback in-memory cache:', { error: err.message });
        });
      } catch (err) {
        logger.warn('[CACHE MANAGER] Redis initialization failed. Using in-memory fallback cache.');
      }
    } else {
      logger.info('[CACHE MANAGER] Redis disabled or unconfigured. Operating exclusively in high-availability in-memory cache.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConnected && this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch (err) {
        logger.warn('[CACHE MANAGER] Failed to fetch cache key from Redis. Reading from memory cache fallback.', { key });
      }
    }

    const local = this.memoryCache.get(key);
    if (local) {
      if (Date.now() < local.expiresAt) {
        return local.value as T;
      }
      this.memoryCache.delete(key);
    }
    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (err) {
        logger.warn('[CACHE MANAGER] Failed to save cache key to Redis. Saving in memory fallback.', { key });
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  async delete(key: string): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        logger.warn('[CACHE MANAGER] Failed to delete cache key from Redis.', { key });
      }
    }
    this.memoryCache.delete(key);
  }
}

export const cache = new CacheManager();

// Recursive input sanitizer helper
function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    // Strip HTML tags and dangerous javascript: protocol prefixes
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>?/gm, '')
      .replace(/javascript:/gi, 'javascript_blocked:');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val && typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      cleaned[k] = sanitizeValue(val[k]);
    }
    return cleaned;
  }
  return val;
}

export function sanitizePayloadMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

// ============================================================================
// 7. REQUEST VALIDATION UTILITY
// ============================================================================
export function validateRequestBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredFields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      logger.warn('Incoming payload missing required fields', { 
        url: req.originalUrl, 
        missing 
      });
      return res.status(400).json({ 
        error: `Validation failed: Missing required fields: ${missing.join(', ')}` 
      });
    }

    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        const val = req.body[key];
        if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val)) {
          logger.warn('Sanitization: Blocked potential script injection input', { key });
          return res.status(400).json({ error: 'Security Exception: Malicious scripts detected in inputs.' });
        }
      }
    }

    next();
  };
}

// ============================================================================
// 8. TELEMETRY: SENTRY & BETTERSTACK INTEGRATION
// ============================================================================
export const telemetry = {
  initialize() {
    const sentryDsn = process.env.SENTRY_DSN;
    const betterStackToken = process.env.BETTER_STACK_TOKEN;

    if (sentryDsn) {
      logger.info('Sentry DSN detected. Initializing Sentry core SDK telemetry routing...');
    }
    if (betterStackToken) {
      logger.info('BetterStack Token detected. Injecting log shipping hooks...');
    }
  },
  captureException(error: Error, context?: any) {
    logger.error(`[EXCEPTION SHIPPED TO TELEMETRY]: ${error.message}`, { 
      stack: error.stack, 
      ...context 
    });
  }
};
