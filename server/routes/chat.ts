import { Router, Response } from 'express';
import { authenticateToken, sendWSMessage } from '../middleware';
import { AuthenticatedRequest, LocalChatMessage } from '../types';
import { messages, contracts, jobs } from '../state';

export const chatRouter = Router();

// GET /api/messages/:jobId
chatRouter.get('/messages/:jobId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const jobMessages = messages.filter(m => m.job_id === jobId);
  return res.json(jobMessages);
});

// POST /api/messages
chatRouter.post('/messages', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const senderId = req.user!.id;
  const senderName = req.user!.name;
  const { job_id, receiver_id, content } = req.body;

  if (!job_id || !receiver_id || !content) {
    return res.status(400).json({ error: 'Job ID, Receiver ID, and content are required' });
  }

  const newMessage: any = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    job_id,
    sender_id: senderId,
    sender_name: senderName,
    receiver_id,
    content,
    created_at: new Date().toISOString()
  };

  messages.push(newMessage);

  sendWSMessage(receiver_id, {
    type: 'NEW_MESSAGE',
    message: newMessage
  });

  return res.status(201).json(newMessage);
});

// GET /api/contracts/:jobId
chatRouter.get('/contracts/:jobId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const contract = contracts.find(c => c.job_id === jobId);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found for this job' });
  }

  return res.json(contract);
});

// POST /api/contracts/:contractId/sign
chatRouter.post('/contracts/:contractId/sign', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { contractId } = req.params;
  const userId = req.user!.id;

  const contract = contracts.find(c => c.id === contractId);
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  if (contract.customer_id === userId) {
    contract.customer_signed = true;
    contract.customer_signed_at = new Date().toISOString();
  } else if (contract.fundi_id === userId) {
    contract.fundi_signed = true;
    contract.fundi_signed_at = new Date().toISOString();
  } else {
    return res.status(403).json({ error: 'You are not a party to this contract' });
  }

  if (contract.customer_signed && contract.fundi_signed) {
    contract.status = 'active';
  }

  return res.json({ message: 'Contract signed successfully', contract });
});
