import Redis, { RedisOptions } from 'ioredis';
import { logger } from './securityHardening';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    logger.info('[REDIS] Redis not configured.');
    return null;
  }

  try {
    if (redisUrl) {
      redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
        connectTimeout: 5000,
        keepAlive: 30000,

        retryStrategy(times) {
          if (times > 5) {
            return null;
          }

          return Math.min(times * 500, 3000);
        }
      });
    } else {
      const options: RedisOptions = {
        host: redisHost!,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,

        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,

        connectTimeout: 5000,
        keepAlive: 30000,

        retryStrategy(times) {
          if (times > 5) {
            return null;
          }

          return Math.min(times * 500, 3000);
        },

        tls:
          process.env.REDIS_TLS === 'true'
            ? {}
            : undefined
      };

      redisClient = new Redis(options);
    }

    redisClient.on('connect', () => {
      logger.info('[REDIS] Shared Redis client connected.');
    });

    redisClient.on('error', (err) => {
      logger.warn('[REDIS] Shared Redis connection error.', {
        error: err.message
      });
    });

    return redisClient;
  } catch (err: any) {
    logger.warn('[REDIS] Failed to initialize shared Redis client.', {
      error: err.message
    });

    redisClient = null;
    return null;
  }
}