import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, isDbMode } from './index';
import { LocalUser } from '../types';

export function normalizePhone(p: string): string {
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

function mapRowToUser(row: any): LocalUser {
  return {
    id: String(row.id),
    email: row.email || '',
    phone: row.phone || '',
    name: row.name,
    role: row.role as 'customer' | 'fundi' | 'admin',
    password_hash: row.password_hash,
    avatar_url: row.avatar_url || undefined,
    kyc_verified: row.is_verified ?? true,
    is_email_verified: row.is_verified ?? true,
    status: row.fundi_status || 'active',
    rating: row.average_rating != null ? parseFloat(row.average_rating) : (row.role === 'fundi' ? 5.0 : undefined),
    category: row.category_name || (row.role === 'fundi' ? 'General Fundi' : undefined),
    hourly_rate: row.hourly_rate_estimate != null ? parseFloat(row.hourly_rate_estimate) : undefined,
    jobs_completed: row.jobs_completed_count != null ? parseInt(row.jobs_completed_count, 10) : undefined,
    bio: row.bio || undefined,
    location: (row.current_lat != null && row.current_lng != null)
      ? { lat: parseFloat(row.current_lat), lng: parseFloat(row.current_lng), address: 'Kisumu, Kenya' }
      : { lat: -0.0917, lng: 34.7680, address: 'Kisumu, Kenya' },
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

const SELECT_USER_BASE = `
  SELECT u.id, u.phone, u.email, u.password_hash, u.name, u.role, u.avatar_url, u.is_verified, u.created_at,
         f.bio, f.hourly_rate_estimate, f.average_rating, f.jobs_completed_count, f.status as fundi_status, f.current_lat, f.current_lng,
         c.name as category_name
  FROM users u
  LEFT JOIN fundis f ON u.id = f.user_id
  LEFT JOIN categories c ON f.category_id = c.id
`;

export async function findByEmail(email: string): Promise<LocalUser | null> {
  if (!email || !isDbMode()) return null;
  const normEmail = email.trim().toLowerCase();
  const res = await query(`${SELECT_USER_BASE} WHERE LOWER(u.email) = LOWER($1)`, [normEmail]);
  if (res.rows.length === 0) return null;
  return mapRowToUser(res.rows[0]);
}

export async function findByPhone(phone: string): Promise<LocalUser | null> {
  if (!phone || !isDbMode()) return null;
  const normPhone = normalizePhone(phone);
  const rawDigits = phone.replace(/\D/g, '');
  const res = await query(
    `${SELECT_USER_BASE} WHERE u.phone = $1 OR u.phone = $2 OR u.phone = $3`,
    [normPhone, phone, rawDigits]
  );
  if (res.rows.length === 0) return null;
  return mapRowToUser(res.rows[0]);
}

export async function findById(id: string): Promise<LocalUser | null> {
  if (!id || !isDbMode()) return null;
  const res = await query(`${SELECT_USER_BASE} WHERE u.id::text = $1`, [id]);
  if (res.rows.length === 0) return null;
  return mapRowToUser(res.rows[0]);
}

export async function findByIdentifier(identifier: string): Promise<LocalUser | null> {
  if (!identifier || !isDbMode()) return null;
  const raw = identifier.trim();
  if (raw.includes('@')) {
    return findByEmail(raw);
  }
  const byPhone = await findByPhone(raw);
  if (byPhone) return byPhone;
  return findByEmail(raw);
}

export async function createUser(data: {
  email?: string;
  phone?: string;
  name: string;
  role: 'customer' | 'fundi' | 'admin';
  password_hash: string;
  category?: string;
  subcategories?: string[];
  bio?: string;
  location?: { lat: number; lng: number; address: string };
  hourly_rate?: number;
}): Promise<LocalUser> {
  if (!isDbMode()) {
    throw new Error('Cannot create user in DB mode when database is not active');
  }

  const userId = crypto.randomUUID();
  const normEmail = data.email ? data.email.trim().toLowerCase() : `${data.role}_${Date.now()}@kazify.com`;
  const normPhone = data.phone ? normalizePhone(data.phone) : `+25470${Math.floor(1000000 + Math.random() * 9000000)}`;

  const userRes = await query(
    `INSERT INTO users (id, phone, email, password_hash, name, role, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING *`,
    [userId, normPhone, normEmail, data.password_hash, data.name, data.role]
  );

  if (data.role === 'customer') {
    await query(
      `INSERT INTO customers (user_id, default_address)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, data.location?.address || 'Kisumu, Kenya']
    );
  } else if (data.role === 'fundi') {
    let categoryId: number | null = null;
    if (data.category) {
      const catRes = await query(`SELECT id FROM categories WHERE LOWER(name) = LOWER($1)`, [data.category]);
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;
      }
    }

    await query(
      `INSERT INTO fundis (user_id, category_id, bio, hourly_rate_estimate, status, current_lat, current_lng, average_rating, jobs_completed_count)
       VALUES ($1, $2, $3, $4, 'available', $5, $6, 5.00, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        userId,
        categoryId,
        data.bio || 'Skilled tradesperson on Kazify',
        data.hourly_rate || 1200.00,
        data.location?.lat || -0.0917,
        data.location?.lng || 34.7680
      ]
    );
  }

  const createdUser = await findById(userId);
  if (createdUser) {
    return createdUser;
  }

  return mapRowToUser(userRes.rows[0]);
}

export async function listAllUsers(): Promise<LocalUser[]> {
  if (!isDbMode()) return [];
  const res = await query(`${SELECT_USER_BASE} ORDER BY u.created_at DESC`);
  return res.rows.map(mapRowToUser);
}

export async function updateUserStatus(userId: string, status: 'active' | 'banned' | 'suspended'): Promise<boolean> {
  if (!isDbMode()) return false;
  await query(`UPDATE fundis SET status = $1 WHERE user_id = $2`, [status, userId]);
  await query(`UPDATE users SET is_verified = CASE WHEN $1 = 'banned' THEN FALSE ELSE is_verified END WHERE id = $2`, [status, userId]);
  return true;
}

export async function updateUserKYC(userId: string, isVerified: boolean): Promise<boolean> {
  if (!isDbMode()) return false;
  await query(`UPDATE users SET is_verified = $1 WHERE id = $2`, [isVerified, userId]);
  return true;
}

export async function ensureAdminTables(): Promise<void> {
  if (!isDbMode()) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS kyc_submissions (
        id VARCHAR(255) PRIMARY KEY,
        fundi_id VARCHAR(255) NOT NULL,
        fundi_name VARCHAR(255) NOT NULL,
        national_id VARCHAR(100) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        document_url TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        admin_id VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(100) NOT NULL,
        target_id VARCHAR(255) NOT NULL,
        details TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) {}
}

export async function saveKycSubmission(doc: {
  id: string;
  fundi_id: string;
  fundi_name: string;
  national_id: string;
  document_type: string;
  document_url: string;
  status: string;
}): Promise<any> {
  if (!isDbMode()) return doc;
  await ensureAdminTables();
  await query(
    `INSERT INTO kyc_submissions (id, fundi_id, fundi_name, national_id, document_type, document_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [doc.id, doc.fundi_id, doc.fundi_name, doc.national_id, doc.document_type, doc.document_url, doc.status]
  );
  return doc;
}

export async function getKycSubmissionsInDb(): Promise<any[]> {
  if (!isDbMode()) return [];
  await ensureAdminTables();
  const res = await query(`SELECT * FROM kyc_submissions ORDER BY submitted_at DESC`);
  return res.rows;
}

export async function reviewKycSubmissionInDb(kycId: string, action: 'approve' | 'reject'): Promise<any> {
  if (!isDbMode()) return null;
  await ensureAdminTables();
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const res = await query(
    `UPDATE kyc_submissions SET status = $1 WHERE id = $2 RETURNING *`,
    [newStatus, kycId]
  );
  if (res.rows.length === 0) return null;
  const sub = res.rows[0];

  if (action === 'approve') {
    await updateUserKYC(sub.fundi_id, true);
  }
  return sub;
}

export async function recordAdminAuditInDb(audit: {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}): Promise<void> {
  if (!isDbMode()) return;
  await ensureAdminTables();
  try {
    await query(
      `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [audit.id, audit.adminId, audit.adminName, audit.action, audit.targetType, audit.targetId, audit.details]
    );
  } catch (_) {}
}

export async function getAdminAuditLogsInDb(): Promise<any[]> {
  if (!isDbMode()) return [];
  await ensureAdminTables();
  const res = await query(`SELECT id, timestamp, admin_id as "adminId", admin_name as "adminName", action, target_type as "targetType", target_id as "targetId", details FROM admin_audit_logs ORDER BY timestamp DESC`);
  return res.rows;
}

export async function upsertSeedUsers(): Promise<void> {
  if (!isDbMode()) return;

  const isProd = process.env.NODE_ENV === 'production';
  const allowDemo = process.env.ALLOW_DEMO_SEED === 'true';

  // If in production and demo seed isn't explicitly enabled, skip or randomize
  if (isProd && !allowDemo) {
    return;
  }

  const seeds = [
    {
      id: '8eb107fa-3211-46ab-82cc-55270505291b',
      email: 'admin@kazify.com',
      phone: '+254700000000',
      password: 'Admin@12345',
      name: 'Robert Ochieng Admin',
      role: 'admin' as const
    },
    {
      id: '7cb805bb-42df-4db2-943b-802af02f043e',
      email: 'customer@kazify.com',
      phone: '+254700000001',
      password: 'Customer@123',
      name: 'Asha Odhiambo',
      role: 'customer' as const
    },
    {
      id: '332c86b1-0988-466e-addd-4cb0cbf3737b',
      email: 'fundi@kazify.com',
      phone: '+254700000002',
      password: 'Fundi@123',
      name: 'Joseph "Jojo" Otieno',
      role: 'fundi' as const
    }
  ];

  for (const s of seeds) {
    const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
    const hash = await bcrypt.hash(
      s.password,
      rounds
    );
    await query(
      `INSERT INTO users (id, phone, email, password_hash, name, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [s.id, s.phone, s.email, hash, s.name, s.role]
    );

    if (s.role === 'customer') {
      await query(
        `INSERT INTO customers (user_id, default_address, preferred_payment_method)
         VALUES ($1, 'Milimani Estate, Kisumu', 'mpesa')
         ON CONFLICT (user_id) DO NOTHING`,
        [s.id]
      );
    } else if (s.role === 'fundi') {
      await query(
        `INSERT INTO fundis (user_id, category_id, bio, experience_years, hourly_rate_estimate, status, current_lat, current_lng, average_rating, jobs_completed_count)
         VALUES ($1, 1, 'Expert plumber with NITA certification and 8 years of pipeline experience in Kisumu Central.', 8, 1200.00, 'available', -0.1022, 34.7615, 4.90, 42)
         ON CONFLICT (user_id) DO NOTHING`,
        [s.id]
      );
    }
  }
}
