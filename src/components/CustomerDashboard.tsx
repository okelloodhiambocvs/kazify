import React, { useState, useEffect } from 'react';
import { 
  Plus, Droplet, Zap, Hammer, Car, Sparkles, Leaf, Shield, 
  MapPin, Clock, DollarSign, Send, MessageSquare, ShieldCheck, 
  Trash2, AlertTriangle, Cpu, Star, ArrowRight, Wallet, Bell, LogOut, Compass, Calendar
} from 'lucide-react';
import { User, Job, Bid, ChatMessage, EscrowTransaction } from '../types';
import MapMock from './MapMock';
import DashboardLayout from './DashboardLayout';
import StatCard from './StatCard';
import PaymentGateway from './PaymentGateway';
import LocationPicker from './LocationPicker';
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
import ReviewRating from './ReviewRating';
import BookingCalendar from './BookingCalendar';
import { validateGeminiEstimateResponse } from '../utils/geminiValidation';
import { GeminiErrorFallback } from './GeminiErrorFallback';
import { performGeminiHandshake } from '../utils/geminiDiagnostics';
import { GeminiErrorBoundary } from './GeminiErrorBoundary';

interface CustomerDashboardProps {
  user: User;
  onLogout: () => void;
  isWrapped?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  notifications?: any[];
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>;
  refreshTrigger?: number;
}

interface CustomerLayoutWrapperProps {
  isWrapped?: boolean;
  user: User;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifications: any[];
  unreadCount: number;
  onRefresh: () => void;
  children: React.ReactNode;
}

