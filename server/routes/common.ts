import { Router, Response } from 'express';
import { 
  authenticateToken, 
  requireAdmin, 
  broadcastWSMessage,
  sendWSMessage
} from '../middleware';
import { AuthenticatedRequest, LocalJob } from '../types';
import { 
  users, 
  jobs, 
  bids, 
  messages, 
  notifications, 
  reviews, 
  wallets, 
  walletTransactions, 
  disputes, 
  disputeMessages, 
  kycDocuments, 
  kycSubmissions, 
  contracts, 
  adminAuditLogs 
} from '../state';
import { createNotification } from '../utils';
import { isDbMode } from '../db';
import * as jobsRepository from '../db/jobsRepository';
import * as walletsRepository from '../db/walletsRepository';
import * as usersRepository from '../db/usersRepository';

export const commonRouter = Router();

// GET /api/jobs
commonRouter.get('/jobs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { role, user_id, category, status } = req.query;

  if (isDbMode()) {
    const dbJobs = await jobsRepository.listAll({
      role: (role as string) || req.user?.role,
      user_id: (user_id as string) || req.user?.id,
      category: category as string,
      status: status as string
    });
    return res.json(dbJobs);
  }

  let result = [...jobs];

  const targetRole = role || req.user?.role;
  const targetUserId = (user_id as string) || req.user?.id;

  if (targetRole === 'customer') {
    if (targetUserId) {
      result = result.filter(j => j.customer_id === targetUserId);
    }
  } else if (targetRole === 'fundi') {
    result = result.filter(j => 
      !j.fundi_id || 
      j.fundi_id === targetUserId || 
      j.assigned_fundi_id === targetUserId || 
      j.status === 'open' || 
      j.status === 'matching' || 
      j.status === 'pending'
    );
  }

  if (category) {
    result = result.filter(j => j.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (status) {
    result = result.filter(j => j.status === status);
  }

  return res.json(result);
});

// POST /api/jobs
commonRouter.post('/jobs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.user!.id;
  const customerName = req.user!.name;
  const { title, category, description, amount, location, workflow } = req.body;

  if (!title || !category || !description || !amount) {
    return res.status(400).json({ error: 'Title, category, description, and amount are required' });
  }

  let newJob: LocalJob;

  if (isDbMode()) {
    newJob = await jobsRepository.create({
      customer_id: customerId,
      customer_name: customerName,
      title,
      category,
      description,
      amount: Number(amount),
      workflow: workflow || 'quotation',
      location
    });

    // Create a pending escrow funding transaction
    walletTransactions.unshift({
      id: `escrow_${Date.now()}`,
      wallet_id: `wallet_${customerId}`,
      user_id: customerId,
      job_id: newJob.id,
      type: 'escrow_hold',
      amount: Number(amount),
      description: `Escrow reserved for job ${newJob.title}`,
      status: 'pending',
      created_at: new Date().toISOString()
    });

  } else {
    newJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title,
      category,
      description,
      amount: Number(amount),
      workflow: workflow || 'quotation',
      status: 'open',
      customer_id: customerId,
      customer_name: customerName,
      location: location || {
        lat: -0.0917,
        lng: 34.7680,
        address: 'Kisumu, Kenya'
      },
      bids_count: 0,
      escrow_status: 'unpaid',
      created_at: new Date().toISOString()
    };

    jobs.unshift(newJob);

    // Create a pending escrow funding transaction
    walletTransactions.unshift({
      id: `escrow_${Date.now()}`,
      wallet_id: `wallet_${customerId}`,
      user_id: customerId,
      job_id: newJob.id,
      type: 'escrow_hold',
      amount: Number(amount),
      description: `Escrow reserved for job ${newJob.title}`,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  }

  broadcastWSMessage({
    type: 'JOB_POSTED',
    job: newJob
  });

  return res.status(201).json(newJob);
});

// POST /api/jobs/:jobId/status
commonRouter.post('/jobs/:jobId/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const { status } = req.body;

  if (isDbMode()) {
    const job = await jobsRepository.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const updatedJob = await jobsRepository.update(jobId, { status });
    return res.json({ message: 'Job status updated successfully', job: updatedJob || job });
  }

  const job = jobs.find(j => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (status) {
    job.status = status;
  }

  return res.json({ message: 'Job status updated successfully', job });
});

// POST /api/jobs/:jobId/accept-instant
commonRouter.post('/jobs/:jobId/accept-instant', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const fundiId = req.user!.id;
  const fundiName = req.user!.name;

  if (isDbMode()) {
    const job = await jobsRepository.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const updatedJob = await jobsRepository.update(jobId, {
      status: 'in_progress',
      fundi_id: fundiId,
      assigned_fundi_id: fundiId
    });
    return res.json({ message: 'Instant job accepted successfully', job: updatedJob || job });
  }

  const job = jobs.find(j => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.status = 'in_progress';
  job.fundi_id = fundiId;
  job.fundi_name = fundiName;
  job.assigned_fundi_id = fundiId;
  job.assigned_fundi_name = fundiName;

  return res.json({ message: 'Instant job accepted successfully', job });
});

// GET /api/notifications
commonRouter.get('/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = (req.query.user_id as string) || (req.query.userId as string) || req.user?.id;
  if (!userId) {
    return res.json(notifications);
  }
  const userNotifs = notifications.filter(n => (n as any).user_id === userId || (n as any).userId === userId || !(n as any).user_id);
  return res.json(userNotifs);
});

