import crypto from 'crypto';
import { query, isDbMode } from './index';
import { EscrowAccount, LedgerEntry, Settlement, Payout } from '../services/escrowService';

function mapRowToEscrowAccount(row: any): EscrowAccount {
  return {
    id: String(row.id),
    job_id: String(row.job_id),
    customer_id: String(row.customer_id),
    fundi_id: row.fundi_id ? String(row.fundi_id) : undefined,
    amount: parseFloat(row.amount || '0'),
    commission_fee: parseFloat(row.commission_fee || '0'),
    payout_amount: parseFloat(row.payout_amount || '0'),
    status: row.status as any,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapRowToLedgerEntry(row: any): LedgerEntry {
  return {
    id: String(row.id),
    ledger_group_id: String(row.ledger_group_id),
    escrow_account_id: row.escrow_account_id ? String(row.escrow_account_id) : undefined,
    milestone_id: row.milestone_id ? String(row.milestone_id) : undefined,
    user_id: row.user_id ? String(row.user_id) : undefined,
    amount: parseFloat(row.amount || '0'),
    direction: row.direction as 'debit' | 'credit',
    ledger_account: row.ledger_account as any,
    description: row.description || '',
    reference_id: row.reference_id || undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

export async function findByJobId(jobId: string): Promise<EscrowAccount | null> {
  if (!jobId || !isDbMode()) return null;
  const res = await query(`SELECT * FROM escrow_accounts WHERE job_id::text = $1`, [jobId]);
  if (res.rows.length === 0) return null;
  return mapRowToEscrowAccount(res.rows[0]);
}

export async function findById(id: string): Promise<EscrowAccount | null> {
  if (!id || !isDbMode()) return null;
  const res = await query(`SELECT * FROM escrow_accounts WHERE id::text = $1`, [id]);
  if (res.rows.length === 0) return null;
  return mapRowToEscrowAccount(res.rows[0]);
}

export async function saveEscrowAccount(account: Partial<EscrowAccount>): Promise<EscrowAccount> {
  if (!isDbMode()) throw new Error('Database is not active');
  
  let existing: EscrowAccount | null = null;
  if (account.id) {
    existing = await findById(account.id);
  }
  if (!existing && account.job_id) {
    existing = await findByJobId(account.job_id);
  }

  if (existing) {
    const id = existing.id;
    const res = await query(
      `UPDATE escrow_accounts SET
        amount = $1,
        commission_fee = $2,
        payout_amount = $3,
        status = $4,
        fundi_id = COALESCE($5, fundi_id),
        updated_at = NOW()
       WHERE id::text = $6
       RETURNING *`,
      [
        account.amount !== undefined ? account.amount : existing.amount,
        account.commission_fee !== undefined ? account.commission_fee : existing.commission_fee,
        account.payout_amount !== undefined ? account.payout_amount : existing.payout_amount,
        account.status || existing.status,
        account.fundi_id || null,
        id
      ]
    );
    return mapRowToEscrowAccount(res.rows[0]);
  } else {
    const id = (account.id && account.id.length === 36) ? account.id : crypto.randomUUID();
    const res = await query(
      `INSERT INTO escrow_accounts (
        id, job_id, customer_id, fundi_id, amount, commission_fee, payout_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        account.job_id,
        account.customer_id,
        account.fundi_id || null,
        account.amount || 0,
        account.commission_fee || 0,
        account.payout_amount || 0,
        account.status || 'held'
      ]
    );
    return mapRowToEscrowAccount(res.rows[0]);
  }
}

export async function updateStatusByJobId(jobId: string, status: string): Promise<void> {
  if (!jobId || !isDbMode()) return;
  await query(`UPDATE escrow_accounts SET status = $1, updated_at = NOW() WHERE job_id::text = $2`, [status, jobId]);
}

export async function listForUser(userId: string, role?: string): Promise<EscrowAccount[]> {
  if (!isDbMode()) return [];
  if (role === 'admin') {
    const res = await query(`SELECT * FROM escrow_accounts ORDER BY created_at DESC`);
    return res.rows.map(mapRowToEscrowAccount);
  }
  const res = await query(
    `SELECT * FROM escrow_accounts WHERE customer_id::text = $1 OR fundi_id::text = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows.map(mapRowToEscrowAccount);
}

export async function saveLedgerEntry(entry: Partial<LedgerEntry>): Promise<void> {
  if (!isDbMode()) return;
  const id = (entry.id && entry.id.length === 36) ? entry.id : crypto.randomUUID();
  const groupId = (entry.ledger_group_id && entry.ledger_group_id.length === 36) ? entry.ledger_group_id : crypto.randomUUID();
  await query(
    `INSERT INTO ledger_entries (
      id, ledger_group_id, escrow_account_id, milestone_id, user_id, amount, direction, ledger_account, description, reference_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      groupId,
      entry.escrow_account_id || null,
      entry.milestone_id || null,
      entry.user_id || null,
      entry.amount || 0,
      entry.direction || 'debit',
      entry.ledger_account || 'user_wallet',
      entry.description || '',
      entry.reference_id || null
    ]
  );
}

export async function listLedgerForUser(userId: string, role?: string): Promise<LedgerEntry[]> {
  if (!isDbMode()) return [];
  if (role === 'admin') {
    const res = await query(`SELECT * FROM ledger_entries ORDER BY created_at DESC`);
    return res.rows.map(mapRowToLedgerEntry);
  }
  const res = await query(`SELECT * FROM ledger_entries WHERE user_id::text = $1 ORDER BY created_at DESC`, [userId]);
  return res.rows.map(mapRowToLedgerEntry);
}

export async function saveSettlement(settlement: Partial<Settlement>): Promise<Settlement> {
  if (!isDbMode()) throw new Error('Database is not active');
  const id = (settlement.id && settlement.id.length === 36) ? settlement.id : crypto.randomUUID();
  const res = await query(
    `INSERT INTO settlements (
      id, escrow_account_id, milestone_id, job_id, fundi_id, amount_gross, platform_fee, amount_net, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      id,
      settlement.escrow_account_id,
      settlement.milestone_id || null,
      settlement.job_id,
      settlement.fundi_id,
      settlement.amount_gross || 0,
      settlement.platform_fee || 0,
      settlement.amount_net || 0,
      settlement.status || 'settled'
    ]
  );
  return {
    id: String(res.rows[0].id),
    escrow_account_id: String(res.rows[0].escrow_account_id),
    milestone_id: res.rows[0].milestone_id ? String(res.rows[0].milestone_id) : undefined,
    job_id: String(res.rows[0].job_id),
    fundi_id: String(res.rows[0].fundi_id),
    amount_gross: parseFloat(res.rows[0].amount_gross || '0'),
    platform_fee: parseFloat(res.rows[0].platform_fee || '0'),
    amount_net: parseFloat(res.rows[0].amount_net || '0'),
    status: res.rows[0].status,
    created_at: res.rows[0].created_at ? new Date(res.rows[0].created_at).toISOString() : new Date().toISOString(),
    updated_at: res.rows[0].updated_at ? new Date(res.rows[0].updated_at).toISOString() : new Date().toISOString()
  };
}

export async function listSettlements(): Promise<Settlement[]> {
  if (!isDbMode()) return [];
  const res = await query(`SELECT * FROM settlements ORDER BY created_at DESC`);
  return res.rows.map(r => ({
    id: String(r.id),
    escrow_account_id: String(r.escrow_account_id),
    milestone_id: r.milestone_id ? String(r.milestone_id) : undefined,
    job_id: String(r.job_id),
    fundi_id: String(r.fundi_id),
    amount_gross: parseFloat(r.amount_gross || '0'),
    platform_fee: parseFloat(r.platform_fee || '0'),
    amount_net: parseFloat(r.amount_net || '0'),
    status: r.status,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
  }));
}

export async function savePayout(payout: Partial<Payout>): Promise<Payout> {
  if (!isDbMode()) throw new Error('Database is not active');
  const id = (payout.id && payout.id.length === 36) ? payout.id : crypto.randomUUID();
  const res = await query(
    `INSERT INTO payouts (
      id, settlement_id, user_id, amount, payout_method, payout_destination, transaction_reference, status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      id,
      payout.settlement_id,
      payout.user_id,
      payout.amount || 0,
      payout.payout_method || 'mpesa',
      payout.payout_destination || 'M-Pesa line',
      payout.transaction_reference || null,
      payout.status || 'pending',
      payout.error_message || null
    ]
  );
  return {
    id: String(res.rows[0].id),
    settlement_id: String(res.rows[0].settlement_id),
    user_id: String(res.rows[0].user_id),
    amount: parseFloat(res.rows[0].amount || '0'),
    payout_method: res.rows[0].payout_method,
    payout_destination: res.rows[0].payout_destination,
    transaction_reference: res.rows[0].transaction_reference || undefined,
    status: res.rows[0].status,
    error_message: res.rows[0].error_message || undefined,
    created_at: res.rows[0].created_at ? new Date(res.rows[0].created_at).toISOString() : new Date().toISOString(),
    updated_at: res.rows[0].updated_at ? new Date(res.rows[0].updated_at).toISOString() : new Date().toISOString()
  };
}

export async function updatePayout(id: string, updates: Partial<Payout>): Promise<void> {
  if (!id || !isDbMode()) return;
  await query(
    `UPDATE payouts SET status = COALESCE($1, status), transaction_reference = COALESCE($2, transaction_reference), updated_at = NOW() WHERE id::text = $3`,
    [updates.status || null, updates.transaction_reference || null, id]
  );
}

export async function listPayouts(): Promise<Payout[]> {
  if (!isDbMode()) return [];
  const res = await query(`SELECT * FROM payouts ORDER BY created_at DESC`);
  return res.rows.map(r => ({
    id: String(r.id),
    settlement_id: String(r.settlement_id),
    user_id: String(r.user_id),
    amount: parseFloat(r.amount || '0'),
    payout_method: r.payout_method,
    payout_destination: r.payout_destination,
    transaction_reference: r.transaction_reference || undefined,
    status: r.status,
    error_message: r.error_message || undefined,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
  }));
}

export async function listAllLedgerEntries(): Promise<LedgerEntry[]> {
  if (!isDbMode()) return [];
  const res = await query(`SELECT * FROM ledger_entries ORDER BY created_at DESC`);
  return res.rows.map(mapRowToLedgerEntry);
}
