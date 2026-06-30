import express from 'express';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DarajaClient, paymentIntents, transactions, reconciliationRecords, PaymentIntent, Transaction } from './src/services/mpesaService';
import { EscrowEngine, escrowAccounts, escrowMilestones, ledgerEntries, settlements, payouts, EscrowAccount } from './src/services/escrowService';
import { NotificationEngineService } from './src/services/notificationService';
import {
  helmetMiddleware,
  apiRateLimiter,
  authRateLimiter,
  csrfProtection,
  validateEnvironment,
  telemetry,
  logger
} from './src/services/securityHardening';




dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

// JWT Security Constants
const JWT_ISSUER = 'kazify';
const JWT_AUDIENCE = 'kazify-users';

// In-memory registry for valid refresh tokens to allow secure revoking
const refreshTokensRegistry = new Set<string>();

// Dummy bcrypt hash used to mitigate login timing attacks
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'kazify_dummy_password',
  10
);

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: 'customer' | 'fundi' | 'admin';
    name: string;
  };
}

// Helpers for JWT Token generation
function generateAccessToken(userPayload: {
  id: string;
  email: string;
  role: string;
  name: string;
}) {
  return jwt.sign(userPayload, JWT_SECRET, {
    expiresIn: '15m',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256'
  });
}

function generateRefreshToken(userPayload: { id: string }) {
  const token = jwt.sign(userPayload, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256'
  });

  refreshTokensRegistry.add(token);
  return token;
}

// Security Middleware: Authenticate JWT Access Token
function authenticateToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token is missing or unauthorized'
    });
  }

  jwt.verify(
    token,
    JWT_SECRET,
    {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({
          error: 'Invalid or expired access token'
        });
      }

      const decodedUser = decoded as any;
      const matchedUser = users.find(u => u.id === decodedUser.id);

      if (matchedUser && matchedUser.status === 'banned') {
        return res.status(403).json({
          error: 'Your account has been banned due to security violations.'
        });
      }

      (req as AuthenticatedRequest).user = decodedUser;
      next();
    }
  );
}

// Security Middleware: Require Customer Role
function requireCustomer(
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

// Security Middleware: Require Fundi Role
function requireFundi(
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

// Security Middleware: Require Admin Role
function requireAdmin(
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

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);

// Production HTTP server timeout hardening
server.requestTimeout = 30_000;      // 30 seconds
server.headersTimeout = 35_000;      // Must be greater than requestTimeout
server.keepAliveTimeout = 5_000;     // 5 seconds
server.timeout = 30_000;             // Legacy socket timeout

const PORT = 3000;

// Apply Helmet & CSP headers
app.use(helmetMiddleware);

// Allowed CORS Origins
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter((origin): origin is string => Boolean(origin))
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header (Postman, curl, mobile apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      logger.warn(`Blocked CORS request from origin: ${origin}`);

      return callback(new Error("Origin not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-CSRF-Token",
    ],
  })
);

app.use(express.json({
  limit: '100kb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({
  extended: false,
  limit: '100kb'
}));

// Apply global rate limiting to all API endpoints
app.use('/api', apiRateLimiter);

// Apply stricter rate limiting on sensitive authentication routes
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/refresh', authRateLimiter);
app.use('/api/auth/logout', authRateLimiter);
app.use('/api/auth/password-reset-request', authRateLimiter);
app.use('/api/auth/password-reset', authRateLimiter);
app.use('/api/auth/verify-email-request', authRateLimiter);
app.use('/api/auth/verify-email', authRateLimiter);

// Apply double-submit CSRF protection
app.use(csrfProtection);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'kazify',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- IN-MEMORY DATABASE ---

interface LocalUser {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: 'customer' | 'fundi' | 'admin';
  password?: string;
  avatar_url?: string;
  rating?: number;
  category?: string;
  status?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  is_email_verified?: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  availability?: any;
}

interface LocalBid {
  id: string;
  job_id: string;
  fundi_id: string;
  fundi_name: string;
  fundi_rating: number;
  amount: number;
  note: string;
  duration_days: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface LocalJob {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  title: string;
  description: string;
  category: string;
  workflow: 'instant' | 'quotation';
  status: 'pending' | 'matching' | 'accepted' | 'en_route' | 'started' | 'completed' | 'cancelled' | 'disputed';
  lat: number;
  lng: number;
  address: string;
  fundi_id?: string;
  fundi_name?: string;
  fundi_phone?: string;
  fundi_lat?: number;
  fundi_lng?: number;
  amount: number;
  estimated_duration?: string;
  escrow_status: 'unpaid' | 'held' | 'released' | 'refunded' | 'disputed';
  created_at: string;
  is_rated?: boolean;
  bids?: LocalBid[];
  fraud_flags?: string[];
  ai_matching_score?: number;
  recommended_fundis?: any[];
}

interface LocalChatMessage {
  id: string;
  job_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

interface LocalEscrowTransaction {
  id: string;
  job_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: 'stk_push' | 'payout' | 'refund';
  phone_number: string;
  checkout_request_id?: string;
  created_at: string;
}

interface LocalNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface LocalReview {
  id: string;
  job_id?: string;
  fundi_id: string;
  customer_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface LocalWallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

interface LocalWalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'commission' | 'refund';
  description: string;
  reference_id?: string;
  created_at: string;
}

type LocalEscrowAccount = EscrowAccount;

interface LocalDisputeEvidenceAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  caption?: string;
  uploaded_at: string;
}

interface LocalDispute {
  id: string;
  job_id: string;
  initiator_id: string;
  initiator_name: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved_refunded' | 'resolved_released' | 'cancelled';
  resolution_summary?: string;
  resolved_at?: string;
  created_at: string;
  completion_percentage?: number;
  evidence_attachments?: LocalDisputeEvidenceAttachment[];
}

interface LocalDisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

interface LocalKYCDocument {
  id: string;
  user_id: string;
  document_type: 'national_id' | 'passport' | 'business_permit';
  document_number: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  full_legal_name?: string;
  kra_pin?: string;
  date_of_birth?: string;
  county_of_operation?: string;
  file_sha256?: string;
  malware_scan_status?: string;
  signature_check?: string;
  compliance_logs?: string[];
}

interface LocalContract {
  id: string;
  job_id: string;
  customer_id: string;
  customer_name: string;
  fundi_id: string;
  fundi_name: string;
  amount: number;
  terms: string;
  customer_signed: boolean;
  fundi_signed: boolean;
  customer_signed_at?: string;
  fundi_signed_at?: string;
  status: 'draft' | 'active' | 'completed' | 'terminated';
  created_at: string;
  updated_at?: string;
}

// Seed In-Memory Store
let users: LocalUser[] = [
  {
    id: "admin-user-id-001",
    email: "admin@kazify.com",
    phone: "+254700000000",
    name: "System Administrator",
    role: "admin",
    password: "Admin@12345",
    avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150"
  },
  {
    id: "customer-user-id-001",
    phone: "+254700000001",
    email: "asha@kazify.com",
    name: "Asha Odhiambo",
    role: "customer",
    password: "Customer@123",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
  },
  {
    id: "fundi-user-id-001",
    phone: "+254700000002",
    email: "joseph@kazify.com",
    name: "Joseph Otieno",
    role: "fundi",
    password: "Fundi@123",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    rating: 4.8,
    category: "Plumbing",
    status: "available",
    location: {
      lat: -1.286389,
      lng: 36.817223,
      address: "Nairobi CBD Center"
    }
  },
  {
    id: "fundi-user-id-002",
    phone: "+254700000003",
    email: "kelvin@kazify.com",
    name: "Kelvin Kiprop",
    role: "fundi",
    password: "Fundi@123",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    rating: 4.9,
    category: "Electrical",
    status: "available",
    location: {
      lat: -0.3031,
      lng: 36.0800,
      address: "Nakuru Kenyatta Avenue"
    }
  },
  {
    id: "fundi-user-id-003",
    phone: "+254700000004",
    email: "brian@kazify.com",
    name: "Brian Onyango",
    role: "fundi",
    password: "Fundi@123",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    rating: 4.7,
    category: "Construction",
    status: "available",
    location: {
      lat: -4.0644,
      lng: 39.6725,
      address: "Mombasa Digo Road CBD"
    }
  }
];

// Hash existing seed user passwords securely on startup and mark them as verified
users.forEach(user => {
  if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    user.password = bcrypt.hashSync(user.password, 10);
  }
  user.is_email_verified = true;
});


let jobs: LocalJob[] = [];
let chatMessages: LocalChatMessage[] = [];
let escrowTransactions: LocalEscrowTransaction[] = [];
let notifications: LocalNotification[] = [];
let reviews: LocalReview[] = [];

let wallets: LocalWallet[] = [
  { id: "w_admin", user_id: "admin-user-id-001", balance: 50000, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_customer", user_id: "customer-user-id-001", balance: 15000, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_fundi_001", user_id: "fundi-user-id-001", balance: 2400, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_fundi_002", user_id: "fundi-user-id-002", balance: 3500, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_fundi_003", user_id: "fundi-user-id-003", balance: 0, currency: "KES", updated_at: new Date().toISOString() },
];
let walletTransactions: LocalWalletTransaction[] = [];
let disputes: LocalDispute[] = [];
let disputeMessages: LocalDisputeMessage[] = [];
let kycDocuments: LocalKYCDocument[] = [
  {
    id: "kyc_fundi_001",
    user_id: "fundi-user-id-001",
    document_type: "national_id",
    document_number: "33445566",
    file_url: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400",
    status: "approved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "kyc_fundi_002",
    user_id: "fundi-user-id-002",
    document_type: "passport",
    document_number: "AK001122",
    file_url: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
(global as any).users = users;
let contracts: LocalContract[] = [];

interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'user' | 'dispute' | 'kyc' | 'wallet' | 'system';
  targetId: string;
  details: string;
  ipAddress?: string;
  userActivity?: string;
}

let adminAuditLogs: AdminAuditLog[] = [
  {
    id: 'AL-101',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    adminId: 'admin-user-id-001',
    adminName: 'System Administrator',
    action: 'SYSTEM_STARTUP',
    targetType: 'system',
    targetId: 'sys-001',
    details: 'Kazify operations control engine initialized and secure double-entry ledgers matching.',
    ipAddress: '127.0.0.1',
    userActivity: 'System Startup Init'
  }
];

function recordAdminAudit(
  adminId: string, 
  adminName: string, 
  action: string, 
  targetType: 'user' | 'dispute' | 'kyc' | 'wallet' | 'system', 
  targetId: string, 
  details: string,
  ipAddress?: string,
  userActivity?: string
) {
  adminAuditLogs.unshift({
    id: `AL-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    adminId,
    adminName,
    action,
    targetType,
    targetId,
    details,
    ipAddress: ipAddress || '127.0.0.1',
    userActivity: userActivity || 'N/A'
  });
}

interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  ip: string;
}
let loginAttempts: LoginAttempt[] = [];

interface SecurityAlert {
  id: string;
  user_id: string;
  user_name: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  rule_triggered: string;
  details: string;
  timestamp: string;
}
let securityAlerts: SecurityAlert[] = [];

// Node crypto module for secure hash chaining
import crypto from 'crypto';

interface ImmutableAuditEntry {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  action:
    | 'PAYMENT_STATE_CHANGE'
    | 'CONTRACT_APPROVAL'
    | 'CONTRACT_NEGOTIATION'
    | 'KYC_STATUS_UPDATE'
    | 'ROLE_CHANGE'
    | 'SECURITY_Sentinel';
  targetType: 'payment' | 'contract' | 'kyc' | 'user';
  targetId: string;
  statusBefore: string;
  statusAfter: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  previousHash: string;
  currentHash: string;
}

let immutableAuditTrail: ImmutableAuditEntry[] = [];

function computeAuditHash(entry: Omit<ImmutableAuditEntry, 'currentHash'>): string {
  const dataStr = `${entry.id}|${entry.timestamp}|${entry.operatorId}|${entry.action}|${entry.targetType}|${entry.targetId}|${entry.statusBefore}|${entry.statusAfter}|${entry.previousHash}`;
  return crypto.createHash('sha256').update(dataStr).digest('hex');
}

function recordSensitiveStateChange(
  operatorId: string,
  operatorName: string,
  action:
    | 'PAYMENT_STATE_CHANGE'
    | 'CONTRACT_APPROVAL'
    | 'CONTRACT_NEGOTIATION'
    | 'KYC_STATUS_UPDATE'
    | 'ROLE_CHANGE'
    | 'SECURITY_Sentinel',
  targetType: 'payment' | 'contract' | 'kyc' | 'user',
  targetId: string,
  statusBefore: string,
  statusAfter: string,
  details: string,
  ipAddress?: string,
  userAgent?: string
) {
  const previousEntry = immutableAuditTrail[0];
  const previousHash = previousEntry
    ? previousEntry.currentHash
    : '0000000000000000000000000000000000000000000000000000000000000000';

  const entry: ImmutableAuditEntry = {
    id: `SEC-AUD-${Math.floor(10000 + Math.random() * 90000)}`,
    timestamp: new Date().toISOString(),
    operatorId,
    operatorName,
    action,
    targetType,
    targetId,
    statusBefore: statusBefore || 'N/A',
    statusAfter: statusAfter || 'N/A',
    details,
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'N/A',
    previousHash,
    currentHash: ''
  };

  entry.currentHash = computeAuditHash(entry);
  immutableAuditTrail.unshift(entry);

  // Sync to the main admin audit logs array for immediate display in the Admin Dashboard UI
  adminAuditLogs.unshift({
    id: entry.id,
    timestamp: entry.timestamp,
    adminId: operatorId,
    adminName: operatorName,
    action: `${action} [SECURE_HASH_CHAINED]`,
    targetType:
      targetType === 'payment'
        ? 'wallet'
        : targetType === 'contract'
          ? 'system'
          : targetType === 'kyc'
            ? 'kyc'
            : 'user',
    targetId,
    details: `${details} (Current Hash: ${entry.currentHash.substring(0, 16)}... Chained to Prev Hash: ${entry.previousHash.substring(0, 16)}...)`,
    ipAddress: entry.ipAddress,
    userActivity: `UserAgent: ${entry.userAgent}`
  });

  console.log(
    `[IMMUTABLE AUDIT LEDGER] Chained event ${entry.id}. Action: ${entry.action}, Hash: ${entry.currentHash}`
  );
}

function evaluateFraudAndVelocityRules(userId: string, type: 'login' | 'transaction', reqContext: { ip: string; amount?: number }) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const now = Date.now();

  // 1. Check Login Patterns (Logins from multiple distinct IPs in last 10 minutes)
  if (type === 'login') {
    const tenMinutesAgo = now - 10 * 60 * 1000;
    // Track successful logins in this timeframe
    const userLogins = loginAttempts.filter(
      la => la.email?.toLowerCase() === user.email?.toLowerCase() && la.timestamp >= tenMinutesAgo && la.success
    );
    const distinctIPs = Array.from(new Set(userLogins.map(la => la.ip)));
    if (distinctIPs.length >= 2) {
      // Set user account to hold
      user.status = 'suspended';

      const alert: SecurityAlert = {
        id: `SEC-${Math.floor(1000 + Math.random() * 9000)}`,
        user_id: user.id,
        user_name: user.name,
        risk_level: 'CRITICAL',
        rule_triggered: 'MULTI_IP_LOGIN',
        details: `Account ${user.name} was suspended due to rapid logins from multiple distinct IP addresses: ${distinctIPs.join(', ')} in the last 10 minutes.`,
        timestamp: new Date().toISOString()
      };
      securityAlerts.unshift(alert);

      recordAdminAudit(
        'system',
        'Automated Sentinel',
        'SUSPEND_USER',
        'user',
        user.id,
        `AUTOMATED SUSPENSION: Multi-IP login pattern detected (${distinctIPs.length} distinct IPs in 10 minutes). IP addresses: ${distinctIPs.join(', ')}.`,
        reqContext.ip,
        'Kazify Security Sentinel v1'
      );

      createNotification(
        user.id,
        'Account Suspended',
        'Your account has been placed on an automated hold due to suspicious login activity from multiple locations. Please contact support.'
      );

      notifyAdmins(
        '🚨 Suspicious Multi-IP Login Suspend',
        `User ${user.name} has been placed on automated hold after logging in from multiple IPs in a 10-minute window.`,
        'high_value_dispute', // Trigger high-priority toast
        alert
      );
    }
  }

  // 2. Check Transaction Velocity (More than 3 transactions in 5 minutes OR total value > 100,000 KES in 5 minutes)
  if (type === 'transaction') {
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const userTxs = walletTransactions.filter(
      tx => tx.user_id === user.id && new Date(tx.created_at).getTime() >= fiveMinutesAgo
    );

    const transactionCount = userTxs.length;
    const totalVolume = userTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    if (transactionCount >= 3 || totalVolume > 100000) {
      user.status = 'suspended';

      const alert: SecurityAlert = {
        id: `SEC-${Math.floor(1000 + Math.random() * 9000)}`,
        user_id: user.id,
        user_name: user.name,
        risk_level: 'CRITICAL',
        rule_triggered: 'TRANSACTION_VELOCITY_BREACH',
        details: `Account ${user.name} was suspended due to transaction velocity breach. Count: ${transactionCount} txs (limit: 3), Volume: KES ${totalVolume.toLocaleString()} (limit: KES 100,000) in the last 5 minutes.`,
        timestamp: new Date().toISOString()
      };
      securityAlerts.unshift(alert);

      recordAdminAudit(
        'system',
        'Automated Sentinel',
        'SUSPEND_USER',
        'user',
        user.id,
        `AUTOMATED SUSPENSION: Transaction velocity breach. Ran ${transactionCount} transactions totaling KES ${totalVolume.toLocaleString()} in the last 5 minutes.`,
        reqContext.ip,
        'Kazify Security Sentinel v1'
      );

      createNotification(
        user.id,
        'Account Suspended',
        'Your account has been placed on an automated hold due to high-frequency or high-volume transaction activity. Please contact support.'
      );

      notifyAdmins(
        '🚨 Transaction Velocity Breach Suspend',
        `User ${user.name} has been placed on automated hold after triggering transaction velocity limits (KES ${totalVolume.toLocaleString()} in 5m).`,
        'high_value_dispute',
        alert
      );
    }
  }
}


// --- SERVICES MODULE ---

class CommissionService {
  static COMMISSION_RATE = 0.10; // 10%

  static calculateCommission(amount: number): { commission: number; payout: number } {
    const commission = Math.round(amount * this.COMMISSION_RATE);
    const payout = amount - commission;
    return { commission, payout };
  }

  static deductCommission(jobId: string, totalAmount: number): { commission: number; payout: number } {
    const { commission, payout } = this.calculateCommission(totalAmount);
    
    // Credit Admin wallet with commission
    let adminWallet = wallets.find(w => w.user_id === 'admin-user-id-001' || w.user_id === 'admin');
    if (!adminWallet) {
      adminWallet = {
        id: 'w_admin',
        user_id: 'admin-user-id-001',
        balance: 50000,
        currency: 'KES',
        updated_at: new Date().toISOString()
      };
      wallets.push(adminWallet);
    }
    
    adminWallet.balance += commission;
    adminWallet.updated_at = new Date().toISOString();

    // Record wallet transaction for admin commission
    walletTransactions.push({
      id: `wtx_${Date.now()}_admin_comm`,
      wallet_id: adminWallet.id,
      user_id: adminWallet.user_id,
      amount: commission,
      type: 'commission',
      description: `Commission collected on job #${jobId.substring(0, 8)}`,
      reference_id: jobId,
      created_at: new Date().toISOString()
    });

    return { commission, payout };
  }
}

// Set up payout settled listener to credit tradesperson in-memory wallet when payout succeed
global.onPayoutSettledSuccessfully = (payout) => {
  let fundiWallet = wallets.find(w => w.user_id === payout.user_id);
  if (!fundiWallet) {
    fundiWallet = {
      id: `w_${payout.user_id}`,
      user_id: payout.user_id,
      balance: 0,
      currency: 'KES',
      updated_at: new Date().toISOString()
    };
    wallets.push(fundiWallet);
  }
  fundiWallet.balance += payout.amount;
  fundiWallet.updated_at = new Date().toISOString();
  console.log(`[PAYOUT SYNC] Tradesperson wallet ${fundiWallet.id} credited with settled payout KES ${payout.amount}`);
};

class EscrowService {
  static holdFunds(jobId: string, customerId: string, amount: number): boolean {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return false;

    // Check customer wallet
    let customerWallet = wallets.find(w => w.user_id === customerId);
    if (!customerWallet || customerWallet.balance < amount) {
      return false;
    }

    // Deduct from customer
    customerWallet.balance -= amount;
    customerWallet.updated_at = new Date().toISOString();

    // Record wallet transaction
    walletTransactions.unshift({
      id: `wtx_${Date.now()}_escrow_hold`,
      wallet_id: customerWallet.id,
      user_id: customerId,
      amount: -amount,
      type: 'escrow_hold',
      description: `Wallet Escrow hold for "${job.title}"`,
      reference_id: jobId,
      created_at: new Date().toISOString()
    });

    job.escrow_status = 'held';

    // Fund the new premium double-entry escrow engine
    EscrowEngine.fundEscrow({
      jobId,
      customerId,
      fundiId: job.fundi_id,
      amount,
      description: `Wallet Escrow hold for "${job.title}"`
    });

    // Update contract status to active
    const contract = contracts.find(c => c.job_id === jobId);
    if (contract) {
      contract.status = 'active';
    }

    createNotification(customerId, "Escrow Secured", `KES ${amount} successfully secured in escrow for "${job.title}".`);
    if (job.fundi_id) {
      createNotification(job.fundi_id, "Escrow Secured", `The client has secured KES ${amount} in escrow. You can now begin work.`);
    }

    return true;
  }

  static releaseFunds(jobId: string): boolean {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return false;

    const escrowAcc = escrowAccounts.find(ea => ea.job_id === jobId);
    if (!escrowAcc || (escrowAcc.status !== 'held' && escrowAcc.status !== 'disputed')) return false;

    const escrowStatusBefore = job.escrow_status;

    // Release via our true marketplace settlement engine
    const settlement = EscrowEngine.releaseEscrow(escrowAcc.id, `Releasing payment for job "${job.title}"`);

    job.escrow_status = 'released';

    // Centralized Immutable Ledger tracking for payment state changes
    recordSensitiveStateChange(
      job.customer_id,
      job.customer_name || 'Client',
      'PAYMENT_STATE_CHANGE',
      'payment',
      jobId,
      escrowStatusBefore,
      'released',
      `Escrow funds of KES ${job.amount} released to Tradesperson. Commission of KES ${settlement.platform_fee} collected.`,
      '127.0.0.1',
      'Automated Escrow Engine Execution Core'
    );

    // Record admin commission wallet ledger increase for compliance
    let adminWallet = wallets.find(w => w.user_id === 'admin-user-id-001' || w.user_id === 'admin');
    if (adminWallet) {
      adminWallet.balance += settlement.platform_fee;
      adminWallet.updated_at = new Date().toISOString();
    }

    createNotification(job.customer_id, "Escrow Released", `Funds of KES ${job.amount} for "${job.title}" have been released to the tradesperson.`);

    // Update contract status to completed
    const contract = contracts.find(c => c.job_id === jobId);
    if (contract) {
      contract.status = 'completed';
    }

    sendWSMessage(job.customer_id, { type: 'escrow_released', job });
    if (job.fundi_id) {
      sendWSMessage(job.fundi_id, { type: 'escrow_released', job });
    }

    return true;
  }

  static refundFunds(jobId: string): boolean {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return false;

    const escrowAcc = escrowAccounts.find(ea => ea.job_id === jobId);
    if (!escrowAcc || (escrowAcc.status !== 'held' && escrowAcc.status !== 'disputed')) return false;

    const escrowStatusBefore = job.escrow_status;

    // Refund using dispute arbitration system split: 100% refund to customer, 0% payout to tradesperson
    EscrowEngine.resolveArbitratedDispute({
      escrowAccountId: escrowAcc.id,
      refundToCustomerAmount: escrowAcc.amount,
      payoutToFundiAmount: 0,
      disputeId: `ref_${Date.now()}`,
      notes: `Direct administrative refund on job "${job.title}"`
    });

    // Return to customer wallet in-memory
    let customerWallet = wallets.find(w => w.user_id === job.customer_id);
    if (customerWallet) {
      customerWallet.balance += escrowAcc.amount;
      customerWallet.updated_at = new Date().toISOString();
    }

    job.escrow_status = 'refunded';

    // Centralized Immutable Ledger tracking for payment state changes
    recordSensitiveStateChange(
      'admin-user-id-001',
      'System Administrator',
      'PAYMENT_STATE_CHANGE',
      'payment',
      jobId,
      escrowStatusBefore,
      'refunded',
      `Escrow payment of KES ${job.amount} for "${job.title}" fully refunded back to Client.`,
      '127.0.0.1',
      'System Escrow Disbursal Arbitrator'
    );

    createNotification(job.customer_id, "Escrow Refunded ↩️", `KES ${job.amount} has been refunded to your wallet for "${job.title}".`);
    if (job.fundi_id) {
      createNotification(job.fundi_id, "Escrow Refunded", `Escrow funds for "${job.title}" have been refunded to the client.`);
    }

    // Update contract status to terminated
    const contract = contracts.find(c => c.job_id === jobId);
    if (contract) {
      contract.status = 'terminated';
    }

    sendWSMessage(job.customer_id, { type: 'escrow_refunded', job });
    if (job.fundi_id) {
      sendWSMessage(job.fundi_id, { type: 'escrow_refunded', job });
    }

    return true;
  }
}

// Helper formula to compute Haversine miles/KM distance
function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth KM radius
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to compute top 3 most relevant and available Fundis
function getTopRecommendationsForJob(jobLat: number, jobLng: number, category: string): any[] {
  // Find fundis in the same category
  const matchingFundis = users.filter(u => u.role === 'fundi' && u.category === category);

  // Map each with distance, rating and status
  const recommendations = matchingFundis.map(fundi => {
    const fLat = fundi.location?.lat !== undefined ? fundi.location.lat : -1.286389;
    const fLng = fundi.location?.lng !== undefined ? fundi.location.lng : 36.817223;
    const distanceKM = getDistanceKM(jobLat, jobLng, fLat, fLng);
    
    const rating = fundi.rating || 5.0;
    const isReliable = rating >= 4.5;
    
    return {
      id: fundi.id,
      name: fundi.name,
      phone: fundi.phone,
      rating: rating,
      avatar_url: fundi.avatar_url,
      status: fundi.status || 'available',
      distanceKM: parseFloat(distanceKM.toFixed(2)),
      address: fundi.location?.address || 'Nairobi Area',
      isReliable,
    };
  });

  // Sort: available first, then distance (nearest first), then highest ratings
  recommendations.sort((a, b) => {
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (a.status !== 'available' && b.status === 'available') return 1;
    if (Math.abs(a.distanceKM - b.distanceKM) > 0.1) {
      return a.distanceKM - b.distanceKM;
    }
    return b.rating - a.rating;
  });

  return recommendations.slice(0, 3);
}

// --- WEBSOCKET SYSTEM ---

const wss = new WebSocketServer({ noServer: true });
const connections = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket & { userId?: string }, request) => {
  console.log('WS connection established');

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());

      if (data.type === 'auth_register') {
        if (typeof data.token !== 'string') {
          ws.send(
            JSON.stringify({
              type: 'auth_error',
              message: 'Authentication token is required.'
            })
          );
          ws.close();
          return;
        }

        try {
          const decoded = jwt.verify(data.token, JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
          }) as {
            id: string;
            email: string;
            role: 'customer' | 'fundi' | 'admin';
            name: string;
          };

          const user = users.find(u => u.id === decoded.id);

          if (!user) {
            ws.send(
              JSON.stringify({
                type: 'auth_error',
                message: 'User not found.'
              })
            );
            ws.close();
            return;
          }

          if (user.status === 'banned') {
            ws.send(
              JSON.stringify({
                type: 'auth_error',
                message: 'Account has been banned.'
              })
            );
            ws.close();
            return;
          }

          ws.userId = user.id;
          connections.set(user.id, ws);

          console.log(`WS authenticated user ID: ${user.id}`);

          ws.send(
            JSON.stringify({
              type: 'auth_success'
            })
          );
        } catch (err) {
          console.error('WS authentication failed:', err);

          ws.send(
            JSON.stringify({
              type: 'auth_error',
              message: 'Invalid or expired authentication token.'
            })
          );

          ws.close();
        }
      }
    } catch (e) {
      console.error('WS message parsing failure:', e);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      connections.delete(ws.userId);
      console.log(`WS removed user ID: ${ws.userId}`);
    }
  });
});