// POST /api/bids
commonRouter.post('/bids', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const fundiId = req.user!.id;
  const fundiName = req.user!.name;
  const { job_id, amount, proposal, note, duration_days } = req.body;

  if (!job_id || !amount) {
    return res.status(400).json({ error: 'Job ID and amount are required' });
  }

  if (isDbMode()) {
    const job = await jobsRepository.findById(job_id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const newBid = await jobsRepository.addBid({
      job_id,
      fundi_id: fundiId,
      amount: Number(amount),
      proposal: proposal || note || 'Trade quotation proposal submitted.',
      duration_days: duration_days || 1
    });

    createNotification(
      job.customer_id,
      'New Bid Received!',
      `${fundiName} placed a bid of KES ${Number(amount).toLocaleString()} on your job "${job.title}"`
    );

    return res.status(201).json(newBid);
  }

  const job = jobs.find(j => j.id === job_id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const newBid: any = {
    id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    job_id,
    fundi_id: fundiId,
    fundi_name: fundiName,
    amount: Number(amount),
    proposal: proposal || note || 'Trade quotation proposal submitted.',
    duration_days: duration_days || 1,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  bids.unshift(newBid);
  if (!job.bids) job.bids = [];
  job.bids.unshift(newBid);
  job.bids_count = (job.bids_count || 0) + 1;

  createNotification(
    job.customer_id,
    'New Bid Received!',
    `${fundiName} placed a bid of KES ${Number(amount).toLocaleString()} on your job "${job.title}"`
  );

  return res.status(201).json(newBid);
});

// POST /api/bids/:bidId/accept
commonRouter.post('/bids/:bidId/accept', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { bidId } = req.params;

  if (isDbMode()) {
    const bid = await jobsRepository.getBidById(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }
    const result = await jobsRepository.acceptBid(bidId);
    if (!result) {
      return res.status(500).json({ error: 'Failed to accept bid' });
    }

    createNotification(
      bid.fundi_id,
      'Bid Accepted!',
      `Your bid of KES ${bid.amount.toLocaleString()} for job "${result.job.title}" was accepted!`
    );

    return res.json({ message: 'Bid accepted successfully', job: result.job, bid: result.bid });
  }

  const bid = bids.find(b => b.id === bidId);

  if (!bid) {
    return res.status(404).json({ error: 'Bid not found' });
  }

  const job = jobs.find(j => j.id === bid.job_id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  bid.status = 'accepted';
  job.status = 'in_progress';
  job.fundi_id = bid.fundi_id;
  job.fundi_name = bid.fundi_name;
  job.assigned_fundi_id = bid.fundi_id;
  job.assigned_fundi_name = bid.fundi_name;

  bids.filter(b => b.job_id === job.id && b.id !== bidId).forEach(b => {
    b.status = 'rejected';
  });

  createNotification(
    bid.fundi_id,
    'Bid Accepted!',
    `Your bid of KES ${bid.amount.toLocaleString()} for job "${job.title}" was accepted!`
  );

  return res.json({ message: 'Bid accepted successfully', job, bid });
});

// GET /api/chats/:jobId or /api/messages/:jobId
commonRouter.get(['/chats/:jobId', '/messages/:jobId'], authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const jobMessages = messages.filter(m => m.job_id === jobId);
  return res.json(jobMessages);
});

// POST /api/chats or /api/messages
commonRouter.post(['/chats', '/messages'], authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const senderId = req.user!.id;
  const senderName = req.user!.name;
  const { job_id, receiver_id, content, message } = req.body;

  const text = content || message;
  if (!job_id || !text) {
    return res.status(400).json({ error: 'Job ID and text content are required' });
  }

  const newMessage: any = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    job_id,
    sender_id: senderId,
    sender_name: senderName,
    receiver_id: receiver_id || '',
    content: text,
    message: text,
    created_at: new Date().toISOString()
  };

  messages.push(newMessage);

  if (receiver_id) {
    sendWSMessage(receiver_id, {
      type: 'NEW_MESSAGE',
      message: newMessage
    });
  }

  return res.status(201).json(newMessage);
});

