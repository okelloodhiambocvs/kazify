import React from 'react';
import { Briefcase } from 'lucide-react';
import { User, Job } from '../../types';

interface FundiJobsFeedProps {
  user: User;
  activeTab: string;
  assignedJobs: Job[];
  availableBiddingJobs: Job[];
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
}

export default function FundiJobsFeed({
  user,
  activeTab,
  assignedJobs,
  availableBiddingJobs,
  selectedJob,
  setSelectedJob
}: FundiJobsFeedProps) {
  return (
    <div className="lg:col-span-4 flex flex-col space-y-4">
      {/* Performance scorecard */}
      {activeTab === 'overview' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left animate-in fade-in duration-150">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">PRO SCORECARD</span>
          <span className="text-base font-bold text-white block">Hi, {user.name}</span>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/60 text-left">
              <span className="text-[9px] text-gray-500 font-mono uppercase block">NITA Rating</span>
              <span className="text-base font-bold text-slate-100">{user.rating || 'N/A'} ⭐</span>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/60 text-left">
              <span className="text-[9px] text-gray-500 font-mono uppercase block">Status</span>
              <span className="text-xs font-semibold text-emerald-400 font-mono block">✔ AVAILABLE</span>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Assigned / Active contracts */}
      {(activeTab === 'overview' || activeTab === 'jobs') && (
        <div className={`bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col transition-all duration-300 animate-in fade-in duration-150 ${activeTab === 'jobs' ? 'flex-1 min-h-[500px]' : 'h-96'}`}>
          <div className="border-b border-slate-800 pb-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-100 text-left flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-orange-500" />
              <span>Your Contracts ({assignedJobs.length})</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {assignedJobs.length === 0 ? (
              <span className="text-xs text-slate-600 block text-center py-12">No active contracts assigned. Accept an instant job or bid below.</span>
            ) : (
              assignedJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${selectedJob?.id === job.id ? 'bg-slate-900 border-orange-500' : 'bg-slate-950 hover:bg-slate-900 border-slate-800/80'}`}
                >
                  <span className="text-xs font-semibold text-white block truncate">{job.title}</span>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-orange-400 font-mono">KES {(job.amount || 0).toLocaleString()}</span>
                    <span className="text-[9px] font-mono bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase">{job.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Open Bidding catalog */}
      {(activeTab === 'overview' || activeTab === 'leads') && (
        <div className={`bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col transition-all duration-300 animate-in fade-in duration-150 ${activeTab === 'leads' ? 'flex-1 min-h-[500px]' : 'h-80'}`}>
          <div className="border-b border-slate-800 pb-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-100 text-left">
              Available {user.category} Requests
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {availableBiddingJobs.length === 0 ? (
              <span className="text-xs text-slate-600 block text-center py-12">No open pending listings in your category currently.</span>
            ) : (
              availableBiddingJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${selectedJob?.id === job.id ? 'bg-slate-900 border-orange-500' : 'bg-slate-950 hover:bg-slate-900 border-slate-800/80'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-white block truncate flex-1 pr-1">{job.title}</span>
                    <span className="text-[9px] font-mono text-slate-500">{job.workflow.toUpperCase()}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block leading-normal truncate">{job.description}</span>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">Budget KES {(job.amount || 0).toLocaleString()}</span>
                    <span className="text-[9px] text-gray-400">{job.address}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