// Broadcast simple websocket payload to a client
function sendWSMessage(userId: string, payload: any) {
  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// Wire up global references for notification service and seed list
(global as any).sendWSMessageRef = sendWSMessage;
(global as any).users = users;

// Broadcast to everyone
function broadcastWSMessage(payload: any) {
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  });
}

// Helper to push a notification
function createNotification(userId: string, title: string, content: string) {
  const notif: LocalNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    user_id: userId,
    title,
    content,
    is_read: false,
    created_at: new Date().toISOString()
  };
  notifications.unshift(notif);
  
  // Call our new production notification engine asynchronously
  NotificationEngineService.sendNotification(userId, title, content).catch(err => {
    console.error('[NOTIF ENGINE ERROR] Failed to route notification via engine:', err);
  });
}

function notifyAdmins(title: string, content: string, type?: string, data?: any) {
  const admins = users.filter(u => u.role === 'admin');
  admins.forEach(admin => {
    // Persistent notification in db/state
    const notif: LocalNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      user_id: admin.id,
      title,
      content,
      is_read: false,
      created_at: new Date().toISOString()
    };
    notifications.unshift(notif);
    
    // Live WS message
    sendWSMessage(admin.id, {
      type: type || 'admin_alert',
      title,
      content,
      data
    });
  });
}

// Ledger adjustment for job escrow payments
function finalizeJobEscrowPayment(jobId: string, amount: number) {
  const updatedJob = jobs.find(j => j.id === jobId);
  if (updatedJob) {
    const escrowStatusBefore = updatedJob.escrow_status;
    updatedJob.escrow_status = 'held';
    createNotification(updatedJob.customer_id, 'Escrow payment secured!', `KES ${amount} successfully held in legal escrow.`);
    if (updatedJob.fundi_id) {
      createNotification(updatedJob.fundi_id, 'Funds Deposited', `Payment for "${updatedJob.title}" locked in escrow. Begin working.`);
    }

    // Call centralized immutable audit log for sensitive payment state changes
    recordSensitiveStateChange(
      updatedJob.customer_id,
      updatedJob.customer_name || 'Client',
      'PAYMENT_STATE_CHANGE',
      'payment',
      jobId,
      escrowStatusBefore,
      'held',
      `Secure M-Pesa escrow payment of KES ${amount} completed and held in escrow for service agreement "${updatedJob.title}".`,
      '127.0.0.1',
      'Daraja M-Pesa Callback Ledger Reconciliation Hook'
    );

    // Update Ledger (Escrow Accounts and Wallets)
    const escAcc = escrowAccounts.find(ea => ea.job_id === jobId);
    if (escAcc) {
      escAcc.status = 'held';
      escAcc.updated_at = new Date().toISOString();
    }

    let cWallet = wallets.find(w => w.user_id === updatedJob.customer_id);
    if (!cWallet) {
      cWallet = { id: `w_${updatedJob.customer_id}`, user_id: updatedJob.customer_id, balance: 15000, currency: "KES", updated_at: new Date().toISOString() };
      wallets.push(cWallet);
    }

    // Record wallet ledger operations
    walletTransactions.push({
      id: `wtx_${Date.now()}_dep`,
      wallet_id: cWallet.id,
      user_id: updatedJob.customer_id,
      amount: amount,
      type: 'deposit',
      description: `M-Pesa STK push deposit for "${updatedJob.title}"`,
      reference_id: jobId,
      created_at: new Date().toISOString()
    });

    walletTransactions.push({
      id: `wtx_${Date.now()}_hold`,
      wallet_id: cWallet.id,
      user_id: updatedJob.customer_id,
      amount: -amount,
      type: 'escrow_hold',
      description: `Funds locked in Escrow for "${updatedJob.title}"`,
      reference_id: jobId,
      created_at: new Date().toISOString()
    });

    // Update contract status to active now that payment is in escrow
    const contract = contracts.find(c => c.job_id === jobId);
    if (contract) {
      contract.status = 'active';
    }

    // Signal socket change
    sendWSMessage(updatedJob.customer_id, { type: 'escrow_received', job: updatedJob });
    if (updatedJob.fundi_id) {
      sendWSMessage(updatedJob.fundi_id, { type: 'escrow_received', job: updatedJob });
    }
  }
}

// Bind Safaricom Callback Hook with local ledger reconciliation
global.onMpesaTransactionCompleted = (intent: PaymentIntent, transaction: Transaction) => {
  console.log(`[LEDGER RECONCILIATION SUCCESS] Auto-reconciled intent ${intent.id} and transaction ${transaction.id}. Adjusting KAZIFY balances.`);
  finalizeJobEscrowPayment(intent.job_id, transaction.amount);
};


// --- REST API ENDPOINTS ---

// AUTH: Login
app.post('/api/auth/login', (req, res) => {
  const { phone, email, password } = req.body;
  const ip = req.ip || '127.0.0.1';
  const loginEmail = email || phone || 'unknown';

  const user = users.find(u => {
    if (email && u.email?.toLowerCase() === email.toLowerCase()) return true;
    if (phone && u.phone === phone) return true;
    return false;
  });

  // Always perform bcrypt verification to reduce timing attacks
  const passwordHash = user?.password || DUMMY_PASSWORD_HASH;

  const isPasswordValid = bcrypt.compareSync(
    password,
    passwordHash
  );

  if (!user || !user.password || !isPasswordValid) {
    loginAttempts.push({
      email: loginEmail,
      timestamp: Date.now(),
      success: false,
      ip
    });

    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  // Record successful login attempt
  loginAttempts.push({
    email: loginEmail,
    timestamp: Date.now(),
    success: true,
    ip
  });

  // Evaluate security rules for Multi-IP logins
  evaluateFraudAndVelocityRules(user.id, 'login', { ip });

  // Re-check suspension after evaluating security sentinel rules
  if (user.status === 'suspended') {
    return res.status(403).json({
      error: 'Account suspended: Your account is on an automated administrative hold subject to manual security review.'
    });
  }

  // Create JWT payload
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  // Exclude password from returned user object
  const { password: _, ...safeUser } = user;

  res.json({
    token: accessToken,
    refreshToken,
    user: safeUser
  });
});

// AUTH: Register
app.post('/api/auth/register', (req, res) => {
  const { name, phone, email, password, role, category } = req.body;

  if (users.some(u => (email && u.email.toLowerCase() === email.toLowerCase()) || (phone && u.phone === phone))) {
    return res.status(400).json({ error: 'User identifier already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser: LocalUser = {
    id: `user_${Date.now()}`,
    phone: phone || '',
    email: email || '',
    name,
    role,
    password: hashedPassword,
    is_email_verified: false,
    avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
    rating: role === 'fundi' ? 5.0 : undefined,
    category: role === 'fundi' ? category : undefined,
    status: role === 'fundi' ? 'available' : undefined,
    location: role === 'fundi' ? {
      lat: -1.286389 + (Math.random() - 0.5) * 0.05,
      lng: 36.817223 + (Math.random() - 0.5) * 0.05,
      address: "Nairobi Area"
    } : undefined
  };

  users.push(newUser);

  // Initialize wallet for new user
  const newWallet: LocalWallet = {
    id: `w_${newUser.id}`,
    user_id: newUser.id,
    balance: role === 'customer' ? 15000 : 0, // Seed customer with some testing funds
    currency: "KES",
    updated_at: new Date().toISOString()
  };
  wallets.push(newWallet);

  // Send verification email link (simulated)
  const verifyToken = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '1d' });
  newUser.email_verification_token = verifyToken;
  console.log(`[AUTH] Simulated Verification Email sent to ${newUser.email}`);
  console.log(`[AUTH] Link: http://localhost:3000/api/auth/verify-email?token=${verifyToken}`);

  const payload = {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: newUser.id });

  const { password: _, ...safeUser } = newUser;

  res.json({
    token: accessToken,
    refreshToken,
    user: safeUser
  });
});

// AUTH: Refresh Token
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'Refresh token is missing'
    });
  }

  jwt.verify(
    refreshToken,
    JWT_REFRESH_SECRET,
    {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({
          error: 'Invalid or expired refresh token'
        });
      }

      const payload = decoded as { id: string };
      const user = users.find(u => u.id === payload.id);

      if (!user) {
        return res.status(401).json({
          error: 'Associated user not found'
        });
      }

      // Ensure the refresh token is still active
      if (!refreshTokensRegistry.has(refreshToken)) {
        return res.status(401).json({
          error: 'Refresh token has been revoked or is no longer valid.'
        });
      }

      const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      // ==============================
      // Refresh Token Rotation
      // ==============================

      // Revoke the old refresh token
      refreshTokensRegistry.delete(refreshToken);

      // Issue a brand-new refresh token
      const newRefreshToken = generateRefreshToken({
        id: user.id
      });

      // Issue a new access token
      const newAccessToken = generateAccessToken(userPayload);

      return res.json({
        token: newAccessToken,
        refreshToken: newRefreshToken
      });
    }
  );
});

// AUTH: Logout/Revoke Refresh Token
app.post('/api/auth/logout', (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    refreshTokensRegistry.delete(refreshToken);
  }

  res.json({
    success: true,
    message: 'Successfully logged out'
  });
});

// AUTH: Request Password Reset
app.post('/api/auth/password-reset-request', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email address is required'
    });
  }

  const user = users.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  );

  // Production practice: Do not disclose if email exists
  const resetToken = jwt.sign(
    { id: user ? user.id : 'fake' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  if (user) {
    user.password_reset_token = resetToken;
    user.password_reset_expires = new Date(
      Date.now() + 3600000
    ).toISOString();

    createNotification(
      user.id,
      'Password Reset Link',
      `A password reset link was requested. Token: ${resetToken}`
    );
  }

  console.log(`[AUTH] Simulated Password Reset Email sent to ${email}`);
  console.log(
    `[AUTH] Link: http://localhost:3000/api/auth/password-reset?token=${resetToken}`
  );

  res.json({
    success: true,
    message:
      'If the email matches a registered account, a password reset link has been dispatched.',
    resetToken,
    simulatedLink: `http://localhost:3000/api/auth/password-reset?token=${resetToken}`
  });
});

// AUTH: Complete Password Reset
app.post('/api/auth/password-reset', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      error: 'Token and new password are required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid or expired password reset token'
      });
    }

    const payload = decoded as { id: string };

    const user = users.find(
      u => u.id === payload.id && u.password_reset_token === token
    );

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired password reset token'
      });
    }

    if (
      user.password_reset_expires &&
      new Date(user.password_reset_expires) < new Date()
    ) {
      return res.status(400).json({
        error: 'Password reset token has expired'
      });
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;

    createNotification(
      user.id,
      'Password Reset Successful',
      'Your account password has been successfully updated.'
    );

    res.json({
      success: true,
      message: 'Password has been successfully reset.'
    });
  });
});

