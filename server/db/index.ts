import pg from 'pg';
import { logger } from '../services/securityHardening';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbMode = false;
let dbFallback = false;
let dbFallbackReason: string | null = null;

export function getPool(): pg.Pool | null {
  return pool;
}

export function isDbMode(): boolean {
  return dbMode;
}

export function getDbInfo() {
  return {
    dbMode,
    dbFallback,
    dbFallbackReason
  };
}

export async function initDb(): Promise<boolean> {
  const useInMemory = process.env.USE_IN_MEMORY === 'true';
  const databaseUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST;

  if (useInMemory || (!databaseUrl && !dbHost)) {
    dbMode = false;
    dbFallback = false;
    dbFallbackReason = null;

    console.log('Kazify auth store: memory');
    console.log('Kazify jobs store: memory');
    console.log('Kazify wallets store: memory');

    logger.info(
      '[DB] Operating in memory mode (USE_IN_MEMORY=true or DATABASE_URL/DB_HOST unset).'
    );

    return false;
  }

  try {
    pool = new Pool(
      databaseUrl
        ? {
            connectionString: databaseUrl,
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 3000,
          }
        : {
            host: dbHost,
            port: parseInt(process.env.DB_PORT || '5432', 10),
            database: process.env.DB_NAME || 'kazify',
            user: process.env.DB_USER || 'kazify_user',
            password: process.env.DB_PASSWORD || '',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 3000,
          }
    );

    pool.on('error', (err) => {
      logger.warn('[DB] PostgreSQL pool error.', {
        error: err.message,
      });
    });

    const client = await pool.connect();
    client.release();

    dbMode = true;
    dbFallback = false;
    dbFallbackReason = null;

    console.log('Kazify auth store: postgres');
    console.log('Kazify jobs store: postgres');
    console.log('Kazify wallets store: postgres');

    logger.info('[DB] Connected to PostgreSQL database pool successfully.');

    return true;
  } catch (err: any) {
    logger.warn(
      `[DB] Could not connect to PostgreSQL database (${err.message}). Falling back to in-memory state.`
    );

    if (pool) {
      try {
        await pool.end();
      } catch (_) {
        // Ignore cleanup errors
      }

      pool = null;
    }

    dbMode = false;
    dbFallback = true;
    dbFallbackReason = `Could not connect to PostgreSQL database (${err.message})`;

    console.log('Kazify auth store: memory');
    console.log('Kazify jobs store: memory');
    console.log('Kazify wallets store: memory');

    return false;
  }
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  if (!pool || !dbMode) {
    throw new Error(
      'Database is not connected or operating in memory mode'
    );
  }

  return pool.query<T>(text, params);
}