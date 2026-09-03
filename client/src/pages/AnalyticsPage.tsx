import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormatMoney } from '../components/FormatMoney';
import { fetchApi } from '../api/client';
import type { EvaluationResults } from '../../../shared/types.js';
import { TrendingUp, Zap, RefreshCw, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { data: evalRes, isLoading, refetch } = useQuery<EvaluationResults>({
    queryKey: ['analytics-evaluation'],
    queryFn: () => fetchApi<EvaluationResults>('/api/analytics'),
    refetchInterval: 10000
  });

  if (isLoading || !evalRes) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-[#161618] animate-spin" />
      </div>
    );
  }

  const comparisonData = [
    {
      name: 'Naive Baseline',
      RecoveredRevenue: evalRes.baseline.recoveredRevenueMinor / 100,
    },
    {
      name: 'Recura AI',
      RecoveredRevenue: evalRes.recura.recoveredRevenueMinor / 100,
    }
  ];

  const funnelData = [
    { stage: 'Failed Payments', count: evalRes.failedTransactions },
    { stage: 'Eligible Candidates', count: evalRes.eligibleCasesCount },
    { stage: 'Interventions', count: evalRes.recura.interventionsCount },
    { stage: 'Successful Recoveries', count: evalRes.recura.successfulRecoveriesCount }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recovery Performance Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Empirical evaluation comparing Recura AI Autopilot against naive retry baseline across the full dataset.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-full border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-run Evaluation</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Baseline */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card space-y-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Naive Baseline</span>
          <div className="text-2xl font-black text-slate-700 font-mono">
            <FormatMoney amountMinor={evalRes.baseline.recoveredRevenueMinor} />
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            Recovery Rate: <span className="text-slate-900 font-black">{evalRes.baseline.recoveryRatePercent}%</span>
          </div>
        </div>

        {/* Recura */}
        <div className="bg-[#161618] text-white border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#d4ff32] uppercase tracking-wider">Recura AI Autopilot</span>
            <Zap className="w-4 h-4 text-[#d4ff32]" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            <FormatMoney amountMinor={evalRes.recura.recoveredRevenueMinor} />
          </div>
          <div className="text-xs text-slate-400 font-semibold">
            Recovery Rate: <span className="text-[#d4ff32] font-black">{evalRes.recura.recoveryRatePercent}%</span>
          </div>
        </div>

        {/* Incremental Lift */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Incremental Lift</span>
            <TrendingUp className="w-4 h-4 text-slate-900" />
          </div>
          <div className="text-2xl font-black text-slate-950 font-mono">
            +<FormatMoney amountMinor={evalRes.incrementalRevenueMinor} />
          </div>
          <div className="text-xs font-semibold">
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#d4ff32] text-slate-950">
              +{evalRes.incrementalRatePercent}% lift vs baseline
            </span>
          </div>
        </div>
      </div>

      {/* Bar Chart Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card">
        <h3 className="text-base font-black text-slate-900 mb-4 tracking-tight">Recura vs Baseline — Revenue Recovered (₹)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161618', borderColor: '#333338', borderRadius: '0.75rem', color: '#ffffff' }}
                itemStyle={{ color: '#d4ff32' }}
                formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue Recovered']}
              />
              <Bar dataKey="RecoveredRevenue" name="Recovered Revenue" fill="#b8a5fe" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recovery Funnel Cards */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card">
        <h3 className="text-base font-black text-slate-900 mb-5 tracking-tight">Recovery Funnel Breakdown</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {funnelData.map((item, idx) => (
            <div key={item.stage} className="relative flex flex-col items-start bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-slate-400 font-bold block">{item.stage}</span>
              <span className="text-2xl font-black text-slate-950 font-mono mt-1">{item.count}</span>
              {idx < funnelData.length - 1 && (
                <ArrowDown className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 bg-white rounded-full" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
