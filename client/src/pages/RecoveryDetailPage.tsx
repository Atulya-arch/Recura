import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FormatMoney } from '../components/FormatMoney';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { fetchApi } from '../api/client';
import {
  ArrowLeft,
  ShieldCheck,
  Play,
  StopCircle,
  Cpu,
  RefreshCw,
  MessageSquare,
  Volume2,
  Calendar,
  Send,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const RecoveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customerReplyInput, setCustomerReplyInput] = useState('');
  const [isSubmittingPTP, setIsSubmittingPTP] = useState(false);
  const [ptpResult, setPtpResult] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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

  const handlePtpSubmit = async (replyText: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingPTP(true);
    setPtpResult(null);

    try {
      const res = await fetchApi<any>(`/api/recovery-cases/${id}/hinglish-negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerReply: replyText })
      });

      setPtpResult(res.extraction);
      setCustomerReplyInput('');
      refetch();
    } catch (err) {
      console.error('Failed to negotiate PTP:', err);
    } finally {
      setIsSubmittingPTP(false);
    }
  };

  const playVoiceSimulation = () => {
    setIsPlayingAudio(true);
    // Use Web Speech API if available for real audible speech synthesis!
    if ('speechSynthesis' in window && ai?.hinglishScript) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(ai.hinglishScript);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingAudio(false), 4000);
    }
  };

  const quickPtpOptions = [
    'Salary 7th ko aayegi, tab auto-retry kar lena',
    'Kal shaam 5 baje try karo please',
    'Main abhi instant UPI link se pay kar deta hoon',
    'Order cancel kar do mujhe nahi chahiye'
  ];

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
              {rc.promiseToPayDate && (
                <span className="flex items-center space-x-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>PTP Scheduled: {new Date(rc.promiseToPayDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                </span>
              )}
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

          {/* STANDOUT FEATURE: Hinglish AI Voice & Promise-to-Pay Negotiator */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-[#e0d8ff]/30 border border-purple-200 rounded-3xl p-6 shadow-flux-card space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-2xl bg-[#d4ff32] text-slate-950 shadow-sm">
                  <Sparkles className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">
                      Hinglish AI Voice & Promise-to-Pay (PTP) Assistant
                    </h2>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-[#161618] text-[#d4ff32] rounded-full uppercase">
                      NLP Negotiator
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Localized conversational touchpoint & autonomous date extraction for Indian customers.
                  </p>
                </div>
              </div>

              {/* Play Audio Button */}
              <button
                onClick={playVoiceSimulation}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition shadow-sm ${
                  isPlayingAudio
                    ? 'bg-[#d4ff32] text-slate-950 ring-2 ring-lime-400 animate-pulse'
                    : 'bg-[#161618] text-white hover:bg-black'
                }`}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
                <span>{isPlayingAudio ? 'Playing Call Audio…' : 'Play Voice Script'}</span>
              </button>
            </div>

            {/* Generated Hinglish AI Script Box */}
            <div className="bg-white border border-purple-200/80 rounded-2xl p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                <div className="flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                  <span>Personalized Hinglish Recovery Script (SMS / WhatsApp / AI Call):</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Hindi + English Hybrid</span>
              </div>
              <p className="text-xs text-slate-800 font-semibold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                "{ai?.hinglishScript ||
                  `Namaste ${cust.name} ji! Acme Retail par aapka order #${tx.orderId} hold par hai. Kya hum payment retry aapke salary credit date par schedule karein?`}"
              </p>
            </div>

            {/* Interactive Promise-to-Pay Simulator */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">
                  Simulate Customer Response (Test Natural Language Date Extraction):
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Click a preset or type below</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickPtpOptions.map((opt, i) => (
                  <button
                    key={i}
                    disabled={isSubmittingPTP}
                    onClick={() => handlePtpSubmit(opt)}
                    className="text-left text-[11px] font-bold p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:bg-[#e0d8ff]/40 text-slate-700 transition duration-150 shadow-sm"
                  >
                    💬 "{opt}"
                  </button>
                ))}
              </div>

              {/* Custom Response Input Box */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={customerReplyInput}
                  onChange={(e) => setCustomerReplyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePtpSubmit(customerReplyInput)}
                  placeholder="Or type custom reply (e.g. 'Bhaiya 10th ko try karna salary aayegi')..."
                  className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d4ff32] shadow-sm"
                />
                <button
                  disabled={isSubmittingPTP || !customerReplyInput.trim()}
                  onClick={() => handlePtpSubmit(customerReplyInput)}
                  className="px-4 py-2 bg-[#161618] hover:bg-black text-[#d4ff32] rounded-full text-xs font-black flex items-center space-x-1.5 shadow-sm transition disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingPTP ? 'Extracting…' : 'Send'}</span>
                </button>
              </div>

              {/* Real-time Extraction Result Card */}
              {ptpResult && (
                <div className="bg-[#d4ff32]/20 border border-lime-400 p-4 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between text-xs font-black text-slate-950">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>AI Promise-to-Pay Extracted & Locked!</span>
                    </div>
                    <span className="font-mono text-[11px] bg-slate-950 text-[#d4ff32] px-2 py-0.5 rounded-full">
                      Confidence: {Math.round(ptpResult.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-900 font-bold">{ptpResult.summary}</p>
                  <p className="text-[11px] text-slate-700 font-medium bg-white/70 p-2.5 rounded-xl border border-lime-200">
                    <strong>AI Hinglish Response:</strong> "{ptpResult.hinglishReply}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Diagnosis Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-2xl bg-[#e0d8ff] text-purple-900">
                  <Cpu className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">AI Failure Diagnosis & Strategy</h2>
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
          <div className="flex-1 overflow-y-auto max-h-[640px] pr-1">
            <Timeline events={events} amountMinor={rc.revenueAtRiskMinor} />
          </div>
        </div>
      </div>
    </div>
  );
};
