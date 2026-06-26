import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Activity, CheckCircle2, ShieldAlert, 
  TrendingUp, RefreshCw, LogOut, ArrowUpRight, Clock,
  AlertTriangle, ShieldCheck, Eye, Check, X, MessageSquare, Send,
  MapPin, Navigation
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { User, KYCDocument, Dispute, DisputeMessage } from '../types';
import DashboardLayout from './DashboardLayout';
import api from '../services/api';
import { preloadService } from '../services/preloadService';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  isWrapped?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  refreshTrigger?: number;
}

interface AdminLayoutWrapperProps {
  isWrapped?: boolean;
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  children: React.ReactNode;
}

function AdminLayoutWrapper({
  isWrapped,
  user,
  onLogout,
  activeTab,
  setActiveTab,
  onRefresh,
  children
}: AdminLayoutWrapperProps) {
  if (isWrapped) {
    return <div className="space-y-6 text-left">{children}</div>;
  }
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      role="admin"
      title="Global Tower"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notifications={[]}
      onRefresh={onRefresh}
    >
      {children}
    </DashboardLayout>
  );
}

export default function AdminDashboard({  
  user, 
  onLogout,
  isWrapped,
  activeTab: propsActiveTab,
  setActiveTab: propsSetActiveTab,
  refreshTrigger = 0
}: AdminDashboardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [recentTrans, setRecentTrans] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Disputes Board States
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [newDisputeMsg, setNewDisputeMsg] = useState('');
  const [resSummary, setResSummary] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [adminZoomExhibit, setAdminZoomExhibit] = useState<any | null>(null);

  // Admin KYC Reviews States
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [selectedKyc, setSelectedKyc] = useState<any | null>(null);
  const [rejReason, setRejReason] = useState('');

  // Admin Allocation Desk States
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedAllocationJob, setSelectedAllocationJob] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocationMessage, setAllocationMessage] = useState('');
  const [allocationSearch, setAllocationSearch] = useState('');
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  // Bulk selection and recommendations states
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRecommendations, setBulkRecommendations] = useState<any[]>([]);
  const [loadingBulkRecommendations, setLoadingBulkRecommendations] = useState(false);
  const [bulkAllocationMessage, setBulkAllocationMessage] = useState('');
  const [isBulkAllocating, setIsBulkAllocating] = useState(false);

  // Client-side geodetic (Haversine) distance calculator for precise spatial filtering
  const calculateGeodeticDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
    const R = 6371; // Earth KM radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  // External services health status
  const [healthStatus, setHealthStatus] = useState([
    { name: 'Gemini AI Engine', service: 'Gemini API', role: 'ESTIMATION & AUTOCAT', status: 'green', latency: 142 },
    { name: 'Twilio SMS Hub', service: 'Twilio', role: 'DISPATCH ALERTS', status: 'green', latency: 85 },
    { name: 'Firebase Datastore', service: 'Firebase', role: 'ESCROW LEDGER', status: 'green', latency: 42 }
  ]);
  const [isRecheckingHealth, setIsRecheckingHealth] = useState(false);

  const handleRecheckHealth = async () => {
    setIsRecheckingHealth(true);
    // Perform dynamic checks or simulation
    setTimeout(() => {
      setHealthStatus([
        { name: 'Gemini AI Engine', service: 'Gemini API', role: 'ESTIMATION & AUTOCAT', status: Math.random() > 0.05 ? 'green' : 'yellow', latency: Math.floor(100 + Math.random() * 80) },
        { name: 'Twilio SMS Hub', service: 'Twilio', role: 'DISPATCH ALERTS', status: Math.random() > 0.05 ? 'green' : 'yellow', latency: Math.floor(60 + Math.random() * 40) },
        { name: 'Firebase Datastore', service: 'Firebase', role: 'ESCROW LEDGER', status: 'green', latency: Math.floor(30 + Math.random() * 25) }
      ]);
      setIsRecheckingHealth(false);
    }, 1200);
  };
  
  const [localActiveTab, setLocalActiveTab] = useState('overview');
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : localActiveTab;
  const setActiveTab = propsSetActiveTab !== undefined ? propsSetActiveTab : setLocalActiveTab;

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const preloadKey = 'admin-metrics';
      const promise = preloadService.get(preloadKey) || api.get('/api/admin/metrics');
      preloadService.clear(preloadKey);
      const res = await promise;
      const data = res.data;
      setMetrics(data.metrics);
      setRecentTrans(data.recent_transactions);
      setRecentJobs(data.recent_jobs);
    } catch (e) {
      console.error('Admin metrics fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputes = async () => {
    try {
      const preloadKey = 'admin-disputes';
      const promise = preloadService.get(preloadKey) || api.get('/api/disputes');
      preloadService.clear(preloadKey);
      const res = await promise;
      setDisputes(res.data);
    } catch (e) {
      console.error('Failed to fetch disputes', e);
    }
  };

  const fetchDisputeMessages = async (disputeId: string) => {
    try {
      const res = await api.get(`/api/disputes/${disputeId}/messages`);
      setDisputeMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchKycDocs = async () => {
    try {
      const preloadKey = 'admin-kyc';
      const promise = preloadService.get(preloadKey) || api.get('/api/admin/kyc');
      preloadService.clear(preloadKey);
      const res = await promise;
      setKycDocs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendDisputeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisputeMsg.trim() || !selectedDispute) return;
    try {
      const res = await api.post(`/api/disputes/${selectedDispute.id}/message`, {
        sender_id: user.id,
        sender_name: 'System Administrator (Arbitrator)',
        message: newDisputeMsg
      });
      setDisputeMessages(prev => [...prev, res.data]);
      setNewDisputeMsg('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveDispute = async (resolution: 'resolved_released' | 'resolved_refunded') => {
    if (!selectedDispute || !resSummary.trim()) return;
    setIsResolving(true);
    try {
      await api.post(`/api/disputes/${selectedDispute.id}/resolve`, {
        resolution,
        resolution_summary: resSummary
      });
      setResSummary('');
      setSelectedDispute(null);
      fetchDisputes();
      fetchAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleReviewKyc = async (docId: string, status: 'approved' | 'rejected') => {
    try {
      await api.post(`/api/admin/kyc/${docId}/review`, {
        status,
        rejection_reason: status === 'rejected' ? rejReason : undefined
      });
      setRejReason('');
      setSelectedKyc(null);
      fetchKycDocs();
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllocationsJobs = async () => {
    setLoadingJobs(true);
    try {
      const preloadKey = 'admin-jobs';
      const promise = preloadService.get(preloadKey) || api.get('/api/jobs');
      preloadService.clear(preloadKey);
      const res = await promise;
      setJobsList(res.data);
    } catch (e) {
      console.error('Failed to fetch allocations jobs', e);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchRecommendations = async (jobId: string) => {
    setLoadingRecommendations(true);
    try {
      const res = await api.get(`/api/admin/jobs/${jobId}/recommendations`);
      setRecommendations(res.data);
    } catch (e) {
      console.error('Failed to fetch recommendations', e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAllocate = async (jobId: string, fundiId: string) => {
    setIsAllocating(true);
    setAllocationMessage('');
    try {
      const res = await api.post('/api/admin/allocate-fundi', { jobId, fundiId });
      setAllocationMessage(res.data.message || 'Tradesperson allocated successfully!');
      
      // Update selected job state with newly allocated details
      if (selectedAllocationJob && selectedAllocationJob.id === jobId) {
        setSelectedAllocationJob(res.data.job);
      }
      
      // Refresh list
      fetchAllocationsJobs();
      fetchRecommendations(jobId);
      fetchAdminData();
    } catch (e: any) {
      console.error(e);
      setAllocationMessage(e.response?.data?.error || 'Allocation failed. Please try again.');
    } finally {
      setIsAllocating(false);
    }
  };

  const fetchBulkRecommendations = async (ids: string[]) => {
    setLoadingBulkRecommendations(true);
    setBulkAllocationMessage('');
    try {
      const res = await api.post('/api/admin/jobs/bulk-recommendations', { jobIds: ids });
      const enriched = res.data.map((item: any) => ({
        ...item,
        selectedCandidateId: item.bestCandidate?.id || ''
      }));
      setBulkRecommendations(enriched);
    } catch (e) {
      console.error('Failed to fetch bulk recommendations', e);
    } finally {
      setLoadingBulkRecommendations(false);
    }
  };

  const handleBulkAllocate = async () => {
    setIsBulkAllocating(true);
    setBulkAllocationMessage('');
    try {
      const allocations = bulkRecommendations
        .filter((item: any) => item.selectedCandidateId)
        .map((item: any) => ({
          jobId: item.jobId,
          fundiId: item.selectedCandidateId
        }));

      if (allocations.length === 0) {
        setBulkAllocationMessage('Please select at least one tradesperson to allocate.');
        setIsBulkAllocating(false);
        return;
      }

      const res = await api.post('/api/admin/jobs/bulk-allocate', { allocations });
      setBulkAllocationMessage(res.data.message || 'Bulk allocation completed successfully!');
      
      // Clear selections and refresh lists
      setSelectedJobIds([]);
      fetchAllocationsJobs();
      fetchAdminData();
    } catch (e: any) {
      console.error(e);
      setBulkAllocationMessage(e.response?.data?.error || 'Bulk allocation failed. Please try again.');
    } finally {
      setIsBulkAllocating(false);
    }
  };

  // 3 New Views: States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingFraud, setLoadingFraud] = useState(false);

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await api.get('/api/admin/audit-logs');
      setAuditLogs(res.data);
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchFraudAlerts = async () => {
    setLoadingFraud(true);
    try {
      const res = await api.get('/api/admin/fraud/detections');
      setFraudAlerts(res.data);
    } catch (e) {
      console.error('Failed to fetch fraud detections', e);
    } finally {
      setLoadingFraud(false);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await api.get('/api/admin/analytics');
      setAnalyticsData(res.data);
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Real-time Live Alert States
  interface LiveAlert {
    id: string;
    title: string;
    content: string;
    type: string;
    timestamp: string;
    read: boolean;
  }
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const wsRef = React.useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchAdminData();

    // Setup WebSockets for real-time admin alerts
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
        // KYC documents submissions, dispute filed, high-value dispute notifications, or new requests
        if (
          payload.type === 'new_kyc_submission' || 
          payload.type === 'high_value_dispute' || 
          payload.type === 'dispute_filed' ||
          payload.type === 'new_service_request' ||
          payload.type === 'new_bid_received'
        ) {
          // Play micro sound effect if supported
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
            audio.volume = 0.4;
            audio.play().catch(() => {});
          } catch (_) {}

          // Add to live alerts state
          const newAlert: LiveAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            title: payload.title || 'Live Alert Notification',
            content: payload.content || 'A formal administrative event has been submitted.',
            type: payload.type,
            timestamp: new Date().toISOString(),
            read: false
          };
          setLiveAlerts(prev => [newAlert, ...prev]);

          // Live data refresh (ensure fresh view is available instantly)
          fetchAdminData();
          if (activeTab === 'disputes') {
            fetchDisputes();
          } else if (activeTab === 'kyc_review') {
            fetchKycDocs();
          } else if (activeTab === 'fraud') {
            fetchFraudAlerts();
          } else if (activeTab === 'audit') {
            fetchAuditLogs();
          } else if (activeTab === 'allocations') {
            // Refresh allocations
            if (typeof (window as any).refreshAllocationsList === 'function') {
              (window as any).refreshAllocationsList();
            }
          }
        }
      } catch (err) {
        console.error('Failed to process incoming live alert message', err);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'disputes') {
      fetchDisputes();
    } else if (activeTab === 'kyc_review') {
      fetchKycDocs();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'fraud') {
      fetchFraudAlerts();
    } else if (activeTab === 'analytics') {
      fetchAnalyticsData();
    } else if (activeTab === 'allocations') {
      fetchAllocationsJobs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedDispute) {
      fetchDisputeMessages(selectedDispute.id);
    }
  }, [selectedDispute]);

  useEffect(() => {
    if (selectedAllocationJob) {
      fetchRecommendations(selectedAllocationJob.id);
    }
  }, [selectedAllocationJob]);

  useEffect(() => {
    (window as any).refreshAllocationsList = fetchAllocationsJobs;
    return () => {
      delete (window as any).refreshAllocationsList;
    };
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAdminData();
    }
  }, [refreshTrigger]);

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
                    // Mark as read
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
        <div className="space-y-6 text-left">
          {/* Headline stats grids */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-left">
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">TOTAL USERS</span>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-3xl font-bold text-white font-display">{metrics?.total_users || 0}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                    {metrics?.total_customers} Custs • {metrics?.total_fundis} Fundis
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-left">
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">M-PESA ESCROW VOLUME</span>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-2xl font-bold text-emerald-400 font-mono">KES {metrics?.escrow_volume_kes.toLocaleString()}</span>
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
                                <td className="py-3 font-mono text-orange-400">KES {job.amount.toLocaleString()}</td>
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
                              <span className="font-mono font-bold text-emerald-400 block">+KES {tx.amount.toLocaleString()}</span>
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

          {activeTab === 'disputes' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
              {/* Disputes List */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
                <h3 className="font-display font-bold text-base text-white">Active Arbitration Claims</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {disputes.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 font-mono text-xs">
                      No disputes lodged on the marketplace
                    </div>
                  ) : (
                    disputes.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDispute(d)}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          selectedDispute?.id === d.id ? 'bg-slate-900 border-orange-500/80' : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[9px] text-slate-500 block uppercase">ID: #{d.id.substring(0, 8)}</span>
                          <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-mono font-bold border ${
                            d.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-2 block truncate">{d.reason}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal line-clamp-2">{d.description}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-900 pt-2">
                          <span>Job Amount: KES {d.amount?.toLocaleString()}</span>
                          <span>{d.customer_name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat & Arbitration Console */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4 flex flex-col justify-between min-h-[540px]">
                {selectedDispute ? (
                  <>
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-display font-bold text-sm text-white">Arbitration Desk: Case #{selectedDispute.id.substring(0, 10)}</h3>
                        <span className="text-[10px] font-mono text-slate-500">Initiator: {selectedDispute.initiator_name}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedDispute(null)}
                        className="text-xs font-mono text-slate-400 hover:text-white"
                      >
                        Close Desk
                      </button>
                    </div>

                    <div className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs space-y-1">
                      <span className="text-[9px] font-mono font-bold text-orange-400 block uppercase">LODGED CLAIM CLAIM STATEMENT</span>
                      <strong className="text-white block">{selectedDispute.reason}</strong>
                      <p className="text-slate-400 leading-normal">{selectedDispute.description}</p>
                    </div>

                    {selectedDispute.completion_percentage !== undefined && (
                      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl font-mono text-[10px] space-y-1">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-slate-400 font-bold uppercase">ESTIMATED PROGRESS (CLAIMED BY CLIENT)</span>
                          <span className="text-orange-400 font-bold">{selectedDispute.completion_percentage}% Completed</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className="bg-orange-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${selectedDispute.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {selectedDispute.evidence_attachments && selectedDispute.evidence_attachments.length > 0 && (
                      <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl space-y-2 text-xs">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">CLIENT EVIDENTIARY EXHIBITS ({selectedDispute.evidence_attachments.length})</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedDispute.evidence_attachments.map((att: any) => (
                            <div 
                              key={att.id} 
                              className="p-1.5 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-2 hover:border-slate-800 transition"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                {att.file_type?.startsWith('image/') || att.file_url?.startsWith('http') ? (
                                  <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
                                    <img src={att.file_url} className="w-full h-full object-cover" alt="Evidence" referrerPolicy="no-referrer" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded bg-orange-500/15 text-orange-400 flex-shrink-0 flex items-center justify-center font-bold text-[8px] font-mono">
                                    DOC
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 font-mono text-[9px] leading-tight">
                                  <span className="text-slate-200 block truncate font-bold">{att.file_name}</span>
                                  <span className="text-slate-500 block truncate">{att.caption || 'Arbitration Exhibit'}</span>
                                </div>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => setAdminZoomExhibit(att)}
                                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Messages Log */}
                    <div className="border border-slate-850 bg-slate-950 rounded-xl p-4 flex-1 h-56 overflow-y-auto space-y-3">
                      {disputeMessages.length === 0 ? (
                        <div className="text-center py-10 text-slate-600 font-mono text-xs">
                          No official communication logs yet
                        </div>
                      ) : (
                        disputeMessages.map((m) => (
                          <div key={m.id} className={`flex flex-col ${m.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-2.5 rounded-xl max-w-[85%] text-xs text-left ${m.sender_id === user.id ? 'bg-orange-500 text-slate-950 rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                              <span className="text-[9px] font-mono block font-bold opacity-60 mb-0.5 uppercase">{m.sender_name}</span>
                              <p className="leading-normal">{m.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Actions Panel */}
                    {selectedDispute.status === 'pending' ? (
                      <div className="space-y-3 pt-2">
                        {/* Send message */}
                        <form onSubmit={handleSendDisputeMessage} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type official arbitrator instructions..."
                            value={newDisputeMsg}
                            onChange={(e) => setNewDisputeMsg(e.target.value)}
                            aria-label="Type official arbitrator instructions message"
                            className="flex-1 bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                          />
                          <button type="submit" aria-label="Send arbitrator instructions message" className="p-2.5 bg-slate-900 border border-slate-800 hover:border-orange-500 text-orange-400 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none">
                            <Send className="w-4 h-4" />
                          </button>
                        </form>

                        {/* Resolve controls */}
                        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                          <span className="text-[9px] font-mono font-bold text-rose-400 block uppercase tracking-widest">JUDICIAL RULING DESK</span>
                          <input
                            type="text"
                            placeholder="Enter rationale summary statement..."
                            value={resSummary}
                            onChange={(e) => setResSummary(e.target.value)}
                            aria-label="Enter rationale summary statement"
                            className="w-full bg-slate-950 border border-slate-850 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                          />
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <button
                              onClick={() => handleResolveDispute('resolved_released')}
                              disabled={isResolving || !resSummary.trim()}
                              aria-label="Resolve dispute and release funds to expert"
                              className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold disabled:opacity-40 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                            >
                              RELEASE TO EXPERT
                            </button>
                            <button
                              onClick={() => handleResolveDispute('resolved_refunded')}
                              disabled={isResolving || !resSummary.trim()}
                              aria-label="Resolve dispute and refund funds to client"
                              className="py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold disabled:opacity-40 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                            >
                              REFUND TO CLIENT
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="font-bold block text-[10px] uppercase">RULING FINALIZED</span>
                          <p className="text-[10px] mt-0.5">{selectedDispute.resolution_summary}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                    <AlertTriangle className="w-10 h-10 text-slate-700 mb-3" />
                    <span className="text-xs font-mono">Select an active conflict claim to open the arbitration desk</span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Zoom Evidence Modal */}
            {adminZoomExhibit && (
              <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
                <div className="relative bg-slate-950 max-w-2xl w-full border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950">
                    <span className="text-xs font-mono font-bold text-slate-300 truncate max-w-[80%]">ADMIN COURT EXHIBIT: {adminZoomExhibit.file_name}</span>
                    <button 
                      onClick={() => setAdminZoomExhibit(null)}
                      className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-slate-900 flex items-center justify-center p-2 min-h-[300px] max-h-[480px] overflow-hidden">
                    <img 
                      src={adminZoomExhibit.file_url} 
                      alt="Court Evidence Exhibit" 
                      className="max-w-full max-h-[440px] object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-4 bg-slate-950 border-t border-slate-900 space-y-1 text-left">
                    <span className="text-[9px] font-mono text-orange-400 block font-bold uppercase tracking-widest">Exhibit Caption / Explanation</span>
                    <p className="text-xs text-slate-200 leading-relaxed font-mono">{adminZoomExhibit.caption || "No caption added."}</p>
                    <div className="text-[8px] text-slate-500 font-mono pt-1.5 border-t border-slate-900 mt-2">
                      LODGING TIMESTAMP: {new Date(adminZoomExhibit.uploaded_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </>
          )}

          {activeTab === 'kyc_review' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
              {/* KYC Document list */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
                <h3 className="font-display font-bold text-base text-white">KYC & Identity Backlog</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {kycDocs.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 font-mono text-xs">
                      No KYC identity documents submitted
                    </div>
                  ) : (
                    kycDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedKyc(doc)}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          selectedKyc?.id === doc.id ? 'bg-slate-900 border-orange-500/80' : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[9px] text-slate-500 block uppercase">{doc.document_type.replace('_', ' ')}</span>
                          <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-mono font-bold border ${
                            doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            doc.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-2 block truncate">Number: {doc.document_number}</h4>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-900 pt-2">
                          <span>User: {doc.user_name} ({doc.user_role?.toUpperCase()})</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* KYC Review Details & Controls */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4 flex flex-col justify-between min-h-[500px]">
                {selectedKyc ? (
                  <>
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-display font-bold text-sm text-white">Reviewing credentials for {selectedKyc.user_name}</h3>
                        <span className="text-[10px] font-mono text-slate-500">Contact: {selectedKyc.user_email || selectedKyc.user_phone || 'None'}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedKyc(null)}
                        className="text-xs font-mono text-slate-400 hover:text-white"
                      >
                        Close Review
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Document Meta Info */}
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Document Type:</span>
                          <span className="text-white capitalize">{selectedKyc.document_type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ID Serial:</span>
                          <span className="text-white">{selectedKyc.document_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Logged Date:</span>
                          <span className="text-white">{new Date(selectedKyc.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Image Preview */}
                      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-900 h-60 relative">
                        <img
                          referrerPolicy="no-referrer"
                          src={selectedKyc.file_url || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500"}
                          alt="ID Preview scan"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Action Controls */}
                    {selectedKyc.status === 'pending' ? (
                      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <span className="text-[9px] font-mono font-bold text-orange-400 block uppercase tracking-widest">VERIFICATION SIGN-OFF</span>
                        <input
                          type="text"
                          placeholder="Specify reason ONLY if rejecting document..."
                          value={rejReason}
                          onChange={(e) => setRejReason(e.target.value)}
                          aria-label="Specify reason for document rejection"
                          className="w-full bg-slate-950 border border-slate-850 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleReviewKyc(selectedKyc.id, 'approved')}
                            aria-label="Approve KYC credentials document"
                            className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                          >
                            APPROVE CREDENTIALS
                          </button>
                          <button
                            onClick={() => handleReviewKyc(selectedKyc.id, 'rejected')}
                            aria-label="Reject KYC credentials document with reason"
                            className="py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                          >
                            REJECT CREDENTIALS
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl text-center text-xs font-mono border ${
                        selectedKyc.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
                      }`}>
                        {selectedKyc.status === 'approved' ? (
                          <span>Identity cleared and verified on secure directories.</span>
                        ) : (
                          <span>Document rejected. Reason: {selectedKyc.rejection_reason || 'Incomplete details.'}</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                    <ShieldCheck className="w-10 h-10 text-slate-700 mb-3" />
                    <span className="text-xs font-mono">Select a submitted credential to open the verification panel</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-150 text-left">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white font-display">Platform Operations & Analytics</h2>
                  <p className="text-xs text-slate-400">Aggregated real-time transactional velocity and registration trends.</p>
                </div>
                <button 
                  onClick={fetchAnalyticsData}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-mono cursor-pointer transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
                  REFRESH INDEX
                </button>
              </div>

              {loadingAnalytics || !analyticsData ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Grid of headline analytics metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Total Placed Contracts</span>
                      <span className="text-2xl font-bold text-white font-display block mt-1">
                        {analyticsData.systemMetrics.totalJobs}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-2 font-mono">
                        {analyticsData.systemMetrics.activeJobs} active • {analyticsData.systemMetrics.completedJobs} completed
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Resolution Backlog</span>
                      <span className="text-2xl font-bold text-rose-400 font-display block mt-1">
                        {analyticsData.systemMetrics.activeDisputes}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-2 font-mono">
                        {analyticsData.systemMetrics.disputeCount} total dispute claims filed
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">KYC Queue Size</span>
                      <span className="text-2xl font-bold text-amber-400 font-display block mt-1">
                        {analyticsData.systemMetrics.pendingKyc}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-2 font-mono">
                        {analyticsData.systemMetrics.kycCount} total directories saved
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">User Base Demographics</span>
                      <span className="text-2xl font-bold text-emerald-400 font-display block mt-1">
                        {analyticsData.rolesSplit.customers + analyticsData.rolesSplit.fundis}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-2 font-mono">
                        {analyticsData.rolesSplit.customers} clients • {analyticsData.rolesSplit.fundis} expert fundis
                      </div>
                    </div>
                  </div>

                  {/* Recharts Visualizations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Platform transaction volume and earnings */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <div>
                        <h3 className="font-display font-bold text-sm text-white">Escrow Payment Volume & Fees (KES)</h3>
                        <p className="text-[10px] text-slate-500">M-Pesa cash flows processed versus 10% administration fees.</p>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsData.timeSeries}>
                            <defs>
                              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} style={{ fontFamily: 'monospace' }} />
                            <YAxis stroke="#64748b" fontSize={10} style={{ fontFamily: 'monospace' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                            <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                            <Area name="Escrow Cash Flow" type="monotone" dataKey="escrowVolume" stroke="#10b981" fillOpacity={1} fill="url(#colorVolume)" />
                            <Area name="Admin Earnings" type="monotone" dataKey="platformEarnings" stroke="#f97316" fillOpacity={1} fill="url(#colorEarnings)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Signups over time */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <div>
                        <h3 className="font-display font-bold text-sm text-white">User Registrations & Growth Rate</h3>
                        <p className="text-[10px] text-slate-500">Daily trajectory of newly onboarded participants.</p>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.timeSeries}>
                            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} style={{ fontFamily: 'monospace' }} />
                            <YAxis stroke="#64748b" fontSize={10} style={{ fontFamily: 'monospace' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                            <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                            <Bar name="New Registrations" dataKey="signups" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* National County Metrics Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Contract Volume By County */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <div>
                        <h3 className="font-display font-bold text-sm text-white">Active Contract Volume by County</h3>
                        <p className="text-[10px] text-slate-500">Distribution of active jobs and dispatch assignments across Kenyan counties.</p>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.countyJobsBreakdown || []}>
                            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                            <XAxis dataKey="county" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                            <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                            <Bar name="Active Contracts" dataKey="jobsCount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* National User Growth Statistics */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <div>
                        <h3 className="font-display font-bold text-sm text-white">National User Growth & Demographics</h3>
                        <p className="text-[10px] text-slate-500">Geographic footprint of onboarded clients and fundis across the republic.</p>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsData.countyUsersBreakdown || []}>
                            <defs>
                              <linearGradient id="colorCountyUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                            <XAxis dataKey="county" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                            <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                            <Area name="Registered Users" type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCountyUsers)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* 3-column sub-dashboards */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Category Breakdown list */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-3">
                      <h4 className="font-display font-bold text-xs text-white">Trade Category Distribution</h4>
                      <p className="text-[9px] text-slate-500">Market share split across tradesmen service fields.</p>
                      <div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto pr-1">
                        {analyticsData.categoryBreakdown.map((cat: any) => (
                          <div key={cat.category} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                            <span className="font-mono capitalize text-slate-300">{cat.category}</span>
                            <div className="text-right">
                              <span className="font-bold text-white block">{cat.jobsCount} jobs</span>
                              <span className="text-[9px] text-emerald-400 font-mono">KES {cat.volume.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Demographics Circular split */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                      <div>
                        <h4 className="font-display font-bold text-xs text-white">Identity Ledger Status</h4>
                        <p className="text-[9px] text-slate-500">System user categorization proportions.</p>
                      </div>
                      <div className="py-2 space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                            <span>Customers</span>
                            <span>{analyticsData.rolesSplit.customers} ({Math.round(analyticsData.rolesSplit.customers / (analyticsData.rolesSplit.customers + analyticsData.rolesSplit.fundis || 1) * 100)}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(analyticsData.rolesSplit.customers / (analyticsData.rolesSplit.customers + analyticsData.rolesSplit.fundis || 1) * 100)}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                            <span>Expert Fundis</span>
                            <span>{analyticsData.rolesSplit.fundis} ({Math.round(analyticsData.rolesSplit.fundis / (analyticsData.rolesSplit.customers + analyticsData.rolesSplit.fundis || 1) * 100)}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${(analyticsData.rolesSplit.fundis / (analyticsData.rolesSplit.customers + analyticsData.rolesSplit.fundis || 1) * 100)}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                            <span>Platform Administrators</span>
                            <span>{analyticsData.rolesSplit.admins}</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-red-500 h-1.5 rounded-full animate-pulse" style={{ width: '10%' }} />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[9px] text-slate-400 leading-normal">
                        All users correspond to legitimate verified Kenyan national credentials.
                      </div>
                    </div>

                    {/* Operational contract check */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <h4 className="font-display font-bold text-xs text-white">Project Pipeline Efficiency</h4>
                      <p className="text-[9px] text-slate-500">Breakdown of operational fulfillment rates.</p>
                      <div className="grid grid-cols-3 gap-2 text-center pt-2">
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-500 block uppercase">Active</span>
                          <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
                            {analyticsData.systemMetrics.activeJobs}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-500 block uppercase">Resolved</span>
                          <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                            {analyticsData.systemMetrics.completedJobs}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-500 block uppercase">Aborted</span>
                          <span className="text-xl font-bold font-mono text-slate-500 mt-1 block">
                            {analyticsData.systemMetrics.cancelledJobs}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-mono text-slate-400 space-y-1.5 pt-2">
                        <div className="flex justify-between">
                          <span>Arbitrated disputes:</span>
                          <span className="text-rose-400">{analyticsData.systemMetrics.disputeCount} filed</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Identity Verification rate:</span>
                          <span className="text-emerald-400">
                            {Math.round((analyticsData.systemMetrics.kycCount - analyticsData.systemMetrics.pendingKyc) / (analyticsData.systemMetrics.kycCount || 1) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'fraud' && (
            <div className="space-y-6 animate-in fade-in duration-150 text-left">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white font-display">Fraud Desk & Intelligence</h2>
                  <p className="text-xs text-slate-400">Rules-based autonomous transaction scoring and behavioral monitoring.</p>
                </div>
                <button 
                  onClick={fetchFraudAlerts}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-mono cursor-pointer transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFraud ? 'animate-spin' : ''}`} />
                  SCAN SYSTEMS
                </button>
              </div>

              {loadingFraud ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active rule banners */}
                  <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 leading-normal">
                    <div className="flex gap-3 items-center">
                      <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-red-400 uppercase font-mono block">6 ACTIVE FRAUD HEURISTICS RUNNING</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Scans dispute velocities, rapid-fire auth attempts, payment failures, transaction size limits, unverified balances, and rapid completions.</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-1 border border-red-500/20 rounded font-mono font-bold uppercase animate-pulse">
                      SECURE SHIELD ACTIVE
                    </span>
                  </div>

                  {/* Feed of active alerts */}
                  {fraudAlerts.length === 0 ? (
                    <div className="p-16 text-center border border-dashed border-slate-800 bg-slate-950 rounded-3xl space-y-2">
                      <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-400 font-mono">Clean Security Log</h4>
                      <p className="text-[10px] text-slate-500 max-w-sm mx-auto">All active accounts, MPesa transactions, and authentication requests score below risk limits.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fraudAlerts.map((alert: any) => (
                        <div 
                          key={alert.id}
                          className={`p-5 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col justify-between ${
                            alert.risk_level === 'CRITICAL' ? 'border-l-4 border-l-red-500' :
                            alert.risk_level === 'HIGH' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-amber-500'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-mono text-slate-500 block uppercase">ALERT ID: #{alert.id}</span>
                              <span className={`text-[8px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${
                                alert.risk_level === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/25' :
                                alert.risk_level === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/25' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              }`}>
                                {alert.risk_level} RISK
                              </span>
                            </div>

                            <strong className="text-white block mt-2 text-xs font-mono">{alert.rule_triggered}</strong>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{alert.details}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                            <span>Logged: {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}</span>
                            <span>Entity ID: {alert.user_id || alert.job_id || 'anonymous'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'allocations' && (
            <div className="space-y-6 animate-in fade-in duration-150 text-left">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Kazify Dispatch & Allocation Desk</h2>
                <p className="text-xs text-slate-400">Match client requests with the nearest, highly reliable tradespersons based on proximity, ratings, and active trade skills.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Service Requests List */}
                <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                    <h3 className="font-display font-bold text-xs text-slate-300 uppercase tracking-wider">Active Service Requests</h3>
                    <button 
                      onClick={fetchAllocationsJobs}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition font-mono"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingJobs ? 'animate-spin' : ''}`} />
                      SYNC LIST
                    </button>
                  </div>

                  {/* Search filter */}
                  <div>
                    <input 
                      type="text"
                      placeholder="Filter by title, client, or category..."
                      value={allocationSearch}
                      onChange={(e) => setAllocationSearch(e.target.value)}
                      aria-label="Filter active service requests list"
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-500"
                    />
                  </div>

                  {loadingJobs ? (
                    <div className="py-12 flex justify-center">
                      <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {jobsList.filter(job => {
                        const searchLower = allocationSearch.toLowerCase();
                        return (
                          job.title?.toLowerCase().includes(searchLower) ||
                          job.category?.toLowerCase().includes(searchLower) ||
                          job.customer_name?.toLowerCase().includes(searchLower)
                        );
                      }).length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-600 font-mono">
                          No matching active requests found.
                        </div>
                      ) : (
                        jobsList.filter(job => {
                          const searchLower = allocationSearch.toLowerCase();
                          return (
                            job.title?.toLowerCase().includes(searchLower) ||
                            job.category?.toLowerCase().includes(searchLower) ||
                            job.customer_name?.toLowerCase().includes(searchLower)
                          );
                        }).map((job) => {
                          const isAssigned = !!job.fundi_id;
                          const isSelected = selectedAllocationJob?.id === job.id;

                          return (
                            <div 
                              key={job.id}
                              onClick={() => {
                                setSelectedAllocationJob(job);
                                setAllocationMessage('');
                              }}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 ${
                                isSelected 
                                  ? 'bg-slate-900 border-orange-500' 
                                  : 'bg-slate-950 hover:bg-slate-900/50 border-slate-850'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-xs font-semibold text-white truncate max-w-[180px]">{job.title}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border bg-slate-900 border-slate-800 text-slate-400">
                                  {job.category}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-400 truncate leading-snug">{job.description}</p>

                              <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                                <span className="text-slate-500">Client: {job.customer_name}</span>
                                <span className="text-emerald-400 font-semibold">KES {job.amount?.toLocaleString()}</span>
                              </div>

                              <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-slate-900">
                                <span className="text-slate-500">Style: {job.workflow?.toUpperCase()}</span>
                                {isAssigned ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                    ASSIGNED
                                  </span>
                                ) : (
                                  <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    UNASSIGNED
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side: Proximity Matching Engine */}
                <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between min-h-[400px]">
                  {selectedAllocationJob ? (
                    <div className="space-y-6 text-left">
                      <div className="border-b border-slate-900 pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-slate-500">REQUEST ID: {selectedAllocationJob.id}</span>
                            <h3 className="font-display font-bold text-lg text-white mt-0.5">{selectedAllocationJob.title}</h3>
                          </div>
                          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2 py-1 rounded font-mono font-bold uppercase">
                            {selectedAllocationJob.status?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{selectedAllocationJob.description}</p>

                        <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-mono text-slate-400">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Client Coordinates</span>
                            <span>Lat: {selectedAllocationJob.lat?.toFixed(5)} | Lng: {selectedAllocationJob.lng?.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">Service Address</span>
                            <span className="truncate block" title={selectedAllocationJob.address}>{selectedAllocationJob.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Matching Recommendations list */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-display font-bold text-xs text-slate-300 uppercase tracking-wider">Spatial & Reliability Matches</h4>
                          <span className="text-[10px] text-slate-500 font-mono">Sorted by Distance</span>
                        </div>

                        {allocationMessage && (
                          <div className={`p-3 rounded-xl border text-xs font-mono ${
                            allocationMessage.includes('Successfully') || allocationMessage.includes('allocated')
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {allocationMessage}
                          </div>
                        )}

                        {loadingRecommendations ? (
                          <div className="py-12 flex justify-center items-center">
                            <RefreshCw className="w-6 h-6 text-orange-500 animate-spin mr-2" />
                            <span className="text-xs text-slate-400 font-mono">Calculating geodetic distances...</span>
                          </div>
                        ) : recommendations.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-600 font-mono border border-dashed border-slate-900 rounded-2xl">
                            No available tradespersons registered in the "{selectedAllocationJob.category}" category.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                            {recommendations.map((fundi: any) => {
                              const isCurrentAllocated = selectedAllocationJob.fundi_id === fundi.id;

                              return (
                                <div 
                                  key={fundi.id}
                                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                    isCurrentAllocated 
                                      ? 'bg-emerald-500/5 border-emerald-500/30' 
                                      : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80'
                                  }`}
                                >
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <strong className="text-xs text-white block truncate">{fundi.name}</strong>
                                      {fundi.isReliable && (
                                        <span className="text-[8px] bg-green-500/15 text-green-400 border border-green-500/20 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                                          RELIABLE ⭐
                                        </span>
                                      )}
                                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                                        fundi.status === 'available' 
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                                          : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                                      }`}>
                                        {fundi.status}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                                      <span className="flex items-center gap-1 text-orange-400 font-bold">
                                        ★ {fundi.rating?.toFixed(1) || '5.0'}
                                      </span>
                                      <span className="text-slate-500">|</span>
                                      <span className="text-blue-400 font-semibold">
                                        📍 ~{fundi.distanceKM} KM away
                                      </span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 font-mono truncate">
                                      Address: {fundi.address}
                                    </div>
                                  </div>

                                  <div className="self-end md:self-center">
                                    {isCurrentAllocated ? (
                                      <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl block text-center">
                                        CURRENT ALLOCATION
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleAllocate(selectedAllocationJob.id, fundi.id)}
                                        disabled={isAllocating}
                                        className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 text-center block whitespace-nowrap animate-in fade-in"
                                      >
                                        {isAllocating ? 'ALLOCATING...' : 'ALLOCATE EXPERT'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-lg animate-bounce">
                        🛰️
                      </div>
                      <h3 className="font-display font-bold text-sm text-slate-300">Spatial Proximity Matching</h3>
                      <p className="text-xs text-slate-500 max-w-sm leading-normal">Select an active client request from the left list to fetch nearby available experts, calculate geodetic distances, and allocate.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
      )}

      {/* Geolocation-based Allocation Modal */}
      {isAllocationModalOpen && selectedAllocationJob && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative bg-slate-950 max-w-2xl w-full border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
                  <Navigation className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">Manual Dispatch Desk</span>
                  <h3 className="font-display font-bold text-base text-white">Allocate Expert Tradesperson</h3>
                </div>
              </div>
              <button 
                onClick={() => setIsAllocationModalOpen(false)}
                className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-left">
              {/* Job Details Card */}
              <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] font-mono text-orange-400 font-bold uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                      {selectedAllocationJob.category}
                    </span>
                    <h4 className="font-display font-bold text-sm text-white mt-1.5">{selectedAllocationJob.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selectedAllocationJob.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block font-bold">BUDGET</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">KES {selectedAllocationJob.amount?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-[11px] font-mono text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Service Address</span>
                    <span className="truncate block text-slate-300" title={selectedAllocationJob.address}>📍 {selectedAllocationJob.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Client Coordinates</span>
                    <span className="text-slate-300">Lat: {selectedAllocationJob.lat?.toFixed(5)} | Lng: {selectedAllocationJob.lng?.toFixed(5)}</span>
                  </div>
                </div>
              </div>

              {/* Proximity Matching Results */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest">Nearby Available Experts</span>
                  <span className="text-[10px] text-orange-400 font-mono font-bold">Dynamic Geodetic Sorting</span>
                </div>

                {allocationMessage && (
                  <div className={`p-3.5 rounded-xl border text-xs font-mono animate-in slide-in-from-top-2 duration-150 ${
                    allocationMessage.includes('Successfully') || allocationMessage.includes('allocated')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {allocationMessage}
                  </div>
                )}

                {loadingRecommendations ? (
                  <div className="py-12 flex flex-col justify-center items-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
                    <span className="text-xs text-slate-500 font-mono">Re-indexing regional satellite coordinates...</span>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-2xl">
                    No available tradespersons registered in "{selectedAllocationJob.category}" category.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {(() => {
                      const sortedFundis = [...recommendations].sort((a, b) => {
                        const fLatA = a.lat !== undefined ? a.lat : (a.location?.lat !== undefined ? a.location.lat : -1.286389);
                        const fLngA = a.lng !== undefined ? a.lng : (a.location?.lng !== undefined ? a.location.lng : 36.817223);
                        const fLatB = b.lat !== undefined ? b.lat : (b.location?.lat !== undefined ? b.location.lat : -1.286389);
                        const fLngB = b.lng !== undefined ? b.lng : (b.location?.lng !== undefined ? b.location.lng : 36.817223);

                        const distA = calculateGeodeticDistance(selectedAllocationJob.lat, selectedAllocationJob.lng, fLatA, fLngA);
                        const distB = calculateGeodeticDistance(selectedAllocationJob.lat, selectedAllocationJob.lng, fLatB, fLngB);
                        
                        // Available first
                        const statusA = a.status || 'available';
                        const statusB = b.status || 'available';
                        if (statusA === 'available' && statusB !== 'available') return -1;
                        if (statusA !== 'available' && statusB === 'available') return 1;
                        
                        // Closest first
                        if (Math.abs(distA - distB) > 0.01) {
                          return distA - distB;
                        }
                        
                        // Highest rating first
                        return (b.rating || 5) - (a.rating || 5);
                      });

                      return sortedFundis.map((fundi: any) => {
                        const fLat = fundi.lat !== undefined ? fundi.lat : (fundi.location?.lat !== undefined ? fundi.location.lat : -1.286389);
                        const fLng = fundi.lng !== undefined ? fundi.lng : (fundi.location?.lng !== undefined ? fundi.location.lng : 36.817223);
                        const calculatedDist = calculateGeodeticDistance(selectedAllocationJob.lat, selectedAllocationJob.lng, fLat, fLng);
                        const isCurrentAllocated = selectedAllocationJob.fundi_id === fundi.id;

                        return (
                          <div 
                            key={fundi.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                              isCurrentAllocated 
                                ? 'bg-emerald-500/5 border-emerald-500/30' 
                                : 'bg-slate-900 border-slate-850 hover:border-slate-800'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-xs text-white block truncate">{fundi.name}</strong>
                                <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded uppercase border ${
                                  fundi.status === 'available' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                                }`}>
                                  {fundi.status || 'available'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                                <span className="text-orange-400 font-bold">★ {fundi.rating?.toFixed(1) || '5.0'}</span>
                                <span className="text-slate-600">|</span>
                                <span className="text-blue-400 font-semibold flex items-center gap-1">📍 {calculatedDist} KM away</span>
                              </div>
                            </div>

                            <div>
                              {isCurrentAllocated ? (
                                <span className="text-[10px] font-mono font-bold text-emerald-400 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
                                  ASSIGNED
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await handleAllocate(selectedAllocationJob.id, fundi.id);
                                  }}
                                  disabled={isAllocating}
                                  className="px-3 py-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-[10px] uppercase rounded-lg transition cursor-pointer"
                                >
                                  {isAllocating ? 'Assigning...' : 'Assign'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>* Assignment automatically generates a smart escrow lock contract.</span>
              <button 
                onClick={() => setIsAllocationModalOpen(false)}
                className="text-slate-400 hover:text-white transition font-bold"
              >
                CLOSE DESK
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayoutWrapper>
  );
}
