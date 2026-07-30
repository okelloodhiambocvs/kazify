import React from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';
import { WalletTransaction } from '../../types';

interface TransactionListProps {
  transactions: WalletTransaction[];
  loading: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading }) => {
  const getTransactionTypeStyle = (type: string, amount: number) => {
    if (amount > 0) {
      return { 
        bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400', 
        icon: <ArrowDownLeft className="w-4 h-4" /> 
      };
    }
    return { 
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', 
      icon: <ArrowUpRight className="w-4 h-4" /> 
    };
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-[520px]">
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
        ) : (!transactions || transactions.length === 0) ? (
          <div className="text-center py-24 text-slate-500">
            <WalletIcon className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <span className="text-xs font-mono block">No wallet activities on record yet</span>
          </div>
        ) : (
          (transactions || []).map((tx) => {
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
                  <span className={`font-mono font-bold text-sm ${(tx.amount || 0) > 0 ? 'text-sky-400' : 'text-slate-300'}`}>
                    {(tx.amount || 0) > 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()} KES
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
  );
};
