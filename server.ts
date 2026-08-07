import express from 'express';
import path from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './server/swagger';
import {
  helmetMiddleware,
  forceHttpsAndHsts,
  apiRateLimiter,
  authRateLimiter,
  csrfProtection,
  validateEnvironment,
  sanitizePayloadMiddleware
} from './server/services/securityHardening';

import { runDatabaseMigrations } from './server/db/runMigrations';
import { setupWebSocket } from './server/middleware';
import { initDb, isDbMode, getDbInfo, getPool } from './server/db';
import { upsertSeedUsers } from './server/db/usersRepository';
import { upsertSeedWallets } from './server/db/walletsRepository';
import { initRefreshTokenStore } from './server/services/refreshTokenService';
import { authRouter } from './server/routes/auth';
import { customerRouter } from './server/routes/customer';
import { fundiRouter } from './server/routes/fundi';
import { adminRouter } from './server/routes/admin';
import { escrowRouter } from './server/routes/escrow';
import { chatRouter } from './server/routes/chat';
import { commonRouter } from './server/routes/common';
import { checkRedisHealth } from './server/services/redis';

dotenv.config();
validateEnvironment();

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);
const PORT = 3000;

// Apply TLS/HTTPS & HSTS Enforcement
app.use(forceHttpsAndHsts);

// Apply Helmet & Security headers
app.use(helmetMiddleware);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(sanitizePayloadMiddleware);
app.use(cookieParser());

// Apply global rate limiting to all API endpoints
app.use('/api', apiRateLimiter);

// Apply stricter rate limiting on sensitive authentication routes
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);

// Apply double-submit CSRF protection
app.use(csrfProtection);

// Mount Modular API Routers per Role
app.use('/api/auth', authRouter);
app.use('/api', customerRouter);
app.use('/api', fundiRouter);
app.use('/api', adminRouter);
app.use('/api', escrowRouter);
app.use('/api', chatRouter);
app.use('/api', commonRouter);

// Swagger API Documentation
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// Health Check Endpoint
app.get('/health', async (req, res) => {
  const dbInfo = getDbInfo();

  const redisHealthy = await checkRedisHealth();

  const databaseStatus = dbInfo.dbMode
    ? 'connected'
    : 'disconnected';

  const services = {
    database: databaseStatus,
    redis: redisHealthy ? 'connected' : 'disconnected'
  };

  const isHealthy =
    databaseStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services,
    details: dbInfo.dbFallback
      ? {
          fallback: true,
          reason: dbInfo.dbFallbackReason
        }
      : undefined
  });
});

// Backwards compatible API health endpoint
app.get('/api/health', async (req, res) => {
  const dbInfo = getDbInfo();

  const redisHealthy = await checkRedisHealth();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    authStore: dbInfo.dbMode ? 'postgres' : 'memory',
    dataStore: dbInfo.dbMode ? 'postgres' : 'memory',
    redis: redisHealthy ? 'connected' : 'disconnected',
    wsAuth: 'jwt',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

server.on('upgrade', (req) => {
  console.log('========== HTTP UPGRADE ==========');
  console.log(req.url);
  console.log(req.headers);
  console.log('==================================');
});

// Setup WebSockets
const wss = new WebSocketServer({
  server,
  path: '/ws'
});

setupWebSocket(wss);

// Vite middleware setup for Development & Static server for Production
async function startServer() {
  const isConnected = await initDb();

  if (isConnected && isDbMode()) {
    try {
      // Apply any pending versioned database migrations before
      // creating application tables or seeding data.
      await runDatabaseMigrations();

      await initRefreshTokenStore();
      await upsertSeedUsers();
      await upsertSeedWallets();
    } catch (err: any) {
      console.warn(
        '[DB] Failed to run migrations, initialize tables, or seed data:',
        err.message
      );
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true
      },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    const dbInfo = getDbInfo();
    const store = dbInfo.dbMode ? 'postgres' : 'memory';

    const jwtSecretStatus = `validated (${process.env.JWT_SECRET?.length || 0} bytes strong entropy)`;

    console.log(`
==================================================
 Kazify listening on http://0.0.0.0:${PORT}
 - Auth/Data store: ${store}
 - WS auth: jwt
 - CSRF: enabled (login/register exempt in dev)
 - JWT: ${jwtSecretStatus}
==================================================
`);
  });
}

startServer();