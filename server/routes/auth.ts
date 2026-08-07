import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { users, refreshTokensRegistry, revokedTokensRegistry } from '../state';
import { LocalUser } from '../types';
import { isDbMode } from '../db';
import * as usersRepository from '../db/usersRepository';
import { 
  generateAccessToken, 
  generateRefreshToken, 
} from '../middleware';
import {
  createAndSaveRefreshToken,
  rotateRefreshToken,
  verifyAndCheckRefreshToken,
  revokeRefreshToken
} from '../services/refreshTokenService';
import { validateBody, loginSchema, registerSchema } from '../middleware/validation';
import { logSecurityEvent } from '../services/securityHardening';

export const authRouter = Router();

// Account Lockout tracking (5 consecutive failures = 15 minute temporary lockout)
interface LockoutEntry {
  attempts: number;
  lockoutUntil: number;
}
const lockoutTracker = new Map<string, LockoutEntry>();

function checkLockout(identifier: string): { isLocked: boolean; remainingMinutes?: number } {
  if (!identifier) return { isLocked: false };
  const entry = lockoutTracker.get(identifier);
  if (!entry) return { isLocked: false };
  if (entry.lockoutUntil > Date.now()) {
    const remainingMinutes = Math.ceil((entry.lockoutUntil - Date.now()) / 60000);
    return { isLocked: true, remainingMinutes };
  }
  if (entry.lockoutUntil <= Date.now() && entry.attempts >= 5) {
    lockoutTracker.delete(identifier);
  }
  return { isLocked: false };
}

function recordFailedAttempt(identifier: string) {
  if (!identifier) return;
  const entry = lockoutTracker.get(identifier) || { attempts: 0, lockoutUntil: 0 };
  entry.attempts += 1;
  if (entry.attempts >= 5) {
    entry.lockoutUntil = Date.now() + 15 * 60 * 1000;
  }
  lockoutTracker.set(identifier, entry);
}

function clearLockout(identifier: string) {
  if (identifier) {
    lockoutTracker.delete(identifier);
  }
}

function setRefreshTokenCookie(res: Response, req: Request, token: string) {
  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

function normalizePhone(p: string): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return '+' + digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '+254' + digits.substring(1);
  }
  if (digits.length === 9) {
    return '+254' + digits;
  }
  if (p.startsWith('+')) {
    return '+' + digits;
  }
  return digits ? '+' + digits : '';
}