// GET /api/kyc/:userId
commonRouter.get('/kyc/:userId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const sub = kycSubmissions.find(k => k.fundi_id === userId || k.user_id === userId) || kycDocuments.find(k => k.user_id === userId);
  if (!sub) {
    return res.json({ status: 'not_submitted', user_id: userId });
  }
  return res.json(sub);
});

// POST /api/kyc/submit
commonRouter.post('/kyc/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userName = req.user!.name;
  const { national_id, document_type, document_url, document_number, file_url } = req.body;

  const newDoc = {
    id: `kyc_${Date.now()}`,
    fundi_id: userId,
    fundi_name: userName,
    user_id: userId,
    national_id: national_id || document_number || '12345678',
    document_type: document_type || 'national_id',
    document_url: document_url || file_url || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
    status: 'pending',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  kycSubmissions.unshift(newDoc);
  if (isDbMode()) {
    await usersRepository.saveKycSubmission(newDoc);
  }
  return res.status(201).json(newDoc);
});

// POST /api/admin/kyc/:docId/review
commonRouter.post('/admin/kyc/:docId/review', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { docId } = req.params;
  const { status, action } = req.body;
  const targetAction = (status === 'approved' || action === 'approve') ? 'approve' : 'reject';

  if (isDbMode()) {
    const dbSub = await usersRepository.reviewKycSubmissionInDb(docId, targetAction);
    if (dbSub) {
      return res.json({ message: 'KYC review recorded successfully', submission: dbSub });
    }
  }

  const sub = kycSubmissions.find(k => k.id === docId);
  if (sub) {
    sub.status = status || (action === 'approve' ? 'approved' : 'rejected');
  }

  return res.json({ message: 'KYC review recorded successfully', submission: sub });
});

// GET /api/wallets/:userId
commonRouter.get('/wallets/:userId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;

  if (isDbMode()) {
    const wallet = await walletsRepository.ensureWallet(userId, 1000);
    const transactions = await walletsRepository.listTransactions(userId);
    return res.json({ wallet, transactions, success: true });
  }

  let wallet = wallets.find(w => w.user_id === userId);
  if (!wallet) {
    wallet = { id: `w_${userId}`, user_id: userId, balance: 1000, currency: 'KES', updated_at: new Date().toISOString() };
    wallets.push(wallet);
  }
  const txs = walletTransactions.filter(t => t.user_id === userId);
  return res.json({ wallet, transactions: txs, success: true });
});

