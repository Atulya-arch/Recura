import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormatMoney } from '../components/FormatMoney';
import { StatusBadge } from '../components/StatusBadge';
import { DemoControls } from '../components/DemoControls';
import { fetchApi } from '../api/client';
import type { DashboardMetrics } from '../../../shared/types.js';
import { TrendingUp, ShieldAlert, CheckCircle, RefreshCw, Zap, ArrowUpRight, Activity, Heart, Moon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { data, isLoading, refetch } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: () => fetchApi<DashboardMetrics>('/api/dashboard/metrics'),
    refetchInterval: 5000
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-[#161618] animate-spin" />
      </div>
    );
  }

  // Flux Palette Chart Colors (Soft Lavender, Volt Lime, Matte Black, Soft Blue, Coral)
  const COLORS = ['#b8a5fe', '#d4ff32', '#161618', '#38bdf8', '#f87171'];

  const outcomePieData = Object.entries(data.outcomeDistribution).map(([name, value]) => ({ name, value }));
  const failureBarData = Object.entries(data.failureBreakdown).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      {/* Header (Matching 'Health Overview' header in image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Revenue Recovery Overview</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Take control of merchant revenue recovery today!</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-full border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Main Grid matching the image card arrangement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Big Card (Matching 'Energy Used' circular graphic card from image) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-2xl bg-slate-100 text-slate-900">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Revenue at Risk</h3>
              </div>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#f87171]/20 text-red-700">
                {data.failedTransactions} Failed
              </span>
            </div>

            <div className="mt-4">
              <div className="text-3xl font-black text-slate-950 font-mono tracking-tight">
                <FormatMoney amountMinor={data.revenueAtRiskMinor} />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">Failed transactions requiring intervention</p>
            </div>
          </div>

          {/* Overlapping Circles Visual Graphic (Matching the 3 circle overlapping graphic from image) */}
          <div className="relative h-44 flex items-center justify-center py-4">
            <div className="absolute left-6 w-28 h-28 rounded-full bg-[#b8a5fe] text-slate-950 flex flex-col items-center justify-center font-black shadow-lg">
              <span className="text-base font-mono font-black">78.2%</span>
              <span className="text-[10px] opacity-80">Recovery</span>
            </div>
            <div className="absolute right-6 w-24 h-24 rounded-full bg-[#161618] text-white flex flex-col items-center justify-center font-black shadow-xl z-10">
              <span className="text-sm font-mono">{data.activeRecoveriesCount}</span>
              <span className="text-[9px] opacity-70">Active</span>
            </div>
            <div className="absolute bottom-1 w-20 h-20 rounded-full bg-[#d4ff32] text-slate-950 flex flex-col items-center justify-center font-black shadow-md z-20">
              <span className="text-xs font-mono font-black">{data.stoppedSafelyCount}</span>
              <span className="text-[9px] opacity-90">Stopped</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between font-bold">
              <span className="text-slate-500">Recovered Rate</span>
              <span className="text-slate-900 font-mono font-black">{data.recoveryRatePercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-[#b8a5fe] h-2 rounded-full" style={{ width: `${Math.min(100, data.recoveryRatePercent)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Smaller KPI Cards & Dark Feature Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Row of 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Revenue Recovered */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-flux-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-[#d4ff32]/30 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500">Recovered</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#d4ff32] text-slate-950">
                  +{data.recoveryRatePercent}%
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-950 font-mono">
                  <FormatMoney amountMinor={data.recoveredRevenueMinor} />
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total money won back</p>
              </div>
            </div>

            {/* Card 2: Incremental Lift */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-flux-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-purple-100 text-purple-900">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500">Incremental Lift</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#b8a5fe] text-slate-950">
                  +78%
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-950 font-mono">
                  +<FormatMoney amountMinor={data.incrementalRecoveryMinor} />
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">vs naive retry baseline</p>
              </div>
            </div>

            {/* Card 3: Active Cases */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-flux-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-slate-100 text-slate-900">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-500">Active Cases</span>
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-950 font-mono">{data.activeRecoveriesCount}</div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  <span className="text-slate-900 font-bold">{data.escalationsCount}</span> escalated
                </p>
              </div>
            </div>
          </div>

          {/* Dark Feature Card (Matching the 'Sleep Analysis' dark matte container from the image) */}
          <div className="bg-[#161618] text-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-2xl bg-slate-800 text-[#d4ff32]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Failure Reason Distribution</h3>
                  <p className="text-xs text-slate-400 font-medium">Root causes identified by AI agent</p>
                </div>
              </div>

              <span className="text-xs font-extrabold px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                Live Data
              </span>
            </div>

            {/* Bar Chart inside Dark Container */}
            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failureBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161618', borderColor: '#333338', borderRadius: '0.75rem', color: '#ffffff' }}
                    itemStyle={{ color: '#d4ff32' }}
                    formatter={(value: any) => [`${value} failed transactions`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#d4ff32" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo Controls */}
      <DemoControls onScenarioRun={() => refetch()} />

      {/* Outcome Distribution Doughnut Chart in White Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card">
        <h3 className="text-base font-black text-slate-900 mb-4 tracking-tight">Recovery Outcome Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outcomePieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value" nameKey="name">
                {outcomePieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#161618', borderColor: '#333338', borderRadius: '0.75rem', color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                formatter={(value: any, name: any) => [`${value} cases`, `${name}`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {outcomePieData.map((item, idx) => (
            <div key={item.name} className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
              <span>{item.name}: <strong className="text-slate-950 font-mono font-black">{String(item.value)}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
