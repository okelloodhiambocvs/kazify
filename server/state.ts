import bcrypt from 'bcryptjs';
import { 
  LocalUser, 
  LocalJob, 
  LocalChatMessage, 
  LocalEscrowTransaction, 
  LocalNotification, 
  LocalReview, 
  LocalWallet, 
  LocalWalletTransaction, 
  LocalDispute, 
  LocalDisputeMessage, 
  LocalKYCDocument, 
  LocalContract, 
  AdminAuditLog, 
  FraudAlert 
} from './types';

import crypto from 'crypto';

export const refreshTokensRegistry = new Set<string>();
export const revokedTokensRegistry = new Set<string>();

const isProductionEnv = process.env.NODE_ENV === 'production';
const allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true';

const getInitialSeedPassword = (defaultPw: string) => {
  if (isProductionEnv && !allowDemoSeed) {
    // In production, rotate fixed seed passwords to random unguessable entropy
    return crypto.randomBytes(32).toString('hex');
  }
  return defaultPw;
};

export const users: LocalUser[] = [
  {
    id: "admin-user-id-001",
    email: "admin@kazify.com",
    phone: "+254700000000",
    name: "System Administrator",
    role: "admin",
    password: getInitialSeedPassword("Admin@12345"),
    avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150"
  },
  {
    id: "customer-user-id-001",
    phone: "+254700000001",
    email: "customer@kazify.com",
    name: "Asha Odhiambo",
    role: "customer",
    password: getInitialSeedPassword("Customer@123"),
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
  },
  {
    id: "fundi-user-id-001",
    phone: "+254700000002",
    email: "fundi@kazify.com",
    name: "Joseph Otieno",
    role: "fundi",
    password: getInitialSeedPassword("Fundi@123"),
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
    password: getInitialSeedPassword("Fundi@123"),
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
  const plainPassword = user.password || user.password_hash;
  if (plainPassword && !plainPassword.startsWith('$2a$') && !plainPassword.startsWith('$2b$')) {
    user.password_hash = bcrypt.hashSync(plainPassword, 10);
  } else if (plainPassword) {
    user.password_hash = plainPassword;
  }
  delete user.password;
  user.is_email_verified = true;
});

export const jobs: LocalJob[] = [];
export const bids: any[] = [];
export const chatMessages: LocalChatMessage[] = [];
export const messages: any[] = [];
export const escrowTransactions: LocalEscrowTransaction[] = [];
export const notifications: LocalNotification[] = [];
export const reviews: LocalReview[] = [];
export const portfolioItems: any[] = [];

export const wallets: LocalWallet[] = [
  { id: "w_admin", user_id: "admin-user-id-001", balance: 50000, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_customer", user_id: "customer-user-id-001", balance: 15000, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_fundi_001", user_id: "fundi-user-id-001", balance: 2400, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_fundi_002", user_id: "fundi-user-id-002", balance: 3500, currency: "KES", updated_at: new Date().toISOString() },
  { id: "w_fundi_003", user_id: "fundi-user-id-003", balance: 0, currency: "KES", updated_at: new Date().toISOString() },
];

export const walletTransactions: LocalWalletTransaction[] = [];
export const disputes: LocalDispute[] = [];
export const disputeMessages: LocalDisputeMessage[] = [];

export const kycDocuments: LocalKYCDocument[] = [
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

export const kycSubmissions: any[] = [
  {
    id: "kyc_fundi_001",
    fundi_id: "fundi-user-id-001",
    fundi_name: "Joseph Otieno",
    national_id: "33445566",
    document_type: "national_id",
    document_url: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400",
    status: "approved",
    submitted_at: new Date().toISOString()
  },
  {
    id: "kyc_fundi_002",
    fundi_id: "fundi-user-id-002",
    fundi_name: "Kelvin Kiprop",
    national_id: "33445567",
    document_type: "passport",
    document_url: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400",
    status: "pending",
    submitted_at: new Date().toISOString()
  }
];

export const contracts: LocalContract[] = [];

export const adminAuditLogs: AdminAuditLog[] = [
  {
    id: 'AL-101',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    adminId: 'admin-user-id-001',
    adminName: 'System Administrator',
    action: 'SYSTEM_STARTUP',
    targetType: 'system',
    targetId: 'sys-001',
    details: 'Kazify operations control engine initialized and secure double-entry ledgers matching.'
  }
];

export const fraudAlerts: FraudAlert[] = [];

(global as any).users = users;
