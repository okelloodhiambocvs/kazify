import crypto from 'crypto';
import { query, isDbMode } from './index';
import { LocalJob, LocalBid } from '../types';

async function getOrCreateCategoryId(categoryName: string): Promise<number> {
  const normName = categoryName ? categoryName.trim() : 'General Work';
  try {
    const sel = await query(`SELECT id FROM categories WHERE LOWER(name) = LOWER($1)`, [normName]);
    if (sel.rows.length > 0) {
      return sel.rows[0].id;
    }
    const ins = await query(
      `INSERT INTO categories (name, description, icon_name)
       VALUES ($1, $2, 'tools')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [normName, `${normName} trade services`]
    );
    if (ins.rows.length > 0) {
      return ins.rows[0].id;
    }
  } catch (_) {}
  return 1;
}

function mapRowToBid(row: any): LocalBid {
  return {
    id: String(row.id),
    job_id: String(row.job_id),
    fundi_id: String(row.fundi_id),
    fundi_name: row.fundi_name || 'Fundi',
    fundi_rating: row.fundi_rating != null ? parseFloat(row.fundi_rating) : 5.0,
    amount: parseFloat(row.bid_amount || '0'),
    proposal: row.note || '',
    note: row.note || '',
    duration_days: row.estimated_days ? parseInt(row.estimated_days, 10) : 1,
    status: row.status || 'pending',
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

function mapRowToJob(row: any, bids: LocalBid[] = []): LocalJob {
  const lat = row.lat != null ? parseFloat(row.lat) : -0.0917;
  const lng = row.lng != null ? parseFloat(row.lng) : 34.7680;
  const address = row.address || 'Kisumu, Kenya';

  return {
    id: String(row.id),
    customer_id: String(row.customer_id),
    customer_name: row.customer_name || 'Customer',
    customer_phone: row.customer_phone || undefined,
    title: row.title,
    description: row.description,
    category: row.category_name || 'General Work',
    workflow: (row.workflow as 'instant' | 'quotation') || 'quotation',
    status: row.status as any,
    lat,
    lng,
    address,
    location: { lat, lng, address },
    fundi_id: row.fundi_id ? String(row.fundi_id) : undefined,
    fundi_name: row.fundi_name || undefined,
    fundi_phone: row.fundi_phone || undefined,
    assigned_fundi_id: row.fundi_id ? String(row.fundi_id) : undefined,
    assigned_fundi_name: row.fundi_name || undefined,
    fundi_lat: row.fundi_lat != null ? parseFloat(row.fundi_lat) : undefined,
    fundi_lng: row.fundi_lng != null ? parseFloat(row.fundi_lng) : undefined,
    amount: row.contracted_amount != null ? parseFloat(row.contracted_amount) : 0,
    bids_count: row.bids_count != null ? parseInt(row.bids_count, 10) : bids.length,
    estimated_duration: row.estimated_duration || undefined,
    escrow_status: row.escrow_status || 'unpaid',
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    bids
  };
}

const SELECT_JOB_BASE = `
  SELECT j.id, j.customer_id, j.fundi_id, j.category_id, j.title, j.description, j.workflow, j.status,
         j.lat, j.lng, j.address, j.contracted_amount, j.estimated_duration, j.escrow_status, j.created_at,
         c_user.name as customer_name, c_user.phone as customer_phone,
         f_user.name as fundi_name, f_user.phone as fundi_phone,
         cat.name as category_name,
         f_profile.current_lat as fundi_lat, f_profile.current_lng as fundi_lng,
         (SELECT COUNT(*)::int FROM quotes q WHERE q.job_id = j.id) as bids_count
  FROM jobs j
  LEFT JOIN users c_user ON j.customer_id = c_user.id
  LEFT JOIN users f_user ON j.fundi_id = f_user.id
  LEFT JOIN categories cat ON j.category_id = cat.id
  LEFT JOIN fundis f_profile ON j.fundi_id = f_profile.user_id
`;

const SELECT_QUOTE_BASE = `
  SELECT q.id, q.job_id, q.fundi_id, q.bid_amount, q.note, q.estimated_days, q.status, q.created_at,
         u.name as fundi_name, f.average_rating as fundi_rating
  FROM quotes q
  LEFT JOIN users u ON q.fundi_id = u.id
  LEFT JOIN fundis f ON q.fundi_id = f.user_id
`;

export async function getBidsForJob(jobId: string): Promise<LocalBid[]> {
  if (!jobId || !isDbMode()) return [];
  const res = await query(`${SELECT_QUOTE_BASE} WHERE q.job_id::text = $1 ORDER BY q.created_at DESC`, [jobId]);
  return res.rows.map(mapRowToBid);
}

export async function getBidsForFundi(fundiId: string): Promise<LocalBid[]> {
  if (!fundiId || !isDbMode()) return [];
  const res = await query(`${SELECT_QUOTE_BASE} WHERE q.fundi_id::text = $1 ORDER BY q.created_at DESC`, [fundiId]);
  return res.rows.map(mapRowToBid);
}

export async function getBidById(bidId: string): Promise<LocalBid | null> {
  if (!bidId || !isDbMode()) return null;
  const res = await query(`${SELECT_QUOTE_BASE} WHERE q.id::text = $1`, [bidId]);
  if (res.rows.length === 0) return null;
  return mapRowToBid(res.rows[0]);
}

export async function findById(id: string): Promise<LocalJob | null> {
  if (!id || !isDbMode()) return null;
  const res = await query(`${SELECT_JOB_BASE} WHERE j.id::text = $1`, [id]);
  if (res.rows.length === 0) return null;
  const bids = await getBidsForJob(id);
  return mapRowToJob(res.rows[0], bids);
}

export async function listByCustomer(customerId: string): Promise<LocalJob[]> {
  if (!customerId || !isDbMode()) return [];
  const res = await query(`${SELECT_JOB_BASE} WHERE j.customer_id::text = $1 ORDER BY j.created_at DESC`, [customerId]);
  const jobsList: LocalJob[] = [];
  for (const row of res.rows) {
    const bids = await getBidsForJob(String(row.id));
    jobsList.push(mapRowToJob(row, bids));
  }
  return jobsList;
}

export async function listByFundi(fundiId: string): Promise<LocalJob[]> {
  if (!fundiId || !isDbMode()) return [];
  const res = await query(`${SELECT_JOB_BASE} WHERE j.fundi_id::text = $1 ORDER BY j.created_at DESC`, [fundiId]);
  const jobsList: LocalJob[] = [];
  for (const row of res.rows) {
    const bids = await getBidsForJob(String(row.id));
    jobsList.push(mapRowToJob(row, bids));
  }
  return jobsList;
}

export async function listAvailableForFundi(params: { category?: string } = {}): Promise<LocalJob[]> {
  if (!isDbMode()) return [];
  let sql = `${SELECT_JOB_BASE} WHERE j.status IN ('open', 'matching', 'pending')`;
  const values: any[] = [];
  if (params.category) {
    values.push(params.category.toLowerCase());
    sql += ` AND LOWER(cat.name) = $1`;
  }
  sql += ` ORDER BY j.created_at DESC`;

  const res = await query(sql, values);
  const jobsList: LocalJob[] = [];
  for (const row of res.rows) {
    const bids = await getBidsForJob(String(row.id));
    jobsList.push(mapRowToJob(row, bids));
  }
  return jobsList;
}

export async function listAll(params: { role?: string; user_id?: string; category?: string; status?: string } = {}): Promise<LocalJob[]> {
  if (!isDbMode()) return [];
  let sql = `${SELECT_JOB_BASE} WHERE 1=1`;
  const values: any[] = [];
  let idx = 1;

  if (params.role === 'customer' && params.user_id) {
    sql += ` AND j.customer_id::text = $${idx++}`;
    values.push(params.user_id);
  } else if (params.role === 'fundi' && params.user_id) {
    sql += ` AND (j.fundi_id IS NULL OR j.fundi_id::text = $${idx} OR j.status IN ('open', 'matching', 'pending'))`;
    idx++;
  }

  if (params.category) {
    sql += ` AND LOWER(cat.name) = $${idx++}`;
    values.push(params.category.toLowerCase());
  }

  if (params.status) {
    sql += ` AND j.status = $${idx++}`;
    values.push(params.status);
  }

  sql += ` ORDER BY j.created_at DESC`;

  const res = await query(sql, values);
  const jobsList: LocalJob[] = [];
  for (const row of res.rows) {
    const bids = await getBidsForJob(String(row.id));
    jobsList.push(mapRowToJob(row, bids));
  }
  return jobsList;
}

export async function create(jobData: {
  customer_id: string;
  customer_name?: string;
  title: string;
  description: string;
  category: string;
  workflow?: 'instant' | 'quotation';
  amount: number;
  location?: { lat: number; lng: number; address: string };
  lat?: number;
  lng?: number;
  address?: string;
}): Promise<LocalJob> {
  if (!isDbMode()) {
    throw new Error('Database is not active');
  }

  const jobId = crypto.randomUUID();
  const categoryId = await getOrCreateCategoryId(jobData.category);

  const lat = jobData.location?.lat ?? jobData.lat ?? -0.0917;
  const lng = jobData.location?.lng ?? jobData.lng ?? 34.7680;
  const address = jobData.location?.address ?? jobData.address ?? 'Kisumu, Kenya';
  const workflow = jobData.workflow || 'quotation';

  await query(
    `INSERT INTO jobs (id, customer_id, category_id, title, description, workflow, status, lat, lng, address, contracted_amount, escrow_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, $9, $10, 'unpaid')`,
    [jobId, jobData.customer_id, categoryId, jobData.title, jobData.description, workflow, lat, lng, address, jobData.amount]
  );

  const createdJob = await findById(jobId);
  if (!createdJob) {
    throw new Error('Failed to retrieve newly created job');
  }
  return createdJob;
}

export async function update(id: string, updates: Partial<LocalJob>): Promise<LocalJob | null> {
  if (!id || !isDbMode()) return null;

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(updates.status);
  }

  if (updates.fundi_id !== undefined || updates.assigned_fundi_id !== undefined) {
    const targetFundi = updates.fundi_id || updates.assigned_fundi_id;
    fields.push(`fundi_id = $${idx++}`);
    values.push(targetFundi || null);
  }

  if (updates.amount !== undefined) {
    fields.push(`contracted_amount = $${idx++}`);
    values.push(updates.amount);
  }

  if (updates.escrow_status !== undefined) {
    fields.push(`escrow_status = $${idx++}`);
    values.push(updates.escrow_status);
  }

  if (updates.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(updates.title);
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(updates.description);
  }

  if (updates.location?.address || updates.address) {
    fields.push(`address = $${idx++}`);
    values.push(updates.location?.address || updates.address);
  }

  if (updates.location?.lat !== undefined || updates.lat !== undefined) {
    fields.push(`lat = $${idx++}`);
    values.push(updates.location?.lat ?? updates.lat);
  }

  if (updates.location?.lng !== undefined || updates.lng !== undefined) {
    fields.push(`lng = $${idx++}`);
    values.push(updates.location?.lng ?? updates.lng);
  }

  if (updates.category) {
    const catId = await getOrCreateCategoryId(updates.category);
    fields.push(`category_id = $${idx++}`);
    values.push(catId);
  }

  if (fields.length > 0) {
    fields.push(`updated_at = NOW()`);
    values.push(id);
    await query(`UPDATE jobs SET ${fields.join(', ')} WHERE id::text = $${idx}`, values);
  }

  return findById(id);
}

export async function addBid(bidData: {
  job_id: string;
  fundi_id: string;
  amount: number;
  proposal?: string;
  note?: string;
  duration_days?: number;
}): Promise<LocalBid> {
  if (!isDbMode()) {
    throw new Error('Database is not active');
  }

  const bidId = crypto.randomUUID();
  const note = bidData.proposal || bidData.note || 'Proposal submitted.';
  const days = bidData.duration_days || 1;

  await query(
    `INSERT INTO quotes (id, job_id, fundi_id, bid_amount, note, estimated_days, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [bidId, bidData.job_id, bidData.fundi_id, bidData.amount, note, days]
  );

  const newBid = await getBidById(bidId);
  if (!newBid) {
    throw new Error('Failed to retrieve created bid');
  }
  return newBid;
}

export async function acceptBid(bidId: string): Promise<{ job: LocalJob; bid: LocalBid } | null> {
  if (!bidId || !isDbMode()) return null;

  const bid = await getBidById(bidId);
  if (!bid) return null;

  await query(`UPDATE quotes SET status = 'accepted' WHERE id::text = $1`, [bidId]);
  await query(`UPDATE quotes SET status = 'rejected' WHERE job_id::text = $1 AND id::text != $2`, [bid.job_id, bidId]);
  
  await query(
    `UPDATE jobs SET status = 'in_progress', fundi_id = $1, contracted_amount = $2, updated_at = NOW() WHERE id::text = $3`,
    [bid.fundi_id, bid.amount, bid.job_id]
  );

  const updatedJob = await findById(bid.job_id);
  const updatedBid = await getBidById(bidId);

  if (!updatedJob || !updatedBid) return null;
  return { job: updatedJob, bid: updatedBid };
}
