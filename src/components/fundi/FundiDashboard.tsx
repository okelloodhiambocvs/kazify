import React, { useState } from 'react';
import { Briefcase, Wallet, Clock } from 'lucide-react';
import { User } from '../../types';
import StatCard from '../StatCard';
import WalletManager from '../WalletManager';
import DisputeManagement from '../DisputeManagement';
import ContractManagement from '../ContractManagement';
import EarningsOverview from '../EarningsOverview';
import BookingCalendar from '../BookingCalendar';
import KYCVerification from '../KYCVerification';
import FundiLayoutWrapper from './FundiLayoutWrapper';
import FundiJobsFeed from './FundiJobsFeed';
import FundiActiveJobs from './FundiActiveJobs';
import { useFundiJobs } from '../../hooks/fundi/useFundiJobs';
import { useFundiBids } from '../../hooks/fundi/useFundiBids';
import { useFundiChat } from '../../hooks/fundi/useFundiChat';

export interface FundiDashboardProps {
  user: User;
  onLogout: () => void;
  isWrapped?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  notifications?: any[];
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>;
  refreshTrigger?: number;
}

export default function FundiDashboard({
  user,
  onLogout,
  isWrapped,
  activeTab: propsActiveTab,
  setActiveTab: propsSetActiveTab,
  notifications: propsNotifications,
  setNotifications,
  refreshTrigger = 0
}: FundiDashboardProps) {
  const [localActiveTab, setLocalActiveTab] = useState('overview');
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : localActiveTab;
  const setActiveTab = propsSetActiveTab !== undefined ? propsSetActiveTab : setLocalActiveTab;

  // 1. Chat hook
  const {
    chatMessages,
    addChatMessage,
    newMessage,
    setNewMessage,
    handleSendChatMsg
  } = useFundiChat();

  // 2. Jobs hook
  const {
    assignedJobs,
    availableBiddingJobs,
    selectedJob,
    setSelectedJob,
    notifications,
    fetchFundiJobs,
    handleAcceptInstantJob,
    handleProgressStatus
  } = useFundiJobs(user, propsNotifications, setNotifications, refreshTrigger, addChatMessage);

  // 3. Bids hook
  const {
    bidAmount,
    setBidAmount,
    bidDuration,
    setBidDuration,
    bidNote,
    setBidNote,
    handleSubmitBid
  } = useFundiBids(user, selectedJob, fetchFundiJobs);

  // Handle send chat msg wrapper
  const onSendChat = () => {
    handleSendChatMsg(selectedJob, user);
  };

  // Tab routing
  if (activeTab === 'wallet') {
    return (
      <FundiLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onRefresh={fetchFundiJobs}
      >
        <WalletManager user={user} />
      </FundiLayoutWrapper>
    );
  }

  if (activeTab === 'kyc') {
    return (
      <FundiLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onRefresh={fetchFundiJobs}
      >
        <KYCVerification user={user} />
      </FundiLayoutWrapper>
    );
  }

  if (activeTab === 'contracts') {
    return (
      <FundiLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onRefresh={fetchFundiJobs}
      >
        <ContractManagement user={user} onContractSigned={fetchFundiJobs} />
      </FundiLayoutWrapper>
    );
  }

  if (activeTab === 'disputes') {
    return (
      <FundiLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onRefresh={fetchFundiJobs}
      >
        <DisputeManagement user={user} />
      </FundiLayoutWrapper>
    );
  }

  if (activeTab === 'earnings') {
    return (
      <FundiLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onRefresh={fetchFundiJobs}
      >
        <EarningsOverview user={user} assignedJobs={assignedJobs} />
      </FundiLayoutWrapper>
    );
  }

  if (activeTab === 'calendar') {
    return (
      <FundiLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onRefresh={fetchFundiJobs}
      >
        <div className="space-y-4">
          <div>
            <h2 className="font-display font-medium text-lg text-white">Trades Dispatch Availability</h2>
            <p className="text-xs text-slate-500 font-mono">
              Mark unavailable dates and configure daily working hours to automate your incoming job allocations
            </p>
          </div>
          <BookingCalendar fundiId={user.id} isEditable={true} />
        </div>
      </FundiLayoutWrapper>
    );
  }

  return (
    <FundiLayoutWrapper
      isWrapped={isWrapped}
      user={user}
      onLogout={onLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      notifications={notifications}
      onRefresh={fetchFundiJobs}
    >
      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" id="fundi-stats-grid">
        <StatCard
          id="fundi-stat-active"
          title="Active Contracts"
          value={assignedJobs.filter(j => j.status !== 'completed').length}
          icon={<Clock className="w-4 h-4" />}
          description="Assigned tasks in progress"
          trend={{ value: 'In progress', type: 'positive' }}
          onClick={() => setActiveTab('jobs')}
        />
        <StatCard
          id="fundi-stat-earnings"
          title="Total Earnings"
          value={`KES ${assignedJobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (j.amount || 0), 0).toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
          description="Settled Escrow payouts"
          trend={{ value: '100% Disbursed', type: 'positive' }}
          onClick={() => setActiveTab('overview')}
        />
        <StatCard
          id="fundi-stat-leads"
          title="Available Leads"
          value={availableBiddingJobs.length}
          icon={<Briefcase className="w-4 h-4" />}
          description={`Requests in ${user.category || 'Trades'}`}
          trend={{ value: 'New bids open', type: 'neutral' }}
          onClick={() => setActiveTab('leads')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 text-left">
        <FundiJobsFeed
          user={user}
          activeTab={activeTab}
          assignedJobs={assignedJobs}
          availableBiddingJobs={availableBiddingJobs}
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
        />

        <FundiActiveJobs
          user={user}
          selectedJob={selectedJob}
          fetchFundiJobs={fetchFundiJobs}
          handleAcceptInstantJob={handleAcceptInstantJob}
          handleProgressStatus={handleProgressStatus}
          bidAmount={bidAmount}
          setBidAmount={setBidAmount}
          bidDuration={bidDuration}
          setBidDuration={setBidDuration}
          bidNote={bidNote}
          setBidNote={setBidNote}
          handleSubmitBid={handleSubmitBid}
          chatMessages={chatMessages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendChatMsg={onSendChat}
        />
      </div>
    </FundiLayoutWrapper>
  );
}
