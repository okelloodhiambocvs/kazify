import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, isDbMode } from '../db';
import { logger } from './securityHardening';
import { generateAccessToken } from '../middleware';

function getJwtRefreshSecret(): string {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  return process.env.JWT_REFRESH_SECRET;
}

interface InMemoryRefreshToken {
  userId: string;
  expiresAt: number;
  isRevoked: boolean;
}

const inMemoryRefreshTokens = new Map<string, InMemoryRefreshToken>();

export async function initRefreshTokenStore(): Promise<void> {
  if (isDbMode()) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_revoked BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
        ON refresh_tokens(token);

        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
        ON refresh_tokens(user_id);
      `);

      logger.info(
        '[RefreshTokenStore] Initialized PostgreSQL refresh_tokens table schema.'
      );
    } catch (err: any) {
      logger.error(
        '[RefreshTokenStore] Failed to initialize PostgreSQL refresh_tokens table:',
        { error: err.message }
      );
    }
  }
}

export async function createAndSaveRefreshToken(
  userId: string
): Promise<string> {
  const token = jwt.sign(
    { id: userId },
    getJwtRefreshSecret(),
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  if (isDbMode()) {
    try {
      const tokenId = crypto.randomUUID();

      await query(
        `INSERT INTO refresh_tokens
        (id, user_id, token, expires_at, is_revoked)
        VALUES ($1, $2, $3, $4, FALSE)`,
        [tokenId, userId, token, expiresAt]
      );
    } catch (err: any) {
      logger.warn(
        '[RefreshTokenStore] DB insert failed, falling back to in-memory store:',
        { error: err.message }
      );

      inMemoryRefreshTokens.set(token, {
        userId,
        expiresAt: expiresAt.getTime(),
        isRevoked: false
      });
    }
  } else {
    inMemoryRefreshTokens.set(token, {
      userId,
      expiresAt: expiresAt.getTime(),
      isRevoked: false
    });
  }

  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
  userPayload: {
    id: string;
    email: string;
    role: string;
    name: string;
  }
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {

  await revokeRefreshToken(oldToken);

  const newAccessToken = generateAccessToken(userPayload);
  const newRefreshToken = await createAndSaveRefreshToken(userPayload.id);

  logger.info(
    '[RefreshTokenStore] Rotated refresh token successfully.',
    { userId: userPayload.id }
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

export async function verifyAndCheckRefreshToken(
  token: string
): Promise<{ userId: string } | null> {

  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      getJwtRefreshSecret()
    ) as { id: string };

    const userId = decoded.id;

    if (isDbMode()) {
      const res = await query(
        `SELECT user_id, is_revoked, expires_at
         FROM refresh_tokens
         WHERE token = $1`,
        [token]
      );

      if (res.rows.length === 0) {
        const memRecord = inMemoryRefreshTokens.get(token);

        if (
          !memRecord ||
          memRecord.isRevoked ||
          memRecord.expiresAt < Date.now()
        ) {
          return null;
        }

        return {
          userId: memRecord.userId
        };
      }

      const row = res.rows[0];

      if (row.is_revoked) {
        logger.warn(
          '[SECURITY ALERT] Attempted reuse of revoked refresh token! Revoking all user tokens.',
          { userId }
        );

        await revokeAllUserTokens(userId);
        return null;
      }

      if (new Date(row.expires_at).getTime() < Date.now()) {
        return null;
      }

      return {
        userId: row.user_id
      };

    } else {

      const memRecord = inMemoryRefreshTokens.get(token);

      if (!memRecord) {
        return { userId };
      }

      if (memRecord.isRevoked) {
        logger.warn(
          '[SECURITY ALERT] Attempted reuse of revoked refresh token! Revoking all user tokens.',
          { userId }
        );

        await revokeAllUserTokens(userId);
        return null;
      }

      if (memRecord.expiresAt < Date.now()) {
        return null;
      }

      return {
        userId: memRecord.userId
      };
    }

  } catch (err: any) {
    logger.warn(
      '[RefreshTokenStore] Token verification failed:',
      { error: err.message }
    );

    return null;
  }
}

export async function revokeRefreshToken(
  token: string
): Promise<void> {

  if (!token) return;

  if (isDbMode()) {
    try {
      await query(
        `UPDATE refresh_tokens
         SET is_revoked = TRUE
         WHERE token = $1`,
        [token]
      );
    } catch (_) {}
  }

  const memRecord = inMemoryRefreshTokens.get(token);

  if (memRecord) {
    memRecord.isRevoked = true;
  }
}

export async function revokeAllUserTokens(
  userId: string
): Promise<void> {

  if (!userId) return;

  if (isDbMode()) {
    try {
      await query(
        `UPDATE refresh_tokens
         SET is_revoked = TRUE
         WHERE user_id = $1`,
        [userId]
      );
    } catch (_) {}
  }

  inMemoryRefreshTokens.forEach((val) => {
    if (val.userId === userId) {
      val.isRevoked = true;
    }
  });
}