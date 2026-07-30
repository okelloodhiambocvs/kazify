import crypto from 'crypto';
import { query, isDbMode } from './index';
import { LocalWallet, LocalWalletTransaction } from '../types';

function mapRowToWallet(row: any): LocalWallet {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    balance: parseFloat(row.balance || '0'),
    currency: row.currency || 'KES',
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapRowToTransaction(row: any): LocalWalletTransaction {
  return {
    id: String(row.id),
    wallet_id: String(row.wallet_id),
    user_id: String(row.user_id),
    amount: parseFloat(row.amount || '0'),
    type: row.type,
    description: row.description || '',
    reference_id: row.reference_id || undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

export async function findByUserId(userId: string): Promise<LocalWallet | null> {
  if (!userId || !isDbMode()) return null;
  const res = await query(`SELECT * FROM wallets WHERE user_id::text = $1`, [userId]);
  if (res.rows.length === 0) return null;
  return mapRowToWallet(res.rows[0]);
}

export async function ensureWallet(userId: string, initialBalance: number = 0): Promise<LocalWallet> {
  if (!isDbMode()) {
    throw new Error('Database is not active');
  }

  const existing = await findByUserId(userId);
  if (existing) return existing;

  const walletId = crypto.randomUUID();
  await query(
    `INSERT INTO wallets (id, user_id, balance, currency)
     VALUES ($1, $2, $3, 'KES')
     ON CONFLICT (user_id) DO NOTHING`,
    [walletId, userId, initialBalance]
  );

  const wallet = await findByUserId(userId);
  if (wallet) return wallet;

  return {
    id: walletId,
    user_id: userId,
    balance: initialBalance,
    currency: 'KES',
    updated_at: new Date().toISOString()
  };
}

export async function updateBalance(userId: string, newBalance: number): Promise<LocalWallet> {
  if (!isDbMode()) {
    throw new Error('Database is not active');
  }

  await ensureWallet(userId, 0);
  const res = await query(
    `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id::text = $2 RETURNING *`,
    [newBalance, userId]
  );
  return mapRowToWallet(res.rows[0]);
}

export async function creditWallet(userId: string, amount: number): Promise<LocalWallet> {
  if (!isDbMode()) {
    throw new Error('Database is not active');
  }

  await ensureWallet(userId, 0);
  const res = await query(
    `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id::text = $2 RETURNING *`,
    [amount, userId]
  );
  return mapRowToWallet(res.rows[0]);
}

export async function debitWallet(userId: string, amount: number): Promise<LocalWallet> {
  if (!isDbMode()) {
    throw new Error('Database is not active');
  }

  const wallet = await ensureWallet(userId, 0);
  if (wallet.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  const res = await query(
    `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id::text = $2 RETURNING *`,
    [amount, userId]
  );
  return mapRowToWallet(res.rows[0]);
}

export async function listTransactions(userId: string): Promise<LocalWalletTransaction[]> {
  if (!userId || !isDbMode()) return [];
  const res = await query(
    `SELECT * FROM wallet_transactions WHERE user_id::text = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows.map(mapRowToTransaction);
}

export async function addTransaction(data: {
  wallet_id?: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'commission' | 'refund';
  description: string;
  reference_id?: string;
}): Promise<LocalWalletTransaction> {
  if (!isDbMode()) {
    throw new Error('Database is not active');
  }

  const wallet = await ensureWallet(data.user_id, 0);
  const txId = crypto.randomUUID();

  const res = await query(
    `INSERT INTO wallet_transactions (id, wallet_id, user_id, amount, type, description, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [txId, wallet.id, data.user_id, data.amount, data.type, data.description, data.reference_id || null]
  );

  return mapRowToTransaction(res.rows[0]);
}

export async function upsertSeedWallets(): Promise<void> {
  if (!isDbMode()) return;

  const seedWallets = [
    { user_id: '8eb107fa-3211-46ab-82cc-55270505291b', balance: 100000 },
    { user_id: '7cb805bb-42df-4db2-943b-802af02f043e', balance: 15000 },
    { user_id: '332c86b1-0988-466e-addd-4cb0cbf3737b', balance: 5000 }
  ];

  for (const sw of seedWallets) {
    await query(
      `INSERT INTO wallets (id, user_id, balance, currency)
       VALUES ($1, $2, $3, 'KES')
       ON CONFLICT (user_id) DO NOTHING`,
      [crypto.randomUUID(), sw.user_id, sw.balance]
    );
  }
}
