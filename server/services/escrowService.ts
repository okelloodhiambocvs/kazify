import crypto from 'crypto';
import { isDbMode } from '../db';
import * as escrowRepository from '../db/escrowRepository';
import * as walletsRepository from '../db/walletsRepository';
import { wallets, walletTransactions } from '../state';

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
  ledger_group_id: string;
  escrow_account_id?: string;
  milestone_id?: string;
  user_id?: string;
  amount: number;
  direction: 'debit' | 'credit';
  ledger_account: 'user_wallet' | 'escrow_liability' | 'escrow_held' | 'platform_earnings' | 'payout_clearing';
  description: string;
  reference_id?: string;
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

export let escrowAccounts: EscrowAccount[] = [];
export let escrowMilestones: EscrowMilestone[] = [];
export let ledgerEntries: LedgerEntry[] = [];
export let settlements: Settlement[] = [];
export let payouts: Payout[] = [];

const COMMISSION_RATE = 0.10;

export class EscrowEngine {
  public static async recordLedgerTransaction(entries: Omit<LedgerEntry, 'id' | 'created_at'>[]): Promise<string> {
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

    if (Math.abs(debitSum - creditSum) > 0.01) {
      throw new Error(`[LEDGER RECONCILIATION EXCEPTION] Ledger transaction is unbalanced! Debits (KES ${debitSum}) must match Credits (KES ${creditSum}).`);
    }

    if (isDbMode()) {
      for (const entry of validatedEntries) {
        await escrowRepository.saveLedgerEntry(entry);
      }
    } else {
      validatedEntries.forEach(entry => ledgerEntries.unshift(entry));
    }
    console.log(`[LEDGER SUCCESS] Double-entry ledger group recorded: ${groupId}. Assets reconciled.`);
    return groupId;
  }

  public static async performLedgerAudit(): Promise<{
    passed: boolean;
    totalGroupsAudited: number;
    totalEntriesAudited: number;
    totalDebits: number;
    totalCredits: number;
    discrepancyCount: number;
    discrepancies: string[];
    ledgerAccountBalances: Record<string, number>;
    auditTimestamp: string;
  }> {
    let allEntries: LedgerEntry[] = [];
    if (isDbMode()) {
      allEntries = await escrowRepository.listAllLedgerEntries();
    } else {
      allEntries = [...ledgerEntries];
    }

    const groups = new Map<string, { debits: number; credits: number; entriesCount: number }>();
    const accountBalances: Record<string, number> = {
      user_wallet: 0,
      escrow_liability: 0,
      escrow_held: 0,
      platform_earnings: 0,
      payout_clearing: 0
    };

    let totalDebits = 0;
    let totalCredits = 0;
    const discrepancies: string[] = [];

    for (const entry of allEntries) {
      if (entry.direction === 'debit') {
        totalDebits += entry.amount;
        accountBalances[entry.ledger_account] = (accountBalances[entry.ledger_account] || 0) + entry.amount;
      } else {
        totalCredits += entry.amount;
        accountBalances[entry.ledger_account] = (accountBalances[entry.ledger_account] || 0) - entry.amount;
      }

      const gId = entry.ledger_group_id || 'ORPHANED_GROUP';
      if (!groups.has(gId)) {
        groups.set(gId, { debits: 0, credits: 0, entriesCount: 0 });
      }
      const gStats = groups.get(gId)!;
      gStats.entriesCount += 1;
      if (entry.direction === 'debit') {
        gStats.debits += entry.amount;
      } else {
        gStats.credits += entry.amount;
      }
    }

    for (const [gId, stats] of groups.entries()) {
      if (Math.abs(stats.debits - stats.credits) > 0.01) {
        discrepancies.push(`Group ${gId} is unbalanced: Debits=${stats.debits}, Credits=${stats.credits}`);
      }
    }

    const passed = discrepancies.length === 0 && Math.abs(totalDebits - totalCredits) <= 0.01;

    console.log(`[DOUBLE-ENTRY LEDGER AUDIT COMPLETE] Passed: ${passed}, Total Debits: ${totalDebits}, Total Credits: ${totalCredits}, Discrepancies: ${discrepancies.length}`);

    return {
      passed,
      totalGroupsAudited: groups.size,
      totalEntriesAudited: allEntries.length,
      totalDebits,
      totalCredits,
      discrepancyCount: discrepancies.length,
      discrepancies,
      ledgerAccountBalances: accountBalances,
      auditTimestamp: new Date().toISOString()
    };
  }

