import { useState, useEffect } from 'react';
import { User, Wallet, WalletTransaction } from '../../types';
import api from '../../services/api';

export interface AuditResult {
  isConsistent: boolean;
  walletBalance: number;
  computedBalance: number;
  discrepancy: number;
  transactionCount: number;
}

interface UseWalletProps {
  user: User;
}

export function useWallet({ user }: UseWalletProps) {
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
      const w = res.data?.wallet || (res.data?.id ? res.data : null);
      setWallet(w);
      setTransactions(Array.isArray(res.data?.transactions) ? res.data.transactions : []);
      setError('');
    } catch (e: any) {
      console.error('Failed to load wallet', e);
      setError('Could not retrieve wallet balance');
      setTransactions([]);
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
        if (res.data.transaction) {
          setTransactions(prev => [res.data.transaction, ...(prev || [])]);
        }
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
        if (res.data.transaction) {
          setTransactions(prev => [res.data.transaction, ...(prev || [])]);
        }
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

  return {
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
  };
}