// AUTH: Verify Email Request
app.post('/api/auth/verify-email-request', authenticateToken, (req, res) => {
  const userReq = (req as AuthenticatedRequest).user;
  if (!userReq) return res.status(401).json({ error: 'Unauthorized' });

  const user = users.find(u => u.id === userReq.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.is_email_verified) {
    return res.status(400).json({ error: 'Email is already verified' });
  }

  const verifyToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
  user.email_verification_token = verifyToken;

  console.log(`[AUTH] Simulated Verification Email sent to ${user.email}`);
  console.log(`[AUTH] Link: http://localhost:3000/api/auth/verify-email?token=${verifyToken}`);

  createNotification(user.id, "Verify Your Email", `Verification link requested. Token: ${verifyToken}`);

  res.json({ 
    success: true, 
    message: 'Verification link has been dispatched.',
    verifyToken,
    simulatedLink: `http://localhost:3000/api/auth/verify-email?token=${verifyToken}`
  });
});

// AUTH: Complete Email Verification (supporting both GET for clicks and POST for api calls)
app.get('/api/auth/verify-email', (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).send('<h1>Error</h1><p>Verification token is missing.</p>');
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send('<h1>Error</h1><p>Invalid or expired email verification token.</p>');
    }

    const payload = decoded as { id: string };
    const user = users.find(u => u.id === payload.id);

    if (!user) {
      return res.status(400).send('<h1>Error</h1><p>User associated with token not found.</p>');
    }

    user.is_email_verified = true;
    user.email_verification_token = undefined;

    createNotification(user.id, "Email Verified Successfully", "Thank you! Your email has been successfully verified.");

    res.send('<h1>Success</h1><p>Your email has been successfully verified! You can return to the Kazify application.</p>');
  });
});

app.post('/api/auth/verify-email', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired email verification token' });
    }

    const payload = decoded as { id: string };
    const user = users.find(u => u.id === payload.id);

    if (!user) {
      return res.status(400).json({ error: 'User associated with token not found' });
    }

    user.is_email_verified = true;
    user.email_verification_token = undefined;

    createNotification(user.id, "Email Verified Successfully", "Thank you! Your email has been successfully verified.");

    res.json({ success: true, message: 'Email has been successfully verified.' });
  });
});

// FUNDIS: Find Nearby
app.get('/api/fundis/nearby', (req, res) => {
  const lat = parseFloat(req.query.lat as string) || -1.286389;
  const lng = parseFloat(req.query.lng as string) || 36.817223;
  const category = req.query.category as string;

  let filtered = users.filter(u => u.role === 'fundi');
  if (category && category !== 'All') {
    filtered = filtered.filter(u => u.category === category);
  }

  const results = filtered.map(u => {
    const uLat = u.location?.lat || -1.286389;
    const uLng = u.location?.lng || 36.817223;
    const distance = getDistanceKM(lat, lng, uLat, uLng);
    return {
      ...u,
      distance: parseFloat(distance.toFixed(2))
    };
  });

  res.json(results);
});

// FUNDIS: Specific Profile & Stats
app.get('/api/fundis/:id/profile', (req, res) => {
  const fundiId = req.params.id;
  const fundi = users.find(u => u.id === fundiId && u.role === 'fundi');
  if (!fundi) {
    return res.status(404).json({ error: 'Expert tradesperson profile not found' });
  }

  const fundiReviews = reviews.filter(r => r.fundi_id === fundiId);
  const completedJobsCount = jobs.filter(j => j.fundi_id === fundiId && j.status === 'completed').length;

  const distribution = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
  fundiReviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))).toString() as keyof typeof distribution;
    distribution[star]++;
  });

  const availability = fundi.availability || {
    workingHours: { start: "08:00", end: "17:00", activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
    unavailableDates: []
  };

  res.json({
    fundi,
    reviews: fundiReviews,
    stats: {
      completed_jobs: completedJobsCount || fundiReviews.length + 3,
      total_reviews: fundiReviews.length,
      rating_distribution: distribution
    },
    availability
  });
});

// BOOKING: Get or update Fundi Availability calendar & working hours
app.get('/api/users/:id/availability', (req, res) => {
  const userId = req.params.id;
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const availability = user.availability || {
    workingHours: { start: "08:00", end: "17:00", activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
    unavailableDates: []
  };

  res.json(availability);
});

app.post('/api/users/:id/availability', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const loggedUser = (req as AuthenticatedRequest).user;
  
  if (!loggedUser || (loggedUser.id !== userId && loggedUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: You can only update your own availability settings.' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { workingHours, unavailableDates } = req.body;
  
  user.availability = {
    workingHours: workingHours || { start: "08:00", end: "17:00", activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
    unavailableDates: unavailableDates || []
  };

  res.json({ success: true, availability: user.availability });
});

// REVIEWS: Post feedback
app.post('/api/reviews', authenticateToken, (req, res) => {
  const { fundi_id, customer_id, customer_name, rating, comment, job_id } = req.body;

  const authUser = (req as AuthenticatedRequest).user;

  if (authUser.id !== customer_id) {
    return res.status(403).json({
      error: 'You may only submit reviews using your own account.'
    });
  }

  // Ensure the reviewed job exists
  const job = jobs.find(j => j.id === job_id);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found.'
    });
  }

  // Ensure the authenticated customer owns the job
  if (job.customer_id !== authUser.id) {
    return res.status(403).json({
      error: 'You can only review your own completed jobs.'
    });
  }

  // Ensure the review is for the assigned fundi
  if (job.fundi_id !== fundi_id) {
    return res.status(400).json({
      error: 'Review fundi does not match the assigned fundi.'
    });
  }

  // Ensure the job has been completed
  if (job.status !== 'completed') {
    return res.status(400).json({
      error: 'Reviews can only be submitted after job completion.'
    });
  }

  // Prevent duplicate reviews for the same completed job
  const existingReview = reviews.find(
    r =>
      r.job_id === job_id &&
      r.customer_id === authUser.id
  );

  if (existingReview) {
    return res.status(409).json({
      error: 'A review has already been submitted for this job.'
    });
  }

  // ------------------------------------------------------------------
  // NEW: Validate review rating
  // ------------------------------------------------------------------
  const numericRating = Number(rating);

  if (!Number.isFinite(numericRating)) {
    return res.status(400).json({
      error: 'Rating must be a valid number.'
    });
  }

  if (numericRating < 1 || numericRating > 5) {
    return res.status(400).json({
      error: 'Rating must be between 1 and 5.'
    });
  }

  const newReview: LocalReview = {
    id: `rev_${Date.now()}`,
    job_id,
    fundi_id,
    customer_id,
    customer_name,
    rating: numericRating,
    comment,
    created_at: new Date().toISOString()
  };

  reviews.push(newReview);

  // Re-calculate rating
  const fundiReviews = reviews.filter(r => r.fundi_id === fundi_id);

  const avgRating =
    fundiReviews.reduce((sum, r) => sum + r.rating, 0) /
    fundiReviews.length;

  const fundiIdx = users.findIndex(u => u.id === fundi_id);

  if (fundiIdx !== -1) {
    users[fundiIdx].rating = parseFloat(avgRating.toFixed(1));
  }

  // Set rated state on job if provided
  if (job_id) {
    const jobIdx = jobs.findIndex(j => j.id === job_id);

    if (jobIdx !== -1) {
      jobs[jobIdx].is_rated = true;
    }
  }

  res.json(newReview);
});

