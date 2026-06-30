import crypto from 'crypto';

// --- SERVICE TYPES ---

export interface EscrowAccount {
  id: string;
  job_id: string;
  customer_id: string;
  fundi_id?: string;
  amount: number;
  commission_fee: number;
  payout_amount: number;
  status: 'unpaid' | 'held' | 'released' | 'refunded' | 'disputed';
  milestones_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EscrowMilestone {
  id: string;
  escrow_account_id: string;
  title: string;
  amount: number;
  commission_fee: number;
  payout_amount: number;
  status: 'pending' | 'funded' | 'released' | 'disputed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  ledger_group_id: string; // Ties Debit and Credit legs together
  escrow_account_id?: string;
  milestone_id?: string;
  user_id?: string;
  amount: number; // Absolute value of ledger leg entry
  direction: 'debit' | 'credit';
  ledger_account: 'user_wallet' | 'escrow_liability' | 'escrow_held' | 'platform_earnings' | 'payout_clearing';
  description: string;
  reference_id?: string; // e.g. job_id, dispute_id, checkout_id, contract_id
  created_at: string;
}

export interface Settlement {
  id: string;
  escrow_account_id: string;
  milestone_id?: string;
  job_id: string;
  fundi_id: string;
  amount_gross: number;
  platform_fee: number;
  amount_net: number;
  status: 'pending' | 'settled' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  settlement_id: string;
  user_id: string;
  amount: number;
  payout_method: 'mpesa' | 'bank';
  payout_destination: string;
  transaction_reference?: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// In-Memory Collections mirroring persistent PostgreSQL tables
export let escrowAccounts: EscrowAccount[] = [];
export let escrowMilestones: EscrowMilestone[] = [];
export let ledgerEntries: LedgerEntry[] = [];
export let settlements: Settlement[] = [];
export let payouts: Payout[] = [];

// Static platform config
const COMMISSION_RATE = 0.10; // 10% platform commission fee

/**
 * TRUE DOUBLE-ENTRY LEDGER & MARKETPLACE ESCROW SYSTEM
 */
export class EscrowEngine {

  /**
   * Helper: Record balanced debit and credit entries representing a transaction
   */
  public static recordLedgerTransaction(entries: Omit<LedgerEntry, 'id' | 'created_at'>[]): string {
    const groupId = crypto.randomUUID();
    let debitSum = 0;
    let creditSum = 0;

    const validatedEntries: LedgerEntry[] = entries.map(entry => {
      if (entry.direction === 'debit') {
        debitSum += entry.amount;
      } else {
        creditSum += entry.amount;
      }

      return {
        id: crypto.randomUUID(),
        ledger_group_id: groupId,
        ...entry,
        created_at: new Date().toISOString()
      };
    });

    // Enforce strict mathematical double-entry validation (Debits MUST equal Credits)
    if (Math.abs(debitSum - creditSum) > 0.01) {
      throw new Error(`[LEDGER RECONCILIATION EXCEPTION] Ledger transaction is unbalanced! Debits (KES ${debitSum}) must match Credits (KES ${creditSum}).`);
    }

    validatedEntries.forEach(entry => ledgerEntries.unshift(entry));
    console.log(`[LEDGER SUCCESS] Double-entry ledger group recorded: ${groupId}. Assets reconciled.`);
    return groupId;
  }

  /**
   * INITIATE AND SECURE ESCROW ACCOUNTS (Job level or full amount hold)
   */
  public static fundEscrow(params: {
    jobId: string;
    customerId: string;
    fundiId?: string;
    amount: number;
    description: string;
  }): EscrowAccount {
    // Check if account already exists
    let escAcc = escrowAccounts.find(ea => ea.job_id === params.jobId);
    
    const commission = Math.round(params.amount * COMMISSION_RATE);
    const payoutAmount = params.amount - commission;

    if (!escAcc) {
      escAcc = {
        id: `escrow_${crypto.randomBytes(6).toString('hex')}`,
        job_id: params.jobId,
        customer_id: params.customerId,
        fundi_id: params.fundiId,
        amount: params.amount,
        commission_fee: commission,
        payout_amount: payoutAmount,
        status: 'held',
        milestones_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      escrowAccounts.push(escAcc);
    } else {
      escAcc.status = 'held';
      escAcc.amount = params.amount;
      escAcc.commission_fee = commission;
      escAcc.payout_amount = payoutAmount;
      escAcc.fundi_id = params.fundiId;
      escAcc.updated_at = new Date().toISOString();
    }

    // Double-Entry Balanced Ledger legs:
    // Leg 1: Debit customer's wallet (Customer loses KES liquidity)
    // Leg 2: Credit Escrow held (System holds KES liability)
    this.recordLedgerTransaction([
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        user_id: params.customerId,
        amount: params.amount,
        direction: 'debit',
        ledger_account: 'user_wallet',
        description: `Escrow hold fund deduction: ${params.description}`,
        reference_id: params.jobId
      },
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        user_id: params.customerId,
        amount: params.amount,
        direction: 'credit',
        ledger_account: 'escrow_held',
        description: `Escrow liability credit hold: ${params.description}`,
        reference_id: params.jobId
      }
    ]);