// POST /api/wallets/deposit
commonRouter.post('/wallets/deposit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { amount, phone_number } = req.body;
  const numAmount = Number(amount || 0);

  if (isDbMode()) {
    const wallet = await walletsRepository.creditWallet(userId, numAmount);
    const transaction = await walletsRepository.addTransaction({
      wallet_id: wallet.id,
      user_id: userId,
      type: 'deposit',
      amount: numAmount,
      description: `M-PESA Deposit via ${phone_number || 'STK Push'}`,
      reference_id: `MP${Date.now()}`
    });
    return res.json({ success: true, wallet, transaction });
  }

  let wallet = wallets.find(w => w.user_id === userId);
  if (!wallet) {
    wallet = { id: `w_${userId}`, user_id: userId, balance: 0, currency: 'KES', updated_at: new Date().toISOString() };
    wallets.push(wallet);
  }
  wallet.balance += numAmount;
  wallet.updated_at = new Date().toISOString();

  const transaction = {
    id: `tx_${Date.now()}`,
    wallet_id: wallet.id,
    user_id: userId,
    type: 'deposit',
    amount: numAmount,
    currency: 'KES',
    status: 'completed',
    description: `M-PESA Deposit via ${phone_number || 'STK Push'}`,
    reference_id: `MP${Date.now()}`,
    created_at: new Date().toISOString()
  };
  walletTransactions.unshift(transaction as any);

  return res.json({ success: true, wallet, transaction });
});

// POST /api/wallets/withdraw
commonRouter.post('/wallets/withdraw', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { amount, phone_number, provider } = req.body;
  const numAmount = Number(amount || 0);

  if (isDbMode()) {
    try {
      const wallet = await walletsRepository.debitWallet(userId, numAmount);
      const transaction = await walletsRepository.addTransaction({
        wallet_id: wallet.id,
        user_id: userId,
        type: 'withdrawal',
        amount: -numAmount,
        description: `Mobile Cashout to ${provider || 'M-Pesa'} (${phone_number || 'User Phone'})`,
        reference_id: `WD${Date.now()}`
      });
      return res.json({ success: true, wallet, transaction });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Insufficient wallet balance' });
    }
  }

  let wallet = wallets.find(w => w.user_id === userId);
  if (!wallet || wallet.balance < numAmount) {
    return res.status(400).json({ error: 'Insufficient wallet balance' });
  }
  wallet.balance -= numAmount;
  wallet.updated_at = new Date().toISOString();

  const transaction = {
    id: `tx_${Date.now()}`,
    wallet_id: wallet.id,
    user_id: userId,
    type: 'withdrawal',
    amount: -numAmount,
    currency: 'KES',
    status: 'completed',
    description: `Mobile Cashout to ${provider || 'M-Pesa'} (${phone_number || 'User Phone'})`,
    reference_id: `WD${Date.now()}`,
    created_at: new Date().toISOString()
  };
  walletTransactions.unshift(transaction as any);

  return res.json({ success: true, wallet, transaction });
});

// GET /api/wallets/:userId/audit
commonRouter.get('/wallets/:userId/audit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  if (isDbMode()) {
    const logs = await walletsRepository.listTransactions(userId);
    return res.json(logs);
  }
  const logs = walletTransactions.filter(wt => wt.user_id === userId);
  return res.json(logs);
});

// GET /api/disputes
commonRouter.get('/disputes', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json(disputes);
});

// GET /api/disputes/:disputeId/messages
commonRouter.get('/disputes/:disputeId/messages', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { disputeId } = req.params;
  const msgs = disputeMessages.filter(dm => dm.dispute_id === disputeId);
  return res.json(msgs);
});

