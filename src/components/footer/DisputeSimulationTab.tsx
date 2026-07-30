import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DisputeSimulationTab: React.FC = () => {
  const [disputeId, setDisputeId] = useState('DIS-2026-4401');
  const [disputeReason, setDisputeReason] = useState('Structural bypass during pipe layout');
  const [disputeEvidence, setDisputeEvidence] = useState('Completed pipeline photo attached');
  const [disputeStatus, setDisputeStatus] = useState<'idle' | 'submitted' | 'resolved'>('idle');

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDisputeStatus('submitted');
    setTimeout(() => {
      setDisputeStatus('resolved');
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <p>
        The Kazify Dispute Room operates as a neutral escrow tribunal. If work is incomplete, materials are counterfeit, or funds are wrongfully withheld, either party can initiate formal arbitration.
      </p>

      <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 text-xs">
        <h4 className="font-bold text-orange-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span>Interactive Escrow Dispute Arbitrator</span>
        </h4>

        {disputeStatus === 'idle' && (
          <form onSubmit={handleDisputeSubmit} className="space-y-2.5">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Contract Reference ID</label>
              <input 
                type="text" 
                value={disputeId} 
                onChange={e => setDisputeId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Primary Reason for Dispute</label>
              <input 
                type="text" 
                value={disputeReason} 
                onChange={e => setDisputeReason(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Photo Evidence / Audit Log</label>
              <textarea 
                rows={2}
                value={disputeEvidence} 
                onChange={e => setDisputeEvidence(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white resize-none"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-lg transition duration-200"
            >
              Lodge Dispute with Compliance Desk
            </button>
          </form>
        )}

        {disputeStatus === 'submitted' && (
          <div className="p-4 text-center space-y-2 py-6">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="font-bold block text-orange-400">Locking Escrow Account & Convening Panel...</span>
            <p className="text-[10px] text-slate-400">Extracting NITA standards & GPS logs for reference #{disputeId}</p>
          </div>
        )}

        {disputeStatus === 'resolved' && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg space-y-2 text-left">
            <div className="flex items-center gap-2 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Tribunal Ruling Issued (#{disputeId})</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Findings: Customer claim verified. <strong>70% refund</strong> issued to Client Wallet; <strong>30% material compensation</strong> credited to Tradesman.
            </p>
            <button 
              onClick={() => setDisputeStatus('idle')}
              className="text-[10px] text-orange-400 underline hover:text-orange-300 font-mono block pt-1"
            >
              Simulate Another Claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
