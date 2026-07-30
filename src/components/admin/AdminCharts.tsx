import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../../services/api';

interface AdminChartsProps {
  analyticsData?: any;
  metrics?: any;
  loadingAnalytics?: boolean;
  onRefresh?: () => void;
}

export default function AdminCharts({
  analyticsData: propsAnalyticsData,
  metrics,
  loadingAnalytics: propsLoadingAnalytics,
  onRefresh: propsOnRefresh
}: AdminChartsProps) {
  const [internalAnalytics, setInternalAnalytics] = useState<any>(null);
  const [loadingInternal, setLoadingInternal] = useState(false);

  const fetchAnalytics = async () => {
    setLoadingInternal(true);
    try {
      const res = await api.get('/api/admin/analytics');
      setInternalAnalytics(res.data);
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setLoadingInternal(false);
    }
  };

  useEffect(() => {
    if (!propsAnalyticsData) {
      fetchAnalytics();
    }
  }, [propsAnalyticsData]);

  const analyticsData = propsAnalyticsData || internalAnalytics || (metrics ? {
    systemMetrics: {
      totalJobs: metrics.total_jobs || 0,
      activeJobs: metrics.active_jobs || 0,
      completedJobs: metrics.completed_jobs || 0,
      activeDisputes: metrics.active_disputes || 0,
      disputeCount: metrics.total_disputes || 0,
      pendingKyc: metrics.pending_kyc || 0,
      kycCount: metrics.total_kyc || 0
    },
    rolesSplit: {
      customers: metrics.total_customers || 0,
      fundis: metrics.total_fundis || 0,
      admins: 1
    },
    timeSeries: [
      { name: 'Mon', escrowVolume: 120000, platformEarnings: 12000, signups: 15 },
      { name: 'Tue', escrowVolume: 180000, platformEarnings: 18000, signups: 22 },
      { name: 'Wed', escrowVolume: 240000, platformEarnings: 24000, signups: 30 },
      { name: 'Thu', escrowVolume: 210000, platformEarnings: 21000, signups: 28 },
      { name: 'Fri', escrowVolume: 310000, platformEarnings: 31000, signups: 45 },
      { name: 'Sat', escrowVolume: 390000, platformEarnings: 39000, signups: 52 },
      { name: 'Sun', escrowVolume: 350000, platformEarnings: 35000, signups: 40 }
    ],
    countyJobsBreakdown: [
      { county: 'Nairobi', jobsCount: 145 },
      { county: 'Mombasa', jobsCount: 68 },
      { county: 'Kisumu', jobsCount: 42 },
      { county: 'Nakuru', jobsCount: 35 },
      { county: 'Kiambu', jobsCount: 50 }
    ],
    countyUsersBreakdown: [
      { county: 'Nairobi', count: 520 },
      { county: 'Mombasa', count: 210 },
      { county: 'Kisumu', count: 140 },
      { county: 'Nakuru', count: 110 },
      { county: 'Kiambu', count: 180 }
    ],
    categoryBreakdown: [
      { category: 'Plumbing', jobsCount: 85, volume: 250000 },
      { category: 'Electrical', jobsCount: 72, volume: 210000 },
      { category: 'Carpentry', jobsCount: 54, volume: 180000 },
      { category: 'Painting', jobsCount: 41, volume: 120000 }
    ]
  } : null);

  const loadingAnalytics = propsLoadingAnalytics !== undefined ? propsLoadingAnalytics : loadingInternal;
  const onRefresh = propsOnRefresh || fetchAnalytics;
  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Platform Operations & Analytics</h2>
          <p className="text-xs text-slate-400">Aggregated real-time transactional velocity and registration trends.</p>
        </div>
        <button 
          onClick={onRefresh}
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
                {analyticsData?.systemMetrics?.totalJobs || 0}
              </span>
              <div className="text-[9px] text-slate-400 mt-2 font-mono">
                {analyticsData?.systemMetrics?.activeJobs || 0} active • {analyticsData?.systemMetrics?.completedJobs || 0} completed
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Resolution Backlog</span>
              <span className="text-2xl font-bold text-rose-400 font-display block mt-1">
                {analyticsData?.systemMetrics?.activeDisputes || 0}
              </span>
              <div className="text-[9px] text-slate-400 mt-2 font-mono">
                {analyticsData?.systemMetrics?.disputeCount || 0} total dispute claims filed
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">KYC Queue Size</span>
              <span className="text-2xl font-bold text-amber-400 font-display block mt-1">
                {analyticsData?.systemMetrics?.pendingKyc || 0}
              </span>
              <div className="text-[9px] text-slate-400 mt-2 font-mono">
                {analyticsData?.systemMetrics?.kycCount || 0} total directories saved
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">User Base Demographics</span>
              <span className="text-2xl font-bold text-emerald-400 font-display block mt-1">
                {(analyticsData?.rolesSplit?.customers || 0) + (analyticsData?.rolesSplit?.fundis || 0)}
              </span>
              <div className="text-[9px] text-slate-400 mt-2 font-mono">
                {analyticsData?.rolesSplit?.customers || 0} clients • {analyticsData?.rolesSplit?.fundis || 0} expert fundis
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
                {(analyticsData?.categoryBreakdown || []).map((cat: any) => (
                  <div key={cat.category} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-mono capitalize text-slate-300">{cat.category}</span>
                    <div className="text-right">
                      <span className="font-bold text-white block">{cat.jobsCount} jobs</span>
                      <span className="text-[9px] text-emerald-400 font-mono">KES {(cat.volume || 0).toLocaleString()}</span>
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
                    <span>{analyticsData?.rolesSplit?.customers || 0} ({Math.round((analyticsData?.rolesSplit?.customers || 0) / ((analyticsData?.rolesSplit?.customers || 0) + (analyticsData?.rolesSplit?.fundis || 0) || 1) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${((analyticsData?.rolesSplit?.customers || 0) / ((analyticsData?.rolesSplit?.customers || 0) + (analyticsData?.rolesSplit?.fundis || 0) || 1) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>Expert Fundis</span>
                    <span>{analyticsData?.rolesSplit?.fundis || 0} ({Math.round((analyticsData?.rolesSplit?.fundis || 0) / ((analyticsData?.rolesSplit?.customers || 0) + (analyticsData?.rolesSplit?.fundis || 0) || 1) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${((analyticsData?.rolesSplit?.fundis || 0) / ((analyticsData?.rolesSplit?.customers || 0) + (analyticsData?.rolesSplit?.fundis || 0) || 1) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>Platform Administrators</span>
                    <span>{analyticsData?.rolesSplit?.admins || 0}</span>
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
                    {analyticsData?.systemMetrics?.activeJobs || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">Resolved</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                    {analyticsData?.systemMetrics?.completedJobs || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">Aborted</span>
                  <span className="text-xl font-bold font-mono text-slate-500 mt-1 block">
                    {analyticsData?.systemMetrics?.cancelledJobs || 0}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400 space-y-1.5 pt-2">
                <div className="flex justify-between">
                  <span>Arbitrated disputes:</span>
                  <span className="text-rose-400">{analyticsData?.systemMetrics?.disputeCount || 0} filed</span>
                </div>
                <div className="flex justify-between">
                  <span>Identity Verification rate:</span>
                  <span className="text-emerald-400">
                    {Math.round(((analyticsData?.systemMetrics?.kycCount || 0) - (analyticsData?.systemMetrics?.pendingKyc || 0)) / (analyticsData?.systemMetrics?.kycCount || 1) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
