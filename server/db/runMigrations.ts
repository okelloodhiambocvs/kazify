import { execSync } from 'node:child_process';
import { logger } from '../services/securityHardening';

export async function runDatabaseMigrations(): Promise<void> {
  try {
    logger.info('[DB] Running database migrations...');

    execSync(
      'npx node-pg-migrate up -m db/migrations',
      {
        stdio: 'inherit',
        shell: process.platform === 'win32'
          ? 'powershell.exe'
          : '/bin/sh',
        env: process.env
      }
    );

    logger.info('[DB] Database migrations completed successfully.');
  } catch (err: any) {
    logger.error('[DB] Database migration failed.', {
      error: err.message
    });

    throw err;
  }
}