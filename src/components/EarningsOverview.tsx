import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Calendar, Briefcase, 
  Award, ShieldCheck, Clock, Users, ArrowUpRight, CheckCircle2 
} from 'lucide-react';
import { User, Job } from '../types';

interface EarningsOverviewProps {
  user: User;
  assignedJobs: Job[];
}

export default function EarningsOverview({ user, assignedJobs }: EarningsOverviewProps) {
  const [chartView, setChartView] = useState<'revenue' | 'volume'>('revenue');

  // Filter completed jobs for this Fundi
  const completedJobs = useMemo(() => {
    return assignedJobs.filter(j => j.status === 'completed');
  }, [assignedJobs]);

  // Compute stats
  const totalEarnings = useMemo(() => {
    return completedJobs.reduce((sum, j) => sum + j.amount, 0);
  }, [completedJobs]);

  const avgTicket = useMemo(() => {
    if (completedJobs.length === 0) return 0;
    return Math.round(totalEarnings / completedJobs.length);
  }, [completedJobs, totalEarnings]);

  const completionRate = useMemo(() => {
    const totalAssigned = assignedJobs.length;
    if (totalAssigned === 0) return 100;
    // Calculate completed vs total non-bidding assigned
    return Math.round((completedJobs.length / totalAssigned) * 100);
  }, [assignedJobs, completedJobs]);

  // Generate monthly charts combining mock base and actual live data
  const monthlyData = useMemo(() => {
    // Standard mock trends representing the first 5 months of the year
    const baseMock = [
      { name: 'Jan', revenue: 15500, jobs: 4 },
      { name: 'Feb', revenue: 22800, jobs: 6 },
      { name: 'Mar', revenue: 18400, jobs: 5 },
      { name: 'Apr', revenue: 31000, jobs: 8 },
      { name: 'May', revenue: 26500, jobs: 7 },
    ];

    // Calculate current month's live data
    // Let's group any live completed jobs from June/current period here
    const currentMonthJobsCount = completedJobs.length;
    const currentMonthRevenue = totalEarnings;

    // Adding current month June
    const liveMonth = {
      name: 'Jun',
      revenue: currentMonthRevenue > 0 ? currentMonthRevenue : 29000, // Fallback if no live jobs completed yet
      jobs: currentMonthJobsCount > 0 ? currentMonthJobsCount : 6,
    };

    return [...baseMock, liveMonth];
  }, [completedJobs, totalEarnings]);

  // Weekly workload stats
  const weeklyDistribution = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Realistic static work distribution
    return days.map((day, idx) => ({
      day,
      jobs: [2, 3, 4, 1, 3, 5, 1][idx],
      earnings: [4500, 6000, 9500, 2000, 7500, 12000, 1500][idx]
    }));
  }, []);

  return (
    <div className="space-y-6 text-left" id="earnings-overview-container">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display font-medium text-lg text-white">Trades Expert Earnings Ledger</h2>
          <p className="text-xs text-slate-500 font-mono">
            Track your continuous Escrow disbursements, payouts, and monthly workspace performance metrics
          </p>
        </div>
        
        {/* Visual Chart Toggles */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setChartView('revenue')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
              chartView === 'revenue' 
                ? 'bg-orange-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            MONTHLY INCOME (KES)
          </button>
          <button
            onClick={() => setChartView('volume')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
              chartView === 'volume' 
                ? 'bg-orange-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            JOB VOLUMES (QTY)
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Life-time Revenue</span>
            <span className="text-xl font-bold font-display text-white">
              KES {totalEarnings > 0 ? totalEarnings.toLocaleString() : "142,800"}
            </span>
            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12.4% vs last period
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Completed Jobs</span>
            <span className="text-xl font-bold font-display text-white">
              {completedJobs.length > 0 ? completedJobs.length : 36} Jobs
            </span>
            <span className="text-[9px] font-mono text-slate-400 block">
              Average 6.2 jobs per month
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Average Ticket Size</span>
            <span className="text-xl font-bold font-display text-white">
              KES {avgTicket > 0 ? avgTicket.toLocaleString() : "4,200"}
            </span>
            <span className="text-[9px] font-mono text-emerald-400 block font-semibold">
              ⭐ Premium Rating Factor
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Job Success Rate</span>
            <span className="text-xl font-bold font-display text-white">
              {completionRate}%
            </span>
            <span className="text-[9px] font-mono text-slate-400 block">
              Disputes SLA compliance
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Income Chart Area */}
      <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white font-display">
            {chartView === 'revenue' ? 'Monthly Earnings Progression' : 'Job Volumes Completed'}
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            {chartView === 'revenue' 
              ? 'Aggregated income (KES) secured and released from Kazify escrow layers' 
              : 'Quantity of individual projects successfully completed and rated'}
          </span>
        </div>

        <div className="h-[240px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'revenue' ? (
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'sans-serif' }}
                  formatter={(value: any) => [`KES ${value.toLocaleString()}`, 'Earnings']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            ) : (
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'sans-serif' }}
                  formatter={(value: any) => [value, 'Jobs Completed']}
                />
                <Bar dataKey="jobs" fill="#f97316" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? '#ea580c' : '#f97316'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of sub-metrics: Weekly Peaks & Completed List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Weekly Peak Load Calendar */}
        <div className="lg:col-span-5 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-md space-y-4">
          <div>
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Weekly Revenue Distribution</h4>
            <span className="text-[10px] font-mono text-slate-500">Day-of-week average workspace capacity</span>
          </div>

          <div className="space-y-3">
            {weeklyDistribution.map((item) => {
              const maxEarnings = Math.max(...weeklyDistribution.map(d => d.earnings));
              const percent = Math.round((item.earnings / maxEarnings) * 100);
              return (
                <div key={item.day} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-300 font-semibold">{item.day}</span>
                    <span className="text-slate-400">
                      KES {item.earnings.toLocaleString()} ({item.jobs} jobs)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Job Ledger Details */}
        <div className="lg:col-span-7 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-md space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <div>
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Completed Jobs Ledger</h4>
              <span className="text-[10px] font-mono text-slate-500">Most recent verified payouts</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              ALL RELEASED
            </span>
          </div>

          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
            {completedJobs.length > 0 ? (
              completedJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between text-left hover:border-slate-800 transition"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-3">
                    <h5 className="text-xs font-bold text-white truncate">{job.title}</h5>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                      <span className="text-slate-500">#{job.id}</span>
                      <span>•</span>
                      <span>{job.category}</span>
                      <span>•</span>
                      <span className="text-slate-500">{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-orange-400 block">
                      KES {job.amount.toLocaleString()}
                    </span>
                    <span className="text-[8px] font-mono font-semibold text-emerald-400 uppercase">
                      Escrow Paidout
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-600 space-y-2">
                <Briefcase className="w-8 h-8 text-slate-800 mx-auto" />
                <p className="text-xs font-mono">No live completed jobs found.</p>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Once jobs are completed and funds released from escrow, they will automatically sync with this live earnings ledger.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
