import { Router, Response } from 'express';
import { 
  authenticateToken, 
  requireCustomer, 
  broadcastWSMessage 
} from '../middleware';
import { AuthenticatedRequest, LocalJob } from '../types';
import { users, jobs, bids, reviews, disputes } from '../state';
import { getDistanceKM, createNotification } from '../utils';
import { isDbMode } from '../db';
import * as jobsRepository from '../db/jobsRepository';

export const customerRouter = Router();

// GET /api/customer/jobs
customerRouter.get('/customer/jobs', authenticateToken, requireCustomer, async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.user!.id;
  if (isDbMode()) {
    const dbJobs = await jobsRepository.listByCustomer(customerId);
    return res.json(dbJobs);
  }
  const myJobs = jobs.filter(j => j.customer_id === customerId);
  return res.json(myJobs);
});

// POST /api/customer/jobs
customerRouter.post('/customer/jobs', authenticateToken, requireCustomer, async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.user!.id;
  const customerName = req.user!.name;
  const { title, category, description, amount, location } = req.body;

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
      location
    });
  } else {
    newJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title,
      category,
      description,
      amount: Number(amount),
      status: 'open',
      customer_id: customerId,
      customer_name: customerName,
      location: location || { lat: -0.0917, lng: 34.7680, address: 'Kisumu, Kenya' },
      bids_count: 0,
      created_at: new Date().toISOString()
    };
    jobs.unshift(newJob);
  }

  broadcastWSMessage({
    type: 'JOB_POSTED',
    job: newJob
  });

  return res.status(201).json(newJob);
});

// GET /api/fundis/search
customerRouter.get('/fundis/search', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { lat, lng, category, maxDistance } = req.query;

  let fundiUsers = users.filter(u => u.role === 'fundi' && u.status === 'active');

  if (category) {
    fundiUsers = fundiUsers.filter(u => u.category?.toLowerCase() === (category as string).toLowerCase());
  }

  const userLat = lat ? parseFloat(lat as string) : -0.0917;
  const userLng = lng ? parseFloat(lng as string) : 34.7680;
  const maxKm = maxDistance ? parseFloat(maxDistance as string) : 50;

  const results = fundiUsers.map(f => {
    const fLat = f.location?.lat ?? -0.0917;
    const fLng = f.location?.lng ?? 34.7680;
    const distance_km = getDistanceKM(userLat, userLng, fLat, fLng);
    const { password_hash, ...safeFundi } = f;
    return {
      ...safeFundi,
      distance_km
    };
  }).filter(f => f.distance_km <= maxKm);

  results.sort((a, b) => a.distance_km - b.distance_km);

  return res.json(results);
});

// POST /api/customer/bids/:bidId/accept
customerRouter.post('/customer/bids/:bidId/accept', authenticateToken, requireCustomer, async (req: AuthenticatedRequest, res: Response) => {
  const { bidId } = req.params;

  if (isDbMode()) {
    const bid = await jobsRepository.getBidById(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }
    const job = await jobsRepository.findById(bid.job_id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.customer_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to accept bids for this job' });
    }

    const result = await jobsRepository.acceptBid(bidId);
    if (!result) {
      return res.status(500).json({ error: 'Failed to accept bid' });
    }

    createNotification(
      bid.fundi_id,
      'Bid Accepted!',
      `Your bid of KES ${bid.amount.toLocaleString()} for job "${job.title}" was accepted!`
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

  if (job.customer_id !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized to accept bids for this job' });
  }

  bid.status = 'accepted';
  job.status = 'in_progress';
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

// POST /api/customer/reviews
customerRouter.post('/customer/reviews', authenticateToken, requireCustomer, (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.user!.id;
  const customerName = req.user!.name;
  const { job_id, fundi_id, rating, comment } = req.body;

  if (!job_id || !fundi_id || !rating) {
    return res.status(400).json({ error: 'Job ID, Fundi ID, and rating are required' });
  }

  const newReview = {
    id: `rev_${Date.now()}`,
    job_id,
    customer_id: customerId,
    customer_name: customerName,
    fundi_id,
    rating: Number(rating),
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

// POST /api/customer/disputes
customerRouter.post('/customer/disputes', authenticateToken, requireCustomer, async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.user!.id;
  const customerName = req.user!.name;
  const { job_id, fundi_id, reason } = req.body;

  if (!job_id || !fundi_id || !reason) {
    return res.status(400).json({ error: 'Job ID, Fundi ID, and reason are required' });
  }

  let job: LocalJob | null = null;
  if (isDbMode()) {
    job = await jobsRepository.findById(job_id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    await jobsRepository.update(job_id, { status: 'disputed' });
    job.status = 'disputed';
  } else {
    job = jobs.find(j => j.id === job_id) || null;
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    job.status = 'disputed';
  }

  const newDispute = {
    id: `disp_${Date.now()}`,
    job_id,
    job_title: job.title,
    customer_id: customerId,
    customer_name: customerName,
    fundi_id,
    fundi_name: job.assigned_fundi_name || 'Fundi',
    amount: job.amount,
    reason,
    status: 'open' as const,
    created_at: new Date().toISOString()
  };

  disputes.unshift(newDispute);

  return res.status(201).json(newDispute);
});
