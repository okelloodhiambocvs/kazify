import React from 'react';
import { RefreshCw, TrendingUp, CheckCircle2, Navigation } from 'lucide-react';

interface AdminOverviewProps {
  activeTab: string;
  metrics: any;
  healthStatus: any[];
  isRecheckingHealth: boolean;
  handleRecheckHealth: () => void;
  recentJobs: any[];
  selectedJobIds: string[];
  setSelectedJobIds: (ids: string[]) => void;
  setIsBulkModalOpen: (open: boolean) => void;
  fetchBulkRecommendations: (jobIds: string[]) => void;
  setSelectedAllocationJob: (job: any | null) => void;
  setIsAllocationModalOpen: (open: boolean) => void;
  setAllocationMessage: (msg: string) => void;
  recentTrans: any[];
  auditLogs: any[];
  loadingAudit: boolean;
  fetchAuditLogs: () => void;
}

export default function AdminOverview({
  activeTab,
  metrics,
  healthStatus,
  isRecheckingHealth,
  handleRecheckHealth,
  recentJobs,
  selectedJobIds,
  setSelectedJobIds,
  setIsBulkModalOpen,
  fetchBulkRecommendations,
  setSelectedAllocationJob,
  setIsAllocationModalOpen,
  setAllocationMessage,
  recentTrans,
  auditLogs,
  loadingAudit,
  fetchAuditLogs
}: AdminOverviewProps) {
  return (
    <div className="space-y-6 text-left">
      {/* Headline stats grids */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-left">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">TOTAL USERS</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-3xl font-bold text-white font-display">{metrics?.total_users || metrics?.totalUsers || 0}</span>
              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                {metrics?.total_customers || 0} Custs • {metrics?.total_fundis || 0} Fundis
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-left">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">M-PESA ESCROW VOLUME</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">KES {(metrics?.escrow_volume_kes ?? metrics?.total_escrow_held ?? metrics?.totalEscrowHeld ?? 0).toLocaleString()}</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-left">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">ACTIVE ASSIGNMENTS</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-3xl font-bold text-white font-display">{metrics?.active_jobs || 0}</span>
              <span className="text-[10px] text-orange-400 font-mono">Uber & Upwork matching</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-left">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">COMPLETED TASKS</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-3xl font-bold text-white font-display">{metrics?.completed_jobs || 0}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* System Health Widget */}
      {activeTab === 'overview' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="space-y-0.5">
              <h3 className="font-display font-bold text-base text-white">System Infrastructure Health</h3>
              <p className="text-[10px] text-slate-500 font-mono">Real-time status check for connected external gateway APIs</p>
            </div>
            <button 
              onClick={handleRecheckHealth}
              disabled={isRecheckingHealth}
              aria-label="Recheck all external services connectivity health"
              className="sm:self-center self-start px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/50 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
            >
              <RefreshCw className={`w-3 h-3 ${isRecheckingHealth ? 'animate-spin text-orange-500' : ''}`} />
              <span>RE-PING SERVICES</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {healthStatus.map((service) => (
              <div key={service.service} className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    service.status === 'green' ? 'bg-emerald-500' : 
                    service.status === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">{service.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase">{service.role}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    service.status === 'green' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                    service.status === 'yellow' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
                    'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {service.status === 'green' ? 'ONLINE' : service.status === 'yellow' ? 'DEGRADED' : 'OFFLINE'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">{service.latency}ms latency</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'orders' || activeTab === 'escrow') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Orders log */}
          {(activeTab === 'overview' || activeTab === 'orders') && (
            <div className={`${activeTab === 'orders' ? 'lg:col-span-12' : 'lg:col-span-8'} bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4 animate-in fade-in duration-150`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-display font-bold text-base text-white">Recent Service Requests Audit</h3>
                {selectedJobIds.length > 0 && (
                  <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-right-3 duration-150">
                    <span className="text-xs font-mono text-orange-400 font-bold bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-xl">
                      {selectedJobIds.length} Job{selectedJobIds.length > 1 ? 's' : ''} Selected
                    </span>
                    <button
                      onClick={() => {
                        setIsBulkModalOpen(true);
                        fetchBulkRecommendations(selectedJobIds);
                      }}
                      className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold font-mono text-xs uppercase rounded-xl transition-all active:translate-y-0.5 cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5 animate-pulse" />
                      Bulk Suggest & Allocate
                    </button>
                    <button
                      onClick={() => setSelectedJobIds([])}
                      className="text-xs text-slate-400 hover:text-white transition font-mono"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500">
                      <th className="py-2 w-8">
                        <input
                          type="checkbox"
                          checked={recentJobs.length > 0 && selectedJobIds.length === recentJobs.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedJobIds(recentJobs.map(j => j.id));
                            } else {
                              setSelectedJobIds([]);
                            }
                          }}
                          className="rounded bg-slate-900 border-slate-800 text-orange-500 focus:ring-orange-500/20 cursor-pointer"
                        />
                      </th>
                      <th className="py-2">ORDER ID</th>
                      <th className="py-2">CLIENT</th>
                      <th className="py-2">TRADE CATEGORY</th>
                      <th className="py-2">ASSIGNMENT</th>
                      <th className="py-2">PRICE</th>
                      <th className="py-2">STATUS</th>
                      <th className="py-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-600 text-xs">No entries found</td>
                      </tr>
                    ) : (
                      recentJobs.map((job) => {
                        const isSelected = selectedJobIds.includes(job.id);
                        return (
                          <tr key={job.id} className={`border-b border-slate-900 text-xs text-gray-200 transition-colors ${isSelected ? 'bg-orange-500/5' : 'hover:bg-slate-900/40'}`}>
                            <td className="py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedJobIds([...selectedJobIds, job.id]);
                                  } else {
                                    setSelectedJobIds(selectedJobIds.filter(id => id !== job.id));
                                  }
                                }}
                                className="rounded bg-slate-900 border-slate-800 text-orange-500 focus:ring-orange-500/20 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 font-mono">#{job.id.substr(-6)}</td>
                            <td className="py-3">{job.customer_name}</td>
                            <td className="py-3 font-mono">{job.category}</td>
                            <td className="py-3 font-mono text-slate-400">{job.fundi_name || 'Unassigned'}</td>
                            <td className="py-3 font-mono text-orange-400">KES {(job.amount || 0).toLocaleString()}</td>
                            <td className="py-3">
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-slate-900 border border-slate-800 text-slate-300">
                                {job.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedAllocationJob(job);
                                  setIsAllocationModalOpen(true);
                                  setAllocationMessage('');
                                }}
                                className={`px-3 py-1 font-mono font-bold text-[10px] uppercase rounded-lg transition-all active:translate-y-0.5 cursor-pointer border ${
                                  job.fundi_id 
                                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700' 
                                    : 'bg-orange-500 hover:bg-orange-400 text-slate-950 border-orange-500'
                                }`}
                              >
                                {job.fundi_id ? 'Reallocate' : 'Allocate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Escrow ledger balance streams */}
          {(activeTab === 'overview' || activeTab === 'escrow') && (
            <div className={`${activeTab === 'escrow' ? 'lg:col-span-12' : 'lg:col-span-4'} bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4 flex flex-col justify-between animate-in fade-in duration-150`}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-base text-white">Escrow Wallet Ledger</h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 rounded font-mono">SECURE POOL</span>
                </div>

                <div className="space-y-3">
                  {recentTrans.length === 0 ? (
                    <span className="text-xs text-slate-600 block text-center py-10">No payments registered on the ledger yet</span>
                  ) : (
                    recentTrans.map((tx: any) => (
                      <div key={tx.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono text-[9px] text-slate-500 block">CHECKOUT ID: {tx.checkout_request_id?.substr(-8) || tx.id.substr(-8)}</span>
                          <span className="text-[10px] text-gray-400">From {tx.phone_number}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400 block">+KES {(tx.amount || 0).toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono">{tx.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 leading-normal mt-4">
                <span className="text-xs text-orange-400 font-bold block mb-1">ADMIN COMPLIANCE WARNING</span>
                <p className="text-[10px] text-slate-400">All transactional items in Kenyan national trade registers are subjected to audit reviews regarding user dispute completions.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-150 text-left">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-white font-display">System Operations Audit Trail</h2>
              <p className="text-xs text-slate-400">Timestamped, tamper-proof administrative activity log with IP & client activity logging.</p>
            </div>
            <button 
              onClick={fetchAuditLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-mono cursor-pointer transition self-start"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
              REFRESH LOGS
            </button>
          </div>

          {loadingAudit ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-white">TAMPER-PROOF LEDGER STREAM</h3>
                <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded font-mono uppercase">
                  {auditLogs.length} audit entries
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] font-mono text-slate-500 uppercase">
                      <th className="py-3">TIMESTAMP</th>
                      <th className="py-3">ADMINISTRATOR</th>
                      <th className="py-3">ACTION EVENT</th>
                      <th className="py-3">IP ADDRESS</th>
                      <th className="py-3">CLIENT INFO / ACTIVITY</th>
                      <th className="py-3">TARGET ENTITY</th>
                      <th className="py-3">EVENT DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-600 font-mono text-xs">
                          No sensitive operational events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-slate-900/45 text-[11px] text-slate-300 hover:bg-slate-900/10">
                          <td className="py-3 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 whitespace-nowrap">
                            <strong className="text-white block">{log.adminName}</strong>
                            <span className="text-[9px] font-mono text-slate-500">#{log.adminId?.substring(0, 8)}</span>
                          </td>
                          <td className="py-3 whitespace-nowrap">
                            <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-orange-400">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-blue-400 whitespace-nowrap">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                          <td className="py-3 text-[10px] text-slate-400 font-mono max-w-[150px] truncate" title={log.userActivity}>
                            {log.userActivity || 'N/A'}
                          </td>
                          <td className="py-3 whitespace-nowrap font-mono text-slate-500">
                            <span className="uppercase text-[9px] bg-slate-900 px-1 py-0.5 rounded mr-1 text-slate-400 border border-slate-850">
                              {log.targetType}
                            </span>
                            #{log.targetId?.substring(0, 8)}
                          </td>
                          <td className="py-3 text-slate-400 leading-normal max-w-sm">
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