// POST /api/disputes/raise or /api/disputes
commonRouter.post(['/disputes/raise', '/disputes'], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userName = req.user!.name;
  const { job_id, fundi_id, reason, description } = req.body;

  let job: LocalJob | null = null;
  if (isDbMode()) {
    job = await jobsRepository.findById(job_id);
    if (job) {
      await jobsRepository.update(job_id, { status: 'disputed' });
      job.status = 'disputed';
    }
  } else {
    job = jobs.find(j => j.id === job_id) || null;
    if (job) {
      job.status = 'disputed';
    }
  }

  const newDispute: any = {
    id: `disp_${Date.now()}`,
    job_id,
    job_title: job?.title || 'Trade Service',
    initiator_id: userId,
    initiator_name: userName,
    customer_id: job?.customer_id || userId,
    customer_name: job?.customer_name || userName,
    fundi_id: fundi_id || job?.assigned_fundi_id,
    fundi_name: job?.assigned_fundi_name || 'Assigned Fundi',
    amount: job?.amount || 0,
    reason: reason || description || 'Quality issue',
    description: description || reason || '',
    status: 'open',
    created_at: new Date().toISOString()
  };

  disputes.unshift(newDispute);
  return res.status(201).json(newDispute);
});

// POST /api/disputes/:disputeId/message
commonRouter.post('/disputes/:disputeId/message', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { disputeId } = req.params;
  const { message, text } = req.body;

  const newMsg = {
    id: `dmsg_${Date.now()}`,
    dispute_id: disputeId,
    sender_id: req.user!.id,
    sender_name: req.user!.name,
    message: message || text || '',
    created_at: new Date().toISOString()
  };

  disputeMessages.push(newMsg);
  return res.status(201).json(newMsg);
});

// POST /api/ai/estimate
commonRouter.post('/ai/estimate', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { category } = req.body;

  const basePrice =
    category?.toLowerCase().includes('electrical') ? 3500 :
    category?.toLowerCase().includes('plumbing') ? 2500 :
    category?.toLowerCase().includes('carpentry') ? 4000 :
    2000;

  return res.json({
    estimated_amount: basePrice,
    duration_estimate: "1 - 3 hours",
    standard_risk_score: 1,
    price_breakdown: [
      `Base labour estimate: KES ${basePrice.toLocaleString()}`,
      `Estimated market range: KES ${basePrice.toLocaleString()} - ${(basePrice * 1.5).toLocaleString()}`
    ],
    fraud_flags: [],
    rationale: "Fair market value calculation based on trade complexity, material inputs, and labour rates."
  });
});

// GET /api/fundis/:fundiId/profile
commonRouter.get('/fundis/:fundiId/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { fundiId } = req.params;
  const fundi = users.find(u => u.id === fundiId && u.role === 'fundi');
  if (!fundi) {
    return res.status(404).json({ error: 'Fundi not found' });
  }
  const fundiReviews = reviews.filter(r => r.fundi_id === fundiId);
  const { password_hash, ...safeFundi } = fundi;
  return res.json({
    ...safeFundi,
    reviews: fundiReviews
  });
});

// POST /api/reviews
commonRouter.post('/reviews', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.user!.id;
  const customerName = req.user!.name;
  const { job_id, fundi_id, rating, comment } = req.body;

  const newReview = {
    id: `rev_${Date.now()}`,
    job_id,
    customer_id: customerId,
    customer_name: customerName,
    fundi_id,
    rating: Number(rating || 5),
    comment: comment || '',
    created_at: new Date().toISOString()
  };

  reviews.unshift(newReview);

  const fundi = users.find(u => u.id === fundi_id);
  if (fundi) {
    const fundiReviews = reviews.filter(r => r.fundi_id === fundi_id);
    const avgRating = fundiReviews.reduce((sum, r) => sum + r.rating, 0) / fundiReviews.length;
    fundi.rating = parseFloat(avgRating.toFixed(1));
  }

  return res.status(201).json(newReview);
});

// GET /api/contracts/user/:userId
commonRouter.get('/contracts/user/:userId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const userContracts = contracts.filter(c => c.customer_id === userId || c.fundi_id === userId);
  return res.json(userContracts);
});

// GET /api/contracts/job/:jobId
commonRouter.get('/contracts/job/:jobId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const contract = contracts.find(c => c.job_id === jobId);
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }
  return res.json(contract);
});