// JOBS: Create job Dispatch / Request
app.post('/api/jobs', authenticateToken, requireCustomer, (req, res) => {
  const { customer_id, title, description, category, workflow, lat, lng, address, amount } = req.body;

  const authUser = (req as AuthenticatedRequest).user;
  if (customer_id !== authUser?.id) {
    return res.status(403).json({ error: 'Unauthorized: Cannot create a job for another customer ID' });
  }

  const customerObj = users.find(u => u.id === customer_id);

  const newJob: LocalJob = {
    id: `job_${Date.now()}`,
    customer_id,
    customer_name: customerObj?.name || 'Asha Odhiambo',
    customer_phone: customerObj?.phone || '+254700000001',
    title,
    description,
    category,
    workflow,
    status: workflow === 'instant' ? 'matching' : 'pending',
    lat: parseFloat(lat) || -1.286389,
    lng: parseFloat(lng) || 36.817223,
    address: address || 'Nairobi CBD Area',
    amount: parseFloat(amount) || 0,
    escrow_status: 'unpaid',
    created_at: new Date().toISOString(),
    bids: [],
    fraud_flags: [],
    ai_matching_score: Math.floor(Math.random() * 20) + 80,
    recommended_fundis: getTopRecommendationsForJob(parseFloat(lat) || -1.286389, parseFloat(lng) || 36.817223, category)
  };

  jobs.unshift(newJob);

  // Alert matching tradespeople of the new job request via web-push in real-time
  const matchingFundis = users.filter(u => u.role === 'fundi' && u.category === category);
  matchingFundis.forEach(fundi => {
    NotificationEngineService.sendNotification(
      fundi.id,
      'New Bidding Job Open! 🛠️',
      `A new ${category} request "${title}" (KES ${parseFloat(amount || 0).toLocaleString()}) is open for proposals in ${address || 'your area'}.`,
      { jobId: newJob.id }
    ).catch(err => console.error('[PUSH ERROR] Failed to send push alert to fundi:', fundi.id, err));
  });

  // Notify system administrators of new incoming service request
  notifyAdmins(
    'New Service Request Filed 🚀',
    `Client ${customerObj?.name || 'Asha'} requested "${title}" in category "${category}".`,
    'new_service_request',
    newJob
  );

  // If Instant Dispatch, notify matching nearby fundis in parallel and simulate an accept mock offer!
  if (workflow === 'instant') {
    broadcastWSMessage({ type: 'new_instant_dispatch', job: newJob });

    // Simulate standard Uber-matching acceptance
    setTimeout(() => {
      const matchingFundi = users.find(u => u.role === 'fundi' && u.category === category && u.status === 'available');
      if (matchingFundi) {
        const jIdx = jobs.findIndex(j => j.id === newJob.id);
        if (jIdx !== -1 && jobs[jIdx].status === 'matching') {
          jobs[jIdx].fundi_id = matchingFundi.id;
          jobs[jIdx].fundi_name = matchingFundi.name;
          jobs[jIdx].fundi_phone = matchingFundi.phone;
          jobs[jIdx].fundi_lat = matchingFundi.location?.lat;
          jobs[jIdx].fundi_lng = matchingFundi.location?.lng;
          jobs[jIdx].status = 'accepted';
          jobs[jIdx].escrow_status = 'unpaid';

          createNotification(customer_id, 'Fundi Matched!', `${matchingFundi.name} has accepted your instant request! Escrow payment pending.`);
          sendWSMessage(customer_id, { type: 'job_status_change', job: jobs[jIdx] });
        }
      }
    }, 4000);
  } else {
    broadcastWSMessage({ type: 'new_quotation_job', job: newJob });

    // Auto-generate some simulated bids to feed Upwork quotation style!
    setTimeout(() => {
      const matchingFundis = users.filter(u => u.role === 'fundi' && u.category === category);
      matchingFundis.forEach((fundi, idx) => {
        const bidId = `bid_${Date.now()}_${idx}`;
        const bidAmt = Math.round(newJob.amount * (0.9 + Math.random() * 0.25));
        const newBid: LocalBid = {
          id: bidId,
          job_id: newJob.id,
          fundi_id: fundi.id,
          fundi_name: fundi.name,
          fundi_rating: fundi.rating || 5.0,
          amount: bidAmt,
          note: `Hello, I can assist you with your ${category} assignment quickly. Experienced over 5 years.`,
          duration_days: Math.floor(Math.random() * 2) + 1,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        const job = jobs.find(j => j.id === newJob.id);
        if (job) {
          if (!job.bids) job.bids = [];
          job.bids.push(newBid);
          createNotification(customer_id, 'New Bid Submitted', `${fundi.name} bid KES ${bidAmt} on your project.`);
          sendWSMessage(customer_id, { type: 'job_status_change', job });
        }
      });
    }, 5000);
  }

  res.status(201).json(newJob);
});

// JOBS: Get filtered lists
app.get('/api/jobs', (req, res) => {
  const { role, user_id } = req.query;

  if (!user_id) return res.json(jobs);

  if (role === 'customer') {
    const list = jobs.filter(j => j.customer_id === user_id);
    list.forEach(j => {
      if (!j.recommended_fundis || j.recommended_fundis.length === 0) {
        j.recommended_fundis = getTopRecommendationsForJob(j.lat, j.lng, j.category);
      }
    });
    return res.json(list);
  } else if (role === 'fundi') {
    const fundiObj = users.find(u => u.id === user_id);
    const fundiCategory = fundiObj?.category || 'Plumbing';

    // Show jobs assigned to them, or open status matching their trade skill
    const list = jobs.filter(j => 
       j.fundi_id === user_id || 
       (j.fundi_id === undefined && j.category === fundiCategory && (j.status === 'pending' || j.status === 'matching'))
    );
    return res.json(list);
  }

  res.json(jobs);
});

// Helper to initialize escrow and contracts upon hire
function initEscrowAndContract(job: LocalJob, fundiId: string) {
  const fundiObj = users.find(u => u.id === fundiId);
  if (!fundiObj) return;

  // 1. Escrow Account Creation
  const commRate = 0.10; // 10% system commission fee
  const commission = Math.round(job.amount * commRate);
  const payout = job.amount - commission;

  const escrowAcc: LocalEscrowAccount = {
    id: `escrow_${job.id}`,
    job_id: job.id,
    customer_id: job.customer_id,
    fundi_id: fundiId,
    amount: job.amount,
    commission_fee: commission,
    payout_amount: payout,
    status: 'unpaid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  escrowAccounts.push(escrowAcc);

  // 2. Contract Creation
  const contract: LocalContract = {
    id: `contract_${job.id}`,
    job_id: job.id,
    customer_id: job.customer_id,
    customer_name: job.customer_name,
    fundi_id: fundiId,
    fundi_name: fundiObj.name,
    amount: job.amount,
    terms: `This contract governs the provision of professional services for "${job.title}". The fundi agrees to complete the requested tasks in a professional and timely manner. The customer agrees to lock the sum of KES ${job.amount} in Kazify's secure Escrow Account prior to work starting. Upon completion and customer approval, funds minus a 10% platform commission fee (KES ${commission}) will be disbursed directly into the fundi's digital wallet. Disputes will be arbitrated by Kazify Administration.`,
    customer_signed: false,
    fundi_signed: false,
    status: 'draft',
    created_at: new Date().toISOString()
  };
  contracts.push(contract);
  
  createNotification(job.customer_id, "Contract Created", `A digital work contract has been generated for ${job.title}. Please sign it.`);
  createNotification(fundiId, "New Contract Pending", `Please sign the digital contract for "${job.title}" to authorize work.`);
}

// BIDS: Submit a quotation proposal (bidding)
app.post('/api/bids', authenticateToken, requireFundi, (req, res) => {
  const { job_id, amount, note, duration_days } = req.body;
  const authUser = (req as AuthenticatedRequest).user;

  if (!job_id || !amount) {
    return res.status(400).json({ error: 'Job ID and bid amount are required' });
  }

  const job = jobs.find(j => j.id === job_id);
  if (!job) {
    return res.status(404).json({ error: 'Target job request not found' });
  }

  if (job.fundi_id) {
    return res.status(400).json({ error: 'This job has already been assigned to a tradesperson' });
  }

  const fundi = users.find(u => u.id === authUser?.id && u.role === 'fundi');
  if (!fundi) {
    return res.status(403).json({ error: 'Access denied: Valid Fundi account required to bid' });
  }

  // Create the bid
  const bidId = `bid_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const newBid: LocalBid = {
    id: bidId,
    job_id,
    fundi_id: fundi.id,
    fundi_name: fundi.name,
    fundi_rating: fundi.rating || 5.0,
    amount: parseFloat(amount),
    note: note || `Hello, I can assist you with your ${job.category} assignment quickly.`,
    duration_days: parseInt(duration_days) || 1,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  if (!job.bids) {
    job.bids = [];
  }

  // Remove existing bids from the same fundi to avoid duplicates if they re-bid
  job.bids = job.bids.filter(b => b.fundi_id !== fundi.id);
  job.bids.push(newBid);

  createNotification(
    job.customer_id, 
    'New Quotation Bid Submitted!', 
    `${fundi.name} has placed a bid of KES ${amount.toLocaleString()} on your "${job.title}" request.`
  );

  // Notify administrator that a bid has been received so they can see active operations
  notifyAdmins(
    'New Bid Submitted 💸',
    `Tradesperson ${fundi.name} submitted KES ${amount.toLocaleString()} bid on job "${job.title}".`,
    'new_bid_received',
    { job, bid: newBid }
  );

  // WebSocket syncs
  sendWSMessage(job.customer_id, { type: 'job_status_change', job });
  sendWSMessage(fundi.id, { type: 'bid_submitted_success', job_id, bid: newBid });
  broadcastWSMessage({ type: 'job_bid_added', jobId: job_id, bid: newBid });

  res.status(201).json(newBid);
});

// ADMIN: Get recommended tradespersons for allocation (nearest & reliable)
app.get('/api/admin/jobs/:id/recommendations', authenticateToken, requireAdmin, (req, res) => {
  const jobId = req.params.id;
  const job = jobs.find(j => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Find fundis in the same category
  const matchingFundis = users.filter(u => u.role === 'fundi' && u.category === job.category);

  // Map each with distance and reliability metrics
  const recommendations = matchingFundis.map(fundi => {
    // default coordinates if not present
    const fLat = fundi.location?.lat !== undefined ? fundi.location.lat : -1.286389;
    const fLng = fundi.location?.lng !== undefined ? fundi.location.lng : 36.817223;
    const distanceKM = getDistanceKM(job.lat, job.lng, fLat, fLng);
    
    // reliability score based on rating (rating out of 5, higher is better)
    const rating = fundi.rating || 5.0;
    const isReliable = rating >= 4.5;
    
    return {
      id: fundi.id,
      name: fundi.name,
      phone: fundi.phone,
      rating: rating,
      avatar_url: fundi.avatar_url,
      status: fundi.status || 'available',
      distanceKM: parseFloat(distanceKM.toFixed(2)),
      address: fundi.location?.address || 'Nairobi Area',
      isReliable,
    };
  });

  // Sort by availability first, then distance (nearest first) and rating
  recommendations.sort((a, b) => {
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (a.status !== 'available' && b.status === 'available') return 1;
    // Nearest first
    if (Math.abs(a.distanceKM - b.distanceKM) > 0.1) {
      return a.distanceKM - b.distanceKM;
    }
    // Highest rating first
    return b.rating - a.rating;
  });

  res.json(recommendations);
});

// ADMIN: Get bulk recommendations for a list of job IDs (nearest available)
app.post('/api/admin/jobs/bulk-recommendations', authenticateToken, requireAdmin, (req, res) => {
  const { jobIds } = req.body;
  if (!Array.isArray(jobIds)) {
    return res.status(400).json({ error: 'jobIds must be an array' });
  }

  const results = jobIds.map(jobId => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      return { jobId, error: 'Job not found' };
    }

    // Find fundis in the same category
    const matchingFundis = users.filter(u => u.role === 'fundi' && u.category === job.category);

    const candidates = matchingFundis.map(fundi => {
      const fLat = fundi.location?.lat !== undefined ? fundi.location.lat : -1.286389;
      const fLng = fundi.location?.lng !== undefined ? fundi.location.lng : 36.817223;
      const distanceKM = getDistanceKM(job.lat, job.lng, fLat, fLng);
      return {
        id: fundi.id,
        name: fundi.name,
        phone: fundi.phone,
        rating: fundi.rating || 5.0,
        status: fundi.status || 'available',
        distanceKM: parseFloat(distanceKM.toFixed(2)),
        avatar_url: fundi.avatar_url,
        address: fundi.location?.address || 'Nairobi Area'
      };
    });

    // Sort: status === 'available' first, then closest distance, then rating
    candidates.sort((a, b) => {
      if (a.status === 'available' && b.status !== 'available') return -1;
      if (a.status !== 'available' && b.status === 'available') return 1;
      if (Math.abs(a.distanceKM - b.distanceKM) > 0.1) {
        return a.distanceKM - b.distanceKM;
      }
      return b.rating - a.rating;
    });

    return {
      jobId,
      jobTitle: job.title,
      jobCategory: job.category,
      budget: job.amount,
      lat: job.lat,
      lng: job.lng,
      address: job.address,
      currentFundiId: job.fundi_id,
      currentFundiName: job.fundi_name,
      bestCandidate: candidates[0] || null,
      allCandidates: candidates.slice(0, 5) // Send top 5 candidates
    };
  });

  res.json(results);
});

// ADMIN: Process bulk manual allocations
app.post('/api/admin/jobs/bulk-allocate', authenticateToken, requireAdmin, (req, res) => {
  const { allocations } = req.body;
  if (!Array.isArray(allocations)) {
    return res.status(400).json({ error: 'allocations must be an array' });
  }

  const adminUser = (req as AuthenticatedRequest).user;
  const successList: any[] = [];
  const errorList: any[] = [];

  allocations.forEach(({ jobId, fundiId }) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      errorList.push({ jobId, error: 'Job not found' });
      return;
    }

    const fundi = users.find(u => u.id === fundiId && u.role === 'fundi');
    if (!fundi) {
      errorList.push({ jobId, error: 'Tradesperson not found' });
      return;
    }

    // Allocate
    job.fundi_id = fundi.id;
    job.fundi_name = fundi.name;
    job.fundi_phone = fundi.phone;
    job.fundi_lat = fundi.location?.lat;
    job.fundi_lng = fundi.location?.lng;
    job.status = 'accepted';

    // Clear previous bids if any and generate contract & escrow account
    initEscrowAndContract(job, fundi.id);

    // Audit Log
    recordAdminAudit(
      adminUser?.id || 'system',
      adminUser?.name || 'Administrator',
      'BULK_ALLOCATE_FUNDI',
      'user',
      fundi.id,
      `Bulk allocated tradesperson ${fundi.name} (Category: ${fundi.category}) to job "${job.title}" (ID: ${job.id}).`
    );

    // Create notifications
    createNotification(
      job.customer_id,
      'Kazify Matchmaker Allocated Expert!',
      `Kazify administration has bulk allocated ${fundi.name} (${fundi.rating || 5.0}⭐, nearest available) to your "${job.title}" request.`
    );

    createNotification(
      fundi.id,
      'Kazify Work Allocation',
      `You have been bulk-allocated to job "${job.title}" by administration. Please check your contract.`
    );

    // Broadcast WebSockets
    sendWSMessage(job.customer_id, { type: 'job_status_change', job });
    sendWSMessage(fundi.id, { type: 'job_status_change', job });
    broadcastWSMessage({ type: 'job_allocated_success', jobId: job.id, fundiId: fundi.id });

    successList.push({ jobId, fundiId, jobTitle: job.title, fundiName: fundi.name });
  });

  res.json({
    success: true,
    message: `Successfully allocated ${successList.length} jobs.`,
    successList,
    errorList
  });
});

// ADMIN: Manually allocate a tradesperson to a service request
app.post('/api/admin/allocate-fundi', authenticateToken, requireAdmin, (req, res) => {
  const { jobId, fundiId } = req.body;

  const jobIdx = jobs.findIndex(j => j.id === jobId);
  if (jobIdx === -1) {
    return res.status(404).json({ error: 'Job request not found' });
  }

  const fundi = users.find(u => u.id === fundiId && u.role === 'fundi');
  if (!fundi) {
    return res.status(404).json({ error: 'Selected tradesperson not found' });
  }

  const job = jobs[jobIdx];

  // Allocate
  job.fundi_id = fundi.id;
  job.fundi_name = fundi.name;
  job.fundi_phone = fundi.phone;
  job.fundi_lat = fundi.location?.lat;
  job.fundi_lng = fundi.location?.lng;
  job.status = 'accepted'; // Directly transition to accepted
  
  // Clear previous bids if any and generate contract & escrow account
  initEscrowAndContract(job, fundi.id);

  const adminUser = (req as AuthenticatedRequest).user;
  recordAdminAudit(
    adminUser?.id || 'system',
    adminUser?.name || 'Administrator',
    'ALLOCATE_FUNDI',
    'user',
    fundi.id,
    `Allocated tradesperson ${fundi.name} (Category: ${fundi.category}, Rating: ${fundi.rating}) to job "${job.title}" (ID: ${job.id}).`
  );

  createNotification(
    job.customer_id, 
    'Kazify Matchmaker Allocated Expert!', 
    `Kazify administration has allocated ${fundi.name} (${fundi.rating}⭐, nearest available) to your "${job.title}" request.`
  );

  createNotification(
    fundi.id,
    'Kazify Work Allocation',
    `You have been allocated to job "${job.title}" by administration. Please check the contract.`
  );

  // Broadcast WebSocket messages to sync screens
  sendWSMessage(job.customer_id, { type: 'job_status_change', job });
  sendWSMessage(fundi.id, { type: 'job_status_change', job });
  broadcastWSMessage({ type: 'job_allocated_success', jobId: job.id, fundiId: fundi.id });

  res.json({ success: true, message: `Successfully allocated ${fundi.name} to job`, job });
});

// JOBS: Accept Bid (Quotation Workflow)
app.post('/api/bids/:id/accept', authenticateToken, requireCustomer, (req, res) => {
  const bidId = req.params.id;

  let matchedJob: LocalJob | null = null;
  let matchedBid: LocalBid | null = null;

  jobs.forEach(job => {
    if (job.bids) {
      const bid = job.bids.find(b => b.id === bidId);
      if (bid) {
        matchedJob = job;
        matchedBid = bid;
      }
    }
  });

  if (!matchedJob || !matchedBid) {
    return res.status(404).json({ error: 'Target bid or associated job not found' });
  }

  const job = matchedJob as LocalJob;
  const bid = matchedBid as LocalBid;

  const authUser = (req as AuthenticatedRequest).user;
  if (job.customer_id !== authUser?.id) {
    return res.status(403).json({ error: 'Unauthorized: Cannot accept bids on someone else\'s job' });
  }

  // Accept this bid, reject all other bids
  if (job.bids) {
    job.bids.forEach(b => {
      if (b.id === bidId) b.status = 'accepted';
      else b.status = 'rejected';
    });
  }

  const fundi = users.find(u => u.id === bid.fundi_id);

  job.fundi_id = bid.fundi_id;
  job.fundi_name = bid.fundi_name;
  job.fundi_phone = fundi?.phone || '+254700000002';
  job.fundi_lat = fundi?.location?.lat;
  job.fundi_lng = fundi?.location?.lng;
  job.status = 'accepted';
  job.amount = bid.amount;
  job.escrow_status = 'unpaid';

  initEscrowAndContract(job, bid.fundi_id);

  createNotification(bid.fundi_id, 'Bid Accepted!', `Your quote on "${job.title}" has been accepted! Access your job center for updates.`);
  sendWSMessage(bid.fundi_id, { type: 'job_status_change', job });
  sendWSMessage(job.customer_id, { type: 'job_status_change', job });

  res.json({ success: true, job });
});

// JOBS: Accept Instant Dispatch (Instant matching screen)
app.post('/api/jobs/:id/accept-instant', authenticateToken, requireFundi, (req, res) => {
  const jobId = req.params.id;
  const { fundi_id } = req.body;

  const authUser = (req as AuthenticatedRequest).user;
  if (fundi_id !== authUser?.id) {
    return res.status(403).json({ error: 'Unauthorized: Cannot accept on behalf of another expert ID' });
  }

  const job = jobs.find(j => j.id === jobId);
  const fundi = users.find(u => u.id === fundi_id);

  if (!job || !fundi) {
    return res.status(404).json({ error: 'Job or expert fundi reference not found' });
  }

  job.fundi_id = fundi_id;
  job.fundi_name = fundi.name;
  job.fundi_phone = fundi.phone;
  job.fundi_lat = fundi.location?.lat;
  job.fundi_lng = fundi.location?.lng;
  job.status = 'accepted';
  job.escrow_status = 'unpaid';

  initEscrowAndContract(job, fundi_id);

  createNotification(job.customer_id, 'Instant Fundi Dispatched', `${fundi.name} accepted your request and is ready.`);
  sendWSMessage(job.customer_id, { type: 'job_status_change', job });
  sendWSMessage(fundi_id, { type: 'job_status_change', job });

  res.json({ success: true, job });
});

// JOBS: Update workflow status (e.g. en_route, started, completed)
app.post(
  '/api/jobs/:id/status',
  authenticateToken,
  (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user;
    const jobId = req.params.id;
    const { status } = req.body;

    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job request reference not found'
      });
    }

    // Only assigned fundi, owning customer or admin may update
    const isAdmin = currentUser.role === 'admin';
    const isCustomer = job.customer_id === currentUser.id;
    const isAssignedFundi = job.fundi_id === currentUser.id;

    if (!isAdmin && !isCustomer && !isAssignedFundi) {
      return res.status(403).json({
        error: 'You are not authorized to update this job.'
      });
    }

    // Allowed workflow states
    const allowedStatuses = [
      'pending',
      'accepted',
      'en_route',
      'started',
      'completed',
      'cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid job status.'
      });
    }

    // Prevent illegal workflow transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['en_route', 'cancelled'],
      en_route: ['started', 'cancelled'],
      started: ['completed'],
      completed: [],
      cancelled: []
    };

    const currentStatus = job.status;

    if (
      validTransitions[currentStatus] &&
      !validTransitions[currentStatus].includes(status)
    ) {
      return res.status(400).json({
        error: `Cannot change job from '${currentStatus}' to '${status}'.`
      });
    }

    job.status = status;

    if (status === 'completed') {
      EscrowService.releaseFunds(jobId);

      // Simulate updating completing statistics
      const fundiIdx = users.findIndex(u => u.id === job.fundi_id);

      if (fundiIdx !== -1) {
        users[fundiIdx].status = 'available';
      }
    }

    if (status === 'en_route') {
      createNotification(
        job.customer_id,
        'Fundi en route',
        `${job.fundi_name || 'Your tradesperson'} is traveling to your location.`
      );

      // Periodically simulate coordinates shifting for Uber-style live tracking
      let count = 0;

      const intervalId = setInterval(() => {
        const freshJob = jobs.find(j => j.id === jobId);

        if (freshJob && freshJob.status === 'en_route') {
          const custLat = freshJob.lat;
          const custLng = freshJob.lng;

          const dx =
            (custLat - (freshJob.fundi_lat || -0.091702)) /
            (5 - count);

          const dy =
            (custLng - (freshJob.fundi_lng || 34.767956)) /
            (5 - count);

          freshJob.fundi_lat =
            (freshJob.fundi_lat || -0.091702) + dx;

          freshJob.fundi_lng =
            (freshJob.fundi_lng || 34.767956) + dy;

          const distance = getDistanceKM(
            custLat,
            custLng,
            freshJob.fundi_lat,
            freshJob.fundi_lng
          );

          const eta = `${Math.ceil(distance * 3 + 1)} mins`;

          sendWSMessage(freshJob.customer_id, {
            type: 'tracking_update',
            job_id: jobId,
            fundi_location: {
              lat: freshJob.fundi_lat,
              lng: freshJob.fundi_lng
            },
            eta
          });

          count++;

          if (count >= 4) {
            clearInterval(intervalId);
          }
        } else {
          clearInterval(intervalId);
        }
      }, 5000);
    }

    if (status === 'started') {
      createNotification(
        job.customer_id,
        'Work Commenced',
        'Secure escrow holds are now active. Work has started.'
      );
    }

    sendWSMessage(job.customer_id, {
      type: 'job_status_change',
      job
    });

    if (job.fundi_id) {
      sendWSMessage(job.fundi_id, {
        type: 'job_status_change',
        job
      });
    }

    res.json(job);
  }
);

// PAYMENTS: M-Pesa STK Push Integration using Daraja Client
app.post('/api/mpesa/stkpush', async (req, res) => {
  const { phone_number, amount, job_id, idempotencyKey } = req.body;

  const job = jobs.find(j => j.id === job_id);
  if (!job) {
    return res.status(404).json({ error: 'Job reference not found' });
  }

  try {
    const numericAmount = parseFloat(amount) || job.amount;
    
    // Call our production-grade Daraja integration
    const result = await DarajaClient.initiateSTKPush({
      phoneNumber: phone_number,
      amount: numericAmount,
      jobId: job_id,
      userId: job.customer_id,
      idempotencyKey: idempotencyKey
    });

    // Also populate escrowTransactions list so legacy/existing codes continue querying it if they do
    const newLegacyTx: LocalEscrowTransaction = {
      id: `tx_${Date.now()}`,
      job_id,
      amount: numericAmount,
      status: 'pending',
      type: 'stk_push',
      phone_number,
      checkout_request_id: result.CheckoutRequestID,
      created_at: new Date().toISOString()
    };
    escrowTransactions.unshift(newLegacyTx);

    res.json({
      MerchantRequestID: result.MerchantRequestID,
      CheckoutRequestID: result.CheckoutRequestID,
      ResponseDescription: result.ResponseDescription,
      ResponseCode: result.ResponseCode,
      isSimulated: result.isSimulated
    });
  } catch (err: any) {
    console.error('[SERVER] M-Pesa STK push error:', err);
    res.status(500).json({ error: err.message || 'M-Pesa STK push request failed.' });
  }
});

// PAYMENTS: M-Pesa Webhook Callback Receiver
app.post('/api/mpesa/callback', async (req, res) => {
  const receivedSecret = req.query.secret as string;
  const clientIp = req.ip;

  try {
    const result = await DarajaClient.handleCallback(req.body, clientIp, receivedSecret);
    
    if (result.success && result.data) {
      // Find matching legacy transaction in escrowTransactions list and set to completed
      const legacyTx = escrowTransactions.find(t => t.checkout_request_id === result.data.intent.checkout_request_id);
      if (legacyTx) {
        legacyTx.status = 'completed';
      }
    }

    // Safaricom expects a response indicating callback receipt
    res.json({
      ResponseCode: '0',
      ResponseDescription: result.message
    });
  } catch (err: any) {
    console.error('[SERVER CALLBACK EXCEPTION]:', err);
    res.status(500).json({ error: 'Internal callback processing failure' });
  }
});

// PAYMENTS: Check status of an STK push transaction
app.get('/api/mpesa/status/:checkoutRequestId', async (req, res) => {
  const checkoutRequestId = req.params.checkoutRequestId;
  try {
    const result = await DarajaClient.queryTransactionStatus(checkoutRequestId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to query transaction status.' });
  }
});

// ADMIN PAYMENTS DASHBOARD ENDPOINTS
app.get('/api/admin/mpesa/intents', authenticateToken, requireAdmin, (req, res) => {
  res.json(paymentIntents);
});

app.get('/api/admin/mpesa/transactions', authenticateToken, requireAdmin, (req, res) => {
  res.json(transactions);
});

app.get('/api/admin/mpesa/reconciliations', authenticateToken, requireAdmin, (req, res) => {
  res.json(reconciliationRecords);
});

// Manually trigger reconciliation on all records
app.post('/api/admin/mpesa/reconcile', authenticateToken, requireAdmin, (req, res) => {
  // Try to match orphaned payment intents
  let reconciledCount = 0;
  paymentIntents.forEach(intent => {
    if (intent.status === 'success') {
      const match = transactions.find(t => t.payment_intent_id === intent.id);
      if (match) {
        const alreadyReconciled = reconciliationRecords.some(r => r.payment_intent_id === intent.id);
        if (!alreadyReconciled) {
          // Re-trigger audit reconcile
          const expected = intent.amount;
          const received = match.amount;
          const status = expected === received ? 'matched' : 'mismatch_amount';
          reconciliationRecords.unshift({
            id: `rec_${Date.now()}_man`,
            transaction_id: match.id,
            payment_intent_id: intent.id,
            mpesa_receipt_number: match.mpesa_receipt_number,
            amount_expected: expected,
            amount_received: received,
            reconciliation_status: status,
            verified_at: new Date().toISOString(),
            notes: 'Manual administrative reconciliation audit run.',
            created_at: new Date().toISOString()
          });
          reconciledCount++;
        }
      }
    }
  });

  res.json({
    success: true,
    message: `Manual reconciliation audit completed. Reconciled ${reconciledCount} missing logs.`,
    total_intents: paymentIntents.length,
    total_transactions: transactions.length,
    total_reconciliation_records: reconciliationRecords.length
  });
});

// Background Sync check (Manual / HTTP triggerable)
app.post('/api/admin/mpesa/sync', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await DarajaClient.syncPendingIntents();
    res.json({
      success: true,
      message: 'Pending payment intents synchronized successfully.',
      ...stats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Background sync job failed.' });
  }
});


// PAYMENTS: Log charge transaction
app.post('/api/payments/charge', (req, res) => {
  const { payment_method, id, amount, phone_number } = req.body;

  const newTx: LocalEscrowTransaction = {
    id: `tx_${Date.now()}`,
    job_id: id,
    amount: parseFloat(amount) || 0,
    status: 'completed',
    type: 'stk_push',
    phone_number: phone_number || '',
    created_at: new Date().toISOString()
  };

  escrowTransactions.unshift(newTx);

  const testJob = jobs.find(j => j.id === id);
  if (testJob) {
    testJob.escrow_status = 'held';

    // Update Ledger (Escrow Accounts and Wallets)
    const escAcc = escrowAccounts.find(ea => ea.job_id === id);
    if (escAcc) {
      escAcc.status = 'held';
      escAcc.updated_at = new Date().toISOString();
    }

    let cWallet = wallets.find(w => w.user_id === testJob.customer_id);
    if (!cWallet) {
      cWallet = { id: `w_${testJob.customer_id}`, user_id: testJob.customer_id, balance: 15000, currency: "KES", updated_at: new Date().toISOString() };
      wallets.push(cWallet);
    }

    // Record wallet ledger operations
    walletTransactions.push({
      id: `wtx_${Date.now()}_dep`,
      wallet_id: cWallet.id,
      user_id: testJob.customer_id,
      amount: parseFloat(amount) || testJob.amount,
      type: 'deposit',
      description: `Direct charge payment for "${testJob.title}"`,
      reference_id: id,
      created_at: new Date().toISOString()
    });

    walletTransactions.push({
      id: `wtx_${Date.now()}_hold`,
      wallet_id: cWallet.id,
      user_id: testJob.customer_id,
      amount: -(parseFloat(amount) || testJob.amount),
      type: 'escrow_hold',
      description: `Funds locked in Escrow for "${testJob.title}"`,
      reference_id: id,
      created_at: new Date().toISOString()
    });

    // Update contract status to active now that payment is in escrow
    const contract = contracts.find(c => c.job_id === id);
    if (contract) {
      contract.status = 'active';
    }

    sendWSMessage(testJob.customer_id, { type: 'escrow_received', job: testJob });
    if (testJob.fundi_id) {
      sendWSMessage(testJob.fundi_id, { type: 'escrow_received', job: testJob });
    }
  }

  res.json({ success: true, transaction: newTx });
});

// PAYMENTS: Escrow history
app.get('/api/escrow/history', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  // Administrators may view the complete escrow history
  if (authUser.role === 'admin') {
    return res.json(escrowTransactions);
  }

  // Build a list of escrow accounts the user participates in
  const accessibleEscrows = escrowAccounts.filter(
    e =>
      e.customer_id === authUser.id ||
      e.fundi_id === authUser.id
  );

  // Extract the corresponding job IDs
  const accessibleJobIds = accessibleEscrows.map(e => e.job_id);

  // Return only transactions belonging to those jobs
  const visibleTransactions = escrowTransactions.filter(
    tx => accessibleJobIds.includes(tx.job_id)
  );

  res.json(visibleTransactions);
});

// CHATS: Send text message
app.post('/api/chats', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const { job_id, message } = req.body;

  const job = jobs.find(j => j.id === job_id);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found.'
    });
  }

  // Admins may participate in any chat
  if (
    authUser.role !== 'admin' &&
    authUser.id !== job.customer_id &&
    authUser.id !== job.fundi_id
  ) {
    return res.status(403).json({
      error: 'You are not authorized to send messages for this job.'
    });
  }

  const newMsg: LocalChatMessage = {
    id: `msg_${Date.now()}`,
    job_id,
    sender_id: authUser.id,
    sender_name: authUser.name,
    message,
    created_at: new Date().toISOString()
  };

  chatMessages.push(newMsg);

  const recipientId =
    authUser.id === job.customer_id
      ? job.fundi_id
      : job.customer_id;

  if (recipientId) {
    sendWSMessage(recipientId, {
      type: 'new_chat_message',
      chatMessage: newMsg
    });
  }

  res.json(newMsg);
});

// CHATS: Get history logs
app.get('/api/chats/:job_id', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const job = jobs.find(j => j.id === req.params.job_id);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found.'
    });
  }

  // Admins may view any chat
  if (
    authUser.role !== 'admin' &&
    authUser.id !== job.customer_id &&
    authUser.id !== job.fundi_id
  ) {
    return res.status(403).json({
      error: 'You are not authorized to view this chat.'
    });
  }

  const filtered = chatMessages.filter(
    m => m.job_id === req.params.job_id
  );

  res.json(filtered);
});

// NOTIFICATIONS: Get list
app.get('/api/notifications', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  // Administrators may view all notifications
  if (authUser.role === 'admin') {
    return res.json(notifications);
  }

  // Customers and Fundis may only view their own notifications
  const visibleNotifications = notifications.filter(
    notification => notification.user_id === authUser.id
  );

  res.json(visibleNotifications);
});

// NOTIFICATIONS: Mark as read
app.post('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const notification = notifications.find(
    n => n.id === req.params.id
  );

  if (!notification) {
    return res.status(404).json({
      error: 'Notification not found.'
    });
  }

  if (
    authUser.role !== 'admin' &&
    notification.user_id !== authUser.id
  ) {
    return res.status(403).json({
      error: 'You are not authorized to modify this notification.'
    });
  }

  notification.is_read = true;

  res.json({
    success: true
  });
});

// ADMIN: Get metric analytics reports
app.get('/api/admin/metrics', authenticateToken, requireAdmin, (req, res) => {
  const total_customers = users.filter(u => u.role === 'customer').length;
  const total_fundis = users.filter(u => u.role === 'fundi').length;
  const active_jobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;
  const completed_jobs = jobs.filter(j => j.status === 'completed').length;
  const escrow_volume_kes = escrowTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  res.json({
    metrics: {
      total_users: users.length,
      total_customers,
      total_fundis,
      escrow_volume_kes,
      active_jobs,
      completed_jobs
    },
    recent_transactions: escrowTransactions.slice(0, 10),
    recent_jobs: jobs.slice(0, 10)
  });
});

// AI: Diagnose Gemini API credentials and connection availability
app.get('/api/ai/diagnose', async (req, res) => {
  const startTime = Date.now();
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      status: 'error',
      code: 'MISSING_API_KEY',
      message: 'GEMINI_API_KEY environment variable is not defined or is missing.',
      latencyMs: Date.now() - startTime
    });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-diagnostics',
        }
      }
    });

    // Make a lightweight, fast, low-token handshake prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: ['Respond with exactly the JSON: {"status": "ok"}'],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const bodyText = response.text || '';
    const parsed = JSON.parse(bodyText.trim());

    if (parsed && parsed.status === 'ok') {
      return res.json({
        status: 'ok',
        code: 'HANDSHAKE_SUCCESS',
        message: 'Gemini API handshake succeeded. Service is fully reachable and credentials are valid.',
        latencyMs: Date.now() - startTime
      });
    } else {
      throw new Error(`Unexpected payload content from handshake response: ${bodyText}`);
    }
  } catch (error: any) {
    console.error('[Gemini Handshake Failure]', error);
    return res.status(502).json({
      status: 'error',
      code: 'HANDSHAKE_FAILED',
      message: error.message || 'Handshake connection to Gemini API failed.',
      latencyMs: Date.now() - startTime
    });
  }
});

// AI: Estimate Pricing Assignment using Gemini
app.post('/api/ai/estimate', async (req, res) => {
  const { title, description, category, locationName } = req.body;
  const startTime = Date.now();

  const fallbackEstimate = {
    estimated_amount: 1800,
    duration_estimate: "2 - 4 hours",
    standard_risk_score: 2,
    price_breakdown: [
      "Plumbing call-out diagnostics and troubleshooting standard rates: KES 1,000",
      "Minor pipe leaks, fittings, and retrofitting materials allowance: KES 800"
    ],
    fraud_flags: []
  };

  const logEvent = (event: string, details: any) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'GeminiEstimateService',
      event,
      durationMs: Date.now() - startTime,
      ...details
    }, null, 2));
  };

  logEvent('RequestReceived', {
    requestParameters: { 
      title, 
      descriptionLength: description?.length || 0, 
      category, 
      locationName 
    }
  });

  if (!process.env.GEMINI_API_KEY) {
    logEvent('FallbackTriggered', {
      reason: 'GEMINI_API_KEY environment variable is not defined or is missing.',
      action: 'Returning fallback hardcoded estimate'
    });
    return res.json(fallbackEstimate);
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const prompt = `You are an expert professional trade pricing assistant in Kenya. Your role is to analyze a job listing details and generate a highly accurate, fair market price estimate in KES, along with typical project details.

Job Details:
Title: ${title}
Description: ${description}
Category: ${category}
Location: ${locationName || 'Kenya'}

Please generate a professional cost estimation report including estimated amount in KES, typical completion duration, a complexity risk score from 1-10, a breakdown of estimated costs, and any safety or fraud flags if the description seems suspicious, fake, or unrealistic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [prompt],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimated_amount: { 
              type: Type.INTEGER, 
              description: "Fair market estimated amount for the job in KES (Kenya Shillings)" 
            },
            duration_estimate: { 
              type: Type.STRING, 
              description: "Typical duration or completion time, e.g., '1 - 3 hours' or '1 - 2 days'" 
            },
            standard_risk_score: { 
              type: Type.INTEGER, 
              description: "An integer complexity/risk score from 1 to 10" 
            },
            price_breakdown: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of cost items breakdown summing up to the estimated amount"
            },
            fraud_flags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of warnings/alerts if the job details look suspicious or dangerous, otherwise empty list"
            }
          },
          required: ["estimated_amount", "duration_estimate", "standard_risk_score", "price_breakdown", "fraud_flags"]
        }
      }
    });

    const bodyText = response.text || '';
    if (!bodyText.trim()) {
      throw new Error('Empty response text received from Gemini model.');
    }

    const cleanJSON = JSON.parse(bodyText.trim());
    
    logEvent('Success', {
      responseDetails: {
        model: 'gemini-3.5-flash',
        responseLength: bodyText.length,
        estimatedAmount: cleanJSON.estimated_amount,
        standardRiskScore: cleanJSON.standard_risk_score,
        priceBreakdownCount: cleanJSON.price_breakdown?.length || 0,
        fraudFlagsCount: cleanJSON.fraud_flags?.length || 0
      }
    });

    res.json(cleanJSON);
  } catch (error: any) {
    logEvent('Error', {
      errorName: error.name || 'Error',
      errorMessage: error.message || 'Unknown error occurred during Gemini estimation',
      errorStack: error.stack,
      action: 'Falling back to fallback hardcoded estimate'
    });
    res.json(fallbackEstimate);
  }
});

