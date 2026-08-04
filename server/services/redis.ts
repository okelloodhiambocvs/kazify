import Redis from 'ioredis';
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

}