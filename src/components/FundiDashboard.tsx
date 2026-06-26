import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Star, MapPin, CheckCircle, Navigation, Play, 
  DollarSign, Send, MessageSquare, AlertCircle, Bell, LogOut, FileText, Wallet, Clock
} from 'lucide-react';
import { User, Job, Bid, ChatMessage } from '../types';
import DashboardLayout from './DashboardLayout';
import StatCard from './StatCard';
import api from '../services/api';
import { preloadService } from '../services/preloadService';
import WalletTab from './WalletTab';
import KYCTab from './KYCTab';
import ContractSignCard from './ContractSignCard';
import DisputePanel from './DisputePanel';
import KYCVerification from './KYCVerification';
import WalletManager from './WalletManager';
import DisputeManagement from './DisputeManagement';
import ContractManagement from './ContractManagement';
import EarningsOverview from './EarningsOverview';
import BookingCalendar from './BookingCalendar';

interface FundiDashboardProps {
  user: User;
  onLogout: () => void;
  isWrapped?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  notifications?: any[];
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>;
  refreshTrigger?: number;
}

interface FundiLayoutWrapperProps {
  isWrapped?: boolean;
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: any[];
  onRefresh: () => void;
  children: React.ReactNode;
}

function FundiLayoutWrapper({
  isWrapped,
  user,
  onLogout,
  activeTab,
  setActiveTab,
  notifications,
  onRefresh,
  children
}: FundiLayoutWrapperProps) {
  if (isWrapped) {
    return <div className="space-y-6 text-left">{children}</div>;
  }
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      role="fundi"
      title="Trades Expert"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notifications={notifications}
      unreadCount={notifications.length}
      onRefresh={onRefresh}
    >
      {children}
    </DashboardLayout>
  );
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
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [availableBiddingJobs, setAvailableBiddingJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  const [localActiveTab, setLocalActiveTab] = useState('overview');
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : localActiveTab;
  const setActiveTab = propsSetActiveTab !== undefined ? propsSetActiveTab : setLocalActiveTab;

  const selectedJobRef = React.useRef<Job | null>(null);
  useEffect(() => {
    selectedJobRef.current = selectedJob;
  }, [selectedJob]);

  // Bid form state
  const [bidAmount, setBidAmount] = useState<number>(1000);
  const [bidNote, setBidNote] = useState('I can solve this leak using professional high-grade copper fittings.');
  const [bidDuration, setBidDuration] = useState<number>(1);

  // Chat window state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Notifications
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);
  const notifications = propsNotifications !== undefined ? propsNotifications : localNotifications;
  const setNotificationsState = setNotifications || setLocalNotifications;

  // WS ref
  const wsRef = React.useRef<WebSocket | null>(null);

  const fetchFundiJobs = async () => {
    try {
      const preloadKey = `fundi-jobs-${user.id}`;
      const promise = preloadService.get(preloadKey) || api.get(`/api/jobs?role=fundi&user_id=${user.id}`);
      preloadService.clear(preloadKey);
      const res = await promise;
      const data = res.data;
      
      // Separate assigned active vs unclaimed bidding list
      const assigned = data.filter((j: Job) => j.fundi_id === user.id);
      const openForBids = data.filter((j: Job) => !j.fundi_id && j.category === user.category);
      
      setAssignedJobs(assigned);
      setAvailableBiddingJobs(openForBids);

      if (selectedJobRef.current) {
        const updated = data.find((j: Job) => j.id === selectedJobRef.current?.id);
        if (updated) setSelectedJob(updated);
      }
    } catch (e) {
      console.error('Fundi job lists loading error', e);
    }
  };

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchFundiJobs();
      fetchNotifications();
    }
  }, [refreshTrigger]);

  const fetchNotifications = async () => {
    try {
      const preloadKey = `fundi-notifications-${user.id}`;
      const promise = preloadService.get(preloadKey) || api.get(`/api/notifications?user_id=${user.id}`);
      preloadService.clear(preloadKey);
      const res = await promise;
      setNotificationsState(res.data);
    } catch (e) {
      console.error('Notifications check error', e);
    }
  };

  useEffect(() => {
    fetchFundiJobs();
    fetchNotifications();

    // WS connectivity setup
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws?user_id=${user.id}`);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'auth_register',
        user_id: user.id
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'job_status_change' || payload.type === 'new_instant_dispatch' || payload.type === 'new_quotation_job' || payload.type === 'escrow_received') {
          fetchFundiJobs();
        }
        if (payload.type === 'new_chat_message') {
          setChatMessages((prev) => [...prev, payload.chatMessage]);
        }
        if (payload.type === 'notification') {
          setNotificationsState((prev) => [payload.notification, ...prev]);
        }
      } catch (err) {
        console.error('WS Fundi message block failure', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [user.id]);

  useEffect(() => {
    if (selectedJob) {
      api.get(`/api/chats/${selectedJob.id}`)
        .then(res => setChatMessages(res.data))
        .catch(err => console.error('Chat fetch failed', err));
    }
  }, [selectedJob?.id]);

  // Submit quotation bid
  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      await api.post('/api/bids', {
        job_id: selectedJob.id,
        fundi_id: user.id,
        amount: bidAmount,
        note: bidNote,
        duration_days: bidDuration
      });
      alert('Your bid quote was submitted successfully!');
      fetchFundiJobs();
    } catch (err) {
      console.error('Bid post failure', err);
    }
  };

  // Accept instant uber dispatch workflow
  const handleAcceptInstantJob = async (jobId: string) => {
    try {
      const res = await api.post(`/api/jobs/${jobId}/accept-instant`, { fundi_id: user.id });
      fetchFundiJobs();
      setSelectedJob(res.data.job || res.data);
    } catch (err) {
      console.error('Accept dispatch failed', err);
    }
  };

  // State progressing actions
  const handleProgressStatus = async (jobId: string, status: 'en_route' | 'started' | 'completed') => {
    try {
      await api.post(`/api/jobs/${jobId}/status`, { status });
      fetchFundiJobs();
    } catch (err) {
      console.error('Progress failed', err);
    }
  };

  // Send communication text
  const handleSendChatMsg = async () => {
    if (!newMessage.trim() || !selectedJob) return;
    try {
      const res = await api.post('/api/chats', {
        job_id: selectedJob.id,
        sender_id: user.id,
        sender_name: user.name,
        message: newMessage
      });
      const msg = res.data;
      setChatMessages((prev) => [...prev, msg]);
      setNewMessage('');
    } catch (e) {
      console.error('Chat error', e);
    }
  };

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
          value={`KES ${assignedJobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + j.amount, 0).toLocaleString()}`}
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
        {/* Left Side: Fundi Statistics & pending orders available */}
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
                      <span className="text-[10px] text-orange-400 font-mono">KES {job.amount.toLocaleString()}</span>
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
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">Budget KES {job.amount.toLocaleString()}</span>
                        <span className="text-[9px] text-gray-400">{job.address}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Contract status updates, maps tracking actions, chat messaging */}
        <div className="lg:col-span-8">
          {selectedJob ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Selected Job Actions and communications */}
              <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-6 flex flex-col justify-between min-h-[450px]">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500">Service Order: {selectedJob.id}</span>
                      <h3 className="font-display font-bold text-lg text-white mt-1">{selectedJob.title}</h3>
                    </div>
                    
                    <span className="text-xs bg-slate-900 font-bold px-2 py-1 text-slate-400 border border-slate-800/80 rounded">
                      {selectedJob.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-slate-400 mt-4 text-sm leading-relaxed">{selectedJob.description}</p>
                </div>

                {/* Submitting custom bids if quotation workflow and unclaimed */}
                {selectedJob.workflow === 'quotation' && !selectedJob.fundi_id && (
                  <form onSubmit={handleSubmitBid} className="space-y-4 border-t border-slate-900 pt-4">
                    <span className="text-xs text-orange-400 font-bold block">SUBMIT QUOTATION PROPOSAL</span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fundi-bid-amount" className="text-xs text-gray-400 font-mono block mb-1">Your Price Offer (KES)</label>
                        <input
                          id="fundi-bid-amount"
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                          aria-label="Your Price Offer in KES"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                        />
                      </div>

                      <div>
                        <label htmlFor="fundi-bid-duration" className="text-xs text-gray-400 font-mono block mb-1">Work Time (Days)</label>
                        <input
                          id="fundi-bid-duration"
                          type="number"
                          value={bidDuration}
                          onChange={(e) => setBidDuration(parseInt(e.target.value) || 1)}
                          aria-label="Estimated Work Time in Days"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="fundi-bid-note" className="text-xs text-gray-400 font-mono block mb-1">Your Pitch Note</label>
                      <textarea
                        id="fundi-bid-note"
                        value={bidNote}
                        onChange={(e) => setBidNote(e.target.value)}
                        rows={2}
                        aria-label="Your Pitch Note to Client"
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      type="submit"
                      aria-label="Submit quotation details proposal"
                      className="w-full py-3 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-400 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                    >
                      SUBMIT QUOTATION DETAILS
                    </button>
                  </form>
                )}

                {/* Accepting instant matching jobs alerts */}
                {selectedJob.workflow === 'instant' && selectedJob.status === 'matching' && (
                  <div className="bg-slate-905 p-5 rounded-2xl border border-slate-800 text-left space-y-4">
                    <span className="text-xs text-orange-400 font-bold block animate-pulse">⚡ ON-DEMAND INSTANT DISPATCH DISPATCH ALERT</span>
                    <p className="text-xs text-gray-300">This client needs immediate water tank repairs/leak fixed nearby in Milimani Estate. Secure held escrow and match instantly.</p>
                    <button
                      onClick={() => handleAcceptInstantJob(selectedJob.id)}
                      aria-label={`Accept instant match dispatch job for KES ${selectedJob.amount.toLocaleString()}`}
                      className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                    >
                      ACCEPT INSTANT MATCH DISPATCH KES {selectedJob.amount.toLocaleString()}
                    </button>
                  </div>
                )}

                {/* Assigned Active contract controls and progress state indicators */}
                {selectedJob.fundi_id === user.id && (
                  <div className="space-y-4 border-t border-slate-900 pt-4">
                    <span className="text-xs text-gray-400 font-semibold block">CONTRACT GPS LIFE CYCLE ACTIONS</span>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleProgressStatus(selectedJob.id, 'en_route')}
                        disabled={selectedJob.status !== 'accepted'}
                        aria-label="Mark en route to customer location"
                        className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-orange-500 font-medium text-xs disabled:opacity-30 flex flex-col items-center justify-center space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                      >
                        <Navigation className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>MARK EN ROUTE</span>
                      </button>

                      <button
                        onClick={() => handleProgressStatus(selectedJob.id, 'started')}
                        disabled={selectedJob.status !== 'en_route'}
                        aria-label="Start working on the task"
                        className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-orange-500 font-medium text-xs disabled:opacity-30 flex flex-col items-center justify-center space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                      >
                        <Play className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>START LABOUR</span>
                      </button>

                      <button
                        onClick={() => handleProgressStatus(selectedJob.id, 'completed')}
                        disabled={selectedJob.status !== 'started'}
                        aria-label="Mark job work as fully completed"
                        className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-orange-500 font-medium text-xs disabled:opacity-30 flex flex-col items-center justify-center space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>FINALIZE WORK</span>
                      </button>
                    </div>

                    {/* Digital Contract Agreement */}
                    <div className="mt-4">
                      <ContractSignCard
                        jobId={selectedJob.id}
                        user={user}
                        onSignedSuccess={fetchFundiJobs}
                      />
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-slate-200 mt-4">
                      <span>Held M-Pesa Escrow Wallet status:</span>
                      <span className="font-bold font-mono text-orange-400">{selectedJob.escrow_status.toUpperCase()}</span>
                    </div>

                    {/* Dispute arbitration management panel */}
                    <div className="mt-4">
                      <DisputePanel
                        jobId={selectedJob.id}
                        user={user}
                        onStateChanged={fetchFundiJobs}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Direct text messages coordination */}
              <div className="md:col-span-5 flex flex-col h-[450px]">
                {selectedJob.fundi_id === user.id ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 text-left flex flex-col h-full">
                    <span className="text-xs font-mono text-gray-500 uppercase block border-b border-slate-800 pb-2 mb-2 flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                      <span>Coordinate Task Elements with Client</span>
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-2 p-1 max-h-[300px]">
                      {chatMessages.length === 0 ? (
                        <span className="text-[10px] text-slate-600 block text-center py-6">No communication text logged. Coordinate materials lists above.</span>
                      ) : (
                        chatMessages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`p-2 rounded-xl max-w-[85%] text-xs ${
                              msg.sender_id === user.id ? 'bg-orange-500 text-slate-950 font-medium ml-auto' : 'bg-slate-900 border border-slate-800 text-slate-100 mr-auto'
                            }`}
                          >
                            <span className="text-[9px] opacity-75 block font-bold mb-0.5">{msg.sender_name}</span>
                            <p className="leading-snug">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mt-auto">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type message text..."
                        aria-label="Type message text to contract chat partner"
                        className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendChatMsg}
                        aria-label="Send message text"
                        className="p-2 rounded-xl bg-orange-500 text-slate-950 hover:bg-orange-400 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left flex items-center justify-center h-full text-slate-500 text-xs">
                    <span>Chat panel links establish after contract assignment is accepted.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-3xl p-8 dark:bg-slate-950/25">
              <Briefcase className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
              <h3 className="font-display font-bold text-lg text-white">No job selected</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm text-center">Click any contract panel under your lists to manage milestones, update live tracking GPS, coordinate messages, or construct quotation proposals.</p>
            </div>
          )}
        </div>
      </div>
    </FundiLayoutWrapper>
  );
}
