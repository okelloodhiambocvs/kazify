import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  DollarSign, 
  FileSignature, 
  History, 
  Send, 
  RefreshCw,
  Clock,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { User, Contract } from '../types';
import api from '../services/api';
import ContractSignCard from './ContractSignCard';

interface ContractManagementProps {
  user: User;
  onContractSigned?: () => void;
}

export default function ContractManagement({ user, onContractSigned }: ContractManagementProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Negotiation / Propose Terms state
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [proposedTerms, setProposedTerms] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  const [isSubmittingNegotiation, setIsSubmittingNegotiation] = useState(false);
  const [negotiationSuccess, setNegotiationSuccess] = useState(false);
  
  const [error, setError] = useState('');

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/contracts/user/${user.id}`);
      setContracts(res.data);
      setError('');
      
      // If we had a selected contract, find its updated version
      if (selectedContract) {
        const updated = res.data.find((c: Contract) => c.id === selectedContract.id);
        if (updated) {
          setSelectedContract(updated);
        }
      }
    } catch (e: any) {
      console.error('Failed to load user contracts', e);
      setError('Could not retrieve contract registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user.id]);

  const handleSelectContract = (contract: Contract) => {
    setSelectedContract(contract);
    setProposedTerms(contract.terms);
    setProposedAmount(contract.amount.toString());
    setIsEditingTerms(false);
    setError('');
    setNegotiationSuccess(false);
  };

  const handleProposeTermsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    const amt = parseFloat(proposedAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please provide a valid pricing estimate amount.');
      return;
    }

    if (!proposedTerms.trim()) {
      setError('Please supply the formal terms of the contract agreement.');
      return;
    }

    setIsSubmittingNegotiation(true);
    setError('');
    try {
      const res = await api.post(`/api/contracts/${selectedContract.id}/negotiate`, {
        user_id: user.id,
        terms: proposedTerms,
        amount: amt
      });
      if (res.data.success) {
        setNegotiationSuccess(true);
        setSelectedContract(res.data.contract);
        setIsEditingTerms(false);
        fetchContracts();
        setTimeout(() => setNegotiationSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to lodge negotiated terms.');
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">● ACTIVE</span>;
      case 'completed':
        return <span className="text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">✔ COMPLETED</span>;
      case 'terminated':
        return <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">✖ TERMINATED</span>;
      default:
        return <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">● PENDING SIGNATURES</span>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-medium text-lg text-white">Digital Contract Registry</h2>
          <p className="text-xs text-slate-500 font-mono">Formalize project budgets, terms negotiation, and cryptographic signatures</p>
        </div>
        <button 
          onClick={fetchContracts}
          className="p-2 border border-slate-800 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition cursor-pointer"
          title="Refresh Registry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Contracts List Sidebar */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
            <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">AGREEMENTS REGISTER</span>
            <span className="text-[10px] font-mono text-slate-500">{contracts.length} CONTRACTS</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading && contracts.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-slate-900 border border-slate-800/50 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-24 text-slate-600 font-mono text-xs flex flex-col items-center">
                <FileText className="w-8 h-8 text-slate-700 mb-2" />
                <span>No contracts drafted yet</span>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">Contracts are initiated when bidding on a job or dispatching instantly.</p>
              </div>
            ) : (
              contracts.map((contract) => (
                <div
                  key={contract.id}
                  onClick={() => handleSelectContract(contract)}
                  className={`p-4 rounded-xl border transition cursor-pointer text-xs flex flex-col justify-between ${
                    selectedContract?.id === contract.id 
                      ? 'bg-slate-900 border-orange-500/80' 
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-mono text-[9px] text-slate-500 uppercase">AGREEMENT #{contract.id.substring(0, 10)}</span>
                      <h4 className="font-bold text-slate-200 mt-0.5 truncate max-w-[180px]">
                        {user.role === 'customer' ? `Expert: ${contract.fundi_name}` : `Client: ${contract.customer_name}`}
                      </h4>
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-900/60 pt-2 mt-2">
                    <span className="font-bold text-orange-400">KES {contract.amount.toLocaleString()}</span>
                    <span>{new Date(contract.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contract Workspace */}
        <div className="lg:col-span-7">
          {selectedContract ? (
            <div className="space-y-4">
              {/* Negotiation Success Alert */}
              {negotiationSuccess && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                  <span>Proposals updated! Previous signature stamps have been voided for re-verification.</span>
                </div>
              )}

              {/* Editing / Propose Terms Form */}
              {isEditingTerms ? (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-orange-400" />
                      <h3 className="font-display font-bold text-sm text-white">Negotiate Contract Terms</h3>
                    </div>
                    <button
                      onClick={() => setIsEditingTerms(false)}
                      className="text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleProposeTermsSubmit} className="space-y-4">
                    <div className="bg-orange-500/5 border border-orange-500/10 p-3.5 rounded-xl text-[11px] text-orange-400 font-mono leading-normal flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <p>
                        Modifying contract parameters resets both signature stamps. Work agreements must be fully signed again by both parties before services can commence.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">PROPOSED PRICING (KES)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">KES</span>
                        <input
                          type="number"
                          value={proposedAmount}
                          onChange={(e) => setProposedAmount(e.target.value)}
                          className="w-full rounded-xl pl-12 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">CONTRACT COVENANTS & TERMS</label>
                      <textarea
                        rows={6}
                        value={proposedTerms}
                        onChange={(e) => setProposedTerms(e.target.value)}
                        className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 resize-none"
                        required
                      />
                    </div>

                    {error && (
                      <div className="text-rose-400 text-xs font-mono p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingNegotiation}
                      className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingNegotiation ? 'DISPATCHING PROPOSAL...' : 'DISPATCH NEW PROPOSAL'}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-xs text-slate-400">
                    <span>Active Workspace: Contract #{selectedContract.id.substring(0, 10)}</span>
                    {selectedContract.status === 'draft' && (
                      <button
                        onClick={() => setIsEditingTerms(true)}
                        className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-mono text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition"
                      >
                        <Edit3 className="w-3 h-3 text-orange-400" />
                        <span>NEGOTIATE / PROPOSE TERMS</span>
                      </button>
                    )}
                  </div>

                  <ContractSignCard 
                    jobId={selectedContract.job_id} 
                    user={user} 
                    onSignedSuccess={() => {
                      fetchContracts();
                      if (onContractSigned) onContractSigned();
                    }} 
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center text-slate-500 h-[520px]">
              <FileSignature className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="font-display font-bold text-sm text-white mb-1">Agreement Console Idle</h3>
              <p className="text-slate-400 text-xs font-mono max-w-[280px]">Select a contract agreement registry entry from the sidebar to review financials, negotiate terms, or execute signatures.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export { ContractManagement };