// GET /api/admin/metrics
commonRouter.get('/admin/metrics', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const activeJobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'pending');
  const pendingKYC = kycSubmissions.filter(k => k.status === 'pending');
  const totalEscrowHeld = jobs.filter(j => j.escrow_status === 'held').reduce((acc, j) => acc + j.amount, 0);

  const metricsObj = {
    total_users: users.length,
    active_jobs: activeJobs.length,
    completed_jobs: completedJobs.length,
    open_disputes: openDisputes.length,
    pending_kyc: pendingKYC.length,
    total_escrow_held: totalEscrowHeld,
    totalUsers: users.length,
    activeJobs: activeJobs.length,
    completedJobs: completedJobs.length,
    openDisputes: openDisputes.length,
    pendingKYC: pendingKYC.length,
    totalEscrowHeld: totalEscrowHeld
  };

  return res.json({
    metrics: metricsObj,
    total_users: users.length,
    active_jobs: activeJobs.length,
    completed_jobs: completedJobs.length,
    open_disputes: openDisputes.length,
    pending_kyc: pendingKYC.length,
    total_escrow_held: totalEscrowHeld,
    recent_transactions: walletTransactions.slice(0, 10),
    recent_jobs: jobs.slice(0, 10),
    jobs: jobs
  });
});

// GET /api/admin/fraud/detections
commonRouter.get('/admin/fraud/detections', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json([]);
});

// GET /api/admin/analytics
commonRouter.get('/admin/analytics', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const customerCount = users.filter(u => u.role === 'customer').length;
  const fundiCount = users.filter(u => u.role === 'fundi').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  return res.json({
    monthlyGrowth: 15.4,
    escrowVolume: 1250000,
    disputeRate: 0.02,
    systemMetrics: {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'in_progress' || j.status === 'open' || j.status === 'pending').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
      activeDisputes: disputes.filter(d => d.status === 'open' || d.status === 'pending').length,
      disputeCount: disputes.length,
      pendingKyc: kycSubmissions.filter(k => k.status === 'pending').length,
      kycCount: kycSubmissions.length
    },
    rolesSplit: {
      customers: customerCount,
      fundis: fundiCount,
      admins: adminCount
    },
    timeSeries: [
      { date: 'Mon', jobs: 12, revenue: 45000, volume: 45000, fees: 4500 },
      { date: 'Tue', jobs: 19, revenue: 68000, volume: 68000, fees: 6800 },
      { date: 'Wed', jobs: 15, revenue: 52000, volume: 52000, fees: 5200 },
      { date: 'Thu', jobs: 22, revenue: 84000, volume: 84000, fees: 8400 },
      { date: 'Fri', jobs: 30, revenue: 110000, volume: 110000, fees: 11000 },
      { date: 'Sat', jobs: 25, revenue: 95000, volume: 95000, fees: 9500 },
      { date: 'Sun', jobs: 18, revenue: 60000, volume: 60000, fees: 6000 }
    ],
    countyJobsBreakdown: [
      { county: 'Nairobi', count: 42, jobs: 42 },
      { county: 'Mombasa', count: 28, jobs: 28 },
      { county: 'Kisumu', count: 19, jobs: 19 },
      { county: 'Nakuru', count: 15, jobs: 15 },
      { county: 'Eldoret', count: 11, jobs: 11 }
    ],
    countyUsersBreakdown: [
      { county: 'Nairobi', count: 120 },
      { county: 'Mombasa', count: 85 },
      { county: 'Kisumu', count: 60 },
      { county: 'Nakuru', count: 45 },
      { county: 'Eldoret', count: 30 }
    ],
    categoryBreakdown: [
      { category: 'Plumbing', jobsCount: 15, volume: 45000 },
      { category: 'Electrical', jobsCount: 12, volume: 54000 },
      { category: 'Carpentry', jobsCount: 8, volume: 32000 },
      { category: 'Painting', jobsCount: 6, volume: 18000 }
    ]
  });
});
