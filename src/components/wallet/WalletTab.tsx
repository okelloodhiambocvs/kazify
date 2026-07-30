import React from 'react';
import { RefreshCw } from 'lucide-react';
import { User } from '../../types';
import { useWallet } from '../../hooks/wallet/useWallet';
import { WalletBalance } from './WalletBalance';
import { DepositForm } from './DepositForm';
import { TransactionList } from './TransactionList';

export interface WalletTabProps {
  user: User;
}

export default function WalletTab({ user }: WalletTabProps) {
  const {
    wallet,
    transactions,
    loading,
    activeTab,
    setActiveTab,
    depositAmount,
    setDepositAmount,
    depositPhone,
    setDepositPhone,
    isDepositing,
    depositSuccess,
    withdrawAmount,
    setWithdrawAmount,
    withdrawPhone,
    setWithdrawPhone,
    withdrawProvider,
    setWithdrawProvider,
    isWithdrawing,
    withdrawSuccess,
    auditResult,
    isAuditing,
    error,
    setError,
    fetchWallet,
    handleDepositSubmit,
    handleWithdrawSubmit,
    handleAuditLedger
  } = useWallet({ user });

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
          <WalletBalance wallet={wallet} loading={loading} />

          <DepositForm
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            depositPhone={depositPhone}
            setDepositPhone={setDepositPhone}
            isDepositing={isDepositing}
            depositSuccess={depositSuccess}
            handleDepositSubmit={handleDepositSubmit}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            withdrawPhone={withdrawPhone}
            setWithdrawPhone={setWithdrawPhone}
            withdrawProvider={withdrawProvider}
            setWithdrawProvider={setWithdrawProvider}
            isWithdrawing={isWithdrawing}
            withdrawSuccess={withdrawSuccess}
            handleWithdrawSubmit={handleWithdrawSubmit}
            auditResult={auditResult}
            isAuditing={isAuditing}
            handleAuditLedger={handleAuditLedger}
            error={error}
            setError={setError}
          />
        </div>

        {/* Transactions ledger */}
        <div className="md:col-span-7">
          <TransactionList transactions={transactions} loading={loading} />
        </div>
      </div>
    </div>
  );
}