    return escAcc;
  }

  /**
   * MILESTONE FUNDING (For phased projects)
   */
  public static fundMilestone(params: {
    jobId: string;
    customerId: string;
    fundiId: string;
    title: string;
    amount: number;
  }): { escrowAccount: EscrowAccount; milestone: EscrowMilestone } {
    let escAcc = escrowAccounts.find(ea => ea.job_id === params.jobId);

    if (!escAcc) {
      escAcc = {
        id: `escrow_${crypto.randomBytes(6).toString('hex')}`,
        job_id: params.jobId,
        customer_id: params.customerId,
        fundi_id: params.fundiId,
        amount: 0,
        commission_fee: 0,
        payout_amount: 0,
        status: 'held',
        milestones_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      escrowAccounts.push(escAcc);
    } else {
      escAcc.milestones_enabled = true;
      escAcc.status = 'held';
      escAcc.updated_at = new Date().toISOString();
    }

    // Calculate milestone specific commissions
    const milestoneComm = Math.round(params.amount * COMMISSION_RATE);
    const milestonePayout = params.amount - milestoneComm;

    const milestone: EscrowMilestone = {
      id: `milestone_${crypto.randomBytes(6).toString('hex')}`,
      escrow_account_id: escAcc.id,
      title: params.title,
      amount: params.amount,
      commission_fee: milestoneComm,
      payout_amount: milestonePayout,
      status: 'funded',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    escrowMilestones.push(milestone);

    // Update aggregate account amounts
    escAcc.amount += params.amount;
    escAcc.commission_fee += milestoneComm;
    escAcc.payout_amount += milestonePayout;

    // Record ledger transition for the funded milestone
    this.recordLedgerTransaction([
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        milestone_id: milestone.id,
        user_id: params.customerId,
        amount: params.amount,
        direction: 'debit',
        ledger_account: 'user_wallet',
        description: `Milestone "${params.title}" funded debit deduction`,
        reference_id: params.jobId
      },
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        milestone_id: milestone.id,
        user_id: params.customerId,
        amount: params.amount,
        direction: 'credit',
        ledger_account: 'escrow_held',
        description: `Milestone "${params.title}" funded escrow hold credit`,
        reference_id: params.jobId
      }
    ]);

    return { escrowAccount: escAcc, milestone };
  }

  /**
   * SETTLEMENT & PAYOUT DISBURSEMENT ENGINE
   * Implements complete release logic splitting into fundi payout and platform commission
   */
  public static releaseEscrow(escrowAccountId: string, description: string): Settlement {
    const escAcc = escrowAccounts.find(ea => ea.id === escrowAccountId);
    if (!escAcc) {
      throw new Error('Escrow account not found.');
    }
    if (escAcc.status !== 'held' && escAcc.status !== 'disputed') {
      throw new Error(`Escrow cannot be released. Current status is ${escAcc.status}`);
    }

    if (!escAcc.fundi_id) {
      throw new Error('Cannot release escrow: No tradesperson is registered for this job.');
    }

    escAcc.status = 'released';
    escAcc.updated_at = new Date().toISOString();

    const gross = escAcc.amount;
    const commission = escAcc.commission_fee;
    const net = escAcc.payout_amount;

    // Create Settlement Registry Entry
    const settlement: Settlement = {
      id: `set_${crypto.randomBytes(6).toString('hex')}`,
      escrow_account_id: escAcc.id,
      job_id: escAcc.job_id,
      fundi_id: escAcc.fundi_id,
      amount_gross: gross,
      platform_fee: commission,
      amount_net: net,
      status: 'settled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    settlements.push(settlement);

    // Ledger Double Entry representation:
    // Debit Escrow held (KES -gross)
    // Credit platform_earnings (KES commission)
    // Credit payout_clearing (KES net)
    this.recordLedgerTransaction([
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        amount: gross,
        direction: 'debit',
        ledger_account: 'escrow_held',
        description: `Releasing main escrow liability: ${description}`,
        reference_id: escAcc.job_id
      },
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        amount: commission,
        direction: 'credit',
        ledger_account: 'platform_earnings',
        description: `Platform 10% commission fee earnings`,
        reference_id: escAcc.job_id
      },
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        user_id: escAcc.fundi_id,
        amount: net,
        direction: 'credit',
        ledger_account: 'payout_clearing',
        description: `Disbursement clearing for tradesperson net payout`,
        reference_id: escAcc.job_id
      }
    ]);