// --- WALLET ENDPOINTS ---

// Get wallet details and history
app.get('/api/wallets/:user_id', authenticateToken, (req, res) => {
  const userId = req.params.user_id;
  const authUser = (req as AuthenticatedRequest).user;

  if (userId !== authUser?.id && authUser?.role !== 'admin') {
    return res.status(403).json({
      error: 'Unauthorized: Cannot view another user\'s wallet'
    });
  }

  let wallet = wallets.find(w => w.user_id === userId);

  if (!wallet) {
    wallet = {
      id: `w_${userId}`,
      user_id: userId,
      balance: 0,
      currency: "KES",
      updated_at: new Date().toISOString()
    };

    wallets.push(wallet);
  }

  const txs = walletTransactions.filter(t => t.user_id === userId);

  res.json({
    wallet,
    transactions: txs
  });
});

// Deposit money into wallet
app.post('/api/wallets/deposit', authenticateToken, (req, res) => {
  const { user_id, amount, phone_number } = req.body;
  const authUser = (req as AuthenticatedRequest).user;
  const ip = req.ip || '127.0.0.1';

  if (user_id !== authUser?.id) {
    return res.status(403).json({
      error: 'Unauthorized: Cannot deposit into another user\'s wallet'
    });
  }

  const userObj = users.find(u => u.id === user_id);

  if (userObj && userObj.status === 'suspended') {
    return res.status(403).json({
      error: 'Account suspended: Your account is on an administrative hold. Transactions are blocked.'
    });
  }

  const numAmt = parseFloat(amount);

  if (isNaN(numAmt) || numAmt <= 0) {
    return res.status(400).json({
      error: 'Invalid deposit amount'
    });
  }

  // ------------------------------------------------------------------
  // NEW: Validate phone number
  // ------------------------------------------------------------------
  const phone = String(phone_number || '').trim();

  if (!/^(254|\+254|0)\d{9}$/.test(phone)) {
    return res.status(400).json({
      error: 'Invalid phone number.'
    });
  }

  let wallet = wallets.find(w => w.user_id === user_id);

  if (!wallet) {
    wallet = {
      id: `w_${user_id}`,
      user_id,
      balance: 0,
      currency: "KES",
      updated_at: new Date().toISOString()
    };

    wallets.push(wallet);
  }

  wallet.balance += numAmt;
  wallet.updated_at = new Date().toISOString();

  const tx: LocalWalletTransaction = {
    id: `wtx_${Date.now()}`,
    wallet_id: wallet.id,
    user_id,
    amount: numAmt,
    type: 'deposit',
    description: `M-Pesa STK Push deposit via ${phone_number || 'STK Push'}`,
    created_at: new Date().toISOString()
  };

  walletTransactions.unshift(tx);

  // Evaluate Sentinel Rules for Transaction Velocity
  evaluateFraudAndVelocityRules(user_id, 'transaction', {
    ip,
    amount: numAmt
  });

  createNotification(
    user_id,
    "Wallet Deposited",
    `Successfully deposited KES ${numAmt} into your Kazify Wallet.`
  );

  res.json({
    success: true,
    wallet,
    transaction: tx
  });
});

// Withdraw money from wallet to mobile money provider
app.post('/api/wallets/withdraw', authenticateToken, (req, res) => {
  const { user_id, amount, phone_number, provider } = req.body;
  const authUser = (req as AuthenticatedRequest).user;
  const ip = req.ip || '127.0.0.1';

  if (user_id !== authUser?.id) {
    return res.status(403).json({
      error: 'Unauthorized: Cannot withdraw from another user\'s wallet'
    });
  }

  const userObj = users.find(u => u.id === user_id);
  if (userObj && userObj.status === 'suspended') {
    return res.status(403).json({
      error: 'Account suspended: Your account is on an administrative hold. Transactions are blocked.'
    });
  }

  const numAmt = parseFloat(amount);
  if (isNaN(numAmt) || numAmt <= 0) {
    return res.status(400).json({
      error: 'Invalid withdrawal amount'
    });
  }

  // Validate destination phone number
  const normalizedPhone = String(phone_number || '').trim();

  const phoneRegex =
    /^(?:\+254|254|0)?(7\d{8}|1\d{8})$/;

  if (!phoneRegex.test(normalizedPhone)) {
    return res.status(400).json({
      error: 'Invalid destination mobile number.'
    });
  }

  // Restrict supported payout providers
  const allowedProviders = [
    'M-Pesa',
    'Airtel Money'
  ];

  const payoutProvider =
    provider || 'M-Pesa';

  if (!allowedProviders.includes(payoutProvider)) {
    return res.status(400).json({
      error: 'Unsupported mobile money provider.'
    });
  }

  let wallet = wallets.find(w => w.user_id === user_id);

  if (!wallet || wallet.balance < numAmt) {
    return res.status(400).json({
      error: 'Insufficient wallet balance for withdrawal'
    });
  }

  wallet.balance -= numAmt;
  wallet.updated_at = new Date().toISOString();

  const tx: LocalWalletTransaction = {
    id: `wtx_${Date.now()}`,
    wallet_id: wallet.id,
    user_id,
    amount: -numAmt,
    type: 'withdrawal',
    description: `Mobile Money withdrawal via ${payoutProvider} to ${normalizedPhone}`,
    created_at: new Date().toISOString()
  };

  walletTransactions.unshift(tx);

  // Evaluate Sentinel Rules for Transaction Velocity
  evaluateFraudAndVelocityRules(user_id, 'transaction', {
    ip,
    amount: numAmt
  });

  createNotification(
    user_id,
    'Wallet Withdrawal',
    `Successfully withdrew KES ${numAmt} from your Kazify Wallet to ${normalizedPhone}.`
  );

  res.json({
    success: true,
    wallet,
    transaction: tx
  });
});

// Audit ledger integrity of a user's wallet
app.get('/api/wallets/:user_id/audit', authenticateToken, (req, res) => {
  const userId = req.params.user_id;
  const authUser = (req as AuthenticatedRequest).user;

  if (userId !== authUser?.id && authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Cannot audit another user\'s wallet ledger' });
  }

  let wallet = wallets.find(w => w.user_id === userId);
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  const txs = walletTransactions.filter(t => t.user_id === userId);
  const computedBalance = txs.reduce((sum, t) => sum + t.amount, 0);
  const discrepancy = wallet.balance - computedBalance;
  const isConsistent = Math.abs(discrepancy) < 0.01;

  res.json({
    success: true,
    isConsistent,
    walletBalance: wallet.balance,
    computedBalance,
    discrepancy,
    transactionCount: txs.length
  });
});

