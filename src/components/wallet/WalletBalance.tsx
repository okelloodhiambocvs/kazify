import React from 'react';
import { Wallet as WalletIcon } from 'lucide-react';
import { Wallet } from '../../types';

interface WalletBalanceProps {
  wallet: Wallet | null;
  loading: boolean;
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({ wallet, loading }) => {
  return (
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
          KES {(wallet?.balance || 0).toLocaleString()}.00
        </h3>
      )}

      <div className="flex items-center gap-1.5 mt-6 text-[10px] font-mono text-slate-400 border-t border-slate-800/60 pt-4">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
        <span>Safaricom M-Pesa & Airtel Money Integrated</span>
      </div>
    </div>
  );
};