    // Generate physical payout trigger
    this.createPayout({
      settlementId: settlement.id,
      userId: escAcc.fundi_id,
      amount: net,
      destination: 'M-Pesa registered line'
    });

    return settlement;
  }

  /**
   * PARTIAL RELEASE WORKFLOW
   * Allows clients or dispute arbiters to release portions of the escrowed funds
   */
  public static releasePartialEscrow(
    escrowAccountId: string, 
    partialAmount: number, 
    description: string
  ): Settlement {
    const escAcc = escrowAccounts.find(ea => ea.id === escrowAccountId);
    if (!escAcc) {
      throw new Error('Escrow account not found.');
    }
    if (escAcc.status !== 'held' && escAcc.status !== 'disputed') {
      throw new Error(`Escrow partial release denied: Status is ${escAcc.status}`);
    }
    if (partialAmount <= 0 || partialAmount > escAcc.amount) {
      throw new Error(`Invalid partial release amount KES ${partialAmount}. Limit KES ${escAcc.amount}`);
    }

    if (!escAcc.fundi_id) {
      throw new Error('No fundi registered for escrow payout.');
    }

    // Determine proportions
    const commission = Math.round(partialAmount * COMMISSION_RATE);
    const net = partialAmount - commission;

    // Deduct from overall escrow held balance
    escAcc.amount -= partialAmount;
    escAcc.commission_fee -= commission;
    escAcc.payout_amount -= net;

    if (escAcc.amount < 0.01) {
      escAcc.status = 'released';
    } else {
      escAcc.status = 'held'; // Remainder still locked
    }
    escAcc.updated_at = new Date().toISOString();

    // Log Settlement
    const settlement: Settlement = {
      id: `set_${crypto.randomBytes(6).toString('hex')}`,
      escrow_account_id: escAcc.id,
      job_id: escAcc.job_id,
      fundi_id: escAcc.fundi_id,
      amount_gross: partialAmount,
      platform_fee: commission,
      amount_net: net,
      status: 'settled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    settlements.push(settlement);

    // Double Entry:
    this.recordLedgerTransaction([
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        amount: partialAmount,
        direction: 'debit',
        ledger_account: 'escrow_held',
        description: `Partial release of escrow: ${description}`,
        reference_id: escAcc.job_id
      },
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        amount: commission,
        direction: 'credit',
        ledger_account: 'platform_earnings',
        description: `Commission collected on partial escrow release`,
        reference_id: escAcc.job_id
      },
      {
        ledger_group_id: '',
        escrow_account_id: escAcc.id,
        user_id: escAcc.fundi_id,
        amount: net,
        direction: 'credit',
        ledger_account: 'payout_clearing',
        description: `Disbursement payout clearing for partial release`,
        reference_id: escAcc.job_id
      }
    ]);

    // Create payout
    this.createPayout({
      settlementId: settlement.id,
      userId: escAcc.fundi_id,
      amount: net,
      destination: 'M-Pesa line'
    });

    return settlement;
  }

  /**
   * MILESTONE RELEASE WORKFLOW
   */
  public static releaseMilestone(
  milestoneId: string,
  description: string
): Settlement {
  const milestone = escrowMilestones.find(
    m => m.id === milestoneId
  );

  if (!milestone) {
    throw new Error('Escrow milestone not found.');
  }

  if (milestone.status !== 'funded') {
    throw new Error(
      `Milestone release denied. Status is ${milestone.status}`
    );
  }

  const escAcc = escrowAccounts.find(
    ea => ea.id === milestone.escrow_account_id
  );

  if (!escAcc || !escAcc.fundi_id) {
    throw new Error(
      'Valid master escrow account or tradesperson details missing.'
    );
  }

  // ------------------------------------------------------------------
  // NEW: Ensure the escrow account still contains sufficient funds
  // before releasing this milestone.
  // ------------------------------------------------------------------
  if (
    milestone.amount > escAcc.amount ||
    milestone.commission_fee > escAcc.commission_fee ||
    milestone.payout_amount > escAcc.payout_amount
  ) {
    throw new Error(
      'Escrow account does not contain sufficient remaining funds for this milestone.'
    );
  }

  milestone.status = 'released';
  milestone.updated_at = new Date().toISOString();

  // Deduct released values from master account totals
  escAcc.amount -= milestone.amount;
  escAcc.commission_fee -= milestone.commission_fee;
  escAcc.payout_amount -= milestone.payout_amount;

  // ------------------------------------------------------------------
  // NEW: Protect against negative balances caused by corruption or
  // unexpected state changes.
  // ------------------------------------------------------------------
  if (
    escAcc.amount < 0 ||
    escAcc.commission_fee < 0 ||
    escAcc.payout_amount < 0
  ) {
    throw new Error(
      'Escrow ledger integrity violation detected.'
    );
  }

  if (escAcc.amount < 0.01) {
    escAcc.status = 'released';
  }

  escAcc.updated_at = new Date().toISOString();

  const settlement: Settlement = {
    id: `set_${crypto.randomBytes(6).toString('hex')}`,
    escrow_account_id: escAcc.id,
    milestone_id: milestone.id,
    job_id: escAcc.job_id,
    fundi_id: escAcc.fundi_id,
    amount_gross: milestone.amount,
    platform_fee: milestone.commission_fee,
    amount_net: milestone.payout_amount,
    status: 'settled',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  settlements.push(settlement);

  // Ledger Double Entry:
  this.recordLedgerTransaction([
    {
      ledger_group_id: '',
      escrow_account_id: escAcc.id,
      milestone_id: milestone.id,
      amount: milestone.amount,
      direction: 'debit',
      ledger_account: 'escrow_held',
      description: `Milestone release debit hold: ${milestone.title}`,
      reference_id: escAcc.job_id
    },
    {
      ledger_group_id: '',
      escrow_account_id: escAcc.id,
      milestone_id: milestone.id,
      amount: milestone.commission_fee,
      direction: 'credit',
      ledger_account: 'platform_earnings',
      description: `Platform fee on released milestone "${milestone.title}"`,
      reference_id: escAcc.job_id
    },
    {
      ledger_group_id: '',
      escrow_account_id: escAcc.id,
      milestone_id: milestone.id,
      user_id: escAcc.fundi_id,
      amount: milestone.payout_amount,
      direction: 'credit',
      ledger_account: 'payout_clearing',
      description: `Milestone payout clearing: ${milestone.title}`,
      reference_id: escAcc.job_id
    }
  ]);

  this.createPayout({
    settlementId: settlement.id,
    userId: escAcc.fundi_id,
    amount: milestone.payout_amount,
    destination: 'M-Pesa line'
  });

  return settlement;
}

  /**
   * ARBITRATED DISPUTE RESOLUTION WORKFLOW
   * Allows resolving disputed escrows with any split ratio (partial refunds and partial payouts)
   */
  public static resolveArbitratedDispute(params: {
    escrowAccountId: string;
    refundToCustomerAmount: number;
    payoutToFundiAmount: number;
    disputeId: string;
    notes: string;
  }): { settlements: Settlement[]; refundReceipt?: any } {
    const escAcc = escrowAccounts.find(ea => ea.id === params.escrowAccountId);
    if (!escAcc) {
      throw new Error('Escrow account not found.');
    }
    if (escAcc.status !== 'disputed' && escAcc.status !== 'held') {
      throw new Error(`Resolution denied. Escrow status is ${escAcc.status}`);
    }

    const totalHeld = escAcc.amount;
    const totalAllocated = params.refundToCustomerAmount + params.payoutToFundiAmount;

    if (Math.abs(totalHeld - totalAllocated) > 1.0) {
      throw new Error(`Dispute allocation mismatch. Sum of refund (KES ${params.refundToCustomerAmount}) and fundi payout (KES ${params.payoutToFundiAmount}) must equal total escrow held (KES ${totalHeld}).`);
    }

    escAcc.status = params.refundToCustomerAmount > 0 && params.payoutToFundiAmount === 0 ? 'refunded' : 'released';
    escAcc.updated_at = new Date().toISOString();

    const resultSettlements: Settlement[] = [];
    let refundReceipt: any = null;

    // Phase A: Process refund split to customer (if any)
    if (params.refundToCustomerAmount > 0) {
      // Return funds directly into user_wallet ledger
      this.recordLedgerTransaction([
        {
          ledger_group_id: '',
          escrow_account_id: escAcc.id,
          amount: params.refundToCustomerAmount,
          direction: 'debit',
          ledger_account: 'escrow_held',
          description: `Dispute arbitrated refund debit from escrow hold`,
          reference_id: params.disputeId
        },
        {
          ledger_group_id: '',
          escrow_account_id: escAcc.id,
          user_id: escAcc.customer_id,
          amount: params.refundToCustomerAmount,
          direction: 'credit',
          ledger_account: 'user_wallet',
          description: `Customer refund credit on arbitrated dispute`,
          reference_id: params.disputeId
        }
      ]);

      refundReceipt = {
        amount: params.refundToCustomerAmount,
        destination_user_id: escAcc.customer_id,
        timestamp: new Date().toISOString()
      };
    }

    // Phase B: Process payout to tradesperson (if any)
    if (params.payoutToFundiAmount > 0) {
      if (!escAcc.fundi_id) {
        throw new Error('No tradesperson registered to dispatch payout.');
      }

      // Proportional commission fee calculation
      const commFee = Math.round(params.payoutToFundiAmount * COMMISSION_RATE);
      const netPayout = params.payoutToFundiAmount - commFee;

      const settlement: Settlement = {
        id: `set_${crypto.randomBytes(6).toString('hex')}`,
        escrow_account_id: escAcc.id,
        job_id: escAcc.job_id,
        fundi_id: escAcc.fundi_id,
        amount_gross: params.payoutToFundiAmount,
        platform_fee: commFee,
        amount_net: netPayout,
        status: 'settled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      settlements.push(settlement);
      resultSettlements.push(settlement);

      // Ledger double entry for fundi split
      this.recordLedgerTransaction([
        {
          ledger_group_id: '',
          escrow_account_id: escAcc.id,
          amount: params.payoutToFundiAmount,
          direction: 'debit',
          ledger_account: 'escrow_held',
          description: `Dispute arbitrated payout debit from escrow hold`,
          reference_id: params.disputeId
        },
        {
          ledger_group_id: '',
          escrow_account_id: escAcc.id,
          amount: commFee,
          direction: 'credit',
          ledger_account: 'platform_earnings',
          description: `Arbitrated platform commission fee collected`,
          reference_id: params.disputeId
        },
        {
          ledger_group_id: '',
          escrow_account_id: escAcc.id,
          user_id: escAcc.fundi_id,
          amount: netPayout,
          direction: 'credit',
          ledger_account: 'payout_clearing',
          description: `Arbitrated payout disbursement clearing`,
          reference_id: params.disputeId
        }
      ]);

      this.createPayout({
        settlementId: settlement.id,
        userId: escAcc.fundi_id,
        amount: netPayout,
        destination: 'M-Pesa line'
      });
    }

    return { settlements: resultSettlements, refundReceipt };
  }

  /**
   * PAYOUT DISBURSEMENT ENGINES
   */
  private static createPayout(params: {
    settlementId: string;
    userId: string;
    amount: number;
    destination: string;
  }): Payout {
    const payout: Payout = {
      id: `payout_${crypto.randomBytes(6).toString('hex')}`,
      settlement_id: params.settlementId,
      user_id: params.userId,
      amount: params.amount,
      payout_method: 'mpesa',
      payout_destination: params.destination,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    payouts.unshift(payout);

    // Auto-process payout simulation for testing convenience
    this.triggerPhysicalPayoutDisbursement(payout);

    return payout;
  }

  /**
   * Trigger Simulated Safaricom M-Pesa B2C payout call
   */
  private static triggerPhysicalPayoutDisbursement(payout: Payout) {
    payout.status = 'processing';
    payout.updated_at = new Date().toISOString();

    console.log(`[DISBURSEMENT DAEMON] Initiating B2C M-Pesa payout KES ${payout.amount} for user ${payout.user_id}...`);
    
    setTimeout(() => {
      payout.status = 'succeeded';
      payout.transaction_reference = `B2C_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      payout.updated_at = new Date().toISOString();

      // Finalize double-entry leg: move from payout_clearing to actual wallet balance
      this.recordLedgerTransaction([
        {
          ledger_group_id: '',
          user_id: payout.user_id,
          amount: payout.amount,
          direction: 'debit',
          ledger_account: 'payout_clearing',
          description: `Discharging payout clearing leg to tradesperson wallet`,
          reference_id: payout.settlement_id
        },
        {
          ledger_group_id: '',
          user_id: payout.user_id,
          amount: payout.amount,
          direction: 'credit',
          ledger_account: 'user_wallet',
          description: `Crediting cleared KAZIFY wallet balance`,
          reference_id: payout.settlement_id
        }
      ]);

      // Emit global notification hooks
      if (global.onPayoutSettledSuccessfully) {
        global.onPayoutSettledSuccessfully(payout);
      }

      console.log(`[DISBURSEMENT SUCCESS] Payout ${payout.id} settled with reference ${payout.transaction_reference}`);
    }, 3000);
  }
}

declare global {
  var onPayoutSettledSuccessfully: ((payout: Payout) => void) | undefined;
}
