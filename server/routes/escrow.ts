import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware';
import { AuthenticatedRequest, LocalJob } from '../types';
import { jobs } from '../state';
import { EscrowEngine, escrowAccounts, ledgerEntries, settlements, payouts } from '../services/escrowService';
import { DarajaClient, paymentIntents, transactions } from '../services/mpesaService';
import { isDbMode } from '../db';
import * as jobsRepository from '../db/jobsRepository';
import * as escrowRepository from '../db/escrowRepository';
import * as paymentRepository from '../db/paymentRepository';
import { validateBody, stkPushSchema, fundEscrowSchema, releaseEscrowSchema } from '../middleware/validation';
import { logSecurityEvent } from '../services/securityHardening';

export const escrowRouter = Router();

// GET /api/escrow/audit (Independent Double-Entry Ledger Security Review)
escrowRouter.get('/escrow/audit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auditResult = await EscrowEngine.performLedgerAudit();
    logSecurityEvent('LEDGER_INTEGRATION_AUDIT', {
      auditedByUserId: req.user?.id,
      auditedByRole: req.user?.role,
      passed: auditResult.passed,
      discrepancyCount: auditResult.discrepancyCount
    }, req);
    return res.json(auditResult);
  } catch (error: any) {
    return res.status(500).json({ error: 'Ledger audit verification failed: ' + error.message });
  }
});

// POST /api/mpesa/stkpush
escrowRouter.post('/mpesa/stkpush', authenticateToken, validateBody(stkPushSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phoneNumber, amount, jobId } = req.body;
    const userId = req.user!.id;

    if (!phoneNumber || !amount || !jobId) {
      return res.status(400).json({ error: 'PhoneNumber, amount, and jobId are required' });
    }

    let job: LocalJob | null = null;
    if (isDbMode()) {
      job = await jobsRepository.findById(jobId);
    } else {
      job = jobs.find(j => j.id === jobId) || null;
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const stkResult = await DarajaClient.initiateSTKPush({
      phoneNumber,
      amount: Number(amount),
      jobId,
      userId
    });

    await EscrowEngine.fundEscrow({
      jobId,
      customerId: userId,
      fundiId: job.assigned_fundi_id || job.fundi_id,
      amount: Number(amount),
      description: `M-Pesa Escrow Lock for job "${job.title}"`
    });

    return res.json({
      message: 'M-Pesa STK Push triggered successfully',
      checkoutRequestId: stkResult.CheckoutRequestID,
      merchantRequestId: stkResult.MerchantRequestID,
      isSimulated: stkResult.isSimulated
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'M-Pesa STK push failed: ' + error.message });
  }
});

// POST /api/escrow/fund
escrowRouter.post('/escrow/fund', authenticateToken, validateBody(fundEscrowSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId, amount, fundiId } = req.body;
    const userId = req.user!.id;

    if (!jobId || !amount) {
      return res.status(400).json({ error: 'jobId and amount are required' });
    }

    let job: LocalJob | null = null;
    if (isDbMode()) {
      job = await jobsRepository.findById(jobId);
    } else {
      job = jobs.find(j => j.id === jobId) || null;
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const assignedFundi = fundiId || job.assigned_fundi_id || job.fundi_id || 'user_fundi_001';

    const account = await EscrowEngine.fundEscrow({
      jobId,
      customerId: userId,
      fundiId: assignedFundi,
      amount: Number(amount),
      description: `Direct Escrow Lock for job "${job.title}"`
    });

    return res.json({
      message: 'Escrow account funded successfully',
      account
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// POST /api/mpesa/callback
escrowRouter.post('/mpesa/callback', async (req: Request, res: Response) => {
  try {
    const secret = (req.query.secret as string) || (req.headers['x-webhook-secret'] as string);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip;
    const authHeader = req.headers['authorization'];

    const result = await DarajaClient.handleCallback(req.body, clientIp, secret, authHeader);
    if (!result.success && result.message.startsWith('Forbidden')) {
      return res.status(403).json(result);
    }
    return res.json(result);
  } catch (error: any) {
    console.error('Callback error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/escrow/release
escrowRouter.post('/escrow/release', authenticateToken, validateBody(releaseEscrowSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    let escAcc: any = null;
    if (isDbMode()) {
      escAcc = await escrowRepository.findByJobId(jobId);
    } else {
      escAcc = escrowAccounts.find(ea => ea.job_id === jobId);
    }

    if (!escAcc) {
      return res.status(404).json({ error: 'Escrow account not found for this job' });
    }

    const settlement = await EscrowEngine.releaseEscrow(
      escAcc.id,
      `Customer ${req.user!.name} approved work completion for job ${jobId}`
    );

    if (isDbMode()) {
      await jobsRepository.update(jobId, { status: 'released' });
    } else {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        job.status = 'released';
      }
    }

    return res.json({
      message: 'Escrow funds released to tradesperson wallet successfully',
      settlement
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// GET /api/escrow/accounts
escrowRouter.get('/escrow/accounts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (isDbMode()) {
    const dbAccounts = await escrowRepository.listForUser(userId, userRole);
    return res.json(dbAccounts);
  }

  if (userRole === 'admin') {
    return res.json(escrowAccounts);
  }

  const userAccounts = escrowAccounts.filter(
    ea => ea.customer_id === userId || ea.fundi_id === userId
  );

  return res.json(userAccounts);
});

// GET /api/escrow/ledger
escrowRouter.get('/escrow/ledger', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user!.role;
  const userId = req.user!.id;

  if (isDbMode()) {
    const dbLedger = await escrowRepository.listLedgerForUser(userId, userRole);
    return res.json(dbLedger);
  }

  if (userRole === 'admin') {
    return res.json(ledgerEntries);
  }

  const userLedger = ledgerEntries.filter(l => l.user_id === userId);
  return res.json(userLedger);
});

// GET /api/escrow/transactions
escrowRouter.get('/escrow/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (isDbMode()) {
    const intents = await paymentRepository.listIntents();
    const txs = await paymentRepository.listTransactions();
    const dbSettlements = await escrowRepository.listSettlements();
    const dbPayouts = await escrowRepository.listPayouts();
    return res.json({
      intents,
      transactions: txs,
      settlements: dbSettlements,
      payouts: dbPayouts
    });
  }

  return res.json({
    intents: paymentIntents,
    transactions,
    settlements,
    payouts
  });
});
