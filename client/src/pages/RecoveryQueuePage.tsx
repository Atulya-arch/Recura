import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormatMoney } from '../components/FormatMoney';
import { StatusBadge } from '../components/StatusBadge';
import { fetchApi } from '../api/client';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, RefreshCw, Filter } from 'lucide-react';

export const RecoveryQueuePage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: cases, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['recovery-cases'],
    queryFn: () => fetchApi<any[]>('/api/recovery-cases'),
    refetchInterval: 5000
  });

  if (isLoading || !cases) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-[#161618] animate-spin" />
      </div>
    );
  }

  const filtered = cases.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recovery Operations Queue</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Active recovery candidate workflows, AI recommendations, policy evaluations, and execution states.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-full border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-3xl shadow-flux-card">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-black text-slate-800">Filter by Recovery Status:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs font-extrabold text-slate-800 focus:outline-none"
        >
          <option value="ALL">All Recovery Statuses</option>
          <option value="RECOVERED">RECOVERED</option>
          <option value="RETRY_SCHEDULED">RETRY_SCHEDULED</option>
          <option value="ESCALATED">ESCALATED</option>
          <option value="STOPPED">STOPPED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-flux-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-900 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Customer / Order</th>
                <th className="px-6 py-4">Revenue at Risk</th>
                <th className="px-6 py-4">Failure Cause</th>
                <th className="px-6 py-4">Recovery Status</th>
                <th className="px-6 py-4 text-center">Attempts</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition duration-150">
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-slate-900">{c.customerName}</div>
                    <div className="text-[11px] text-purple-900 font-mono font-bold">{c.orderId}</div>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-950">
                    <FormatMoney amountMinor={c.revenueAtRiskMinor} />
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-600">
                    {c.failureReason || 'Transient Error'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-black text-slate-900">
                    {c.currentAttempt} / {c.maxAttempts}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/recoveries/${c.id}`}
                      className="inline-flex items-center space-x-1 text-xs font-black text-slate-950 bg-[#d4ff32] hover:bg-[#c4f024] px-3.5 py-1.5 rounded-full shadow-sm transition"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No recovery cases match the current filter selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
