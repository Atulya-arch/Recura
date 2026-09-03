import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FormatMoney } from '../components/FormatMoney';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { fetchApi } from '../api/client';
import { ArrowLeft, ShieldCheck, Play, StopCircle, Cpu, RefreshCw } from 'lucide-react';

export const RecoveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['recovery-detail', id],
    queryFn: () => fetchApi<any>(`/api/recovery-cases/${id}`),
    refetchInterval: 3000
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-[#161618] animate-spin" />
      </div>
    );
  }

  const { recoveryCase: rc, transaction: tx, customer: cust, aiDecision: ai, auditEvents: events } = data;

  const handleExecuteNext = async () => {
    try {
      await fetchApi(`/api/recovery-cases/${id}/execute`, { method: 'POST' });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopWorkflow = async () => {
    try {
      await fetchApi(`/api/recovery-cases/${id}/stop`, { method: 'POST' });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/recoveries"
            className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-700 transition shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">Case #{rc.id.slice(0, 12)}…</h1>
              <StatusBadge status={rc.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Order <span className="text-slate-900 font-mono font-black">{tx.orderId}</span> • Customer <span className="text-slate-900 font-black">{cust.name}</span>
            </p>
          </div>
        </div>

        {rc.status !== 'RECOVERED' && rc.status !== 'STOPPED' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExecuteNext}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#161618] text-white text-xs font-black rounded-full shadow-sm hover:bg-slate-900 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Recovery Step</span>
            </button>
            <button
              onClick={handleStopWorkflow}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-full hover:bg-red-50 transition"
            >
              <StopCircle className="w-4 h-4" />
              <span>Stop</span>
            </button>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* Transaction Overview Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card">
            <h2 className="text-sm font-black text-slate-900 mb-4 tracking-tight">Transaction & Customer Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Customer</span>
                <p className="text-sm font-black text-slate-900 mt-0.5">{cust.name}</p>
                <p className="text-[11px] text-slate-400">{cust.email}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Revenue at Risk</span>
                <p className="text-sm font-black text-slate-950 font-mono mt-0.5">
                  <FormatMoney amountMinor={rc.revenueAtRiskMinor} currency={tx.currency} />
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Payment Method</span>
                <p className="text-sm font-mono font-black text-purple-900 mt-0.5">{tx.paymentMethod}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Attempt</span>
                <p className="text-sm font-mono font-black text-slate-900 mt-0.5">{rc.currentAttempt} / {rc.maxAttempts}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Initial Failure Reason:</span>
              <span className="font-mono text-red-700 font-bold">{tx.failureReason || 'Transient failure'}</span>
            </div>
          </div>

          {/* AI Diagnosis Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-2xl bg-[#e0d8ff] text-purple-900">
                  <Cpu className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">AI Diagnosis & Strategy</h2>
              </div>
              {ai && (
                <span className="text-[11px] px-3 py-1 rounded-full bg-[#d4ff32] text-slate-950 font-black">
                  Confidence: {ai.confidence}%
                </span>
              )}
            </div>

            {ai ? (
              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-semibold">
                    <span>Failure Diagnosis</span>
                    <span className="font-mono text-amber-700 font-black">{ai.failureCategory}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{ai.diagnosis}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-400 block font-medium mb-1">Recommended Action</span>
                    <span className="text-sm font-black text-purple-900 font-mono">{ai.recommendedAction}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-400 block font-medium mb-1">Business Rationale</span>
                    <p className="text-xs text-slate-600 italic font-medium">{ai.rationale}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">AI diagnosis pending execution.</p>
            )}
          </div>

          {/* Policy Guardrails Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="p-2 rounded-2xl bg-sky-100 text-sky-900">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Merchant Policy Engine Guardrails</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-slate-400 block font-medium mb-0.5">Eligibility</span>
                <span className="font-black text-slate-950">ELIGIBLE</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-slate-400 block font-medium mb-0.5">Retry Limit</span>
                <span className="font-mono font-black text-slate-950">{rc.currentAttempt} / {rc.maxAttempts}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-slate-400 block font-medium mb-0.5">Customer Opt-out</span>
                <span className="font-black text-slate-950">{cust.optedOut ? 'OPTED_OUT' : 'ACTIVE'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Audit Timeline */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card flex flex-col">
          <h2 className="text-sm font-black text-slate-900 mb-4 tracking-tight">Execution Timeline</h2>
          <div className="flex-1 overflow-y-auto max-h-[580px] pr-1">
            <Timeline events={events} amountMinor={rc.revenueAtRiskMinor} />
          </div>
        </div>
      </div>
    </div>
  );
};
