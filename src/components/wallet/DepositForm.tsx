import React from 'react';
import { Send, CheckCircle, Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import { AuditResult } from '../../hooks/wallet/useWallet';

interface DepositFormProps {
  activeTab: 'deposit' | 'withdraw' | 'audit';
  setActiveTab: (tab: 'deposit' | 'withdraw' | 'audit') => void;
  // Deposit
  depositAmount: string;
  setDepositAmount: (val: string) => void;
  depositPhone: string;
  setDepositPhone: (val: string) => void;
  isDepositing: boolean;
  depositSuccess: boolean;
  handleDepositSubmit: (e: React.FormEvent) => void;
  // Withdraw
  withdrawAmount: string;
  setWithdrawAmount: (val: string) => void;
  withdrawPhone: string;
  setWithdrawPhone: (val: string) => void;
  withdrawProvider: 'mpesa' | 'airtel';
  setWithdrawProvider: (provider: 'mpesa' | 'airtel') => void;
  isWithdrawing: boolean;
  withdrawSuccess: boolean;
  handleWithdrawSubmit: (e: React.FormEvent) => void;
  // Audit
  auditResult: AuditResult | null;
  isAuditing: boolean;
  handleAuditLedger: () => void;
  // Shared error
  error: string;
  setError: (err: string) => void;
}

export const DepositForm: React.FC<DepositFormProps> = ({
  activeTab,
  setActiveTab,
  depositAmount,
  setDepositAmount,
  depositPhone,
  setDepositPhone,
  isDepositing,
  depositSuccess,
  handleDepositSubmit,
  withdrawAmount,
  setWithdrawAmount,
  withdrawPhone,
  setWithdrawPhone,
  withdrawProvider,
  setWithdrawProvider,
  isWithdrawing,
  withdrawSuccess,
  handleWithdrawSubmit,
  auditResult,
  isAuditing,
  handleAuditLedger,
  error,
  setError
}) => {
  return (
    <div className="space-y-4">
      {/* Tab Selection */}
      <div className="flex bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
        <button
          onClick={() => { setActiveTab('deposit'); setError(''); }}
          className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'deposit' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          DEPOSIT
        </button>
        <button
          onClick={() => { setActiveTab('withdraw'); setError(''); }}
          className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'withdraw' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          WITHDRAW
        </button>
        <button
          onClick={() => { setActiveTab('audit'); setError(''); }}
          className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'audit' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          AUDIT LEDGER
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'deposit' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest mb-4">Deposit Funds via M-Pesa</h4>
          
          <form onSubmit={handleDepositSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">PHONE NUMBER</label>
              <input
                type="text"
                placeholder="e.g. +254712345678"
                value={depositPhone}
                onChange={(e) => setDepositPhone(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">DEPOSIT AMOUNT (KES)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">KES</span>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full rounded-xl pl-12 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-rose-400 text-xs font-mono p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                {error}
              </div>
            )}

            {depositSuccess && (
              <div className="text-sky-400 text-xs font-mono p-2.5 bg-sky-500/5 border border-sky-500/10 rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>STK Push triggered! Check phone to approve.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isDepositing}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isDepositing ? 'SENDING STK PUSH...' : 'DEPOSIT VIA M-PESA'}</span>
            </button>
          </form>
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest mb-4">Withdraw to Mobile Money</h4>
          
          <form onSubmit={handleWithdrawSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">MOBILE PROVIDER</label>
              <select
                value={withdrawProvider}
                onChange={(e) => setWithdrawProvider(e.target.value as any)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
              >
                <option value="mpesa">Safaricom M-Pesa</option>
                <option value="airtel">Airtel Money Kenya</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">PHONE NUMBER</label>
              <input
                type="text"
                placeholder="e.g. +254712345678"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">WITHDRAWAL AMOUNT (KES)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">KES</span>
                <input
                  type="number"
                  placeholder="e.g. 2500"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full rounded-xl pl-12 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-rose-400 text-xs font-mono p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                {error}
              </div>
            )}

            {withdrawSuccess && (
              <div className="text-sky-400 text-xs font-mono p-2.5 bg-sky-500/5 border border-sky-500/10 rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Withdrawal approved & processed instantly!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isWithdrawing}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isWithdrawing ? 'PROCESSING PAYOUT...' : 'WITHDRAW TO PHONE'}</span>
            </button>
          </form>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest mb-1">Ledger Integrity Audit</h4>
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
              Triggers a mathematical reconciliation check on the digital ledger to verify the transaction sum equals the current wallet balance.
            </p>
          </div>

          {auditResult && (
            <div className={`p-4 rounded-xl border font-mono text-xs space-y-2.5 ${
              auditResult.isConsistent 
                ? 'bg-sky-500/5 border-sky-500/20 text-sky-300' 
                : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            }`}>
              <div className="flex items-center space-x-1.5 font-bold">
                {auditResult.isConsistent ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span>LEDGER VERIFIED & CONSISTENT</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>DISCREPANCY DETECTED</span>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-y-1.5 text-[11px] pt-1 border-t border-slate-800/40">
                <span className="text-slate-500">Wallet Balance:</span>
                <span className="text-right text-slate-300">KES {(auditResult.walletBalance || 0).toLocaleString()}.00</span>
                
                <span className="text-slate-500">Sum of Records:</span>
                <span className="text-right text-slate-300">KES {(auditResult.computedBalance || 0).toLocaleString()}.00</span>
                
                <span className="text-slate-500">Discrepancy:</span>
                <span className="text-right font-bold text-orange-400">KES {(auditResult.discrepancy || 0).toLocaleString()}.00</span>

                <span className="text-slate-500">Audited Entries:</span>
                <span className="text-right text-slate-300">{auditResult.transactionCount} txs</span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-rose-400 text-xs font-mono p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleAuditLedger}
            disabled={isAuditing}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAuditing ? 'AUDITING LEDGER FLOW...' : 'RUN MATHEMATICAL AUDIT'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
