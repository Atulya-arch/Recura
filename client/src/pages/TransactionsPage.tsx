import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { FormatMoney } from '../components/FormatMoney';
import { StatusBadge } from '../components/StatusBadge';
import { fetchApi } from '../api/client';
import { Search, Filter, RefreshCw, ArrowRight, Zap } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const { data: txs, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['transactions'],
    queryFn: () => fetchApi<any[]>('/api/transactions'),
    refetchInterval: 3000
  });

  if (isLoading || !txs) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-[#161618] animate-spin" />
      </div>
    );
  }

  const filtered = txs.filter((t) => {
    const matchesSearch =
      t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.failureReason && t.failureReason.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'FAILED') {
      matchesStatus = t.paymentStatus === 'FAILED';
    } else if (statusFilter === 'SUCCESS') {
      matchesStatus = t.paymentStatus === 'SUCCESS';
    } else if (statusFilter === 'ACTIVE_RECOVERY') {
      matchesStatus = Boolean(t.recoveryStatus && !['RECOVERED', 'FAILED', 'STOPPED'].includes(t.recoveryStatus));
    }

    return matchesSearch && matchesStatus;
  });

  const activeRecoveryCount = txs.filter(t => t.recoveryStatus && !['RECOVERED', 'FAILED', 'STOPPED'].includes(t.recoveryStatus)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transaction Work Queue</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Search and filter merchant payment transactions, failure reasons, and AI recovery links.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-full border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Transactions</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-flux-card">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black text-slate-800">Filter Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs font-extrabold text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Transactions ({txs.length})</option>
            <option value="FAILED">Failed ({txs.filter(t => t.paymentStatus === 'FAILED').length})</option>
            <option value="SUCCESS">Success ({txs.filter(t => t.paymentStatus === 'SUCCESS').length})</option>
            <option value="ACTIVE_RECOVERY">Active in Recovery Queue ({activeRecoveryCount})</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          {searchTerm && (
            <div className="flex items-center space-x-1.5 bg-[#e0d8ff] border border-purple-300 px-3 py-1 rounded-full text-xs font-extrabold text-purple-950">
              <span>Query: "{searchTerm}"</span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-purple-700 hover:text-purple-950 font-black ml-1"
                title="Clear search query"
              >
                ×
              </button>
            </div>
          )}
          <span className="text-xs font-bold text-slate-500">
            Showing <strong className="text-slate-900 font-mono font-black">{filtered.length}</strong> transactions
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-flux-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-900 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4">AI Recovery Queue</th>
                <th className="px-6 py-4">Failure Reason</th>
                <th className="px-6 py-4 text-center">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition duration-150">
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-slate-900">{t.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{t.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-black text-purple-900">{t.orderId}</td>
                  <td className="px-6 py-4 font-black text-slate-950">
                    <FormatMoney amountMinor={t.amountMinor} currency={t.currency} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{t.paymentMethod}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.paymentStatus} />
                  </td>
                  <td className="px-6 py-4">
                    {t.recoveryCaseId ? (
                      <Link
                        to={`/recoveries/${t.recoveryCaseId}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-[#161618] hover:bg-black text-[#d4ff32] shadow-sm transition"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{t.recoveryStatus || 'ACTIVE'}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-600">
                    {t.failureReason || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-black text-slate-900">
                    {t.attemptCount}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No transactions match the selected filter criteria.
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