  public static async fundEscrow(params: {
    jobId: string;
    customerId: string;
    fundiId?: string;
    amount: number;
    description: string;
  }): Promise<EscrowAccount> {
    const commission = Math.round(params.amount * COMMISSION_RATE);
    const payoutAmount = params.amount - commission;

    let escAcc: EscrowAccount | null = null;
    if (isDbMode()) {
      escAcc = await escrowRepository.findByJobId(params.jobId);
      if (!escAcc) {
        escAcc = await escrowRepository.saveEscrowAccount({
          id: crypto.randomUUID(),
          job_id: params.jobId,
          customer_id: params.customerId,
          fundi_id: params.fundiId,
          amount: params.amount,
          commission_fee: commission,
          payout_amount: payoutAmount,
          status: 'held'
        });
      } else {
        escAcc = await escrowRepository.saveEscrowAccount({
          id: escAcc.id,
          job_id: params.jobId,
          customer_id: params.customerId,
          fundi_id: params.fundiId || escAcc.fundi_id,
          amount: params.amount,
          commission_fee: commission,
          payout_amount: payoutAmount,
          status: 'held'
        });
      }
    } else {
      escAcc = escrowAccounts.find(ea => ea.job_id === params.jobId) || null;
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
    }

    await this.recordLedgerTransaction([
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

    escAcc.amount += params.amount;
    escAcc.commission_fee += milestoneComm;
    escAcc.payout_amount += milestonePayout;

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

  public static async releaseEscrow(escrowAccountId: string, description: string): Promise<Settlement> {
    let escAcc: EscrowAccount | null = null;
    if (isDbMode()) {
      escAcc = await escrowRepository.findById(escrowAccountId);
    } else {
      escAcc = escrowAccounts.find(ea => ea.id === escrowAccountId) || null;
    }

    if (!escAcc) {
      throw new Error('Escrow account not found.');
    }
    if (escAcc.status !== 'held' && escAcc.status !== 'disputed') {
      throw new Error(`Escrow cannot be released. Current status is ${escAcc.status}`);
    }

    if (!escAcc.fundi_id) {
      throw new Error('Cannot release escrow: No tradesperson is registered for this job.');
    }

    if (isDbMode()) {
      escAcc = await escrowRepository.saveEscrowAccount({
        id: escAcc.id,
        status: 'released'
      });
    } else {
      escAcc.status = 'released';
      escAcc.updated_at = new Date().toISOString();
    }

    const gross = escAcc.amount;
    const commission = escAcc.commission_fee;
    const net = escAcc.payout_amount;

    let settlement: Settlement;
    if (isDbMode()) {
      settlement = await escrowRepository.saveSettlement({
        escrow_account_id: escAcc.id,
        job_id: escAcc.job_id,
        fundi_id: escAcc.fundi_id,
        amount_gross: gross,
        platform_fee: commission,
        amount_net: net,
        status: 'settled'
      });
    } else {
      settlement = {
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
    }

    await this.recordLedgerTransaction([
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

    await this.createPayout({
      settlementId: settlement.id,
      userId: escAcc.fundi_id,
      amount: net,
      destination: 'M-Pesa registered line'
    });

    return settlement;
  }

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

    const commission = Math.round(partialAmount * COMMISSION_RATE);
    const net = partialAmount - commission;

    escAcc.amount -= partialAmount;
    escAcc.commission_fee -= commission;
    escAcc.payout_amount -= net;

    if (escAcc.amount < 0.01) {
      escAcc.status = 'released';
    } else {
      escAcc.status = 'held';
    }
    escAcc.updated_at = new Date().toISOString();

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

    this.createPayout({
      settlementId: settlement.id,
      userId: escAcc.fundi_id,
      amount: net,
      destination: 'M-Pesa line'
    });

    return settlement;
  }

  public static releaseMilestone(milestoneId: string, description: string): Settlement {
    const milestone = escrowMilestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Escrow milestone not found.');
    }
    if (milestone.status !== 'funded') {
      throw new Error(`Milestone release denied. Status is ${milestone.status}`);
    }

    const escAcc = escrowAccounts.find(ea => ea.id === milestone.escrow_account_id);
    if (!escAcc || !escAcc.fundi_id) {
      throw new Error('Valid master escrow account or tradesperson details missing.');
    }

    milestone.status = 'released';
    milestone.updated_at = new Date().toISOString();

    escAcc.amount -= milestone.amount;
    escAcc.commission_fee -= milestone.commission_fee;
    escAcc.payout_amount -= milestone.payout_amount;

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

    if (params.refundToCustomerAmount > 0) {
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

    if (params.payoutToFundiAmount > 0) {
      if (!escAcc.fundi_id) {
        throw new Error('No tradesperson registered to dispatch payout.');
      }

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

  private static async createPayout(params: {
    settlementId: string;
    userId: string;
    amount: number;
    destination: string;
  }): Promise<Payout> {
    let payout: Payout;
    if (isDbMode()) {
      payout = await escrowRepository.savePayout({
        id: crypto.randomUUID(),
        settlement_id: params.settlementId,
        user_id: params.userId,
        amount: params.amount,
        payout_method: 'mpesa',
        payout_destination: params.destination,
        status: 'pending'
      });
    } else {
      payout = {
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
    }

    this.triggerPhysicalPayoutDisbursement(payout);
    return payout;
  }

  private static triggerPhysicalPayoutDisbursement(payout: Payout) {
    payout.status = 'processing';
    payout.updated_at = new Date().toISOString();
    if (isDbMode()) {
      escrowRepository.updatePayout(payout.id, { status: 'processing' }).catch(console.error);
    }

    console.log(`[DISBURSEMENT DAEMON] Initiating B2C M-Pesa payout KES ${payout.amount} for user ${payout.user_id}...`);
    
    setTimeout(async () => {
      payout.status = 'succeeded';
      payout.transaction_reference = `B2C_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      payout.updated_at = new Date().toISOString();

      if (isDbMode()) {
        await escrowRepository.updatePayout(payout.id, {
          status: 'succeeded',
          transaction_reference: payout.transaction_reference
        });
        await walletsRepository.creditWallet(payout.user_id, payout.amount);
        await walletsRepository.addTransaction({
          user_id: payout.user_id,
          amount: payout.amount,
          type: 'escrow_release',
          description: `Crediting cleared KAZIFY wallet balance for payout ${payout.id}`,
          reference_id: payout.settlement_id
        });
      } else {
        const userWallet = wallets.find(w => w.user_id === payout.user_id);
        if (userWallet) {
          userWallet.balance += payout.amount;
          userWallet.updated_at = new Date().toISOString();
        }
        walletTransactions.unshift({
          id: `tx_${Date.now()}`,
          wallet_id: userWallet?.id || 'w_default',
          user_id: payout.user_id,
          amount: payout.amount,
          type: 'escrow_release',
          description: `Crediting cleared KAZIFY wallet balance for payout ${payout.id}`,
          reference_id: payout.settlement_id,
          created_at: new Date().toISOString()
        });
      }

      await this.recordLedgerTransaction([
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
