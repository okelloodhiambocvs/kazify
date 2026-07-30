import React from 'react';
import { 
  Plus, Clock, Wallet, ShieldCheck, AlertTriangle, 
  Droplet, Zap, Hammer, Car, Sparkles, Leaf, Shield 
} from 'lucide-react';
import { Job, EscrowTransaction } from '../../types';
import StatCard from '../StatCard';

interface CustomerJobsListProps {
  activeJobs: Job[];
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  activeTab: string;
  handleTabChange: (tab: string) => void;
  escrowTransactions: EscrowTransaction[];
  setShowPaymentGateway: (show: boolean) => void;
  setShowCreateForm: (show: boolean) => void;
}

export function getCategoryIcon(catName: string) {
  switch (catName) {
    case 'Plumbing': return <Droplet className="w-4 h-4 text-blue-500" />;
    case 'Electrical': return <Zap className="w-4 h-4 text-amber-500" />;
    case 'Construction': return <Hammer className="w-4 h-4 text-orange-500" />;
    case 'Automotive': return <Car className="w-4 h-4 text-red-500" />;
    case 'Cleaning': return <Sparkles className="w-4 h-4 text-emerald-500" />;
    case 'Outdoor': return <Leaf className="w-4 h-4 text-lime-500" />;
    default: return <Shield className="w-4 h-4 text-indigo-500" />;
  }
}

const statusOrder = ['matching', 'accepted', 'en_route', 'started', 'completed'];
export function getStatusIndex(status: string) {
  const idx = statusOrder.indexOf(status);
  return idx !== -1 ? idx : 0;
}

export default function CustomerJobsList({
  activeJobs,
  selectedJob,
  setSelectedJob,
  activeTab,
  handleTabChange,
  escrowTransactions,
  setShowPaymentGateway,
  setShowCreateForm
}: CustomerJobsListProps) {
  const safeActiveJobs = Array.isArray(activeJobs) ? activeJobs : [];
  const filteredJobs = safeActiveJobs.filter(job => {
    if (activeTab === 'history') {
      return job.status === 'completed';
    }
    return job.status !== 'completed';
  });

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" id="customer-stats-grid">
        <StatCard
          id="cust-stat-active-requests"
          title="Active Requests"
          value={safeActiveJobs.filter(j => j?.status !== 'completed').length}
          icon={<Clock className="w-4 h-4" />}
          description="Awaiting match or in progress"
          trend={{ value: 'Live dispatch', type: 'positive' }}
          onClick={() => handleTabChange('overview')}
        />
        <StatCard
          id="cust-stat-escrow-balance"
          title="Funds held in Escrow"
          value={`KES ${safeActiveJobs.filter(j => j?.escrow_status === 'held').reduce((acc, j) => acc + (j?.amount || 0), 0).toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
          description="Secured M-PESA escrow"
          trend={{ value: '100% Secure', type: 'neutral' }}
          onClick={() => handleTabChange('overview')}
        />
        <StatCard
          id="cust-stat-completed-orders"
          title="Completed Orders"
          value={safeActiveJobs.filter(j => j?.status === 'completed').length}
          icon={<ShieldCheck className="w-4 h-4" />}
          description="Historic assignments past"
          trend={{ value: 'Success rate', type: 'positive' }}
          onClick={() => handleTabChange('history')}
        />
      </div>

      {/* Orders Header & Filtered Jobs list */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-lg text-white">Your Service Orders</h2>
          <button
            onClick={() => { handleTabChange('request'); }}
            className="px-3.5 py-2 rounded-xl bg-orange-500 text-slate-950 text-xs font-bold font-mono hover:bg-orange-400 transition shadow-md shadow-orange-500/10 flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>REQUEST TRADESMAN</span>
          </button>
        </div>

        {/* Active List Panel */}
        <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 overflow-y-auto max-h-[calc(100vh-200px)] space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <span className="text-sm block">
                {activeTab === 'history' ? 'No completed orders in history' : 'No active service requests'}
              </span>
              {activeTab !== 'history' && (
                <span className="text-xs font-mono mt-1 block">Click 'REQUEST TRADESMAN' to request a fundi.</span>
              )}
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => { setSelectedJob(job); setShowPaymentGateway(false); }}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${selectedJob?.id === job.id ? 'bg-slate-900 border-orange-500/80' : 'bg-slate-950 hover:bg-slate-900 border-slate-800/80'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono text-slate-500">#{job.id.substr(-6)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    job.status === 'matching' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    job.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    job.status === 'en_route' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    job.status === 'started' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    job.status === 'completed' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {job.status.toUpperCase()}
                  </span>
                </div>

                <span className="text-sm font-semibold text-slate-100 block truncate">{job.title}</span>
                
                <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-400">
                  {getCategoryIcon(job.category)}
                  <span>{job.category} ({job.workflow})</span>
                </div>

                {/* Compact visual status segmented track */}
                <div className="mt-3 bg-slate-900/40 p-2 rounded-lg border border-slate-900">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mb-1.5">
                    <span>STAGING STATUS</span>
                    <span className="text-orange-400 font-bold">
                      {job.status === 'matching' ? 'Awaiting Fundi' :
                       job.status === 'accepted' ? 'Assigned (2/5)' :
                       job.status === 'en_route' ? 'En Route (3/5)' :
                       job.status === 'started' ? 'In Progress (4/5)' :
                       'Completed (5/5)'}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3, 4].map((step) => {
                      const isDone = getStatusIndex(job.status) >= step;
                      const isCurrent = getStatusIndex(job.status) === step;
                      return (
                        <div 
                          key={step} 
                          className={`h-full flex-1 transition-all duration-300 ${
                            isDone 
                              ? (isCurrent ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500') 
                              : 'bg-slate-800'
                          }`} 
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/80">
                  <span className="text-xs font-bold text-gray-200">KES {(job.amount || 0).toLocaleString()}</span>
                  {escrowTransactions.some(tx => tx.job_id === job.id && tx.status === 'pending') ? (
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-0.5 border border-amber-500/24 animate-pulse">
                      STK PENDING...
                    </span>
                  ) : (
                    <span className={`text-[10px] font-mono font-medium ${job.escrow_status === 'held' ? 'text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5' : 'text-slate-500'}`}>
                      ESCROW: {job.escrow_status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
