import { 
  users, 
  adminAuditLogs, 
  notifications, 
  contracts, 
  jobs 
} from './state';
import { LocalJob, LocalContract } from './types';
import { EscrowEngine } from './services/escrowService';

export function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

import { isDbMode } from './db';
import * as usersRepository from './db/usersRepository';

export function recordAdminAudit(
  adminId: string, 
  adminName: string, 
  action: string, 
  targetType: 'user' | 'job' | 'dispute' | 'system' | 'escrow', 
  targetId: string, 
  details: string
) {
  const auditEntry = {
    id: `AL-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    adminId,
    adminName,
    action,
    targetType,
    targetId,
    details
  };

  adminAuditLogs.unshift(auditEntry);

  if (isDbMode()) {
    usersRepository.recordAdminAuditInDb(auditEntry).catch((err) => {
      console.error('[DB AUDIT LOG ERROR] Failed to persist audit log:', err);
    });
  }
}

export function createNotification(userId: string, title: string, content: string) {
  const notif = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
    title,
    content,
    is_read: false,
    created_at: new Date().toISOString()
  };
  notifications.unshift(notif);
  return notif;
}

export function initEscrowAndContract(job: LocalJob, fundiId: string) {
  const fundi = users.find(u => u.id === fundiId);
  if (!fundi) return;

  try {
    EscrowEngine.fundEscrow({
      jobId: job.id,
      customerId: job.customer_id,
      fundiId: fundi.id,
      amount: job.amount,
      description: `Contract initialization for ${job.title}`
    });
  } catch (e) {
    // Escrow account may already exist
  }

  const existingContract = contracts.find(c => c.job_id === job.id);
  if (!existingContract) {
    const newContract: LocalContract = {
      id: `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      job_id: job.id,
      customer_id: job.customer_id,
      customer_name: job.customer_name,
      fundi_id: fundi.id,
      fundi_name: fundi.name,
      amount: job.amount,
      terms: `Binding Work Agreement for ${job.title} (${job.category}). Payment of KES ${job.amount.toLocaleString()} is locked in Kazify M-Pesa Escrow and will be released upon completion verification.`,
      customer_signed: true,
      fundi_signed: false,
      customer_signed_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString()
    };
    contracts.push(newContract);
  }
}