function CustomerLayoutWrapper({
  isWrapped,
  user,
  onLogout,
  activeTab,
  onTabChange,
  notifications,
  unreadCount,
  onRefresh,
  children
}: CustomerLayoutWrapperProps) {
  if (isWrapped) {
    return <div className="space-y-6 text-left">{children}</div>;
  }
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      role="customer"
      title="Client Center"
      activeTab={activeTab}
      onTabChange={onTabChange}
      notifications={notifications}
      unreadCount={unreadCount}
      onRefresh={onRefresh}
    >
      {children}
    </DashboardLayout>
  );
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
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  const [localActiveTab, setLocalActiveTab] = useState('overview');
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : localActiveTab;
  const setActiveTab = propsSetActiveTab !== undefined ? propsSetActiveTab : setLocalActiveTab;

  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [escrowTransactions, setEscrowTransactions] = useState<EscrowTransaction[]>([]);

  const selectedJobRef = React.useRef<Job | null>(null);
  useEffect(() => {
    selectedJobRef.current = selectedJob;
  }, [selectedJob]);

  // Fetch all escrow records to monitor pending payments
  const fetchTransactions = async () => {
    try {
      const preloadKey = 'customer-escrow-history';
      const promise = preloadService.get(preloadKey) || api.get('/api/escrow/history');
      preloadService.clear(preloadKey);
      const res = await promise;
      setEscrowTransactions(res.data);
    } catch (e) {
      console.error('Failed to load escrow transaction ledger', e);
    }
  };
  
  // Job Form state
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Profile & Reviews Dialog state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFundiId, setProfileFundiId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  
  // Submit new review inside profile modal
  const [profileReviewRating, setProfileReviewRating] = useState(5);
  const [profileReviewComment, setProfileReviewComment] = useState('');
  const [isSubmittingProfileReview, setIsSubmittingProfileReview] = useState(false);

  // Leave a review block state for active jobs
  const [activeJobReviewRating, setActiveJobReviewRating] = useState(5);
  const [activeJobReviewComment, setActiveJobReviewComment] = useState('');
  const [isSubmittingActiveJobReview, setIsSubmittingActiveJobReview] = useState(false);

  const handleOpenProfileModal = async (fundiId: string) => {
    setProfileFundiId(fundiId);
    setShowProfileModal(true);
    setProfileLoading(true);
    setProfileData(null);
    setProfileReviewComment('');
    setProfileReviewRating(5);
    setSelectedBookingDate('');
    try {
      const res = await api.get(`/api/fundis/${fundiId}/profile`);
      setProfileData(res.data);
    } catch (e) {
      console.error('Failed to fetch fundi profile attributes', e);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFundiId) return;
    setIsSubmittingProfileReview(true);
    try {
      await api.post('/api/reviews', {
        fundi_id: profileFundiId,
        customer_id: user.id,
        customer_name: user.name,
        rating: profileReviewRating,
        comment: profileReviewComment
      });
      // Refresh statistics and reviews
      const res = await api.get(`/api/fundis/${profileFundiId}/profile`);
      setProfileData(res.data);
      setProfileReviewComment('');
      setProfileReviewRating(5);
    } catch (e) {
      console.error('Failed to submit review', e);
    } finally {
      setIsSubmittingProfileReview(false);
    }
  };

  const handleActiveJobReviewSubmit = async (jobId: string, fundiId: string, ratingValue?: number, commentValue?: string) => {
    setIsSubmittingActiveJobReview(true);
    try {
      await api.post('/api/reviews', {
        fundi_id: fundiId,
        customer_id: user.id,
        customer_name: user.name,
        rating: ratingValue !== undefined ? ratingValue : activeJobReviewRating,
        comment: commentValue !== undefined ? commentValue : activeJobReviewComment,
        job_id: jobId
      });
      setActiveJobReviewComment('');
      setActiveJobReviewRating(5);
      // reload customer jobs
      fetchCustomerJobs();
    } catch (e) {
      console.error('Failed to submit job review', e);
    } finally {
      setIsSubmittingActiveJobReview(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'request') {
      setShowCreateForm(true);
      setAiResult(null);
    } else {
      setShowCreateForm(false);
    }
  };
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [workflow, setWorkflow] = useState<'instant' | 'quotation'>('instant');
  const [address, setAddress] = useState('Nairobi CBD Center');
  const [lat, setLat] = useState<number>(-1.286389);
  const [lng, setLng] = useState<number>(36.817223);
  const [amount, setAmount] = useState<number>(1200);

  // AI Assistant Estimation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCooldown, setAiCooldown] = useState(0);
  const lastTriggerTimeRef = React.useRef<number>(0);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (aiCooldown > 0) {
      const timer = setTimeout(() => {
        setAiCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [aiCooldown]);

  // Advanced Diagnostics, Handshake, and Fallback variables
  const [handshakeResult, setHandshakeResult] = useState<{ status: 'ok' | 'error' | 'pending'; message?: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [aiFailCount, setAiFailCount] = useState(0);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const aiAbortControllerRef = React.useRef<AbortController | null>(null);

  // Chat window state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Notifications
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);
  const notifications = propsNotifications !== undefined ? propsNotifications : localNotifications;
  const setNotificationsState = setNotifications || setLocalNotifications;

  const [showNotifications, setShowNotifications] = useState(false);

  // Websocket connection ref
  const wsRef = React.useRef<WebSocket | null>(null);

  // Fetch current customer jobs on load
  const fetchCustomerJobs = async () => {
    try {
      const preloadKey = `customer-jobs-${user.id}`;
      const promise = preloadService.get(preloadKey) || api.get(`/api/jobs?role=customer&user_id=${user.id}`);
      preloadService.clear(preloadKey);
      const res = await promise;
      const data = res.data;
      setActiveJobs(data);
      
      // Update selected job details if open
      if (selectedJobRef.current) {
        const updated = data.find((j: Job) => j.id === selectedJobRef.current?.id);
        if (updated) setSelectedJob(updated);
      }
    } catch (e) {
      console.error('Jobs fetch failed', e);
    }
  };

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCustomerJobs();
      fetchNotifications();
      fetchTransactions();
    }
  }, [refreshTrigger]);

  const fetchNotifications = async () => {
    try {
      const preloadKey = `customer-notifications-${user.id}`;
      const promise = preloadService.get(preloadKey) || api.get(`/api/notifications?user_id=${user.id}`);
      preloadService.clear(preloadKey);
      const res = await promise;
      setNotificationsState(res.data);
    } catch (e) {
      console.error('Notifications fetch failed', e);
    }
  };

  useEffect(() => {
    fetchCustomerJobs();
    fetchNotifications();
    fetchTransactions();

    // Setup WebSockets
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws?user_id=${user.id}`);
    wsRef.current = socket;

    socket.onopen = () => {
      // Register credentials to socket registry
      socket.send(JSON.stringify({
        type: 'auth_register',
        user_id: user.id
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'job_status_change' || payload.type === 'new_bid' || payload.type === 'escrow_received') {
          fetchCustomerJobs();
          fetchTransactions();
        }
        if (payload.type === 'tracking_update') {
          // Live coordinates push
          setActiveJobs((prev) => 
            prev.map((j) => {
              if (j.id === payload.job_id) {
                return {
                  ...j,
                  fundi_lat: payload.fundi_location.lat,
                  fundi_lng: payload.fundi_location.lng,
                  estimated_duration: payload.eta
                };
              }
              return j;
            })
          );
          setSelectedJob((prev) => {
            if (prev && prev.id === payload.job_id) {
              return {
                ...prev,
                fundi_lat: payload.fundi_location.lat,
                fundi_lng: payload.fundi_location.lng,
                estimated_duration: payload.eta
              };
            }
            return prev;
          });
        }
        if (payload.type === 'new_chat_message') {
          setChatMessages((prev) => [...prev, payload.chatMessage]);
        }
        if (payload.type === 'notification') {
          setNotificationsState((prev) => [payload.notification, ...prev]);
        }
      } catch (err) {
        console.error('WS client message parse failed', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [user.id]);

  useEffect(() => {
    if (selectedJob) {
      // Fetch Chats
      api.get(`/api/chats/${selectedJob.id}`)
        .then(res => setChatMessages(res.data))
        .catch(err => console.error('Chat fetch failed', err));
    }
  }, [selectedJob?.id]);

  // Trigger diagnostic handshake when the user opens the create job form
  useEffect(() => {
    if (showCreateForm) {
      setHandshakeResult({ status: 'pending' });
      performGeminiHandshake().then((res) => {
        setHandshakeResult(res);
        if (res.status === 'error') {
          setShowToast(true);
        }
      });
    } else {
      setShowToast(false);
      setHandshakeResult(null);
      // Abort any pending Gemini API request if form is closed
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
    }
  }, [showCreateForm]);

  // Cleanup abort controller on component unmount
  useEffect(() => {
    return () => {
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
      }
    };
  }, []);

  const CATEGORY_MANUAL_PRICE_RANGES: Record<string, { min: number, max: number, recommended: number, description: string }> = {
    Plumbing: { min: 1000, max: 5000, recommended: 2500, description: "Typical leak repair, unclogging, or pipe fixtures." },
    Electrical: { min: 1500, max: 8000, recommended: 3500, description: "Wiring fix, sockets replacement, or diagnostics." },
    Construction: { min: 3000, max: 20000, recommended: 8500, description: "Masonry work, small structural fixes, tiling, or remodeling." },
    Automotive: { min: 1200, max: 10000, recommended: 4000, description: "Mechanical engine diagnostics, battery swap, or brake service." },
    Cleaning: { min: 800, max: 4000, recommended: 1800, description: "Deep cleaning, dry-cleaning, sofa vacuuming, or post-construction dust removal." },
    Outdoor: { min: 1000, max: 6000, recommended: 3000, description: "Gardening, compound clear-up, tree pruning, or landscaping." },
    Specialized: { min: 2500, max: 15000, recommended: 6000, description: "CCTV surveillance setup, advanced smart lock installations, or diagnostics." }
  };

  // AI Estimation Engine trigger
  const handleAiEstimate = async () => {
    if (!title) return;

    // Client-side request throttle to prevent API exhaustion and redundant rapid clicks
    const now = Date.now();
    const timeSinceLast = now - lastTriggerTimeRef.current;
    if (timeSinceLast < 4000) {
      const remainingSecs = Math.ceil((4000 - timeSinceLast) / 1000);
      setAiCooldown(remainingSecs);
      return;
    }

    lastTriggerTimeRef.current = now;

    // Abort previous pending estimation if user triggers again rapidly
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    console.log('[AI Estimate] Triggered estimation for job:', { title, description, category, address });
    
    try {
      const res = await api.post('/api/ai/estimate', {
        title,
        description,
        category,
        locationName: address
      }, {
        signal: controller.signal
      });
      
      console.log('[AI Estimate] Received response from server:', res);
      
      const data = res.data;
      if (!data) {
        throw new Error('Received empty or null response from the server.');
      }
      
      if (typeof data !== 'object') {
        throw new Error(`Expected a JSON object but received type "${typeof data}".`);
      }
      
      const isValid = validateGeminiEstimateResponse(data);
      if (!isValid) {
        throw new Error('Service Temporarily Unavailable');
      }
      
      const estimatedAmt = data.estimated_amount;
      setAiResult(data);
      setAmount(estimatedAmt);
      setAiFailCount(0); // Reset fail count on successful parse
      console.log('[AI Estimate] Estimation succeeded and parsed successfully:', data);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        console.log('[AI Estimate] Pricing estimation request was successfully aborted.');
        return; // Don't set error or update loading state if aborted
      }

      console.error('[AI Estimate] Pricing estimation request failed:', err);
      setAiFailCount(prev => prev + 1);

      if (err.message === 'Service Temporarily Unavailable') {
        setAiError('Service Temporarily Unavailable');
      } else {
        const serverErrorMessage = err.response?.data?.error || err.response?.data?.details;
        const finalErrorMessage = serverErrorMessage || err.message || "Failed to process the AI estimation. Please try again.";
        setAiError(finalErrorMessage);
      }
    } finally {
      if (aiAbortControllerRef.current === controller) {
        aiAbortControllerRef.current = null;
      }
      setAiLoading(false);
    }
  };

  // Create Job service dispatch
  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/jobs', {
        customer_id: user.id,
        title,
        description,
        category,
        workflow,
        lat,
        lng,
        address,
        amount
      });
      const newJob = res.data;
      // Clear forms
      setTitle('');
      setDescription('');
      setLat(-0.0917);
      setLng(34.7680);
      setAiResult(null);
      setShowCreateForm(false);
      fetchCustomerJobs();
      setSelectedJob(newJob);
    } catch (err) {
      console.error('Post job failed', err);
    }
  };

  // M-Pesa simulated payment trigger
  const handleStkPushTrigger = async (jobId: string, KES: number) => {
    try {
      await api.post('/api/mpesa/stkpush', {
        phone_number: user.phone || '0700000001',
        amount: KES,
        job_id: jobId
      });
      // Show simulated alert for STK Push sent
      alert(`M-Pesa STK Push of KES ${KES} sent to your phone. Enter your PIN on the prompt to secure escrow.`);
    } catch (e) {
      console.error('M-Pesa Push trigger error', e);
    }
  };

  // Release payment held in escrow
  const handleReleaseEscrow = async (jobId: string) => {
    try {
      await api.post(`/api/jobs/${jobId}/status`, { status: 'completed' });
      fetchCustomerJobs();
    } catch (e) {
      console.error('Release failed', e);
    }
  };

  // Accept Upwork Bid
  const handleAcceptBid = async (bidId: string) => {
    try {
      await api.post(`/api/bids/${bidId}/accept`);
      fetchCustomerJobs();
    } catch (e) {
      console.error('Bid accept error', e);
    }
  };

  // Send Custom Messages
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
      console.error('Chat deliver failure', e);
    }
  };

  const statusOrder = ['matching', 'accepted', 'en_route', 'started', 'completed'];
  const getStatusIndex = (status: string) => {
    const idx = statusOrder.indexOf(status);
    return idx !== -1 ? idx : 0;
  };

  const getCategoryIcon = (catName: string) => {
    switch (catName) {
      case 'Plumbing': return <Droplet className="w-4 h-4 text-blue-500" />;
      case 'Electrical': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Construction': return <Hammer className="w-4 h-4 text-orange-500" />;
      case 'Automotive': return <Car className="w-4 h-4 text-red-500" />;
      case 'Cleaning': return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'Outdoor': return <Leaf className="w-4 h-4 text-lime-500" />;
      default: return <Shield className="w-4 h-4 text-indigo-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredJobs = activeJobs.filter(job => {
    if (activeTab === 'history') {
      return job.status === 'completed';
    }
    return job.status !== 'completed';
  });

  if (activeTab === 'wallet') {
    return (
      <CustomerLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={fetchCustomerJobs}
      >
        <WalletManager user={user} />
      </CustomerLayoutWrapper>
    );
  }

  if (activeTab === 'kyc') {
    return (
      <CustomerLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={fetchCustomerJobs}
      >
        <KYCVerification user={user} />
      </CustomerLayoutWrapper>
    );
  }

  if (activeTab === 'contracts') {
    return (
      <CustomerLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={fetchCustomerJobs}
      >
        <ContractManagement user={user} onContractSigned={fetchCustomerJobs} />
      </CustomerLayoutWrapper>
    );
  }

  if (activeTab === 'disputes') {
    return (
      <CustomerLayoutWrapper
        isWrapped={isWrapped}
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={fetchCustomerJobs}
      >
        <DisputeManagement user={user} />
      </CustomerLayoutWrapper>
    );
  }

  return (
    <CustomerLayoutWrapper
      isWrapped={isWrapped}
      user={user}
      onLogout={onLogout}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      notifications={notifications}
      unreadCount={unreadCount}
      onRefresh={fetchCustomerJobs}
    >
      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" id="customer-stats-grid">
        <StatCard
          id="cust-stat-active-requests"
          title="Active Requests"
          value={activeJobs.filter(j => j.status !== 'completed').length}
          icon={<Clock className="w-4 h-4" />}
          description="Awaiting match or in progress"
          trend={{ value: 'Live dispatch', type: 'positive' }}
          onClick={() => handleTabChange('overview')}
        />
        <StatCard
          id="cust-stat-escrow-balance"
          title="Funds held in Escrow"
          value={`KES ${activeJobs.filter(j => j.escrow_status === 'held').reduce((acc, j) => acc + j.amount, 0).toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
          description="Secured M-PESA escrow"
          trend={{ value: '100% Secure', type: 'neutral' }}
          onClick={() => handleTabChange('overview')}
        />
        <StatCard
          id="cust-stat-completed-orders"
          title="Completed Orders"
          value={activeJobs.filter(j => j.status === 'completed').length}
          icon={<ShieldCheck className="w-4 h-4" />}
          description="Historic assignments past"
          trend={{ value: 'Success rate', type: 'positive' }}
          onClick={() => handleTabChange('history')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 text-left">
        {/* Left Side: Services lists & Book Form buttons */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
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
                    <span className="text-xs font-bold text-gray-200">KES {job.amount.toLocaleString()}</span>
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

        {/* Center/Right Side: Dynamic Active View */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Create Job Form Modal Panel */}
          {showCreateForm ? (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl"></div>
              
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="font-display font-bold text-xl text-white">Post Service Request</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Launches dispatch match or quotation bidders across Kenya</p>
                </div>
                <button
                  onClick={() => handleTabChange('overview')}
                  className="p-1 px-2.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  X
                </button>
              </div>

              <form onSubmit={handleCreateJobSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form Inputs */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="create-job-trade" className="text-xs text-gray-400 font-mono uppercase block mb-1">Trade Category</label>
                    <select
                      id="create-job-trade"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      aria-label="Select Trade Category"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Construction">Construction</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Outdoor">Outdoor</option>
                      <option value="Specialized">Specialized/CCTV</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="create-job-title" className="text-xs text-gray-400 font-mono uppercase block mb-1">Job Title</label>
                    <input
                      id="create-job-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Tank Installation or Cistern Leak repairing"
                      aria-label="Job Title"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="create-job-location" className="text-xs text-gray-400 font-mono uppercase block mb-1">Location Details (Kenya)</label>
                    <input
                      id="create-job-location"
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Westlands Square, Nairobi"
                      aria-label="Location Details"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <LocationPicker 
                    lat={lat} 
                    lng={lng} 
                    onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
                    address={address}
                    onAddressChange={(newAddress) => setAddress(newAddress)}
                  />

                  <div>
                    <label htmlFor="create-job-desc" className="text-xs text-gray-400 font-mono uppercase block mb-1">Service Description</label>
                    <textarea
                      id="create-job-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe exactly what you need. Be precise for AI accuracy."
                      rows={3}
                      aria-label="Service Description"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-gray-400 font-mono uppercase block mb-1">Job System</span>
                      <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800/80" role="group" aria-label="Select job matching system">
                        <button
                          type="button"
                          onClick={() => setWorkflow('instant')}
                          aria-label="Set job matching system to Uber-Style (instant matching)"
                          className={`flex-1 py-1.5 text-xs text-center rounded-md font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none ${workflow === 'instant' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'}`}
                        >
                          Uber-Style
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkflow('quotation')}
                          aria-label="Set job matching system to Bidding (quotation model)"
                          className={`flex-1 py-1.5 text-xs text-center rounded-md font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none ${workflow === 'quotation' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'}`}
                        >
                          Bidding
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="create-job-amount" className="text-xs text-gray-400 font-mono uppercase block mb-1">Bid/Contract amount (KES)</label>
                      <input
                        id="create-job-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        aria-label="Bid or contract amount in KES"
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Gemini-powered pricing Assistant */}
                <div className="space-y-4 flex flex-col justify-between">
                  <GeminiErrorBoundary onHelpTriggered={() => setShowSupportModal(true)}>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-orange-400 font-bold flex items-center space-x-1">
                          <Cpu className="w-3.5 h-3.5" />
                          <span>GEMINI AI PRICE ESTIMATION MVP</span>
                        </span>
                        <button
                          type="button"
                          disabled={aiLoading || !title || aiCooldown > 0}
                          onClick={handleAiEstimate}
                          aria-label="Ask Gemini AI for pricing estimate advice"
                          className="p-1 px-3 rounded-lg bg-orange-500 text-slate-950 hover:bg-orange-400 transition font-mono text-[10px] font-bold cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                        >
                          {aiLoading ? 'Analyzing...' : aiCooldown > 0 ? `WAIT ${aiCooldown}s` : 'ASK GEMINI'}
                        </button>
                      </div>

                      {aiLoading ? (
                        <div className="space-y-4 py-3 animate-pulse">
                          <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                            <div className="h-4 bg-slate-800 rounded w-1/4 animate-bounce"></div>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                            <div className="h-4 bg-slate-800 rounded w-1/5"></div>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                            <div className="h-4 bg-slate-800 rounded w-1/6"></div>
                          </div>
                          <div className="space-y-2 pt-1">
                            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                            <div className="h-2.5 bg-slate-800 rounded w-5/6"></div>
                            <div className="h-2.5 bg-slate-800 rounded w-2/3"></div>
                          </div>
                        </div>
                      ) : aiError ? (
                        <div className="space-y-3">
                          <GeminiErrorFallback
                            error={aiError}
                            jobTitle={title}
                            jobDescription={description}
                            jobCategory={category}
                            jobLocation={address}
                            onRetry={handleAiEstimate}
                          />
                          
                          {aiFailCount >= 2 && (
                            <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl space-y-3 mt-3 animate-fadeIn" id="gemini-fallback-mode-block">
                              <div className="flex items-start space-x-2">
                                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <h5 className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Suggested Local Fallback</h5>
                                  <p className="text-[10px] text-slate-300 leading-relaxed">
                                    Multiple estimation attempts have failed. Based on the selected <strong>{category}</strong> category, we suggest a standard local trade range:
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                                <div>
                                  <span className="text-[9px] font-mono text-slate-400 block uppercase">Standard Range</span>
                                  <span className="text-xs font-semibold text-slate-200 font-mono">
                                    KES {CATEGORY_MANUAL_PRICE_RANGES[category]?.min.toLocaleString()} - {CATEGORY_MANUAL_PRICE_RANGES[category]?.max.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] font-mono text-slate-400 block uppercase">Recommended</span>
                                  <span className="text-xs font-semibold text-emerald-400 font-mono">
                                    KES {CATEGORY_MANUAL_PRICE_RANGES[category]?.recommended.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const fallbackData = CATEGORY_MANUAL_PRICE_RANGES[category] || CATEGORY_MANUAL_PRICE_RANGES.Plumbing;
                                  setAmount(fallbackData.recommended);
                                  setAiResult({
                                    estimated_amount: fallbackData.recommended,
                                    duration_estimate: "1 - 3 hours",
                                    standard_risk_score: 1,
                                    price_breakdown: [
                                      `Standard callout rate for ${category}: KES ${fallbackData.min}`,
                                      `Typical minor materials allowance: KES ${fallbackData.recommended - fallbackData.min}`
                                    ],
                                    fraud_flags: []
                                  });
                                  setAiError(null);
                                }}
                                className="w-full py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/35 transition font-mono cursor-pointer uppercase tracking-wider text-center"
                                id="apply-fallback-estimate-btn"
                              >
                                Apply Recommended Fallback (KES {CATEGORY_MANUAL_PRICE_RANGES[category]?.recommended.toLocaleString()})
                              </button>
                            </div>
                          )}
                        </div>
                      ) : aiResult ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <span className="text-xs text-slate-400">Fair Market Estimate:</span>
                            <span className="text-sm font-semibold text-emerald-400 font-mono">
                              KES {(aiResult.estimated_amount ?? aiResult.recommended ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <span className="text-xs text-slate-400">Typical Duration:</span>
                            <span className="text-sm text-slate-200">
                              {aiResult.duration_estimate ?? aiResult.range ?? 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <span className="text-xs text-slate-400">Task Complexity:</span>
                            <span className="text-sm text-amber-400">
                              Risk {aiResult.standard_risk_score ?? 'N/A'}/10
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono block mb-1">ESTIMATION BREAKDOWN:</span>
                            <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-300">
                              {(aiResult.price_breakdown ?? (aiResult.justification ? [aiResult.justification] : [])).map((item: string, idx: number) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          {(aiResult.fraud_flags ?? []).length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2.5 rounded-xl flex items-start space-x-1.5 mt-2">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>{(aiResult.fraud_flags ?? [])[0]}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <span className="text-xs block">AI details will render here.</span>
                          <span className="text-[10px] font-italic mt-1 block">Specify title, description, location, then click 'ASK GEMINI'</span>
                        </div>
                      )}
                    </div>
                  </GeminiErrorBoundary>

                  <button
                    type="submit"
                    className="w-full py-4.5 rounded-xl bg-orange-500 text-slate-950 font-bold font-display hover:bg-orange-400 transition flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20"
                  >
                    <span>LAUNCH ORDER DISPATCH</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : selectedJob ? (
            /* Selected Active Job details, tracking & bids dashboard */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side: Order properties and tracking actions */}
              {showPaymentGateway ? (
                <PaymentGateway
                  user={user}
                  job={selectedJob}
                  onPaymentSuccess={() => {
                    fetchCustomerJobs();
                    fetchTransactions();
                    setShowPaymentGateway(false);
                  }}
                  onClose={() => setShowPaymentGateway(false)}
                />
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-slate-500">ORDER ID: {selectedJob.id}</span>
                      <span className="text-xs bg-slate-900 border border-slate-800 rounded px-2 text-slate-400">
                        {selectedJob.workflow.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-white mt-1">{selectedJob.title}</h3>
                    <p className="text-slate-400 mt-1 text-sm leading-relaxed">{selectedJob.description}</p>
                  </div>

                  {/* Job Lifecycle Step Progress Timeline */}
                  <div className="bg-slate-900/60 border border-slate-900/80 p-5 rounded-2xl space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-[10px] text-slate-400 font-semibold tracking-wider font-mono">ORDER LIFE CYCLE</span>
                      <span className="text-[10px] font-bold text-orange-400 font-mono bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        {selectedJob.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="relative pt-4 pb-2 px-1">
                      {/* Connection Line background */}
                      <div className="absolute top-[31px] left-0 w-full h-[3px] bg-slate-800 rounded-full"></div>
                      
                      {/* Active line fill */}
                      <div 
                        className="absolute top-[31px] left-0 h-[3px] bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(getStatusIndex(selectedJob.status) / 4) * 100}%` }}
                      ></div>

                      {/* Stepper circles */}
                      <div className="relative flex justify-between">
                        {statusOrder.map((stepStatus, idx) => {
                          const isDone = getStatusIndex(selectedJob.status) >= idx;
                          const isCurrent = getStatusIndex(selectedJob.status) === idx;
                          
                          const stepLabel = 
                            stepStatus === 'matching' ? 'Post & Match' :
                            stepStatus === 'accepted' ? 'Vetted' :
                            stepStatus === 'en_route' ? 'En Route' :
                            stepStatus === 'started' ? 'Working' :
                            'Completed';

                          return (
                            <div key={stepStatus} className="flex flex-col items-center select-none">
                              <div 
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-350 z-10 ${
                                  isDone 
                                    ? (isCurrent 
                                        ? 'bg-orange-500 border-orange-400 text-slate-950 shadow-md shadow-orange-500/30 font-extrabold ring-4 ring-orange-500/20' 
                                        : 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/10') 
                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <span className={`text-[9px] font-mono mt-2 font-bold transition-colors ${
                                isDone ? 'text-slate-200' : 'text-slate-500'
                              } ${isCurrent ? 'text-orange-400 scale-105' : ''}`}>
                                {stepLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Digital Contract System Agreement */}
                  {selectedJob.fundi_id && (
                    <div className="mt-4">
                      <ContractSignCard
                        jobId={selectedJob.id}
                        user={user}
                        onSignedSuccess={fetchCustomerJobs}
                      />
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-mono block">Secured Escrow Wallet</span>
                      <span className="text-lg font-bold text-slate-150">KES {selectedJob.amount.toLocaleString()}</span>
                    </div>

                    <div className="flex gap-2">
                      {selectedJob.escrow_status === 'unpaid' ? (
                        <button
                          onClick={() => setShowPaymentGateway(true)}
                          className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>STK PUSH PAY</span>
                        </button>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>HELD SECURELY</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dispute arbitration management panel */}
                  {selectedJob.fundi_id && (
                    <div className="mt-4">
                      <DisputePanel
                        jobId={selectedJob.id}
                        user={user}
                        onStateChanged={fetchCustomerJobs}
                      />
                    </div>
                  )}

                  {/* Assigned Fundi Details */}
                  <div className="border-t border-slate-800 pt-4">
                    <span className="text-xs font-mono text-gray-500 uppercase block mb-3">ASSIGNED TRADESPERSON</span>
                    {selectedJob.fundi_id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/50 hover:border-orange-500/30 hover:bg-slate-900 group transition-all duration-300">
                          <div className="flex items-center space-x-3">
                            <div 
                              onClick={() => handleOpenProfileModal(selectedJob.fundi_id!)}
                              className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-slate-950 font-bold font-display cursor-pointer"
                            >
                              {selectedJob.fundi_name?.substr(0, 2)}
                            </div>
                            <div>
                              <span 
                                onClick={() => handleOpenProfileModal(selectedJob.fundi_id!)}
                                className="text-sm font-semibold text-white block hover:text-orange-400 hover:underline cursor-pointer transition-colors"
                              >
                                {selectedJob.fundi_name}
                              </span>
                              <button
                                onClick={() => handleOpenProfileModal(selectedJob.fundi_id!)}
                                className="text-[10px] text-orange-500 font-mono flex items-center space-x-1 hover:text-orange-450 tracking-wide font-medium mt-0.5 cursor-pointer bg-transparent border-none"
                              >
                                <span>★ View Profile & Reviews</span>
                              </button>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <span className="text-xs text-slate-400 font-mono">{selectedJob.fundi_phone}</span>
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 mt-1 rounded border border-emerald-500/20 uppercase tracking-widest font-bold">VERIFIED TRADESMAN</span>
                          </div>
                        </div>

                        {/* Escrow payout release actions if completed */}
                        {selectedJob.status === 'completed' && selectedJob.escrow_status === 'held' && (
                          <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/30 text-left">
                            <span className="text-xs text-orange-400 font-bold block mb-1 font-display">TASK COMPLETED AND VETTED ✅</span>
                            <p className="text-xs text-slate-200">The tradesperson has marked the service as completed. Authorize and release the vault-locked escrow directly through our integrated gateway.</p>
                            <button
                              onClick={() => setShowPaymentGateway(true)}
                              className="mt-3 w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                            >
                              <Wallet className="w-4 h-4" />
                              <span>SECURE ESCROW PAYOUT (KES {selectedJob.amount.toLocaleString()})</span>
                            </button>
                          </div>
                        )}

                        {/* Escrow payout released review box */}
                        {selectedJob.status === 'completed' && selectedJob.escrow_status === 'released' && !selectedJob.is_rated && (
                          <div className="mt-3">
                            <ReviewRating 
                              isSubmitting={isSubmittingActiveJobReview}
                              submitButtonText="Submit Job Performance Review"
                              onSubmit={async (rating, comment) => {
                                await handleActiveJobReviewSubmit(selectedJob.id, selectedJob.fundi_id!, rating, comment);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs py-2">
                        {selectedJob.workflow === 'instant' ? (
                          <span className="animate-pulse">Searching nearest available plumbers... matching score active.</span>
                        ) : (
                          <span>Waiting for available bids from local tradesmen.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Top 3 Automated Recommendations Panel */}
                  {!selectedJob.fundi_id && selectedJob.recommended_fundis && selectedJob.recommended_fundis.length > 0 && (
                    <div className="border-t border-slate-800 pt-4 space-y-3 animate-in fade-in duration-200 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-orange-400 uppercase tracking-wider block font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-orange-400 shrink-0" />
                          Kazify Recommended Matches (Top 3 Match)
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          Rating • Distance • Status
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {selectedJob.recommended_fundis.map((recFundi) => (
                          <div 
                            key={recFundi.id} 
                            className="p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 transition-all flex flex-col justify-between space-y-2 text-left group"
                          >
                            <div className="space-y-1">
                              <div className="flex justify-between items-start gap-1">
                                <span 
                                  onClick={() => handleOpenProfileModal(recFundi.id)}
                                  className="text-xs font-bold text-white hover:text-orange-400 hover:underline cursor-pointer truncate block flex-1"
                                >
                                  {recFundi.name}
                                </span>
                                {recFundi.isReliable && (
                                  <span className="text-[7px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono font-bold px-1 rounded uppercase shrink-0">
                                    TOP⭐
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                                <span className="text-amber-400 font-bold flex items-center">
                                  ★ {recFundi.rating.toFixed(1)}
                                </span>
                                <span>•</span>
                                <span className="text-blue-400 font-bold">
                                  📍 {recFundi.distanceKM} KM
                                </span>
                              </div>

                              <span className="text-[9px] text-slate-500 font-mono block truncate">
                                {recFundi.address}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-950 gap-1">
                              <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded uppercase border shrink-0 ${
                                recFundi.status === 'available'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                              }`}>
                                {recFundi.status}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleOpenProfileModal(recFundi.id)}
                                className="text-[9px] font-mono text-orange-500 hover:text-orange-400 hover:underline cursor-pointer font-bold bg-transparent border-none"
                              >
                                VIEW
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job bidding panel if quotation workflow */}
                  {selectedJob.workflow === 'quotation' && !selectedJob.fundi_id && (
                    <div className="border-t border-slate-800 pt-4 space-y-3">
                      <span className="text-xs font-mono text-gray-500 uppercase block">Active Fundi Bids ({selectedJob.bids?.length || 0})</span>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(selectedJob.bids || []).map((bid: Bid) => (
                          <div key={bid.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/60 flex items-center justify-between">
                            <div>
                              <span 
                                onClick={() => handleOpenProfileModal(bid.fundi_id)}
                                className="text-sm font-bold text-white block hover:text-orange-400 hover:underline cursor-pointer transition-colors"
                              >
                                {bid.fundi_name}
                              </span>
                              <div className="flex items-center space-x-2 text-[10px] text-gray-400 mt-0.5">
                                <span className="flex items-center text-amber-500 font-bold">
                                  <Star className="w-3 h-3 mr-0.5 fill-amber-500" />
                                  {bid.fundi_rating}
                                </span>
                                <span>•</span>
                                <span className="font-mono">{bid.duration_days} days schedule</span>
                                <span>•</span>
                                <button
                                  onClick={() => handleOpenProfileModal(bid.fundi_id)}
                                  className="text-orange-500 hover:text-orange-400 hover:underline font-mono cursor-pointer font-bold bg-transparent border-none text-[10px]"
                                >
                                  View Reviews
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-300 italic mt-1 font-mono">"{bid.note}"</p>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-emerald-400 block mb-1.5">KES {bid.amount.toLocaleString()}</span>
                              <button
                                onClick={() => handleAcceptBid(bid.id)}
                                className="px-2.5 py-1 text-[10px] font-bold bg-orange-500 text-slate-950 rounded hover:bg-orange-400 transition cursor-pointer"
                              >
                                ACCEPT
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Right Side: Map & Direct Coordinate Tracking & Messaging */}
              <div className="space-y-4">
                {/* Visual Map component */}
                <div className="w-full h-80 rounded-3xl overflow-hidden shadow-2xl relative">
                  <MapMock
                    customerLocation={{ lat: -0.0917, lng: 34.7680, address: selectedJob.address }}
                    fundiLocation={selectedJob.fundi_lat ? { lat: selectedJob.fundi_lat, lng: selectedJob.fundi_lng || 0, address: 'Moving Fundi' } : undefined}
                    isTracking={selectedJob.status === 'en_route'}
                  />
                  {selectedJob.status === 'en_route' && (
                    <div className="absolute bottom-4 left-4 bg-slate-950/90 border border-slate-800 text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2">
                      <Compass className="w-4 h-4 text-orange-500 animate-spin" />
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">TRACTION ETA</span>
                        <span className="text-emerald-400 font-bold">{selectedJob.estimated_duration || '7 mins'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct text messages coordination */}
                {selectedJob.fundi_id && (
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 text-left flex flex-col h-64">
                    <span className="text-xs font-mono text-gray-500 uppercase block border-b border-slate-800 pb-2 mb-2 flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Coordinating Chat Thread with Fundi</span>
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-2 p-1 max-h-40">
                      {chatMessages.length === 0 ? (
                        <span className="text-[10px] text-slate-600 block text-center py-6">Send a message to coordinate coordinates/materials...</span>
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

                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type standard message details..."
                        className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-orange-500"
                      />
                      <button
                        onClick={handleSendChatMsg}
                        className="p-2 rounded-xl bg-orange-500 text-slate-950 hover:bg-orange-400 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-3xl p-8 dark:bg-slate-950/20">
              <Star className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
              <h3 className="font-display font-bold text-lg text-white">No service request selected</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md">Click any order in your left list to see real-time map GPS tracking, fundi matching score, live escrow payouts, and coordinate chat panels.</p>
            </div>
          )}
        </div>
      </div>

      {/* TRADESPERSON PROFILE & STAR REVIEWS MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-950/40">
              <div>
                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider font-mono block mb-1">SKILLED TRADESMAN PROFILE</span>
                <h3 className="text-xl font-bold font-display text-white" id="modal-fundi-name">
                  {profileLoading ? 'Loading profile...' : profileData?.fundi?.name || 'Tradesperson'}
                </h3>
                {!profileLoading && profileData?.fundi && (
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold font-mono">
                      {profileData.fundi.category} Expert
                    </span>
                    <span className="text-xs text-slate-400">• Vetted & Approved</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer text-xs font-mono border border-slate-700"
              >
                Close
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {profileLoading ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-3"></div>
                  Retrieving trusted statistics & history...
                </div>
              ) : profileData ? (
                <>
                  {/* Overview Panel / Trust Box */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col justify-center">
                      <span className="text-[9px] text-slate-500 font-mono block font-bold uppercase mb-1">SCORE</span>
                      <div className="flex items-center justify-center space-x-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-lg font-bold text-white font-display">{profileData.fundi.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 block font-mono mt-1">out of 5.0</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col justify-center">
                      <span className="text-[9px] text-slate-500 font-mono block font-bold uppercase mb-1">JOBS COMPLETED</span>
                      <span className="text-lg font-bold text-white font-display">{profileData.stats.completed_jobs}</span>
                      <span className="text-[9px] text-emerald-400 block font-mono">100% verified</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col justify-center">
                      <span className="text-[9px] text-slate-500 font-mono block font-bold uppercase mb-1">FEEDBACKS</span>
                      <span className="text-lg font-bold text-orange-400 font-display">{profileData.stats.total_reviews}</span>
                      <span className="text-[9px] text-slate-500 block font-mono">Reviews logged</span>
                    </div>
                  </div>

                  {/* Rating Distribution Grid */}
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-2">
                    <span className="text-[10px] text-slate-400 font-mono font-bold block mb-2">RATING BREAKDOWN</span>
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = profileData.stats.rating_distribution[stars.toString()] || 0;
                      const total = profileData.stats.total_reviews || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={stars} className="flex items-center text-xs text-slate-400 font-mono">
                          <span className="w-8">{stars} ★</span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden mx-3">
                            <div className="h-full bg-amber-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-8 text-right text-[11px] font-semibold text-slate-300">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Availability Booking Calendar for Clients */}
                  <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                    <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-400" />
                      BOOKING AVAILABILITY CALENDAR
                    </span>
                    <BookingCalendar 
                      fundiId={profileFundiId || ''} 
                      isEditable={false} 
                      selectedDate={selectedBookingDate}
                      onDateSelected={(dateStr) => {
                        setSelectedBookingDate(dateStr);
                      }}
                    />
                    {selectedBookingDate && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex flex-col gap-1 text-left animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-[10px] font-mono font-bold text-orange-400 uppercase">PROPOSED DATE SELECTED</span>
                        <p className="text-[11px] text-slate-300 font-mono">
                          You selected <strong className="text-white">{new Date(selectedBookingDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>. Propose this date in chat to book this expert!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Customer Review chronological feed */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">CUSTOMER LOGGED REVIEWS ({profileData.reviews.length})</span>
                    {profileData.reviews.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-3 text-center border border-dashed border-slate-850 rounded-xl font-mono">No feedback reviews logged yet for this tradesperson.</p>
                    ) : (
                      <div className="space-y-3">
                        {profileData.reviews.map((rev: any) => (
                          <div key={rev.id} className="p-4 rounded-2xl bg-slate-950/50 border border-slate-850 text-xs text-left">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-white">{rev.customer_name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center text-amber-500 space-x-0.5 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-800'}`} 
                                />
                              ))}
                            </div>
                            <p className="text-slate-300 leading-relaxed italic font-mono">"{rev.comment}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Independent Review Box inside the profile modal */}
                  <div className="space-y-2">
                    <div className="border-t border-slate-800 pt-4 mt-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold mb-3">Leave Profile Feedback</span>
                      <ReviewRating 
                        isSubmitting={isSubmittingProfileReview}
                        submitButtonText="Post Profile Feedback"
                        onSubmit={async (rating, comment) => {
                          if (!profileFundiId) return;
                          setIsSubmittingProfileReview(true);
                          try {
                            await api.post('/api/reviews', {
                              fundi_id: profileFundiId,
                              customer_id: user.id,
                              customer_name: user.name,
                              rating: rating,
                              comment: comment
                            });
                            // Refresh statistics and reviews
                            const res = await api.get(`/api/fundis/${profileFundiId}/profile`);
                            setProfileData(res.data);
                          } catch (e) {
                            console.error('Failed to submit review', e);
                          } finally {
                            setIsSubmittingProfileReview(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-red-400 text-xs font-mono">
                  Error retrieving tradesman details. Please retry.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-center">
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                Review scores are fully secured by M-Pesa escrow verification tags to maintain high trust values.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification for Handshake failure alert */}
      {showToast && handshakeResult && (
        <div className="fixed bottom-5 right-5 z-[9999] max-w-sm p-4 bg-slate-900 border border-orange-500/40 text-white rounded-2xl shadow-2xl shadow-orange-500/10 animate-slideIn flex items-start space-x-3" id="gemini-toast-notification">
          <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-[11px] font-mono font-bold text-orange-400 uppercase tracking-wider">Gemini Service Notice</h4>
            <p className="text-[10px] text-slate-300 leading-relaxed">{handshakeResult.message || 'Gemini API is currently unreachable. Kazify has loaded local pricing fallback mode.'}</p>
          </div>
          <button 
            onClick={() => setShowToast(false)} 
            className="text-slate-500 hover:text-white transition font-mono text-xs px-1 cursor-pointer"
            id="close-gemini-toast-btn"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Support Chat Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" id="gemini-support-chat-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Kazify Live Support</h4>
                  <p className="text-[9px] text-slate-400">Agent Jane is active</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="text-xs font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-1 rounded-md cursor-pointer"
                id="close-support-modal-btn"
              >
                CLOSE
              </button>
            </div>
            
            {/* Chat Body */}
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

            {/* Chat Input */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
              <input 
                type="text" 
                placeholder="Type your help query..."
                className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                id="support-chat-input-field"
                aria-label="Type your help query to Jane support agent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Alert mock send
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
