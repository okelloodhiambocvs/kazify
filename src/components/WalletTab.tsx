import React, { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Send, 
  CheckCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Download, 
  History 
} from 'lucide-react';
import { User, Wallet, WalletTransaction } from '../types';
import api from '../services/api';

interface WalletTabProps {
  user: User;
}

interface AuditResult {
  isConsistent: boolean;
  walletBalance: number;
  computedBalance: number;
  discrepancy: number;
  transactionCount: number;
}

export default function WalletTab({ user }: WalletTabProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'audit'>('deposit');
  
  // Deposit States
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState(user.phone || '+254700000001');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Withdraw States
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(user.phone || '+254700000001');
  const [withdrawProvider, setWithdrawProvider] = useState<'mpesa' | 'airtel'>('mpesa');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Audit States
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const [error, setError] = useState('');

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/wallets/${user.id}`);
      setWallet(res.data.wallet);
      setTransactions(res.data.transactions);
      setError('');
    } catch (e: any) {
      console.error('Failed to load wallet', e);
      setError('Could not retrieve wallet balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user.id]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    setIsDepositing(true);
    setError('');
    try {
      const res = await api.post('/api/wallets/deposit', {
        user_id: user.id,
        amount: amt,
        phone_number: depositPhone
      });
      if (res.data.success) {
        setDepositSuccess(true);
        setDepositAmount('');
        setWallet(res.data.wallet);
        setTransactions(prev => [res.data.transaction, ...prev]);
        setTimeout(() => setDepositSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    if (wallet && wallet.balance < amt) {
      setError('Insufficient wallet balance for withdrawal');
      return;
    }

    setIsWithdrawing(true);
    setError('');
    try {
      const res = await api.post('/api/wallets/withdraw', {
        user_id: user.id,
        amount: amt,
        phone_number: withdrawPhone,
        provider: withdrawProvider === 'mpesa' ? 'Safaricom M-Pesa' : 'Airtel Money'
      });
      if (res.data.success) {
        setWithdrawSuccess(true);
        setWithdrawAmount('');
        setWallet(res.data.wallet);
        setTransactions(prev => [res.data.transaction, ...prev]);
        setTimeout(() => setWithdrawSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleAuditLedger = async () => {
    setIsAuditing(true);
    setError('');
    try {
      const res = await api.get(`/api/wallets/${user.id}/audit`);
      setAuditResult(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to run ledger integrity audit');
    } finally {
      setIsAuditing(false);
    }
  };

  const getTransactionTypeStyle = (type: string, amount: number) => {
    if (amount > 0) {
      return { 
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', 
        icon: <ArrowDownLeft className="w-4 h-4" /> 
      };
    }
    return { 
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', 
      icon: <ArrowUpRight className="w-4 h-4" /> 
    };
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-medium text-lg text-white">Kazify Personal Wallet & Ledger</h2>
          <p className="text-xs text-slate-500 font-mono">Real-time balances, secure mobile money payouts, and ledger auditing</p>
        </div>
        <button 
          onClick={fetchWallet}
          className="p-2 border border-slate-800 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition cursor-pointer"
          title="Refresh Balance"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Balance Card & Action Panel */}
        <div className="md:col-span-5 space-y-4">
          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-xl">
            <div className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <WalletIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-400 border border-slate-700/50">
                ACTIVE DIGITAL ACCOUNT
              </span>
            </div>

            <span className="text-xs font-mono text-slate-500 block uppercase tracking-wider">AVAILABLE BALANCE</span>
            {loading ? (
              <div className="h-10 w-32 bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <h3 className="text-3xl font-display font-bold text-white mt-1">
                KES {wallet?.balance.toLocaleString() || '0'}.00
              </h3>
            )}

            <div className="flex items-center gap-1.5 mt-6 text-[10px] font-mono text-slate-400 border-t border-slate-800/60 pt-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Safaricom M-Pesa & Airtel Money Integrated</span>
            </div>
          </div>

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
                  <div className="text-emerald-400 text-xs font-mono p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
                  <div className="text-emerald-400 text-xs font-mono p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                }`}>
                  <div className="flex items-center space-x-1.5 font-bold">
                    {auditResult.isConsistent ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
                    <span className="text-right text-slate-300">KES {auditResult.walletBalance.toLocaleString()}.00</span>
                    
                    <span className="text-slate-500">Sum of Records:</span>
                    <span className="text-right text-slate-300">KES {auditResult.computedBalance.toLocaleString()}.00</span>
                    
                    <span className="text-slate-500">Discrepancy:</span>
                    <span className="text-right font-bold text-orange-400">KES {auditResult.discrepancy.toLocaleString()}.00</span>

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

        {/* Transactions ledger */}
        <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-orange-400" />
              <h4 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">Transactions Statement</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">LEDGER HISTORIC VIEW</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-slate-900 border border-slate-800/50 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-24 text-slate-500">
                <WalletIcon className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                <span className="text-xs font-mono block">No wallet activities on record yet</span>
              </div>
            ) : (
              transactions.map((tx) => {
                const style = getTransactionTypeStyle(tx.type, tx.amount);
                return (
                  <div 
                    key={tx.id} 
                    className="p-3.5 rounded-xl border border-slate-900/60 bg-slate-950 flex justify-between items-center text-xs"
                  >
                    <div className="flex items-center space-x-3 text-left">
                      <div className={`p-2 rounded-lg border ${style.bg}`}>
                        {style.icon}
                      </div>
                      <div>
                        <span className="font-semibold block text-slate-200">{tx.description}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                          {tx.type.toUpperCase()} • {new Date(tx.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} KES
                      </span>
                      {tx.reference_id && (
                        <span className="text-[9px] font-mono text-slate-600 block mt-0.5">Ref: {tx.reference_id.substring(0, 12)}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
