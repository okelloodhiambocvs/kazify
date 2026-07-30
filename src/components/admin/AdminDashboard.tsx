import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { AdminLayoutWrapper } from './AdminLayoutWrapper';
import { useAdminStats } from '../../hooks/admin/useAdminStats';
import { useAdminDisputes } from '../../hooks/admin/useAdminDisputes';
import { useAdminKYC } from '../../hooks/admin/useAdminKYC';
import { useAdminAllocation } from '../../hooks/admin/useAdminAllocation';

import AdminOverview from './AdminOverview';
import AdminDisputesBoard from './AdminDisputesBoard';
import AdminKYCReview from './AdminKYCReview';
import AdminCharts from './AdminCharts';
import AdminAllocationDesk from './AdminAllocationDesk';

export interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  isWrapped?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  refreshTrigger?: number;
}

export default function AdminDashboard({
  user,
  onLogout,
  isWrapped,
  activeTab: propsActiveTab,
  setActiveTab: propsSetActiveTab,
  refreshTrigger = 0
}: AdminDashboardProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<string>('overview');
  const activeTab = propsActiveTab || internalActiveTab;
  const setActiveTab = propsSetActiveTab || setInternalActiveTab;

  const {
    metrics,
    recentTrans,
    recentJobs,
    loading,
    healthStatus,
    isRecheckingHealth,
    handleRecheckHealth,
    liveAlerts,
    setLiveAlerts,
    auditLogs,
    loadingAudit,
    fetchAuditLogs,
    fetchAdminData
  } = useAdminStats(user, activeTab, refreshTrigger);

  const {
    disputes,
    selectedDispute,
    setSelectedDispute,
    disputeMessages,
    newDisputeMsg,
    setNewDisputeMsg,
    resSummary,
    setResSummary,
    isResolving,
    adminZoomExhibit,
    setAdminZoomExhibit,
    handleSendDisputeMessage,
    handleResolveDispute
  } = useAdminDisputes(user);

  const {
    kycDocs,
    selectedKyc,
    setSelectedKyc,
    rejReason,
    setRejReason,
    handleReviewKyc
  } = useAdminKYC();

  const {
    jobsList,
    loadingJobs,
    selectedAllocationJob,
    setSelectedAllocationJob,
    recommendations,
    loadingRecommendations,
    isAllocating,
    allocationMessage,
    setAllocationMessage,
    allocationSearch,
    setAllocationSearch,
    isAllocationModalOpen,
    setIsAllocationModalOpen,
    selectedJobIds,
    setSelectedJobIds,
    isBulkModalOpen,
    setIsBulkModalOpen,
    bulkRecommendations,
    setBulkRecommendations,
    loadingBulkRecommendations,
    bulkAllocationMessage,
    isBulkAllocating,
    calculateGeodeticDistance,
    fetchAllocationsJobs,
    fetchBulkRecommendations,
    handleAllocate,
    handleBulkAllocate
  } = useAdminAllocation();

  useEffect(() => {
    (window as any).refreshAllocationsList = fetchAllocationsJobs;
    return () => {
      delete (window as any).refreshAllocationsList;
    };
  }, [fetchAllocationsJobs]);

  return (
    <AdminLayoutWrapper
      isWrapped={isWrapped}
      user={user}
      onLogout={onLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onRefresh={fetchAdminData}
    >
      {/* Floating Real-time Admin Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm w-full pointer-events-none">
        {liveAlerts.filter(a => !a.read).map((alert) => (
          <div 
            key={alert.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right duration-300 flex items-start gap-3 backdrop-blur-sm ${
              alert.type === 'high_value_dispute' 
                ? 'bg-rose-950/95 border-rose-500/50 text-white' 
                : alert.type === 'dispute_filed'
                  ? 'bg-amber-950/95 border-amber-500/50 text-white'
                  : 'bg-indigo-950/95 border-indigo-500/50 text-white'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-white/10 shrink-0">
              {alert.type === 'high_value_dispute' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : alert.type === 'dispute_filed' ? (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <span className="text-[8px] font-mono font-bold tracking-wider uppercase opacity-80 block">
                {alert.type === 'high_value_dispute' ? '🚨 CRITICAL SYSTEM ALERT' : alert.type === 'dispute_filed' ? '⚠️ DISPUTE ACTION' : '📄 KYC REGISTRATION'}
              </span>
              <h5 className="text-xs font-bold truncate mt-0.5">{alert.title}</h5>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{alert.content}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    if (alert.type === 'new_kyc_submission') {
                      setActiveTab('kyc_review');
                    } else {
                      setActiveTab('disputes');
                    }
                    setLiveAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
                  }}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded font-mono text-[9px] font-bold text-white transition cursor-pointer"
                >
                  INVESTIGATE
                </button>
                <button
                  onClick={() => {
                    setLiveAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
                  }}
                  className="text-[9px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 min-h-[400px] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <>
          {(activeTab === 'overview' || activeTab === 'orders' || activeTab === 'escrow' || activeTab === 'audit') && (
            <AdminOverview
              activeTab={activeTab}
              metrics={metrics}
              healthStatus={healthStatus}
              isRecheckingHealth={isRecheckingHealth}
              handleRecheckHealth={handleRecheckHealth}
              recentJobs={recentJobs}
              selectedJobIds={selectedJobIds}
              setSelectedJobIds={setSelectedJobIds}
              setIsBulkModalOpen={setIsBulkModalOpen}
              fetchBulkRecommendations={fetchBulkRecommendations}
              setSelectedAllocationJob={setSelectedAllocationJob}
              setIsAllocationModalOpen={setIsAllocationModalOpen}
              setAllocationMessage={setAllocationMessage}
              recentTrans={recentTrans}
              auditLogs={auditLogs}
              loadingAudit={loadingAudit}
              fetchAuditLogs={fetchAuditLogs}
            />
          )}

          {activeTab === 'disputes' && (
            <AdminDisputesBoard
              user={user}
              disputes={disputes}
              selectedDispute={selectedDispute}
              setSelectedDispute={setSelectedDispute}
              disputeMessages={disputeMessages}
              newDisputeMsg={newDisputeMsg}
              setNewDisputeMsg={setNewDisputeMsg}
              resSummary={resSummary}
              setResSummary={setResSummary}
              isResolving={isResolving}
              adminZoomExhibit={adminZoomExhibit}
              setAdminZoomExhibit={setAdminZoomExhibit}
              handleSendDisputeMessage={handleSendDisputeMessage}
              handleResolveDispute={handleResolveDispute}
            />
          )}

          {activeTab === 'kyc_review' && (
            <AdminKYCReview
              kycDocs={kycDocs}
              selectedKyc={selectedKyc}
              setSelectedKyc={setSelectedKyc}
              rejReason={rejReason}
              setRejReason={setRejReason}
              handleReviewKyc={handleReviewKyc}
            />
          )}

          {activeTab === 'analytics' && (
            <AdminCharts metrics={metrics} />
          )}

          {activeTab === 'allocations' && (
            <AdminAllocationDesk
              jobsList={jobsList}
              loadingJobs={loadingJobs}
              selectedAllocationJob={selectedAllocationJob}
              setSelectedAllocationJob={setSelectedAllocationJob}
              recommendations={recommendations}
              loadingRecommendations={loadingRecommendations}
              isAllocating={isAllocating}
              allocationMessage={allocationMessage}
              setAllocationMessage={setAllocationMessage}
              allocationSearch={allocationSearch}
              setAllocationSearch={setAllocationSearch}
              isAllocationModalOpen={isAllocationModalOpen}
              setIsAllocationModalOpen={setIsAllocationModalOpen}
              isBulkModalOpen={isBulkModalOpen}
              setIsBulkModalOpen={setIsBulkModalOpen}
              bulkRecommendations={bulkRecommendations}
              setBulkRecommendations={setBulkRecommendations}
              loadingBulkRecommendations={loadingBulkRecommendations}
              bulkAllocationMessage={bulkAllocationMessage}
              isBulkAllocating={isBulkAllocating}
              calculateGeodeticDistance={calculateGeodeticDistance}
              fetchAllocationsJobs={fetchAllocationsJobs}
              handleAllocate={handleAllocate}
              handleBulkAllocate={handleBulkAllocate}
            />
          )}
        </>
      )}
    </AdminLayoutWrapper>
  );
}
