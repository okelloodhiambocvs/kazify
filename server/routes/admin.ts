import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireAdmin } from '../middleware';
import { AuthenticatedRequest, LocalUser } from '../types';
import { 
  users, 
  jobs, 
  kycSubmissions, 
  disputes, 
  adminAuditLogs 
} from '../state';
import { recordAdminAudit } from '../utils';
import { isDbMode } from '../db';
import * as jobsRepository from '../db/jobsRepository';
import * as usersRepository from '../db/usersRepository';
import { logSecurityEvent } from '../services/securityHardening';

export const adminRouter = Router();

// GET /api/admin/users
adminRouter.get('/admin/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isDbMode()) {
    const dbUsers = await usersRepository.listAllUsers();
    const safeUsers = dbUsers.map(({ password_hash, ...rest }) => rest);
    return res.json(safeUsers);
  }
  const safeUsers = users.map(({ password_hash, ...rest }) => rest);
  return res.json(safeUsers);
});

// POST /api/admin/users/:userId/ban
adminRouter.post('/admin/users/:userId/ban', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  
  if (isDbMode()) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    await usersRepository.updateUserStatus(userId, 'banned');
    const updatedUser = await usersRepository.findById(userId);

    logSecurityEvent('BAN_ATTEMPT', {
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      targetUserId: userId,
      targetUserEmail: user.email,
      action: 'BAN_EXECUTED'
    }, req);

    recordAdminAudit(
      req.user!.id,
      req.user!.name,
      'BAN_USER',
      'user',
      userId,
      `Banned user ${user.name} (${user.email})`
    );

    return res.json({ message: `User ${user.name} has been banned`, user: updatedUser });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.status = 'banned';

  recordAdminAudit(
    req.user!.id,
    req.user!.name,
    'BAN_USER',
    'user',
    userId,
    `Banned user ${user.name} (${user.email})`
  );

  return res.json({ message: `User ${user.name} has been banned`, user });
});

// GET /api/admin/kyc
adminRouter.get('/admin/kyc', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isDbMode()) {
    const dbKyc = await usersRepository.getKycSubmissionsInDb();
    if (dbKyc && dbKyc.length > 0) {
      return res.json(dbKyc);
    }
  }
  return res.json(kycSubmissions);
});

// POST /api/admin/kyc/:kycId/verify
adminRouter.post('/admin/kyc/:kycId/verify', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { kycId } = req.params;
  const { action } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
  }

  if (isDbMode()) {
    const reviewed = await usersRepository.reviewKycSubmissionInDb(kycId, action as 'approve' | 'reject');
    if (reviewed) {
      recordAdminAudit(
        req.user!.id,
        req.user!.name,
        action === 'approve' ? 'APPROVE_KYC' : 'REJECT_KYC',
        'user',
        reviewed.fundi_id,
        `${action === 'approve' ? 'Approved' : 'Rejected'} KYC submission for ${reviewed.fundi_name}`
      );
      return res.json({ message: `KYC submission ${action}d successfully`, submission: reviewed });
    }
  }

  const submission = kycSubmissions.find(k => k.id === kycId);
  if (!submission) {
    return res.status(404).json({ error: 'KYC submission not found' });
  }

  submission.status = action === 'approve' ? 'approved' : 'rejected';

  if (action === 'approve') {
    const fundi = users.find(u => u.id === submission.fundi_id);
    if (fundi) {
      fundi.kyc_verified = true;
    }
  }

  recordAdminAudit(
    req.user!.id,
    req.user!.name,
    action === 'approve' ? 'APPROVE_KYC' : 'REJECT_KYC',
    'user',
    submission.fundi_id,
    `${action === 'approve' ? 'Approved' : 'Rejected'} KYC submission for ${submission.fundi_name}`
  );

  return res.json({ message: `KYC submission ${action}d successfully`, submission });
});

// GET /api/admin/disputes
adminRouter.get('/admin/disputes', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json(disputes);
});

// POST /api/admin/disputes/:disputeId/resolve
adminRouter.post('/admin/disputes/:disputeId/resolve', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { disputeId } = req.params;
  const { resolution, refundCustomer } = req.body;

  const dispute = disputes.find(d => d.id === disputeId);
  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  dispute.status = 'resolved';
  dispute.resolution_notes = resolution;

  const newStatus = refundCustomer ? 'refunded' : 'completed';
  if (isDbMode() && dispute.job_id) {
    await jobsRepository.update(dispute.job_id, { status: newStatus as any });
  } else {
    const job = jobs.find(j => j.id === dispute.job_id);
    if (job) {
      job.status = newStatus as any;
    }
  }

  recordAdminAudit(
    req.user!.id,
    req.user!.name,
    'RESOLVE_DISPUTE',
    'dispute',
    disputeId,
    `Resolved dispute for job "${dispute.job_title}". Resolution: ${resolution}`
  );

  return res.json({ message: 'Dispute resolved successfully', dispute });
});

// GET /api/admin/audit-logs
adminRouter.get('/admin/audit-logs', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isDbMode()) {
    const dbLogs = await usersRepository.getAdminAuditLogsInDb();
    if (dbLogs && dbLogs.length > 0) {
      return res.json(dbLogs);
    }
  }
  return res.json(adminAuditLogs);
});

// POST /api/admin/invite-admin (Invite / create admin account by authenticated administrator)
adminRouter.post('/admin/invite-admin', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, name, and initial password are required to create an admin account' });
    }

    const normEmail = email.trim().toLowerCase();
    let existingUser: LocalUser | null = null;

    if (isDbMode()) {
      existingUser = await usersRepository.findByEmail(normEmail);
    } else {
      existingUser = users.find(u => u.email && u.email.toLowerCase() === normEmail) || null;
    }

    if (existingUser) {
      return res.status(400).json({ error: 'A user account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    let newAdmin: LocalUser;

    if (isDbMode()) {
      newAdmin = await usersRepository.createUser({
        email: normEmail,
        phone: phone || '+254700000000',
        name,
        role: 'admin',
        password_hash,
      });
    } else {
      const adminId = `admin_${Date.now()}`;
      newAdmin = {
        id: adminId,
        email: normEmail,
        role: 'admin',
        name,
        phone: phone || '+254700000000',
        password_hash,
        kyc_verified: true,
        status: 'active',
        is_email_verified: true,
        created_at: new Date().toISOString()
      };
      users.push(newAdmin);
    }

    recordAdminAudit(
      req.user!.id,
      req.user!.name,
      'CREATE_ADMIN',
      'user',
      newAdmin.id,
      `Created administrator invitation for ${name} (${normEmail})`
    );

    const { password: _p, password_hash: _ph, ...safeAdmin } = newAdmin as any;

    return res.status(201).json({
      message: 'Administrator account created successfully via invitation',
      user: safeAdmin
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create administrator: ' + error.message });
  }
});