// Pay escrow using wallet balance
app.post(
  '/api/wallets/pay-escrow',
  authenticateToken,
  requireCustomer,
  (req, res) => {

    const { user_id, job_id } = req.body;

    const authUser = (req as AuthenticatedRequest).user;

    // Prevent customers from paying escrow using another user's wallet
    if (user_id !== authUser?.id) {
      return res.status(403).json({
        error: 'Unauthorized: You may only use your own wallet.'
      });
    }

    const job = jobs.find(j => j.id === job_id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    // Step 3.2 — Ensure the authenticated customer owns the job
    if (job.customer_id !== authUser.id) {
      return res.status(403).json({
        error: 'Unauthorized: You may only fund escrow for your own jobs.'
      });
    }

    // Step 3.4 — Reject completed or cancelled jobs
    if (
      job.status === 'completed' ||
      job.status === 'cancelled'
    ) {
      return res.status(400).json({
        error: 'Escrow cannot be funded for completed or cancelled jobs.'
      });
    }

    // Step 3.3 — Prevent duplicate escrow funding
    if (job.escrow_status === 'held') {
      return res.status(409).json({
        error: 'Escrow has already been funded for this job.'
      });
    }

    let wallet = wallets.find(w => w.user_id === user_id);

    if (!wallet || wallet.balance < job.amount) {
      return res.status(400).json({
        error: 'Insufficient wallet balance. Please top up.'
      });
    }

    wallet.balance -= job.amount;
    wallet.updated_at = new Date().toISOString();

    // Record wallet transaction
    const tx: LocalWalletTransaction = {
      id: `wtx_${Date.now()}`,
      wallet_id: wallet.id,
      user_id,
      amount: -job.amount,
      type: 'escrow_hold',
      description: `Wallet Escrow hold for "${job.title}"`,
      reference_id: job_id,
      created_at: new Date().toISOString()
    };

    walletTransactions.unshift(tx);

    // Update job and escrow account status
    job.escrow_status = 'held';

    const escAcc = escrowAccounts.find(ea => ea.job_id === job_id);

    if (escAcc) {
      escAcc.status = 'held';
      escAcc.updated_at = new Date().toISOString();
    } else {
      const commRate = 0.10;
      const commission = Math.round(job.amount * commRate);
      const payout = job.amount - commission;

      escrowAccounts.push({
        id: `escrow_${job_id}`,
        job_id,
        customer_id: job.customer_id,
        fundi_id: job.fundi_id,
        amount: job.amount,
        commission_fee: commission,
        payout_amount: payout,
        status: 'held',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Set contract status to active
    const contract = contracts.find(c => c.job_id === job_id);

    if (contract) {
      contract.status = 'active';
    }

    createNotification(
      user_id,
      'Escrow Secured via Wallet',
      `KES ${job.amount} successfully deducted and held in escrow for "${job.title}".`
    );

    if (job.fundi_id) {
      createNotification(
        job.fundi_id,
        'Escrow Secured',
        `The client has secured KES ${job.amount} in escrow. You can now begin working.`
      );
    }

    sendWSMessage(job.customer_id, {
      type: 'escrow_received',
      job
    });

    if (job.fundi_id) {
      sendWSMessage(job.fundi_id, {
        type: 'escrow_received',
        job
      });
    }

    res.json({
      success: true,
      wallet,
      job
    });
  }
);

// --- KYC DOCUMENT ENDPOINTS ---

// Get user KYC documents
app.get(
  '/api/kyc/:user_id',
  authenticateToken,
  (req, res) => {
    const userId = req.params.user_id;
    const authUser = (req as AuthenticatedRequest).user;

    if (
      authUser?.id !== userId &&
      authUser?.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'Unauthorized: You cannot view another user’s KYC documents.'
      });
    }

    const docs = kycDocuments.filter(kd => kd.user_id === userId);
    res.json(docs);
  }
);

// Submit KYC Document
app.post(
  '/api/kyc/submit',
  authenticateToken,
  (req, res) => {
    const {
      user_id,
      document_type,
      document_number,
      file_url,
      full_legal_name,
      kra_pin,
      date_of_birth,
      county_of_operation,
      file_base64,
      file_name
    } = req.body;

    const authUser = (req as AuthenticatedRequest).user;

    if (authUser?.id !== user_id) {
      return res.status(403).json({
        error: 'Unauthorized: You may only submit your own KYC documents.'
      });
    }

    const existingKyc = kycDocuments.find(
      doc =>
        doc.user_id === user_id &&
        doc.document_type === document_type
    );

    if (existingKyc) {
      return res.status(409).json({
        error: `A ${document_type} document has already been submitted.`
      });
    }

    let signatureCheck = 'skipped';
    let malwareScan = 'clean';
    let fileHash = '';
    const complianceLogs: string[] = [];

    const crypto = require('crypto');

    if (file_base64) {
      try {
        // 1. Generate sha256 checksum of the payload for data integrity
        const hash = crypto.createHash('sha256');
        hash.update(file_base64);
        fileHash = hash.digest('hex');
        complianceLogs.push(`Generated secure payload checksum: SHA-256 ${fileHash}`);

        // 2. Malware Scan: Check for EICAR standard antivirus test signature or simulated triggers
        const base64Clean = file_base64.replace(/^data:.*?;base64,/, '');
        const decodedBuffer = Buffer.from(base64Clean, 'base64');
        const decodedString = decodedBuffer.toString('utf8');

        const lowerDecoded = decodedString.toLowerCase();

        if (
          decodedString.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE') ||
          lowerDecoded.includes('infected') ||
          lowerDecoded.includes('malware') ||
          lowerDecoded.includes('virus')
        ) {
          malwareScan = 'infected';
          complianceLogs.push('ALERT: File ingestion aborted - matches active anti-malware block signature.');

          return res.status(400).json({
            success: false,
            error: 'Security Quarantine: File failed malware scanning (EICAR check failed). Securely deleted.',
            scan_status: 'infected',
            logs: complianceLogs
          });
        }

        // Check for code/script injection patterns
        if (
          decodedString.includes('<script') ||
          decodedString.includes('eval(') ||
          decodedString.includes('/bin/sh')
        ) {
          malwareScan = 'suspicious';
          complianceLogs.push('ALERT: Code execution signatures matched. Ingestion rejected.');

          return res.status(400).json({
            success: false,
            error: 'Security Quarantine: Executable script or commands detected in document file scan. Rejected.',
            scan_status: 'suspicious',
            logs: complianceLogs
          });
        }

        // 3. File Signature / Magic Bytes Validation
        const headerBytes = decodedBuffer
          .slice(0, 4)
          .toString('hex')
          .toUpperCase();

        let matchedSignature = false;
        let detectedType = 'unknown';

        // PNG: 89504E47
        // PDF: 25504446
        // JPG/JPEG: FFD8FF
        if (headerBytes.startsWith('89504E47')) {
          detectedType = 'image/png';
          matchedSignature = true;
        } else if (headerBytes.startsWith('25504446')) {
          detectedType = 'application/pdf';
          matchedSignature = true;
        } else if (headerBytes.startsWith('FFD8FF')) {
          detectedType = 'image/jpeg';
          matchedSignature = true;
        }

        if (matchedSignature) {
          signatureCheck = 'valid';
          complianceLogs.push(
            `File magic bytes signature verified. Structure: ${headerBytes} matches MIME ${detectedType}.`
          );
        } else {
          // If file_name indicates standard text format, we allow it, otherwise reject
          if (
            file_name &&
            (file_name.endsWith('.txt') ||
              file_name.endsWith('.json'))
          ) {
            signatureCheck = 'valid_text';
            complianceLogs.push(
              `File accepted as verified text format (${file_name}).`
            );
          } else {
            signatureCheck = 'invalid';
            complianceLogs.push(
              `CRITICAL: File signature header mismatch. Detected magic bytes: ${headerBytes || 'NONE'}`
            );

            return res.status(400).json({
              success: false,
              error: 'File signature mismatch: Magic bytes did not match expected image/pdf headers.',
              scan_status: 'signature_mismatch',
              logs: complianceLogs
            });
          }
        }
      } catch (e: any) {
        console.error('KYC file validation error:', e);

        return res.status(500).json({
          success: false,
          error: 'Internal failure during document ingestion checks.'
        });
      }
    } else if (file_url) {
      // URL fallback simulator
      fileHash = crypto
        .createHash('sha256')
        .update(file_url)
        .digest('hex');

      const lowerUrl = file_url.toLowerCase();

      if (
        lowerUrl.includes('malware') ||
        lowerUrl.includes('eicar') ||
        lowerUrl.includes('infected')
      ) {
        malwareScan = 'infected';

        complianceLogs.push(
          'ALERT: Malware scan failed for simulated asset URL.'
        );

        return res.status(400).json({
          success: false,
          error: 'Security Quarantine: simulated malware or virus trace detected.',
          scan_status: 'infected'
        });
      }

      signatureCheck = 'valid';
      malwareScan = 'clean';

      complianceLogs.push(
        `Checked remote asset headers. Integrity hash: ${fileHash}`
      );
    } else {
      // Generate empty mock signature
      fileHash = crypto
        .createHash('sha256')
        .update(`empty_${Date.now()}`)
        .digest('hex');

      signatureCheck = 'valid';
      malwareScan = 'clean';

      complianceLogs.push(
        `Default placeholder avatar ingested. SHA-256: ${fileHash}`
      );
    }

    const newDoc: LocalKYCDocument = {
      id: `kyc_${Date.now()}`,
      user_id,
      document_type,
      document_number,
      file_url:
        file_url ||
        'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      full_legal_name: full_legal_name || undefined,
      kra_pin: kra_pin || undefined,
      date_of_birth: date_of_birth || undefined,
      county_of_operation: county_of_operation || undefined,
      file_sha256: fileHash,
      malware_scan_status: malwareScan,
      signature_check: signatureCheck,
      compliance_logs: complianceLogs
    };

    kycDocuments.push(newDoc);

    createNotification(
      user_id,
      'KYC Submitted',
      'Your identity verification documents have been received and are pending administrator review.'
    );

    const submitter = users.find(u => u.id === user_id);
    const nameToUse = submitter ? submitter.name : 'A user';

    notifyAdmins(
      'New KYC Document Ingested & Scanned 🛡️',
      `${nameToUse} has submitted a new ${document_type.replace('_', ' ')} (ID: ${document_number}). Malware Scan: ${malwareScan.toUpperCase()}, Signature: ${signatureCheck.toUpperCase()}, Checksum: ${fileHash.substring(0, 12)}...`,
      'new_kyc_submission',
      newDoc
    );

    res.json({
      success: true,
      document: newDoc
    });
  }
);

// Admin: Get all KYC submissions
app.get('/api/admin/kyc', authenticateToken, requireAdmin, (req, res) => {
  const results = kycDocuments.map(doc => {
    const user = users.find(u => u.id === doc.user_id);
    return {
      ...doc,
      user_name: user?.name,
      user_role: user?.role,
      user_email: user?.email,
      user_phone: user?.phone
    };
  });
  res.json(results);
});

// Admin: Review KYC submission
app.post('/api/admin/kyc/:id/review', authenticateToken, requireAdmin, (req, res) => {
  const docId = req.params.id;
  const { status, rejection_reason } = req.body;

  const doc = kycDocuments.find(d => d.id === docId);
  if (!doc) {
    return res.status(404).json({ error: 'KYC Document not found' });
  }

  const statusBefore = doc.status;

  doc.status = status;
  doc.rejection_reason = rejection_reason;
  doc.updated_at = new Date().toISOString();

  const admin = (req as AuthenticatedRequest).user;
  const userObj = users.find(u => u.id === doc.user_id);

  // Cryptographically Chained Centralized Sensitive State Change Audit
  recordSensitiveStateChange(
    admin.id,
    admin.name,
    'KYC_STATUS_UPDATE',
    'kyc',
    docId,
    statusBefore,
    status,
    `Admin reviewed KYC documents for user "${userObj?.name || doc.user_id}". Status updated to ${status.toUpperCase()}.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`,
    req.ip,
    req.headers['user-agent'] as string
  );

  const title = status === 'approved' ? "KYC Approved! 🎉" : "KYC Document Rejected";
  const content = status === 'approved' 
    ? "Your account has been fully verified. You are now cleared for all bidding, contracting, and payments."
    : `Your document verification failed. Reason: ${rejection_reason || 'Incomplete or blurry image'}. Please re-submit.`;

  createNotification(doc.user_id, title, content);

  res.json({ success: true, document: doc });
});

// Get contract for a specific job
app.get(
  '/api/contracts/job/:job_id',
  authenticateToken,
  (req, res) => {
    const authUser = (req as AuthenticatedRequest).user;
    const jobId = req.params.job_id;

    const contract = contracts.find(c => c.job_id === jobId);

    if (!contract) {
      return res.status(404).json({
        error: 'No contract found for this job'
      });
    }

    // Only participants or administrators may access the contract
    const authorized =
      authUser.role === 'admin' ||
      contract.customer_id === authUser.id ||
      contract.fundi_id === authUser.id;

    if (!authorized) {
      return res.status(403).json({
        error: 'You are not authorized to view this contract.'
      });
    }

    res.json(contract);
  }
);

// Get all contracts for a user
app.get(
  '/api/contracts/user/:user_id',
  authenticateToken,
  (req, res) => {
    const userId = req.params.user_id;
    const authUser = (req as AuthenticatedRequest).user;

    // Authentication required
    if (!authUser) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    // Only the owner or an administrator may view these contracts
    const isOwner = authUser.id === userId;
    const isAdmin = authUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'You are not authorized to view these contracts.'
      });
    }

    const filtered = contracts.filter(
      contract =>
        contract.customer_id === userId ||
        contract.fundi_id === userId
    );

    if (filtered.length === 0) {
      return res.status(404).json({
        error: 'No contracts found.'
      });
    }

    res.json(filtered);
  }
);

// Sign Contract
app.post(
  '/api/contracts/:id/sign',
  authenticateToken,
  (req, res) => {
    const contractId = req.params.id;
    const { role } = req.body;

    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const contract = contracts.find(c => c.id === contractId);

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    // Only draft contracts may be signed
    if (contract.status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft contracts can be signed.'
      });
    }

    // Determine the authenticated user's expected role
    const expectedRole =
      contract.customer_id === authUser.id
        ? 'customer'
        : contract.fundi_id === authUser.id
          ? 'fundi'
          : null;

    // User must be a participant in this contract
    if (!expectedRole) {
      return res.status(403).json({
        error: 'You are not a party to this contract.'
      });
    }

    // Prevent role spoofing
    if (role !== expectedRole) {
      return res.status(403).json({
        error: 'Role does not match your account.'
      });
    }

    const statusBefore = contract.status;

    if (role === 'customer') {
      if (contract.customer_signed) {
        return res.status(409).json({
          error: 'Customer has already signed this contract.'
        });
      }

      contract.customer_signed = true;
      contract.customer_signed_at = new Date().toISOString();
    } else if (role === 'fundi') {
      if (contract.fundi_signed) {
        return res.status(409).json({
          error: 'Fundi has already signed this contract.'
        });
      }

      contract.fundi_signed = true;
      contract.fundi_signed_at = new Date().toISOString();
    } else {
      return res.status(400).json({
        error: 'Invalid contract role.'
      });
    }

    if (contract.customer_signed && contract.fundi_signed) {
      contract.status = 'active';

      createNotification(
        contract.customer_id,
        'Contract Fully Executed',
        'Both parties have signed the contract. Escrow payment is now requested.'
      );

      createNotification(
        contract.fundi_id,
        'Contract Fully Executed',
        'The contract is now fully signed. Secure escrow payment is being initialized by the client.'
      );

      // Centralized Immutable Audit logging for contract execution approval
      recordSensitiveStateChange(
        authUser.id,
        role === 'customer' ? 'Client Operator' : 'Fundi Operator',
        'CONTRACT_APPROVAL',
        'contract',
        contractId,
        statusBefore,
        'active',
        `Contract #${contractId.substring(0, 8)} has been fully executed and approved by both parties. Job amount KES ${contract.amount}.`,
        req.ip,
        req.headers['user-agent'] as string
      );
    } else {
      const notifyUser =
        role === 'customer'
          ? contract.fundi_id
          : contract.customer_id;

      createNotification(
        notifyUser,
        'Contract Signature Added',
        'The other party has signed the work agreement. Please sign to proceed.'
      );
    }

    res.json({
      success: true,
      contract
    });
  }
);

// Propose terms / negotiate contract
app.post(
  '/api/contracts/:id/negotiate',
  authenticateToken,
  (req, res) => {
    const contractId = req.params.id;
    const { terms, amount } = req.body;

    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const contract = contracts.find(c => c.id === contractId);

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    // Only contract participants may negotiate
    const isParticipant =
      contract.customer_id === authUser.id ||
      contract.fundi_id === authUser.id;

    if (!isParticipant) {
      return res.status(403).json({
        error: 'You are not authorized to negotiate this contract.'
      });
    }

    // Only draft contracts may be negotiated
    if (contract.status !== 'draft') {
      return res.status(400).json({
        error:
          'Contract is already locked or active and cannot be negotiated'
      });
    }

    // Require at least one field to update
    if (
      (terms === undefined ||
        (typeof terms === 'string' && terms.trim() === '')) &&
      amount === undefined
    ) {
      return res.status(400).json({
        error: 'Provide updated terms or amount.'
      });
    }

    const changes: string[] = [];

    // Update contract terms
    if (typeof terms === 'string' && terms.trim() !== '') {
      contract.terms = terms.trim();
      changes.push('terms');
    }

    // Validate and update amount
    if (amount !== undefined) {
      const numAmt = Number(amount);

      if (!Number.isFinite(numAmt) || numAmt <= 0) {
        return res.status(400).json({
          error: 'Amount must be a positive number.'
        });
      }

      contract.amount = numAmt;
      changes.push(`amount to KES ${numAmt}`);

      // Update linked job
      const job = jobs.find(j => j.id === contract.job_id);

      if (job) {
        job.amount = numAmt;
      }

      // Update escrow
      const escrow = escrowAccounts.find(
        e => e.job_id === contract.job_id
      );

      if (escrow) {
        const commission = Math.round(numAmt * 0.10);

        escrow.amount = numAmt;
        escrow.commission_fee = commission;
        escrow.payout_amount = numAmt - commission;
      }
    }

    // Reset signatures because the agreement changed
    contract.customer_signed = false;
    contract.fundi_signed = false;
    contract.customer_signed_at = undefined;
    contract.fundi_signed_at = undefined;
    contract.updated_at = new Date().toISOString();

    // Immutable audit log
    recordSensitiveStateChange(
      authUser.id,
      authUser.name,
      'CONTRACT_APPROVAL',
      'contract',
      contract.id,
      'draft',
      'draft',
      `Contract updated (${changes.join(
        ', '
      )}). Signatures reset pending re-approval.`,
      req.ip,
      req.headers['user-agent'] as string
    );

    // Notify the other party
    const alertTarget =
      authUser.id === contract.customer_id
        ? contract.fundi_id
        : contract.customer_id;

    createNotification(
      alertTarget,
      'Contract Terms Updated',
      'The other party has updated the contract terms or pricing. Please review and sign.'
    );

    res.json({
      success: true,
      contract
    });
  }
);

// --- DISPUTE SYSTEM ENDPOINTS ---

// Raise a dispute on a job
app.post('/api/disputes/raise', authenticateToken, (req, res) => {
  const {
    job_id,
    initiator_id,
    reason,
    description,
    completion_percentage,
    evidence_attachments
  } = req.body;

  const authUser = (req as AuthenticatedRequest).user;

  // Authentication required
  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  // Prevent impersonation
  if (initiator_id !== authUser.id) {
    return res.status(403).json({
      error: 'You may only raise disputes on your own behalf.'
    });
  }

  const job = jobs.find(j => j.id === job_id);
  const user = users.find(u => u.id === initiator_id);

  if (!job || !user) {
    return res.status(404).json({
      error: 'Job or user not found'
    });
  }

  // Only the customer or assigned fundi may raise a dispute
  const isParticipant =
    job.customer_id === authUser.id ||
    job.fundi_id === authUser.id;

  if (!isParticipant) {
    return res.status(403).json({
      error: 'You are not a participant in this job.'
    });
  }

  // Only allow disputes on valid job states
  const allowedStatuses = [
    'accepted',
    'active',
    'in_progress',
    'completed'
  ];

  if (!allowedStatuses.includes(job.status)) {
    return res.status(400).json({
      error: `Cannot raise a dispute while the job is '${job.status}'.`
    });
  }

  // Prevent duplicate active disputes
  const existingDispute = disputes.find(
    d =>
      d.job_id === job_id &&
      d.status === 'pending'
  );

  if (existingDispute) {
    return res.status(409).json({
      error: 'An active dispute already exists for this job.'
    });
  }

  const dispute: LocalDispute = {
    id: `disp_${Date.now()}`,
    job_id,
    initiator_id,
    initiator_name: user.name,
    reason,
    description,
    status: 'pending',
    created_at: new Date().toISOString(),
    completion_percentage:
      completion_percentage !== undefined
        ? Number(completion_percentage)
        : undefined,
    evidence_attachments: evidence_attachments || []
  };

  disputes.unshift(dispute);

  job.status = 'disputed';

  const escAcc = escrowAccounts.find(ea => ea.job_id === job_id);

  if (escAcc) {
    escAcc.status = 'disputed';
    escAcc.updated_at = new Date().toISOString();
  }

  const notifyUser =
    initiator_id === job.customer_id
      ? job.fundi_id
      : job.customer_id;

  if (notifyUser) {
    createNotification(
      notifyUser,
      "Dispute Raised on Project",
      `A formal dispute has been initiated on "${job.title}". A platform administrator will arbitrate shortly.`
    );
  }

  createNotification(
    initiator_id,
    "Dispute Raised Successful",
    "Your dispute request has been lodged. A platform admin is reviewing the contract."
  );

  const isHighValue = job.amount >= 20000;

  if (isHighValue) {
    notifyAdmins(
      "🔥 HIGH-VALUE DISPUTE FILED",
      `A high-value dispute of KES ${job.amount.toLocaleString()} has been filed on "${job.title}" by ${user.name}. Immediate arbitration required!`,
      "high_value_dispute",
      { dispute, job }
    );
  } else {
    notifyAdmins(
      "Dispute Lodged ⚠️",
      `A dispute has been raised on "${job.title}" by ${user.name} for KES ${job.amount.toLocaleString()}.`,
      "dispute_filed",
      { dispute, job }
    );
  }

  res.json({
    success: true,
    dispute,
    job
  });
});

// Get dispute for a job
app.get(
  '/api/disputes/job/:job_id',
  authenticateToken,
  (req, res) => {
    const jobId = req.params.job_id;
    const user = (req as AuthenticatedRequest).user;

    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    const isParticipant =
      job.customer_id === user.id ||
      job.fundi_id === user.id;

    if (!isParticipant && user.role !== 'admin') {
      return res.status(403).json({
        error: 'You are not authorized to view this dispute.'
      });
    }

    const dispute = disputes.find(d => d.job_id === jobId);

    if (!dispute) {
      return res.status(404).json({
        error: 'No dispute active on this job'
      });
    }

    res.json(dispute);
  }
);
// Get all disputes (Admin Only)
app.get(
  '/api/disputes',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const admin = (req as AuthenticatedRequest).user;

    const enriched = disputes.map(d => {
      const job = jobs.find(j => j.id === d.job_id);

      return {
        ...d,
        job_title: job?.title,
        customer_name: job?.customer_name,
        fundi_name: job?.fundi_name,
        amount: job?.amount
      };
    });

    recordAdminAudit(
      admin.id,
      admin.name,
      'VIEW_DISPUTES',
      'dispute',
      'all',
      'Viewed all dispute records.',
      req.ip,
      req.headers['user-agent']
    );

    res.json(enriched);
  }
);

// Send dispute chat message
app.post(
  '/api/disputes/:id/message',
  authenticateToken,
  (req, res) => {
    const disputeId = req.params.id;
    const { message } = req.body;

    const sender = (req as AuthenticatedRequest).user;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message cannot be empty.'
      });
    }

    const dispute = disputes.find(d => d.id === disputeId);

    if (!dispute) {
      return res.status(404).json({
        error: 'Dispute not found.'
      });
    }

    const job = jobs.find(j => j.id === dispute.job_id);

    if (!job) {
      return res.status(404).json({
        error: 'Associated job not found.'
      });
    }

    // Only dispute participants or admins may send messages
    const isParticipant =
      sender.id === job.customer_id ||
      sender.id === job.fundi_id ||
      sender.role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({
        error: 'You are not authorized to participate in this dispute.'
      });
    }

    // Prevent messaging after dispute resolution
    if (dispute.status !== 'pending') {
      return res.status(409).json({
        error: 'This dispute has already been resolved.'
      });
    }

    const msg: LocalDisputeMessage = {
      id: `dmsg_${Date.now()}`,
      dispute_id: disputeId,
      sender_id: sender.id,
      sender_name: sender.name,
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    disputeMessages.push(msg);

    const notifyUser =
      sender.id === job.customer_id
        ? job.fundi_id
        : job.customer_id;

    if (notifyUser && notifyUser !== sender.id) {
      createNotification(
        notifyUser,
        "New Dispute Message",
        `Dispute message in job "${job.title}": ${message
          .trim()
          .substring(0, 40)}...`
      );
    }

    res.json({
      success: true,
      message: msg
    });
  }
);

