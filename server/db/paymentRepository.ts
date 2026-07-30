import crypto from 'crypto';
import { query, isDbMode } from './index';
import { PaymentIntent, Transaction, ReconciliationRecord } from '../services/mpesaService';

function mapRowToIntent(row: any): PaymentIntent {
  return {
    id: String(row.id),
    job_id: String(row.job_id),
    user_id: String(row.user_id),
    amount: parseFloat(row.amount || '0'),
    phone_number: row.phone_number,
    status: row.status,
    checkout_request_id: row.checkout_request_id,
    merchant_request_id: row.merchant_request_id,
    idempotency_key: row.idempotency_key || undefined,
    retry_count: row.retry_count != null ? parseInt(row.retry_count, 10) : 0,
    last_error: row.last_error || undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapRowToTransaction(row: any): Transaction {
  return {
    id: String(row.id),
    payment_intent_id: row.payment_intent_id ? String(row.payment_intent_id) : undefined,
    job_id: row.job_id ? String(row.job_id) : undefined,
    amount: parseFloat(row.amount || '0'),
    phone_number: row.phone_number,
    mpesa_receipt_number: row.mpesa_receipt_number,
    transaction_date: row.transaction_date ? new Date(row.transaction_date).toISOString() : new Date().toISOString(),
    status: row.status,
    raw_callback_payload: row.raw_callback_payload,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

export async function createIntent(data: Partial<PaymentIntent>): Promise<PaymentIntent> {
  if (!isDbMode()) throw new Error('Database is not active');
  const id = (data.id && data.id.length === 36) ? data.id : crypto.randomUUID();
  const res = await query(
    `INSERT INTO payment_intents (
      id, job_id, user_id, amount, phone_number, status, 
      checkout_request_id, merchant_request_id, idempotency_key, retry_count, last_error
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      id,
      data.job_id,
      data.user_id,
      data.amount || 0,
      data.phone_number,
      data.status || 'pending',
      data.checkout_request_id,
      data.merchant_request_id,
      data.idempotency_key || null,
      data.retry_count || 0,
      data.last_error || null
    ]
  );
  return mapRowToIntent(res.rows[0]);
}

export async function findIntentByCheckoutId(checkoutRequestId: string): Promise<PaymentIntent | null> {
  if (!checkoutRequestId || !isDbMode()) return null;
  const res = await query(`SELECT * FROM payment_intents WHERE checkout_request_id = $1`, [checkoutRequestId]);
  if (res.rows.length === 0) return null;
  return mapRowToIntent(res.rows[0]);
}

export async function findPendingIntentByJobPhoneOrKey(params: {
  jobId?: string;
  phone?: string;
  idempotencyKey?: string;
}): Promise<PaymentIntent | null> {
  if (!isDbMode()) return null;
  if (params.idempotencyKey) {
    const resKey = await query(`SELECT * FROM payment_intents WHERE idempotency_key = $1`, [params.idempotencyKey]);
    if (resKey.rows.length > 0) return mapRowToIntent(resKey.rows[0]);
  }
  if (params.jobId && params.phone) {
    const resPending = await query(
      `SELECT * FROM payment_intents WHERE job_id::text = $1 AND phone_number = $2 AND status = 'pending'`,
      [params.jobId, params.phone]
    );
    if (resPending.rows.length > 0) return mapRowToIntent(resPending.rows[0]);
  }
  return null;
}

export async function updateIntentStatus(id: string, status: string, lastError?: string): Promise<PaymentIntent | null> {
  if (!id || !isDbMode()) return null;
  const res = await query(
    `UPDATE payment_intents SET status = $1, last_error = COALESCE($2, last_error), updated_at = NOW() WHERE id::text = $3 RETURNING *`,
    [status, lastError || null, id]
  );
  if (res.rows.length === 0) return null;
  return mapRowToIntent(res.rows[0]);
}

export async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  if (!isDbMode()) throw new Error('Database is not active');
  const id = (data.id && data.id.length === 36) ? data.id : crypto.randomUUID();
  const res = await query(
    `INSERT INTO transactions (
      id, payment_intent_id, job_id, amount, phone_number, mpesa_receipt_number, transaction_date, status, raw_callback_payload
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      id,
      data.payment_intent_id || null,
      data.job_id || null,
      data.amount || 0,
      data.phone_number || '',
      data.mpesa_receipt_number || `REC_${Date.now()}`,
      data.transaction_date ? new Date(data.transaction_date) : new Date(),
      data.status || 'completed',
      data.raw_callback_payload ? JSON.stringify(data.raw_callback_payload) : null
    ]
  );
  return mapRowToTransaction(res.rows[0]);
}

export async function createReconciliation(data: Partial<ReconciliationRecord>): Promise<ReconciliationRecord> {
  if (!isDbMode()) throw new Error('Database is not active');
  const id = (data.id && data.id.length === 36) ? data.id : crypto.randomUUID();
  const res = await query(
    `INSERT INTO reconciliation (
      id, transaction_id, payment_intent_id, mpesa_receipt_number, amount_expected, amount_received, reconciliation_status, verified_at, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      id,
      data.transaction_id || null,
      data.payment_intent_id || null,
      data.mpesa_receipt_number || null,
      data.amount_expected || 0,
      data.amount_received || 0,
      data.reconciliation_status || 'unreconciled',
      data.verified_at ? new Date(data.verified_at) : new Date(),
      data.notes || null
    ]
  );
  return {
    id: String(res.rows[0].id),
    transaction_id: res.rows[0].transaction_id ? String(res.rows[0].transaction_id) : undefined,
    payment_intent_id: res.rows[0].payment_intent_id ? String(res.rows[0].payment_intent_id) : undefined,
    mpesa_receipt_number: res.rows[0].mpesa_receipt_number || undefined,
    amount_expected: parseFloat(res.rows[0].amount_expected || '0'),
    amount_received: parseFloat(res.rows[0].amount_received || '0'),
    reconciliation_status: res.rows[0].reconciliation_status,
    verified_at: res.rows[0].verified_at ? new Date(res.rows[0].verified_at).toISOString() : new Date().toISOString(),
    notes: res.rows[0].notes || undefined,
    created_at: res.rows[0].created_at ? new Date(res.rows[0].created_at).toISOString() : new Date().toISOString()
  };
}

export async function listIntents(): Promise<PaymentIntent[]> {
  if (!isDbMode()) return [];
  const res = await query(`SELECT * FROM payment_intents ORDER BY created_at DESC`);
  return res.rows.map(mapRowToIntent);
}

export async function listTransactions(): Promise<Transaction[]> {
  if (!isDbMode()) return [];
  const res = await query(`SELECT * FROM transactions ORDER BY created_at DESC`);
  return res.rows.map(mapRowToTransaction);
}
