import express from 'express';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { AuthenticatedRequest } from './types';
import { users } from './state';
import { isDbMode } from './db';
import * as usersRepository from './db/usersRepository';

function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
}

function getJwtRefreshSecret(): string {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return process.env.JWT_REFRESH_SECRET;
}

export function generateAccessToken(userPayload: {
  id: string;
  email: string;
  role: string;
  name: string;
}) {
  return jwt.sign(userPayload, getJwtSecret(), {
    expiresIn: '15m'
  });
}

export function generateRefreshToken(userPayload: { id: string }) {
  return jwt.sign(userPayload, getJwtRefreshSecret(), {
    expiresIn: '7d'
  });
}

export function authenticateToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res
      .status(401)
      .json({ error: 'Access token is missing or unauthorized' });
  }

  jwt.verify(token, getJwtSecret(), async (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ error: 'Invalid or expired access token' });
    }

    const decodedUser = decoded as any;

    if (isDbMode()) {
      const matchedUser = await usersRepository.findById(decodedUser.id);

      if (matchedUser && matchedUser.status === 'banned') {
        return res.status(403).json({
          error:
            'Your account has been banned due to security violations.'
        });
      }
    } else {
      const matchedUser = users.find(u => u.id === decodedUser.id);

      if (matchedUser && matchedUser.status === 'banned') {
        return res.status(403).json({
          error:
            'Your account has been banned due to security violations.'
        });
      }
    }

    (req as AuthenticatedRequest).user = decodedUser;
    next();
  });
}

export function requireCustomer(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = (req as AuthenticatedRequest).user;

  if (!user || user.role !== 'customer') {
    return res.status(403).json({
      error: 'Access denied: Customer role privileges required'
    });
  }

  next();
}

export function requireFundi(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = (req as AuthenticatedRequest).user;

  if (!user || user.role !== 'fundi') {
    return res.status(403).json({
      error: 'Access denied: Fundi role privileges required'
    });
  }

  next();
}

export function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = (req as AuthenticatedRequest).user;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied: Admin role privileges required'
    });
  }

  next();
}

// WebSockets Manager
export const wsClients = new Map<string, WebSocket>();

export function sendWSMessage(userId: string, data: any) {
  const ws = wsClients.get(userId);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function broadcastWSMessage(data: any) {
  const payload = JSON.stringify(data);

  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    console.log("=================================");
    console.log("[WS] Incoming connection");
    console.log("[WS] URL:", req.url);
    console.log("[WS] Headers:", req.headers);
    console.log("=================================");
    let currentUserId: string | null = null;

    const authenticateSocket = async (
      token: string,
      rawUserId?: string
    ): Promise<boolean> => {
      try {

        console.log("[WS] Authenticating...");
        const decoded = jwt.verify(
          token,
          getJwtSecret()
        ) as any;

        console.log("[WS] JWT verified");
        console.log(decoded);

        if (!decoded || !decoded.id) {
          ws.send(
            JSON.stringify({
              type: 'error',
              code: 'WS_AUTH_FAILED',
              message: 'Invalid token payload'
            })
          );

          ws.close(4001, 'Authentication failed');
          return false;
        }

        let isBanned = false;

        if (isDbMode()) {
          const dbUser = await usersRepository.findById(decoded.id);

          if (dbUser && dbUser.status === 'banned') {
            isBanned = true;
          }
        } else {
          const matchedUser = users.find(
            u => u.id === decoded.id
          );

          if (matchedUser && matchedUser.status === 'banned') {
            isBanned = true;
          }
        }

        if (isBanned) {
          ws.send(
            JSON.stringify({
              type: 'error',
              code: 'WS_AUTH_FAILED',
              message:
                'Your account has been banned due to security violations.'
            })
          );

          ws.close(4003, 'Account banned');
          return false;
        }

        const verifiedUserId = decoded.id;

        if (rawUserId && rawUserId !== verifiedUserId) {
          console.warn(
            `[WS Warning] Client-supplied userId (${rawUserId}) does not match token subject (${verifiedUserId}). Binding socket to token subject.`
          );
        }

        currentUserId = verifiedUserId;

        console.log("[WS] Registering client", verifiedUserId);

        wsClients.set(verifiedUserId, ws);

        ws.send(
          JSON.stringify({
            type: 'authenticated',
            status: 'ok',
            userId: verifiedUserId
          })
        );

        return true;
      } catch (err: any) {

        console.error("[WS AUTH ERROR]");
        console.error(err);
        
        ws.send(
          JSON.stringify({
            type: 'error',
            code: 'WS_AUTH_FAILED',
            message:
              err.message || 'Invalid or expired access token'
          })
        );

        ws.close(4001, 'Authentication failed');
        return false;
      }
    };

    let queryToken: string | null = null;
    let queryUserId: string | null = null;

    try {
      if (req.url) {
        const urlObj = new URL(req.url, 'http://localhost');

        queryToken = urlObj.searchParams.get('token');
        queryUserId =
          urlObj.searchParams.get('user_id') ||
          urlObj.searchParams.get('userId');
      }
    } catch (_) {}

    if (queryToken) {
      authenticateSocket(queryToken, queryUserId || undefined);
    }

    ws.on('message', async message => {

      console.log("[WS MESSAGE]", message.toString());

      try {
        const data = JSON.parse(message.toString());

        if (
          data.type === 'auth' ||
          data.type === 'auth_register'
        ) {
          const token =
            data.token ||
            data.accessToken ||
            queryToken;

          const rawUserId =
            data.userId ||
            data.user_id ||
            queryUserId;

          if (token) {
            await authenticateSocket(token, rawUserId);
          } else {
            const allowInsecure =
              process.env.NODE_ENV !== 'production' &&
              process.env.ALLOW_INSECURE_WS_AUTH === 'true';

            if (allowInsecure && rawUserId) {
              console.warn(
                `[WS Warning] ALLOW_INSECURE_WS_AUTH is active! Binding socket to unverified userId: ${rawUserId}`
              );

              currentUserId = rawUserId;
              wsClients.set(rawUserId, ws);

              ws.send(
                JSON.stringify({
                  type: 'authenticated',
                  status: 'ok',
                  userId: rawUserId
                })
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  code: 'WS_AUTH_FAILED',
                  message:
                    'Authentication failed: Access token is required'
                })
              );

              ws.close(4001, 'Authentication failed');
            }
          }
        }
      } catch (e) {
        console.error('WS Message parsing error:', e);
      }
    });

    ws.on('close', () => {
      
      console.log(
        `[WS CLOSED] code=${(ws as any)._closeCode}`
      );

      if (
        currentUserId &&
        wsClients.get(currentUserId) === ws
      ) {
        wsClients.delete(currentUserId);
      }
    });
  });
}