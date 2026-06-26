import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FolderLock, 
  Scale, 
  PlusCircle, 
  FileText, 
  Send 
} from 'lucide-react';
import { User, Contract, Dispute } from '../types';
import api from '../services/api';
import DisputePanel from './DisputePanel';

interface DisputeManagementProps {
  user: User;
}

export default function DisputeManagement({ user }: DisputeManagementProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [activeDisputeJobId, setActiveDisputeJobId] = useState<string | null>(null);
  
  // Create dispute state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch user's contracts
      const contractRes = await api.get(`/api/contracts/user/${user.id}`);
      setContracts(contractRes.data);

      // Fetch all disputes and filter for user's participation
      const disputeRes = await api.get('/api/disputes');
      // Enriched disputes contain customer_name, fundi_name etc.
      // Filter disputes where user is customer or fundi or initiator
      const userDisputes = disputeRes.data.filter((d: any) => {
        const matchingContract = contractRes.data.find((c: any) => c.job_id === d.job_id);
        return d.initiator_id === user.id || matchingContract !== undefined;
      });
      setDisputes(userDisputes);
    } catch (e) {
      console.error('Failed to load dispute management data', e);
      setError('Could not retrieve active disputes or contracts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const handleCreateDisputeSuccess = () => {
    setShowCreateForm(false);
    setSelectedContract(null);
    fetchData();
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-medium text-lg text-white">Dispute Arbitration Center</h2>
          <p className="text-xs text-slate-500 font-mono">Formal legal arbitration desk for contracts in Kenya</p>
        </div>
        
        {!showCreateForm && (
          <button
            onClick={() => {
              setShowCreateForm(true);
              setActiveDisputeJobId(null);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>FILE DISPUTE TICKET</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dispute Tickets Sidebar List */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
            <div className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest">Active Claims</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{disputes.length} ACTIVE CASES</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading && disputes.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-slate-900 border border-slate-800/50 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : disputes.length === 0 ? (
              <div className="text-center py-24 text-slate-600 font-mono text-xs flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-slate-700 mb-2" />
                <span>No active disputes or claims on record</span>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">All your active job contracts are performing smoothly.</p>
              </div>
            ) : (
              disputes.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    setActiveDisputeJobId(d.job_id);
                    setShowCreateForm(false);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer text-xs flex flex-col justify-between ${
                    activeDisputeJobId === d.job_id 
                      ? 'bg-slate-900 border-rose-500/80' 
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-200 block truncate max-w-[160px]">{d.job_title || 'Contract Dispute'}</span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      d.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {d.status.replace('resolved_', '')}
                    </span>
                  </div>
                  <p className="text-slate-400 line-clamp-2 text-[11px] font-mono leading-relaxed mb-3">{d.reason}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-900/60 pt-2">
                    <span>Val: KES {d.amount?.toLocaleString() || '0'}</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dispute Workspace Panel */}
        <div className="lg:col-span-7">
          {showCreateForm ? (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                <h3 className="font-display font-bold text-sm text-white">Lodge a Contract Dispute Ticket</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {!selectedContract ? (
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-semibold text-slate-400 block uppercase tracking-wider">SELECT AN ACTIVE JOB CONTRACT</span>
                  
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {contracts.filter(c => c.status === 'active').length === 0 ? (
                      <div className="text-center py-16 text-slate-600 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                        No active signed contracts found.
                        <p className="text-[10px] text-slate-600 mt-1 max-w-[240px] mx-auto">Disputes can only be filed against legally signed and currently active job contracts.</p>
                      </div>
                    ) : (
                      contracts.filter(c => c.status === 'active').map((contract) => (
                        <div
                          key={contract.id}
                          onClick={() => setSelectedContract(contract)}
                          className="p-3.5 rounded-xl border border-slate-850 hover:bg-slate-900 cursor-pointer transition text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-slate-200 block">Job Contract: {contract.id.substring(0, 8)}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              Between: {contract.customer_name} & {contract.fundi_name}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-orange-400 font-bold block">KES {contract.amount.toLocaleString()}</span>
                            <span className="text-[9px] text-emerald-400 uppercase tracking-widest block font-bold mt-0.5">● ACTIVE</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <DisputePanel 
                  jobId={selectedContract.job_id} 
                  user={user} 
                  onStateChanged={handleCreateDisputeSuccess} 
                />
              )}
            </div>
          ) : activeDisputeJobId ? (
            <DisputePanel 
              jobId={activeDisputeJobId} 
              user={user} 
              onStateChanged={fetchData} 
            />
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center text-slate-500 h-[520px]">
              <Scale className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="font-display font-bold text-sm text-white mb-1">Arbitration Desk Idle</h3>
              <p className="text-slate-400 text-xs font-mono max-w-[280px]">Select an active claim from the sidebar list or file a new ticket to open the mediation environment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export { DisputeManagement };