// POST /api/auth/register
authRouter.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, role, name, phone, category, subcategories, bio, location } = req.body;

    if (role === 'admin') {
      logSecurityEvent('UNAUTHORIZED_ROLE_REGISTRATION', { attemptedRole: 'admin', email, phone }, req);
      return res.status(403).json({ 
        error: 'Public registration for administrator role is disabled. Admin accounts must be seeded or created via administrator invitation.' 
      });
    }

    if (!['customer', 'fundi'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role specified. Public registration allowed only for customer or fundi.' });
    }

    const normPhone = phone ? normalizePhone(phone) : '';
    const normEmail = email ? email.trim().toLowerCase() : '';

    let existingUser: LocalUser | null = null;

    if (isDbMode()) {
      if (normEmail) {
        existingUser = await usersRepository.findByEmail(normEmail);
      }
      if (!existingUser && normPhone) {
        existingUser = await usersRepository.findByPhone(normPhone);
      }
    } else {
      const found = users.find(u => {
        if (normEmail && u.email && u.email.toLowerCase() === normEmail) return true;
        if (normPhone && u.phone && normalizePhone(u.phone) === normPhone) return true;
        return false;
      });
      existingUser = found || null;
    }

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or phone already exists' });
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
    const password_hash = await bcrypt.hash(password, rounds);
    let newUser: LocalUser;

    if (isDbMode()) {
      newUser = await usersRepository.createUser({
        email: normEmail,
        phone: normPhone || phone,
        name,
        role,
        password_hash,
        category,
        subcategories,
        bio,
        location,
        hourly_rate: role === 'fundi' ? 1200 : undefined
      });
    } else {
      const userId = `${role}_${Date.now()}`;
      newUser = {
        id: userId,
        email: normEmail || `${role}_${Date.now()}@kazify.com`,
        role,
        name,
        phone: normPhone || phone || '+254700000000',
        password_hash,
        kyc_verified: role === 'customer' || role === 'admin' ? true : false,
        rating: role === 'fundi' ? 5.0 : undefined,
        jobs_completed: role === 'fundi' ? 0 : undefined,
        category: role === 'fundi' ? category || 'General Fundi' : undefined,
        subcategories: role === 'fundi' ? subcategories || [] : undefined,
        bio: role === 'fundi' ? bio || 'Skilled tradesperson on Kazify' : undefined,
        location: location || { lat: -0.0917, lng: 34.7680, address: 'Kisumu, Kenya' },
        hourly_rate: role === 'fundi' ? 1200 : undefined,
        status: 'active',
        is_email_verified: true,
        created_at: new Date().toISOString()
      };
      users.push(newUser);
    }

    const userPayload = { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = await createAndSaveRefreshToken(newUser.id);

    setRefreshTokenCookie(res, req, refreshToken);

    const { password: _p, password_hash: _ph, ...safeUser } = newUser as any;

    return res.status(201).json({
      message: 'User registered successfully',
      user: safeUser,
      accessToken,
      token: accessToken
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to register user: ' + error.message });
  }
});

// POST /api/auth/login
authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.body.email || '').trim().toLowerCase();
    const rawPhone = (req.body.phone || '').trim();
    const rawIdentifier = (req.body.identifier || '').trim();
    const password = req.body.password;

    const lookupKey = rawEmail || rawIdentifier || rawPhone;
    const lockStatus = checkLockout(lookupKey);
    if (lockStatus.isLocked) {
      logSecurityEvent('FAILED_LOGIN', { identifier: lookupKey, reason: 'ACCOUNT_LOCKED_MAX_ATTEMPTS' }, req);
      return res.status(429).json({ 
        error: `Account temporarily locked due to 5 consecutive failed login attempts. Please try again in ${lockStatus.remainingMinutes} minutes.` 
      });
    }

    let user: LocalUser | null = null;

    if (isDbMode()) {
      if (rawEmail) {
        user = await usersRepository.findByEmail(rawEmail);
      }
      if (!user && rawIdentifier) {
        user = await usersRepository.findByIdentifier(rawIdentifier);
      }
      if (!user && rawPhone) {
        user = await usersRepository.findByPhone(rawPhone);
      }
    } else {
      const found = users.find(u => {
        if (rawEmail && u.email && u.email.toLowerCase() === rawEmail) return true;

        if (rawIdentifier) {
          if (rawIdentifier.includes('@')) {
            if (u.email && u.email.toLowerCase() === rawIdentifier.toLowerCase()) return true;
          } else {
            const normId = normalizePhone(rawIdentifier);
            if (u.phone && normId && normalizePhone(u.phone) === normId) return true;
          }
        }

        if (rawPhone && u.phone) {
          const normPhone = normalizePhone(rawPhone);
          if (normPhone && normalizePhone(u.phone) === normPhone) return true;
        }

        if (rawIdentifier) {
          if (u.email && u.email.toLowerCase() === rawIdentifier.toLowerCase()) return true;
          if (u.phone && u.phone === rawIdentifier) return true;
        }

        return false;
      });
      user = found || null;
    }

    if (!user || !user.password_hash) {
      recordFailedAttempt(lookupKey);
      logSecurityEvent('FAILED_LOGIN', { identifier: lookupKey, reason: 'User identity not found' }, req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'banned') {
      logSecurityEvent('FAILED_LOGIN', { userId: user.id, email: user.email, reason: 'Account banned' }, req);
      return res.status(403).json({ error: 'Your account has been banned due to policy or security violations.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      recordFailedAttempt(lookupKey);
      logSecurityEvent('FAILED_LOGIN', { userId: user.id, email: user.email, reason: 'Invalid password' }, req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    clearLockout(lookupKey);

    const userPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = await createAndSaveRefreshToken(user.id);

    setRefreshTokenCookie(res, req, refreshToken);

    const { password: _p, password_hash: _ph, ...safeUser } = user as any;

    return res.json({
      message: 'Login successful',
      user: safeUser,
      accessToken,
      token: accessToken
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to log in: ' + error.message });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const validRecord = await verifyAndCheckRefreshToken(refreshToken);
  if (!validRecord) {
    return res.status(403).json({ error: 'Invalid, expired, or revoked refresh token' });
  }

  let user: LocalUser | null = null;
  if (isDbMode()) {
    user = await usersRepository.findById(validRecord.userId);
  } else {
    user = users.find(u => u.id === validRecord.userId) || null;
  }

  if (!user) {
    return res.status(404).json({ error: 'Associated user no longer exists' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'User is banned' });
  }

  const userPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const rotated = await rotateRefreshToken(refreshToken, userPayload);

  setRefreshTokenCookie(res, req, rotated.refreshToken);

  return res.json({
    accessToken: rotated.accessToken,
    token: rotated.accessToken
  });
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
    refreshTokensRegistry.delete(refreshToken);
    revokedTokensRegistry.add(refreshToken);
  }
  res.clearCookie('refreshToken', { path: '/' });
  return res.json({ message: 'Logged out successfully' });
});
