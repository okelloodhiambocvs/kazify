import { Router, Response } from 'express';
import { 
  authenticateToken, 
  requireFundi, 
  broadcastWSMessage 
} from '../middleware';
import { AuthenticatedRequest, LocalBid, LocalJob } from '../types';
import { users, jobs, bids, kycSubmissions, portfolioItems } from '../state';
import { initEscrowAndContract, createNotification } from '../utils';
import { isDbMode } from '../db';
import * as jobsRepository from '../db/jobsRepository';

export const fundiRouter = Router();

// GET /api/fundi/jobs
fundiRouter.get('/fundi/jobs', authenticateToken, requireFundi, async (req: AuthenticatedRequest, res: Response) => {
  const fundiUser = users.find(u => u.id === req.user!.id);
  if (isDbMode()) {
    const dbJobs = await jobsRepository.listAvailableForFundi({ category: fundiUser?.category });
    return res.json(dbJobs);
  }

  const openJobs = jobs.filter(j => j.status === 'open');

  if (fundiUser && fundiUser.category) {
    const relevantJobs = openJobs.filter(j => j.category.toLowerCase() === fundiUser.category?.toLowerCase());
    const otherJobs = openJobs.filter(j => j.category.toLowerCase() !== fundiUser.category?.toLowerCase());
    return res.json([...relevantJobs, ...otherJobs]);
  }

  return res.json(openJobs);
});

// POST /api/fundi/bids
fundiRouter.post('/fundi/bids', authenticateToken, requireFundi, async (req: AuthenticatedRequest, res: Response) => {
  const fundiId = req.user!.id;
  const fundiName = req.user!.name;
  const { job_id, amount, proposal } = req.body;

  if (!job_id || !amount || !proposal) {
    return res.status(400).json({ error: 'Job ID, amount, and proposal are required' });
  }

  if (isDbMode()) {
    const job = await jobsRepository.findById(job_id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.status !== 'open' && job.status !== 'matching' && job.status !== 'pending') {
      return res.status(400).json({ error: 'Job is no longer open for bidding' });
    }

    const existingBids = await jobsRepository.getBidsForJob(job_id);
    if (existingBids.some(b => b.fundi_id === fundiId)) {
      return res.status(400).json({ error: 'You have already submitted a bid for this job' });
    }

    const newBid = await jobsRepository.addBid({
      job_id,
      fundi_id: fundiId,
      amount: Number(amount),
      proposal
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

  if (job.status !== 'open') {
    return res.status(400).json({ error: 'Job is no longer open for bidding' });
  }

  const existingBid = bids.find(b => b.job_id === job_id && b.fundi_id === fundiId);
  if (existingBid) {
    return res.status(400).json({ error: 'You have already submitted a bid for this job' });
  }

  const newBid: LocalBid = {
    id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    job_id,
    fundi_id: fundiId,
    fundi_name: fundiName,
    amount: Number(amount),
    proposal,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  bids.unshift(newBid);
  job.bids_count = (job.bids_count || 0) + 1;

  createNotification(
    job.customer_id,
    'New Bid Received!',
    `${fundiName} placed a bid of KES ${Number(amount).toLocaleString()} on your job "${job.title}"`
  );

  return res.status(201).json(newBid);
});

// GET /api/fundi/my-bids
fundiRouter.get('/fundi/my-bids', authenticateToken, requireFundi, async (req: AuthenticatedRequest, res: Response) => {
  const fundiId = req.user!.id;
  if (isDbMode()) {
    const dbBids = await jobsRepository.getBidsForFundi(fundiId);
    return res.json(dbBids);
  }
  const myBids = bids.filter(b => b.fundi_id === fundiId);
  return res.json(myBids);
});

// POST /api/fundi/jobs/:jobId/complete
fundiRouter.post('/fundi/jobs/:jobId/complete', authenticateToken, requireFundi, async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;

  if (isDbMode()) {
    const job = await jobsRepository.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.assigned_fundi_id !== req.user!.id && job.fundi_id !== req.user!.id) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    const updatedJob = await jobsRepository.update(jobId, { status: 'completed' });
    initEscrowAndContract(updatedJob || job, req.user!.id);

    createNotification(
      job.customer_id,
      'Job Completed!',
      `${req.user!.name} marked the job "${job.title}" as completed. Please review and release funds from escrow.`
    );

    broadcastWSMessage({
      type: 'JOB_COMPLETED',
      job: updatedJob || job
    });

    return res.json({ message: 'Job marked as completed successfully', job: updatedJob || job });
  }

  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.assigned_fundi_id !== req.user!.id) {
    return res.status(403).json({ error: 'You are not assigned to this job' });
  }

  job.status = 'completed';

  initEscrowAndContract(job, req.user!.id);

  createNotification(
    job.customer_id,
    'Job Completed!',
    `${req.user!.name} marked the job "${job.title}" as completed. Please review and release funds from escrow.`
  );

  broadcastWSMessage({
    type: 'JOB_COMPLETED',
    job
  });

  return res.json({ message: 'Job marked as completed successfully', job });
});

// POST /api/fundi/kyc
fundiRouter.post('/fundi/kyc', authenticateToken, requireFundi, (req: AuthenticatedRequest, res: Response) => {
  const fundiId = req.user!.id;
  const fundiName = req.user!.name;
  const { national_id, document_type, document_url } = req.body;

  if (!national_id || !document_type) {
    return res.status(400).json({ error: 'National ID and Document Type are required' });
  }

  const submission = {
    id: `kyc_${Date.now()}`,
    fundi_id: fundiId,
    fundi_name: fundiName,
    national_id,
    document_type,
    document_url: document_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    status: 'pending' as const,
    submitted_at: new Date().toISOString()
  };

  kycSubmissions.unshift(submission);

  return res.status(201).json({ message: 'KYC documents submitted for review', submission });
});

// POST /api/fundi/portfolio
fundiRouter.post('/fundi/portfolio', authenticateToken, requireFundi, (req: AuthenticatedRequest, res: Response) => {
  const fundiId = req.user!.id;
  const { title, description, image_url, category } = req.body;

  if (!title || !description || !image_url) {
    return res.status(400).json({ error: 'Title, description, and image URL are required' });
  }

  const newItem = {
    id: `port_${Date.now()}`,
    fundi_id: fundiId,
    title,
    description,
    image_url,
    category: category || 'General Work',
    created_at: new Date().toISOString()
  };

  portfolioItems.unshift(newItem);

  return res.status(201).json(newItem);
});
