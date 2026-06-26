import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, AlertCircle, Edit3, ShieldAlert, KeyRound } from 'lucide-react';
import { User, Contract } from '../types';
import api from '../services/api';

interface ContractSignCardProps {
  jobId: string;
  user: User;
  onSignedSuccess?: () => void;
}

export default function ContractSignCard({ jobId, user, onSignedSuccess }: ContractSignCardProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const fetchContract = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/contracts/job/${jobId}`);
      setContract(res.data);
      setError('');
    } catch (e) {
      console.error('Failed to load contract details', e);
      // Fail silently if contract does not exist yet (e.g., job in matching)
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [jobId]);

  const handleSign = async () => {
    if (!contract) return;
    setSigning(true);
    setError('');
    try {
      const res = await api.post(`/api/contracts/${contract.id}/sign`, {
        user_id: user.id,
        role: user.role
      });
      if (res.data.success) {
        setContract(res.data.contract);
        if (onSignedSuccess) onSignedSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign contract agreement');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 border border-slate-800 rounded-2xl bg-slate-950/60 animate-pulse space-y-3">
        <div className="h-4 w-40 bg-slate-800 rounded" />
        <div className="h-16 bg-slate-900 rounded" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-4 border border-slate-800/40 rounded-xl bg-slate-950 text-left text-xs font-mono text-slate-500">
        ⌛ Contract will be drafted once a quotation is matched or fundi dispatches.
      </div>
    );
  }

  const alreadySigned = user.role === 'customer' ? contract.customer_signed : contract.fundi_signed;
  const bothSigned = contract.customer_signed && contract.fundi_signed;

  const commission = Math.round(contract.amount * 0.10);
  const payout = contract.amount - commission;

  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-950 p-5 text-left space-y-4">
      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/80">
        <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Digital Agreement Statement</h3>
          <span className="text-[10px] font-mono text-slate-500">Contract ID: #{contract.id.substring(0, 12)}</span>
        </div>
      </div>

      {/* Contract terms body text */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 leading-relaxed font-serif max-h-40 overflow-y-auto">
        <p>{contract.terms}</p>
      </div>

      {/* Financial terms breakdown */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-2 text-xs font-mono">
        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-1">Financial Structure Ledger</span>
        <div className="flex justify-between">
          <span className="text-slate-500">Lockable Escrow Amount:</span>
          <span className="text-white font-bold">KES {contract.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Platform Commission Fee (10%):</span>
          <span className="text-rose-400 font-bold">-KES {commission.toLocaleString()}</span>
        </div>
        <div className="border-t border-slate-900 my-1 pt-1.5 flex justify-between font-bold">
          <span className="text-slate-400">Net Expert Payout:</span>
          <span className="text-emerald-400">KES {payout.toLocaleString()}</span>
        </div>
      </div>

      {/* Signature States */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-mono ${contract.customer_signed ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
          <CheckCircle2 className={`w-4.5 h-4.5 flex-shrink-0 ${contract.customer_signed ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
          <div className="text-left">
            <span className="font-bold block text-[10px] uppercase">CUSTOMER SIGNATURE</span>
            <span className="text-[9px] mt-0.5 block">{contract.customer_signed ? `SIGNED AT ${new Date(contract.customer_signed_at || '').toLocaleDateString()}` : 'PENDING'}</span>
          </div>
        </div>

        <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-mono ${contract.fundi_signed ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
          <CheckCircle2 className={`w-4.5 h-4.5 flex-shrink-0 ${contract.fundi_signed ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
          <div className="text-left">
            <span className="font-bold block text-[10px] uppercase">EXPERT SIGNATURE</span>
            <span className="text-[9px] mt-0.5 block">{contract.fundi_signed ? `SIGNED AT ${new Date(contract.fundi_signed_at || '').toLocaleDateString()}` : 'PENDING'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-rose-400 text-xs font-mono p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
          {error}
        </div>
      )}

      {/* Signature submission actions */}
      {bothSigned ? (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-bold block text-[10px] uppercase">CONTRACT ACTIVATED</span>
            <p className="text-[10px] mt-0.5">Agreement is legally executed. Client can proceed to secure escrow payment.</p>
          </div>
        </div>
      ) : alreadySigned ? (
        <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-amber-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-bold block text-[10px] uppercase">AWAITING SECOND SIGNATURE</span>
            <p className="text-[10px] mt-0.5">Your signature is stamped. Waiting on the other party.</p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleSign}
          disabled={signing}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>{signing ? 'STAMPING DIGITAL CERTIFICATE...' : 'SIGN WORK CONTRACT'}</span>
        </button>
      )}
    </div>
  );
}