// Get dispute chat messages
app.get(
  '/api/disputes/:id/messages',
  authenticateToken,
  (req, res) => {
    const disputeId = req.params.id;
    const user = (req as AuthenticatedRequest).user;

    const dispute = disputes.find(d => d.id === disputeId);

    if (!dispute) {
      return res.status(404).json({
        error: 'Dispute not found'
      });
    }

    const job = jobs.find(j => j.id === dispute.job_id);

    if (!job) {
      return res.status(404).json({
        error: 'Associated job not found'
      });
    }

    const isParticipant =
      user.id === job.customer_id ||
      user.id === job.fundi_id;

    if (!isParticipant && user.role !== 'admin') {
      return res.status(403).json({
        error: 'You are not authorized to view these dispute messages.'
      });
    }

    const filtered = disputeMessages.filter(
      m => m.dispute_id === disputeId
    );

    res.json(filtered);
  }
);

// Resolve dispute (Admin Arbitration)
app.post(
  '/api/disputes/:id/resolve',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const admin = (req as AuthenticatedRequest).user;

    const disputeId = req.params.id;
    const { resolution, resolution_summary } = req.body;

    const allowedResolutions = [
      'resolved_refunded',
      'resolved_released'
    ];

    if (!allowedResolutions.includes(resolution)) {
      return res.status(400).json({
        error: 'Invalid dispute resolution.'
      });
    }

    if (
      typeof resolution_summary !== 'string' ||
      resolution_summary.trim().length < 10
    ) {
      return res.status(400).json({
        error: 'Resolution summary must be at least 10 characters.'
      });
    }

    const dispute = disputes.find(d => d.id === disputeId);

    if (!dispute) {
      return res.status(404).json({
        error: 'Dispute not found'
      });
    }

    dispute.status = resolution;
    dispute.resolution_summary = resolution_summary.trim();
    dispute.resolved_at = new Date().toISOString();

    const job = jobs.find(j => j.id === dispute.job_id);

    if (!job) {
      return res.status(404).json({
        error: 'Job associated with dispute not found'
      });
    }

    const escAcc = escrowAccounts.find(
      ea => ea.job_id === job.id
    );

    if (resolution === 'resolved_refunded') {
      job.status = 'cancelled';

      if (escAcc) {
        escAcc.status = 'refunded';
        escAcc.updated_at = new Date().toISOString();
      }

      EscrowService.refundFunds(job.id);
    } else if (resolution === 'resolved_released') {
      job.status = 'completed';

      if (escAcc) {
        escAcc.status = 'released';
        escAcc.updated_at = new Date().toISOString();
      }

      EscrowService.releaseFunds(job.id);
    }

    recordAdminAudit(
      admin.id,
      admin.name,
      'RESOLVE_DISPUTE',
      'dispute',
      dispute.id,
      `Resolved dispute ${dispute.id} for job ${job.id} using '${resolution}'. Summary: ${resolution_summary}`,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      dispute,
      job
    });
  }
);

// --- PRODUCTION NOTIFICATION ENGINE ENDPOINTS ---

// 1. Get Notification Preferences
app.get('/api/notifications/preferences', authenticateToken, (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const pref = NotificationEngineService.getPreferences(user.id);
  res.json(pref);
});

// 2. Update Notification Preferences
app.post('/api/notifications/preferences', authenticateToken, (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const pref = NotificationEngineService.updatePreferences(user.id, req.body);
  res.json(pref);
});

// 3. Register Web-Push Subscription
app.get('/api/notifications/vapid-key', authenticateToken, (req, res) => {
  const pubKey = NotificationEngineService.getVapidPublicKey();
  if (!pubKey) {
    return res.status(404).json({ error: 'VAPID public key not configured on the server.' });
  }
  res.json({ publicKey: pubKey });
});

app.post('/api/notifications/subscribe', authenticateToken, (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const { endpoint, keys } = req.body;

  if (
    !endpoint ||
    typeof endpoint !== 'string' ||
    !keys ||
    typeof keys !== 'object' ||
    !keys.p256dh ||
    !keys.auth
  ) {
    return res.status(400).json({
      error: 'Invalid web-push subscription format.'
    });
  }

  // Prevent duplicate subscriptions
  const existing = NotificationEngineService
    .getSubscriptions(user.id)
    .find(sub => sub.endpoint === endpoint);

  if (existing) {
    return res.json({
      success: true,
      message: 'Subscription already registered.',
      record: existing
    });
  }

  const record = NotificationEngineService.addSubscription(user.id, {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth
  });

  res.json({
    success: true,
    record
  });
});

// 4. Admin: Get Notification Queue Status & Metrics
app.get('/api/admin/notifications/queue', authenticateToken, requireAdmin, (req, res) => {
  const status = NotificationEngineService.getQueueStatus();
  res.json(status);
});

// --- TRUE MARKETPLACE ESCROW API ENDPOINTS ---

// 1. Get all Escrow Accounts
app.get('/api/escrow/accounts', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  // Administrators may view every escrow account
  if (authUser.role === 'admin') {
    return res.json(escrowAccounts);
  }

  // Other users may only view escrow accounts they participate in
  const visibleAccounts = escrowAccounts.filter(
    e =>
      e.customer_id === authUser.id ||
      e.fundi_id === authUser.id
  );

  res.json(visibleAccounts);
});

// 2. Get Escrow Account by Job ID
app.get('/api/escrow/accounts/job/:jobId', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const escrow = escrowAccounts.find(
    e => e.job_id === req.params.jobId
  );

  if (!escrow) {
    return res.status(404).json({
      error: 'Escrow account not found for this job.'
    });
  }

  const authorized =
    authUser.role === 'admin' ||
    escrow.customer_id === authUser.id ||
    escrow.fundi_id === authUser.id;

  if (!authorized) {
    return res.status(403).json({
      error: 'You are not authorized to view this escrow account.'
    });
  }

  res.json(escrow);
});

// 3. Create & Fund a Milestone
app.post('/api/escrow/:jobId/milestones', authenticateToken, (req, res) => {
  const jobId = req.params.jobId;
  const { title, amount, fundiId } = req.body;

  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  if (
    !title ||
    typeof title !== 'string' ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    return res.status(400).json({
      error: 'Invalid milestone data.'
    });
  }

  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found.'
    });
  }

  // Only participants in the job or an administrator may create milestones
  const authorized =
    authUser.role === 'admin' ||
    job.customer_id === authUser.id ||
    job.fundi_id === authUser.id;

  if (!authorized) {
    return res.status(403).json({
      error: 'You are not authorized to create escrow milestones for this job.'
    });
  }

  const customerId = job.customer_id;
  const targetFundiId = fundiId || job.fundi_id;

  if (!targetFundiId) {
    return res.status(400).json({
      error: 'Cannot create milestone without a registered tradesperson.'
    });
  }

  // Check customer wallet balance
  let wallet = wallets.find(w => w.user_id === customerId);

  if (!wallet || wallet.balance < Number(amount)) {
    return res.status(400).json({
      error: 'Insufficient wallet balance to fund this milestone. Please top up.'
    });
  }

  try {
    // Deduct balance from customer wallet
    wallet.balance -= Number(amount);
    wallet.updated_at = new Date().toISOString();

    // Log wallet transaction for audit
    walletTransactions.unshift({
      id: `wtx_${Date.now()}_milestone_fund`,
      wallet_id: wallet.id,
      user_id: customerId,
      amount: -Number(amount),
      type: 'escrow_hold',
      description: `Funded Milestone: "${title}" for "${job.title}"`,
      reference_id: jobId,
      created_at: new Date().toISOString()
    });

    const result = EscrowEngine.fundMilestone({
      jobId,
      customerId,
      fundiId: targetFundiId,
      title,
      amount: Number(amount)
    });

    job.escrow_status = 'held';

    // Immutable audit trail
    recordSensitiveStateChange(
      authUser.id,
      authUser.name,
      'PAYMENT_STATE_CHANGE',
      'payment',
      result.escrowAccount.id,
      'milestone_pending',
      'milestone_created',
      `Created escrow milestone "${title}" worth KES ${Number(amount)} for job "${job.title}".`,
      req.ip,
      req.headers['user-agent'] as string
    );

    // Notify fundi
    createNotification(
      targetFundiId,
      'Milestone Funded! 🚀',
      `The client has funded a milestone: "${title}" (KES ${Number(amount)}) for job "${job.title}".`
    );

    createNotification(
      customerId,
      'Milestone Funded',
      `You successfully funded milestone "${title}" for KES ${Number(amount)}.`
    );

    sendWSMessage(customerId, {
      type: 'milestone_funded',
      job,
      milestone: result.milestone
    });

    sendWSMessage(targetFundiId, {
      type: 'milestone_funded',
      job,
      milestone: result.milestone
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
});

// 4. Get Milestones for a Job
app.get('/api/escrow/:jobId/milestones', authenticateToken, (req, res) => {
  const authUser = (req as AuthenticatedRequest).user;

  if (!authUser) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const escrow = escrowAccounts.find(
    e => e.job_id === req.params.jobId
  );

  if (!escrow) {
    return res.json([]);
  }

  const authorized =
    authUser.role === 'admin' ||
    escrow.customer_id === authUser.id ||
    escrow.fundi_id === authUser.id;

  if (!authorized) {
    return res.status(403).json({
      error: 'You are not authorized to view these milestones.'
    });
  }

  const milestones = escrowMilestones.filter(
    m => m.escrow_account_id === escrow.id
  );

  res.json(milestones);
});

// 5. Release a Milestone
app.post(
  '/api/escrow/milestones/:milestoneId/release',
  authenticateToken,
  (req, res) => {
    const authUser = (req as AuthenticatedRequest).user;
    const milestoneId = req.params.milestoneId;

    if (!authUser) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const milestone = escrowMilestones.find(
      m => m.id === milestoneId
    );

    if (!milestone) {
      return res.status(404).json({
        error: 'Milestone not found.'
      });
    }

    const escAcc = escrowAccounts.find(
      ea => ea.id === milestone.escrow_account_id
    );

    if (!escAcc) {
      return res.status(404).json({
        error: 'Escrow account not found.'
      });
    }

    // Only the customer who owns the escrow or an administrator
    // may release milestone funds.
    const authorized =
      authUser.role === 'admin' ||
      authUser.id === escAcc.customer_id;

    if (!authorized) {
      return res.status(403).json({
        error: 'You are not authorized to release this milestone.'
      });
    }

    try {
      const settlement = EscrowEngine.releaseMilestone(
        milestoneId,
        'Milestone completion release'
      );

      // Sync platform commission wallet
      const adminWallet = wallets.find(
        w =>
          w.user_id === 'admin-user-id-001' ||
          w.user_id === 'admin'
      );

      if (adminWallet) {
        adminWallet.balance += settlement.platform_fee;
        adminWallet.updated_at = new Date().toISOString();
      }

      const job = jobs.find(
        j => j.id === escAcc.job_id
      );

      if (job) {
        if (escAcc.status === 'released') {
          job.escrow_status = 'released';
          job.status = 'completed';
        }

        createNotification(
          escAcc.customer_id,
          'Milestone Released',
          `Milestone "${milestone.title}" has been released to the tradesperson.`
        );

        if (escAcc.fundi_id) {
          createNotification(
            escAcc.fundi_id,
            'Milestone Payment Dispatched! 💰',
            `KES ${settlement.amount_net} has been dispatched for milestone "${milestone.title}".`
          );

          sendWSMessage(escAcc.fundi_id, {
            type: 'milestone_released',
            job,
            milestone
          });
        }

        sendWSMessage(escAcc.customer_id, {
          type: 'milestone_released',
          job,
          milestone
        });
      }

      // Immutable audit log
      recordSensitiveStateChange(
        authUser.id,
        authUser.name,
        'PAYMENT_STATE_CHANGE',
        'payment',
        milestone.id,
        'locked',
        'released',
        `Released milestone "${milestone.title}" for escrow account ${escAcc.id}.`,
        req.ip,
        req.headers['user-agent'] as string
      );

      return res.json({
        success: true,
        settlement,
        milestone
      });
    } catch (err: any) {
      return res.status(500).json({
        error: err.message
      });
    }
  }
);

// 6. Partial Escrow Release
app.post(
  '/api/escrow/accounts/:escrowAccountId/release-partial',
  authenticateToken,
  (req, res) => {
    const escrowAccountId = req.params.escrowAccountId;
    const { amount, description } = req.body;

    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: 'Invalid partial amount to release.'
      });
    }

    const escAcc = escrowAccounts.find(
      ea => ea.id === escrowAccountId
    );

    if (!escAcc) {
      return res.status(404).json({
        error: 'Escrow account not found.'
      });
    }

    const authorized =
      authUser.role === 'admin' ||
      authUser.id === escAcc.customer_id;

    if (!authorized) {
      return res.status(403).json({
        error: 'You are not authorized to release escrow funds.'
      });
    }

    if (escAcc.status !== 'held') {
      return res.status(400).json({
        error: `Escrow cannot be released while its status is "${escAcc.status}".`
      });
    }

    const job = jobs.find(j => j.id === escAcc.job_id);

    if (!job) {
      return res.status(404).json({
        error: 'Associated job not found.'
      });
    }

    const statusBefore = escAcc.status;

    try {
      const settlement = EscrowEngine.releasePartialEscrow(
        escrowAccountId,
        Number(amount),
        description || 'Partial payment release'
      );

      // Synchronize platform commission wallet
      const adminWallet = wallets.find(
        w =>
          w.user_id === 'admin-user-id-001' ||
          w.user_id === 'admin'
      );

      if (adminWallet) {
        adminWallet.balance += settlement.platform_fee;
        adminWallet.updated_at = new Date().toISOString();
      }

      // Refresh escrow after engine updates
      const updatedEscrow = escrowAccounts.find(
        ea => ea.id === escrowAccountId
      );

      if (updatedEscrow) {
        if (updatedEscrow.status === 'released') {
          job.escrow_status = 'released';
          job.status = 'completed';
        }

        // Immutable audit trail
        recordSensitiveStateChange(
          authUser.id,
          authUser.name,
          'PAYMENT_STATE_CHANGE',
          'payment',
          escrowAccountId,
          statusBefore,
          updatedEscrow.status,
          `Released partial escrow payment of KES ${Number(amount).toLocaleString()} for job "${job.title}". Net payout: KES ${settlement.amount_net}. Platform fee: KES ${settlement.platform_fee}.`,
          req.ip,
          req.headers['user-agent'] as string
        );

        createNotification(
          updatedEscrow.customer_id,
          'Partial Payment Released',
          `Partial payment of KES ${Number(amount).toLocaleString()} has been released to the tradesperson.`
        );

        if (updatedEscrow.fundi_id) {
          createNotification(
            updatedEscrow.fundi_id,
            'Partial Payout Received! 💰',
            `KES ${settlement.amount_net.toLocaleString()} has been dispatched to you.`
          );
        }

        sendWSMessage(updatedEscrow.customer_id, {
          type: 'escrow_partial_released',
          job,
          amount: Number(amount)
        });

        if (updatedEscrow.fundi_id) {
          sendWSMessage(updatedEscrow.fundi_id, {
            type: 'escrow_partial_released',
            job,
            amount: Number(amount)
          });
        }
      }

      res.json({
        success: true,
        settlement
      });
    } catch (err: any) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// 7. Resolve Dispute with Arbitrary Split (Admin Arbitration)
