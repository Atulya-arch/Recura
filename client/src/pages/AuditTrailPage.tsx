import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { Search, Filter, RefreshCw } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');

  const { data: logs, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: () => fetchApi<any[]>('/api/audit'),
    refetchInterval: 5000
  });

  if (isLoading || !logs) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-[#161618] animate-spin" />
      </div>
    );
  }

  const filtered = logs.filter((l) => {
    const metaStr = l.metadata ? JSON.stringify(l.metadata).toLowerCase() : '';
    const matchesSearch =
      l.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.recoveryCaseId && l.recoveryCaseId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      metaStr.includes(searchTerm.toLowerCase());
    const matchesEvent = eventFilter === 'ALL' || l.eventType === eventFilter;
    return matchesSearch && matchesEvent;
  });

  const eventTypeColor: Record<string, string> = {
    PAYMENT_RECOVERED: 'bg-[#d4ff32] text-slate-950',
    PAYMENT_FAILED: 'bg-red-100 text-red-800',
    POLICY_BLOCKED: 'bg-red-100 text-red-800',
    DIAGNOSIS_CREATED: 'bg-amber-100 text-amber-800',
    AI_RECOMMENDATION: 'bg-[#e0d8ff] text-purple-900',
    POLICY_CHECK: 'bg-sky-100 text-sky-900',
    ACTION_EXECUTED: 'bg-blue-100 text-blue-900',
    VERIFICATION: 'bg-purple-100 text-purple-900',
    DUPLICATE_BLOCKED: 'bg-slate-200 text-slate-800',
    AI_FAILURE: 'bg-orange-100 text-orange-900',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Complete immutable event ledger — payment failures, AI decisions, policy checks, and verification logs.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-full border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-flux-card">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black text-slate-800">Filter Event Type:</span>
          </div>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs font-extrabold text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Event Types</option>
            <option value="PAYMENT_FAILED">PAYMENT_FAILED</option>
            <option value="DIAGNOSIS_CREATED">DIAGNOSIS_CREATED</option>
            <option value="AI_RECOMMENDATION">AI_RECOMMENDATION</option>
            <option value="POLICY_CHECK">POLICY_CHECK</option>
            <option value="POLICY_BLOCKED">POLICY_BLOCKED</option>
            <option value="ACTION_EXECUTED">ACTION_EXECUTED</option>
            <option value="PROVIDER_TIMEOUT">PROVIDER_TIMEOUT</option>
            <option value="VERIFICATION">VERIFICATION</option>
            <option value="PAYMENT_RECOVERED">PAYMENT_RECOVERED</option>
            <option value="DUPLICATE_BLOCKED">DUPLICATE_BLOCKED</option>
            <option value="AI_FAILURE">AI_FAILURE</option>
          </select>
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing <strong className="text-slate-900 font-mono font-black">{filtered.length}</strong> immutable audit records
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-flux-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-900 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Event Type</th>
                <th className="px-6 py-4">Case ID</th>
                <th className="px-6 py-4">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition duration-150">
                  <td className="px-6 py-3.5 text-slate-500 font-sans text-[11px]">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black ${eventTypeColor[l.eventType] || 'bg-slate-100 text-slate-700'}`}>
                      {l.eventType}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-purple-900 text-[11px] font-bold">{l.recoveryCaseId || '—'}</td>
                  <td className="px-6 py-3.5 text-slate-500 max-w-lg truncate text-[10px]">
                    {l.metadata ? JSON.stringify(l.metadata) : '{}'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-sans font-medium">
                    No audit records match the current filter selection.
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
