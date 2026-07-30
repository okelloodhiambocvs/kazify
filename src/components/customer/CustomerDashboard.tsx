import React, { useState } from 'react';
import { User } from '../../types';
import { AlertTriangle, Send, Star } from 'lucide-react';
import CustomerLayoutWrapper from './CustomerLayoutWrapper';
import CustomerJobsList from './CustomerJobsList';
import CreateJobForm from './CreateJobForm';
import JobDetailPanel from './JobDetailPanel';
import FundiProfileModal from './FundiProfileModal';
import WalletManager from '../WalletManager';
import KYCVerification from '../KYCVerification';
import ContractManagement from '../ContractManagement';
import DisputeManagement from '../DisputeManagement';
import { useCustomerJobs } from '../../hooks/customer/useCustomerJobs';
import { useCreateJob } from '../../hooks/customer/useCreateJob';
import { useCustomerChat } from '../../hooks/customer/useCustomerChat';
import { useFundiProfileModal } from '../../hooks/customer/useFundiProfileModal';

export interface CustomerDashboardProps {
  user: User;
  onLogout: () => void;
  isWrapped?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  notifications?: any[];
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>;
  refreshTrigger?: number;
}

export default function CustomerDashboard({
  user,
  onLogout,
  isWrapped,
  activeTab: propsActiveTab,
  setActiveTab: propsSetActiveTab,
  notifications: propsNotifications,
  setNotifications,
  refreshTrigger = 0
}: CustomerDashboardProps) {
  const [localActiveTab, setLocalActiveTab] = useState('overview');
  const activeTab = propsActiveTab || localActiveTab;
  
  const handleTabChange = (newTab: string) => {
    if (propsSetActiveTab) propsSetActiveTab(newTab);
    setLocalActiveTab(newTab);
    if (newTab === 'request') {
      createJobHook.setShowCreateForm(true);
    } else {
      createJobHook.setShowCreateForm(false);
    }
  };

  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [paymentMethodTab, setPaymentMethodTab] = useState<'mpesa' | 'all'>('mpesa');

  const jobsHook = useCustomerJobs(user, propsNotifications, setNotifications, refreshTrigger);
  const {
    activeJobs,
    selectedJob,
    setSelectedJob,
    escrowTransactions,
    notifications,
    fetchCustomerJobs,
    fetchTransactions,
    fetchNotifications,
    handleAcceptBid,
    isSubmittingActiveJobReview,
    handleActiveJobReviewSubmit
  } = jobsHook;

  const createJobHook = useCreateJob(user, (newJob) => {
    fetchCustomerJobs();
    setSelectedJob(newJob);
  });

  const chatHook = useCustomerChat(selectedJob?.id);

  const profileModalHook = useFundiProfileModal(user);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <CustomerLayoutWrapper
      isWrapped={isWrapped}
      user={user}
      onLogout={onLogout}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      notifications={notifications}
      unreadCount={unreadCount}
      onRefresh={() => {
        fetchCustomerJobs();
        fetchNotifications();
        fetchTransactions();
      }}
    >
      {/* Dynamic Tab Views */}
      {activeTab === 'wallet' ? (
        <WalletManager user={user} />
      ) : activeTab === 'kyc' ? (
        <KYCVerification user={user} />
      ) : activeTab === 'contracts' ? (
        <ContractManagement user={user} />
      ) : activeTab === 'disputes' ? (
        <DisputeManagement user={user} />
      ) : (
        <div className="space-y-6">
          <CustomerJobsList
            activeJobs={activeJobs}
            selectedJob={selectedJob}
            setSelectedJob={setSelectedJob}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            escrowTransactions={escrowTransactions}
            setShowPaymentGateway={setShowPaymentGateway}
            setShowCreateForm={createJobHook.setShowCreateForm}
          />

          {createJobHook.showCreateForm ? (
            <CreateJobForm
              title={createJobHook.title}
              setTitle={createJobHook.setTitle}
              description={createJobHook.description}
              setDescription={createJobHook.setDescription}
              category={createJobHook.category}
              setCategory={createJobHook.setCategory}
              workflow={createJobHook.workflow}
              setWorkflow={createJobHook.setWorkflow}
              address={createJobHook.address}
              setAddress={createJobHook.setAddress}
              lat={createJobHook.lat}
              setLat={createJobHook.setLat}
              lng={createJobHook.lng}
              setLng={createJobHook.setLng}
              amount={createJobHook.amount}
              setAmount={createJobHook.setAmount}
              aiLoading={createJobHook.aiLoading}
              aiResult={createJobHook.aiResult}
              setAiResult={createJobHook.setAiResult}
              aiError={createJobHook.aiError}
              setAiError={createJobHook.setAiError}
              aiCooldown={createJobHook.aiCooldown}
              aiFailCount={createJobHook.aiFailCount}
              setShowSupportModal={createJobHook.setShowSupportModal}
              handleAiEstimate={createJobHook.handleAiEstimate}
              handleCreateJobSubmit={createJobHook.handleCreateJobSubmit}
            />
          ) : selectedJob ? (
            <JobDetailPanel
              user={user}
              selectedJob={selectedJob}
              showPaymentGateway={showPaymentGateway}
              setShowPaymentGateway={setShowPaymentGateway}
              paymentMethodTab={paymentMethodTab}
              setPaymentMethodTab={setPaymentMethodTab}
              fetchCustomerJobs={fetchCustomerJobs}
              fetchTransactions={fetchTransactions}
              handleAcceptBid={handleAcceptBid}
              handleOpenProfileModal={profileModalHook.handleOpenProfileModal}
              isSubmittingActiveJobReview={isSubmittingActiveJobReview}
              handleActiveJobReviewSubmit={handleActiveJobReviewSubmit}
              chatMessages={chatHook.chatMessages}
              newMessage={chatHook.newMessage}
              setNewMessage={chatHook.setNewMessage}
              handleSendChatMsg={() => chatHook.handleSendChatMsg(selectedJob, user)}
            />
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-3xl p-8 dark:bg-slate-950/20">
              <Star className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
              <h3 className="font-display font-bold text-lg text-white">No service request selected</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md">Click any order in your left list to see real-time map GPS tracking, fundi matching score, live escrow payouts, and coordinate chat panels.</p>
            </div>
          )}
        </div>
      )}

      {/* Tradesperson Profile Modal */}
      <FundiProfileModal
        showProfileModal={profileModalHook.showProfileModal}
        setShowProfileModal={profileModalHook.setShowProfileModal}
        profileLoading={profileModalHook.profileLoading}
        profileData={profileModalHook.profileData}
        profileFundiId={profileModalHook.profileFundiId}
        selectedBookingDate={profileModalHook.selectedBookingDate}
        setSelectedBookingDate={profileModalHook.setSelectedBookingDate}
        isSubmittingProfileReview={profileModalHook.isSubmittingProfileReview}
        handleProfileReviewSubmit={profileModalHook.handleProfileReviewSubmit}
      />

      {/* Toast Notification for Handshake failure alert */}
      {createJobHook.showToast && createJobHook.handshakeResult && (
        <div className="fixed bottom-5 right-5 z-[9999] max-w-sm p-4 bg-slate-900 border border-orange-500/40 text-white rounded-2xl shadow-2xl shadow-orange-500/10 animate-slideIn flex items-start space-x-3" id="gemini-toast-notification">
          <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-[11px] font-mono font-bold text-orange-400 uppercase tracking-wider">Gemini Service Notice</h4>
            <p className="text-[10px] text-slate-300 leading-relaxed">{createJobHook.handshakeResult.message || 'Gemini API is currently unreachable. Kazify has loaded local pricing fallback mode.'}</p>
          </div>
          <button 
            onClick={() => createJobHook.setShowToast(false)} 
            className="text-slate-500 hover:text-white transition font-mono text-xs px-1 cursor-pointer"
            id="close-gemini-toast-btn"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Support Chat Modal */}
      {createJobHook.showSupportModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" id="gemini-support-chat-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Kazify Live Support</h4>
                  <p className="text-[9px] text-slate-400">Agent Jane is active</p>
                </div>
              </div>
              <button 
                onClick={() => createJobHook.setShowSupportModal(false)}
                className="text-xs font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-1 rounded-md cursor-pointer"
                id="close-support-modal-btn"
              >
                CLOSE
              </button>
            </div>
            
            <div className="p-4 h-64 overflow-y-auto space-y-3 flex flex-col justify-end">
              <div className="flex flex-col space-y-1">
                <div className="bg-slate-950 text-slate-300 p-3 rounded-2xl rounded-tl-none text-[11px] leading-relaxed max-w-[85%] self-start border border-slate-800">
                  Hello! I am Jane from Kazify Support. I see that your Gemini AI price estimation service encountered an error or timed out.
                </div>
                <span className="text-[8px] font-mono text-slate-500 pl-1">Jane • Just now</span>
              </div>
              
              <div className="flex flex-col space-y-1">
                <div className="bg-slate-950 text-slate-300 p-3 rounded-2xl rounded-tl-none text-[11px] leading-relaxed max-w-[85%] self-start border border-slate-800">
                  I can assist you directly with your plumbing or trade project budget. What category of trade work are you planning to post?
                </div>
                <span className="text-[8px] font-mono text-slate-500 pl-1">Jane • Just now</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
              <input 
                type="text" 
                placeholder="Type your help query..."
                className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                id="support-chat-input-field"
                aria-label="Type your help query to Jane support agent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('support-chat-input-field') as HTMLInputElement;
                  if (input) input.value = '';
                }}
                className="p-2 bg-orange-500 text-slate-950 hover:bg-orange-400 transition rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                id="support-chat-send-btn"
                aria-label="Send support query message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayoutWrapper>
  );
}