app.post('/api/disputes/:id/resolve-arbitrated', authenticateToken, requireAdmin, (req, res) => {
  const disputeId = req.params.id;
  const { refundToCustomerAmount, payoutToFundiAmount, notes } = req.body;

  const dispute = disputes.find(d => d.id === disputeId);
  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  const job = jobs.find(j => j.id === dispute.job_id);
  if (!job) {
    return res.status(404).json({ error: 'Associated job not found' });
  }

  const escAcc = escrowAccounts.find(ea => ea.job_id === job.id);
  if (!escAcc) {
    return res.status(404).json({ error: 'Associated escrow account not found.' });
  }

  try {
    const result = EscrowEngine.resolveArbitratedDispute({
      escrowAccountId: escAcc.id,
      refundToCustomerAmount: parseFloat(refundToCustomerAmount) || 0,
      payoutToFundiAmount: parseFloat(payoutToFundiAmount) || 0,
      disputeId,
      notes: notes || 'Arbitrated split settlement'
    });

    // Update in-memory dispute model status
    dispute.status = 'resolved_released'; // Map to a status the UI supports
    dispute.resolution_summary = `Dispute resolved via administrative split arbitration. Customer refunded KES ${refundToCustomerAmount}, Tradesperson paid KES ${payoutToFundiAmount}. Notes: ${notes}`;
    dispute.resolved_at = new Date().toISOString();

    // Refund customer in-memory
    if (refundToCustomerAmount > 0) {
      let customerWallet = wallets.find(w => w.user_id === job.customer_id);
      if (customerWallet) {
        customerWallet.balance += refundToCustomerAmount;
        customerWallet.updated_at = new Date().toISOString();
      }
      createNotification(job.customer_id, "Dispute Arbitration Refund ↩️", `You have been refunded KES ${refundToCustomerAmount} following dispute resolution.`);
    }

    // Payout tradesperson in-memory commission
    if (payoutToFundiAmount > 0 && result.settlements.length > 0) {
      const sett = result.settlements[0];
      let adminWallet = wallets.find(w => w.user_id === 'admin-user-id-001' || w.user_id === 'admin');
      if (adminWallet) {
        adminWallet.balance += sett.platform_fee;
        adminWallet.updated_at = new Date().toISOString();
      }
      createNotification(job.fundi_id!, "Dispute Arbitration Payout! 💰", `You have been paid KES ${sett.amount_net} (after 10% platform fee) following dispute resolution.`);
    }

    job.status = 'completed';
    job.escrow_status = escAcc.status;

    const admin = (req as AuthenticatedRequest).user;
    recordAdminAudit(
      admin.id,
      admin.name,
      'RESOLVE_DISPUTE',
      'dispute',
      disputeId,
      `Resolved dispute on job #${job.id.substring(0, 8)}. Split settlement: Refunded Customer KES ${refundToCustomerAmount}, Paid Fundi KES ${payoutToFundiAmount}. Reason/Notes: ${notes || 'Arbitrated settlement'}.`,
      req.ip,
      req.headers['user-agent']
    );

    sendWSMessage(job.customer_id, { type: 'dispute_arbitrated', job, dispute });
    if (job.fundi_id) {
      sendWSMessage(job.fundi_id, { type: 'dispute_arbitrated', job, dispute });
    }

    res.json({ success: true, dispute, job, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Admin: Ledger Entries
app.get('/api/admin/escrow/ledger', authenticateToken, requireAdmin, (req, res) => {
  res.json(ledgerEntries);
});

// 9. Admin: Settlements Ledger
app.get('/api/admin/escrow/settlements', authenticateToken, requireAdmin, (req, res) => {
  res.json(settlements);
});

// 10. Admin: Payouts Ledger
app.get('/api/admin/escrow/payouts', authenticateToken, requireAdmin, (req, res) => {
  res.json(payouts);
});

// 11. Admin: Balanced Double-Entry Audit Check
app.get('/api/admin/escrow/ledger/audit', authenticateToken, requireAdmin, (req, res) => {
  const totalDebit = ledgerEntries.filter(e => e.direction === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalCredit = ledgerEntries.filter(e => e.direction === 'credit').reduce((s, e) => s + e.amount, 0);
  const balanceDiscrepancy = Math.abs(totalDebit - totalCredit);
  const isPerfectlyBalanced = balanceDiscrepancy < 0.01;

  // Track accounts summary
  const userWalletSum = ledgerEntries.filter(e => e.ledger_account === 'user_wallet').reduce((s, e) => s + (e.direction === 'credit' ? e.amount : -e.amount), 0);
  const escrowHeldSum = ledgerEntries.filter(e => e.ledger_account === 'escrow_held').reduce((s, e) => s + (e.direction === 'credit' ? e.amount : -e.amount), 0);
  const platformEarningsSum = ledgerEntries.filter(e => e.ledger_account === 'platform_earnings').reduce((s, e) => s + (e.direction === 'credit' ? e.amount : -e.amount), 0);
  const payoutClearingSum = ledgerEntries.filter(e => e.ledger_account === 'payout_clearing').reduce((s, e) => s + (e.direction === 'credit' ? e.amount : -e.amount), 0);

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    isPerfectlyBalanced,
    totalDebit,
    totalCredit,
    balanceDiscrepancy,
    accountsTrialBalance: {
      user_wallet: userWalletSum,
      escrow_held: escrowHeldSum,
      platform_earnings: platformEarningsSum,
      payout_clearing: payoutClearingSum
    },
    metrics: {
      escrowAccountsCount: escrowAccounts.length,
      milestonesCount: escrowMilestones.length,
      settlementsCount: settlements.length,
      payoutsCount: payouts.length,
      ledgerEntriesCount: ledgerEntries.length
    }
  });
});


// --- PRODUCTION OPERATIONS CENTER ENDPOINTS ---

// 1. Get Detailed User list with Wallet and KYC
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = users.map(u => {
      const w = wallets.find(wallet => wallet.user_id === u.id);
      const kyc = kycDocuments.find(d => d.user_id === u.id);
      const userJobs = jobs.filter(j => j.customer_id === u.id || j.fundi_id === u.id);
      const userDisputes = disputes.filter(d => d.initiator_id === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        category: u.category,
        status: u.status || 'active', // 'active' | 'suspended' | 'banned'
        rating: u.rating,
        avatar_url: u.avatar_url,
        wallet_balance: w ? w.balance : 0,
        kyc_status: kyc ? kyc.status : 'none',
        kyc_type: kyc ? kyc.document_type : null,
        jobs_count: userJobs.length,
        disputes_count: userDisputes.length
      };
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Change User Status (Banning, suspending, or activating)
app.post('/api/admin/users/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const admin = (req as AuthenticatedRequest).user;
  const targetId = req.params.id;
  const { status, reason } = req.body; // status can be 'active', 'suspended', 'banned'

  const targetUser = users.find(u => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  // Validate allowed account statuses
  const allowedStatuses = ['active', 'suspended', 'banned'];

  if (
    typeof status !== 'string' ||
    !allowedStatuses.includes(status)
  ) {
    return res.status(400).json({
      error: `Invalid account status. Allowed values: ${allowedStatuses.join(', ')}`
    });
  }

  const oldStatus = targetUser.status || 'active';
  targetUser.status = status;

  recordAdminAudit(
    admin.id,
    admin.name,
    'UPDATE_USER_STATUS',
    'user',
    targetId,
    `Updated status of user ${targetUser.name} (${targetUser.email}) from '${oldStatus}' to '${status}'. Reason: ${reason || 'Not specified'}.`,
    req.ip,
    req.headers['user-agent']
  );

  createNotification(
    targetId,
    `Account Status Update: ${status.toUpperCase()}`,
    `An administrator has updated your account status to ${status}.${reason ? ' Reason: ' + reason : ''}`
  );

  res.json({
    success: true,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      status: targetUser.status
    }
  });
});


// 2b. Change User Role (Role Changes)
app.post('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  const admin = (req as AuthenticatedRequest).user;
  const targetId = req.params.id;

  const role = String(req.body.role).trim().toLowerCase();

  const allowedRoles = ['customer', 'fundi', 'admin'] as const;

  if (!allowedRoles.includes(role as typeof allowedRoles[number])) {
    return res.status(400).json({
      error: 'Invalid role. Allowed roles are customer, fundi, and admin.'
    });
  }

  const targetUser = users.find(u => u.id === targetId);

  if (!targetUser) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  // Prevent unnecessary updates
  if (targetUser.role === role) {
    return res.status(409).json({
      error: `User already has the '${role}' role.`
    });
  }

  // Prevent an admin from removing their own administrator privileges
  if (
    admin.id === targetId &&
    targetUser.role === 'admin' &&
    role !== 'admin'
  ) {
    return res.status(400).json({
      error: 'You cannot remove your own administrator privileges.'
    });
  }

  // Prevent removal of the last administrator account
  if (
    targetUser.role === 'admin' &&
    role !== 'admin'
  ) {
    const adminCount = users.filter(u => u.role === 'admin').length;

    if (adminCount <= 1) {
      return res.status(400).json({
        error: 'The last administrator account cannot be demoted.'
      });
    }
  }

  const oldRole = targetUser.role;

  targetUser.role = role as 'customer' | 'fundi' | 'admin';

  recordAdminAudit(
    admin.id,
    admin.name,
    'UPDATE_USER_ROLE',
    'user',
    targetId,
    `Updated role of user ${targetUser.name} (${targetUser.email}) from '${oldRole}' to '${role}'.`,
    req.ip,
    req.headers['user-agent']
  );

  createNotification(
    targetId,
    `Account Role Update: ${role.toUpperCase()}`,
    `An administrator has updated your account role to ${role}.`
  );

  res.json({
    success: true,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      role: targetUser.role
    }
  });
});

// 3. Admin Wallet Override (Increase/decrease wallet balance with double-entry matching)
app.post('/api/admin/users/:id/wallet-override', authenticateToken, requireAdmin, (req, res) => {
  const admin = (req as AuthenticatedRequest).user;
  const targetId = req.params.id;
  const { amount, action, reason } = req.body;

  const targetUser = users.find(u => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  // Prevent administrators from modifying their own wallet
  if (admin.id === targetId) {
    return res.status(400).json({
      error: 'Administrators cannot perform wallet overrides on their own accounts.'
    });
  }

  let wallet = wallets.find(w => w.user_id === targetId);

  if (!wallet) {
    wallet = {
      id: `w_${targetId}`,
      user_id: targetId,
      balance: 0,
      currency: 'KES',
      updated_at: new Date().toISOString()
    };

    wallets.push(wallet);
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({
      error: 'Invalid amount value. Must be positive number.'
    });
  }

  // Validate action
  const normalizedAction = String(action).trim().toLowerCase();

  if (!['credit', 'debit'].includes(normalizedAction)) {
    return res.status(400).json({
      error: "Action must be either 'credit' or 'debit'."
    });
  }

  // Require meaningful audit reason
  const auditReason = String(reason ?? '').trim();

  if (auditReason.length < 10) {
    return res.status(400).json({
      error: 'Please provide a meaningful reason (minimum 10 characters) for the wallet override.'
    });
  }

  const oldBalance = wallet.balance;

  try {
    if (normalizedAction === 'credit') {
      EscrowEngine.recordLedgerTransaction([
        {
          ledger_group_id: '',
          user_id: targetId,
          amount: numAmount,
          direction: 'debit',
          ledger_account: 'platform_earnings',
          description: `Admin manual wallet override credit adjustment: ${auditReason}`,
          reference_id: `override_${targetId}`
        },
        {
          ledger_group_id: '',
          user_id: targetId,
          amount: numAmount,
          direction: 'credit',
          ledger_account: 'user_wallet',
          description: `Admin manual wallet override credit adjustment: ${auditReason}`,
          reference_id: `override_${targetId}`
        }
      ]);

      wallet.balance += numAmount;
    } else {
      if (wallet.balance < numAmount) {
        return res.status(400).json({
          error: `Cannot debit KES ${numAmount} from balance of KES ${wallet.balance}.`
        });
      }

      EscrowEngine.recordLedgerTransaction([
        {
          ledger_group_id: '',
          user_id: targetId,
          amount: numAmount,
          direction: 'debit',
          ledger_account: 'user_wallet',
          description: `Admin manual wallet override debit adjustment: ${auditReason}`,
          reference_id: `override_${targetId}`
        },
        {
          ledger_group_id: '',
          user_id: targetId,
          amount: numAmount,
          direction: 'credit',
          ledger_account: 'platform_earnings',
          description: `Admin manual wallet override debit adjustment: ${auditReason}`,
          reference_id: `override_${targetId}`
        }
      ]);

      wallet.balance -= numAmount;
    }

    wallet.updated_at = new Date().toISOString();

    const tx: LocalWalletTransaction = {
      id: `wtx_${Date.now()}`,
      wallet_id: wallet.id,
      user_id: targetId,
      amount: normalizedAction === 'credit' ? numAmount : -numAmount,
      type: normalizedAction === 'credit' ? 'deposit' : 'withdrawal',
      description: `Admin manual wallet override adjustment: ${auditReason}`,
      reference_id: `override_${targetId}`,
      created_at: new Date().toISOString()
    };

    walletTransactions.unshift(tx);

    recordAdminAudit(
      admin.id,
      admin.name,
      'WALLET_OVERRIDE',
      'wallet',
      targetId,
      `Manual balance adjustment for ${targetUser.name}: ${normalizedAction.toUpperCase()} KES ${numAmount}. New balance KES ${wallet.balance}. Reason: ${auditReason}.`,
      req.ip,
      req.headers['user-agent']
    );

    createNotification(
      targetId,
      `Wallet Adjusted KES ${normalizedAction === 'credit' ? '+' : '-'}${numAmount.toLocaleString()} 💳`,
      `An administrator has adjusted your wallet balance. Old: KES ${oldBalance.toLocaleString()}, New: KES ${wallet.balance.toLocaleString()}. Note: ${auditReason}`
    );

    res.json({
      success: true,
      balance: wallet.balance
    });

  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
});

// 4. Admin operations Audit Logs
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req, res) => {
  res.json(adminAuditLogs);
});

// 5. Fraud Detection Alerts
app.get('/api/admin/fraud/detections', authenticateToken, requireAdmin, (req, res) => {
  const alerts: any[] = [];
  const now = new Date().toISOString();

  // 1. High Dispute Rate
  users.forEach(u => {
    const userJobs = jobs.filter(
      j => j.customer_id === u.id || j.fundi_id === u.id
    );

    const userDisputes = disputes.filter(
      d => d.initiator_id === u.id
    );

    if (userJobs.length >= 3) {
      const disputeRate = userDisputes.length / userJobs.length;

      if (disputeRate > 0.3) {
        alerts.push({
          id: `FRD-HIGH-DISPUTE-${u.id}`,
          user_id: u.id,
          user_name: u.name,
          risk_level: disputeRate > 0.5 ? 'CRITICAL' : 'HIGH',
          rule_triggered: 'HIGH_DISPUTE_RATE',
          details: `User has an abnormally high dispute rate of ${Math.round(disputeRate * 100)}% (${userDisputes.length} disputes out of ${userJobs.length} jobs).`,
          timestamp: now
        });
      }
    }

    // 2. Unverified High Balance
    const kyc = kycDocuments.find(d => d.user_id === u.id);
    const wallet = wallets.find(w => w.user_id === u.id);

    if ((!kyc || kyc.status !== 'approved') && wallet && wallet.balance > 40000) {
      alerts.push({
        id: `FRD-KYC-BALANCE-${u.id}`,
        user_id: u.id,
        user_name: u.name,
        risk_level: 'HIGH',
        rule_triggered: 'UNVERIFIED_HIGH_BALANCE',
        details: `User is unverified (KYC status: ${kyc ? kyc.status : 'None'}) but has a wallet balance exceeding the review threshold.`,
        timestamp: now
      });
    }
  });

  // 3. Repeated Payment Failures
  const failedTransactions = transactions.filter(
    t => t.status === 'failed'
  );

  const failureByPhone: Record<string, number> = {};

  failedTransactions.forEach(t => {
    failureByPhone[t.phone_number] =
      (failureByPhone[t.phone_number] || 0) + 1;
  });

  Object.entries(failureByPhone).forEach(([phone, failures]) => {
    if (failures >= 3) {
      const matchedUser = users.find(u => u.phone === phone);

      alerts.push({
        id: `FRD-PAYMENT-FAIL-${matchedUser?.id ?? phone}`,
        user_id: matchedUser?.id || 'anonymous',
        user_name: matchedUser?.name || 'Anonymous User',
        risk_level: 'MEDIUM',
        rule_triggered: 'REPEATED_PAYMENT_FAILURE',
        details: `Account registered ${failures} consecutive failed payment attempts.`,
        timestamp: now
      });
    }
  });

  // 4. High Value Transactions
  jobs.forEach(job => {
    if (job.amount > 80000) {
      alerts.push({
        id: `FRD-HIGH-VALUE-${job.id}`,
        job_id: job.id,
        user_name: job.customer_name,
        risk_level: 'MEDIUM',
        rule_triggered: 'HIGH_VALUE_TRANSACTION',
        details: `Service request #${job.id.substring(0, 8)} exceeded the high-value review threshold.`,
        timestamp: now
      });
    }
  });

  // 5. Rapid Failed Login Attempts
  const uniqueEmails = [...new Set(loginAttempts.map(a => a.email))];

  uniqueEmails.forEach(email => {
    const recentFailures = loginAttempts.filter(
      a =>
        a.email === email &&
        !a.success &&
        Date.now() - a.timestamp < 15 * 60 * 1000
    );

    if (recentFailures.length >= 3) {
      const matchedUser = users.find(
        u => u.email?.toLowerCase() === email.toLowerCase()
      );

      alerts.push({
        id: `FRD-LOGIN-${matchedUser?.id ?? email}`,
        user_id: matchedUser?.id || 'anonymous',
        user_name: matchedUser?.name || 'Anonymous User',
        risk_level: 'CRITICAL',
        rule_triggered: 'RAPID_LOGIN_FAILURES',
        details: `Account experienced ${recentFailures.length} failed login attempts within 15 minutes.`,
        timestamp: now
      });
    }
  });

  // 6. Suspiciously Rapid Job Completion
  jobs.forEach(job => {
    if (job.status !== 'completed') return;

    const created = new Date(job.created_at).getTime();

    if (
      Number.isFinite(created) &&
      Date.now() - created < 5 * 60 * 1000
    ) {
      alerts.push({
        id: `FRD-RAPID-COMPLETE-${job.id}`,
        job_id: job.id,
        user_name: job.customer_name,
        risk_level: 'HIGH',
        rule_triggered: 'RAPID_JOB_COMPLETION',
        details: `Service request #${job.id.substring(0, 8)} was completed unusually quickly and should be reviewed.`,
        timestamp: now
      });
    }
  });

  // 7. System Security Alerts
  alerts.push(...securityAlerts);

  alerts.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );

  res.json(alerts);
});

// 6. Platform Time-Series Analytics
app.get('/api/admin/analytics', authenticateToken, requireAdmin, (req, res) => {
  try {
    const days = ['Day -6', 'Day -5', 'Day -4', 'Day -3', 'Day -2', 'Day -1', 'Today'];

    // Only completed escrow transactions contribute to revenue metrics
    const completedEscrowVolume = escrowTransactions
      .filter(tx => tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const dailyEscrowVolume = [
      12000,
      18500,
      15000,
      32000,
      24000,
      41000,
      completedEscrowVolume
    ];

    const dailyEarnings = dailyEscrowVolume.map(v => Math.round(v * 0.10));

    const dailyUserRegistrations = [
      2,
      4,
      1,
      5,
      3,
      2,
      Math.max(users.length - 12, 0)
    ];

    const categoryCounts: Record<string, number> = {};

    jobs.forEach(j => {
      categoryCounts[j.category] = (categoryCounts[j.category] || 0) + 1;
    });

    const categoryBreakdown = Object.keys(categoryCounts).map(category => ({
      category,
      jobsCount: categoryCounts[category],
      volume: jobs
        .filter(j => j.category === category)
        .reduce((sum, j) => sum + j.amount, 0)
    }));

    // Helper for County Identification supporting all 47 counties
    const getCountyFromAddress = (address?: string): string => {
      if (!address) return 'Nairobi County';

      const lower = address.toLowerCase();

      const counties = [
        'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta',
        'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru',
        'Tharaka Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
        'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot',
        'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi',
        'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho',
        'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya',
        'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'
      ];

      for (const county of counties) {
        if (lower.includes(county.toLowerCase())) {
          return `${county} County`;
        }
      }

      if (lower.includes('eldoret')) return 'Uasin Gishu County';
      if (lower.includes('diani')) return 'Kwale County';
      if (lower.includes('malindi')) return 'Kilifi County';
      if (lower.includes('thika') || lower.includes('ruiru') || lower.includes('githurai')) return 'Kiambu County';
      if (lower.includes('naivasha')) return 'Nakuru County';
      if (lower.includes('kitengela') || lower.includes('rongai') || lower.includes('ngong')) return 'Kajiado County';
      if (lower.includes('syokimau') || lower.includes('athi river') || lower.includes('athiriver')) return 'Machakos County';
      if (lower.includes('kakamega')) return 'Kakamega County';
      if (lower.includes('kisumu')) return 'Kisumu County';
      if (lower.includes('mombasa')) return 'Mombasa County';

      return 'Nairobi County';
    };

    const countyJobs: Record<string, number> = {};

    jobs.forEach(job => {
      const county = getCountyFromAddress(job.address);
      countyJobs[county] = (countyJobs[county] || 0) + 1;
    });

    const countyUsers: Record<string, number> = {};

    users.forEach(user => {
      const county = getCountyFromAddress(user.location?.address);
      countyUsers[county] = (countyUsers[county] || 0) + 1;
    });

    const countyJobsBreakdown = Object.entries(countyJobs).map(([county, jobsCount]) => ({
      county,
      jobsCount
    }));

    const countyUsersBreakdown = Object.entries(countyUsers).map(([county, count]) => ({
      county,
      count
    }));

    res.json({
      generated_at: new Date().toISOString(),

      timeSeries: days.map((day, idx) => ({
        name: day,
        escrowVolume: dailyEscrowVolume[idx],
        platformEarnings: dailyEarnings[idx],
        signups: dailyUserRegistrations[idx]
      })),

      categoryBreakdown,
      countyJobsBreakdown,
      countyUsersBreakdown,

      rolesSplit: {
        customers: users.filter(u => u.role === 'customer').length,
        fundis: users.filter(u => u.role === 'fundi').length,
        admins: users.filter(u => u.role === 'admin').length
      },

      systemMetrics: {
        totalJobs: jobs.length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
        activeJobs: jobs.filter(j =>
          j.status !== 'completed' &&
          j.status !== 'cancelled'
        ).length,
        disputeCount: disputes.length,
        activeDisputes: disputes.filter(d => d.status === 'pending').length,
        kycCount: kycDocuments.length,
        pendingKyc: kycDocuments.filter(d => d.status === 'pending').length
      }
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Failed to generate analytics.'
    });
  }
});

// --- VITE DEV MIDDLEWARE & PRODUCTION STATIC SERVING ---

async function startServer() {
  // Validate environment variables and initialize Sentry/BetterStack telemetry systems
  validateEnvironment();
  telemetry.initialize();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched on port ${PORT}`);
  });
}

startServer();
