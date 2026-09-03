import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FormatMoney } from '../components/FormatMoney';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { fetchApi } from '../api/client';
import { ArrowLeft, ShieldCheck, Play, StopCircle, Cpu, RefreshCw, MessageSquare, Volume2, Calendar, Send, Sparkles, CheckCircle2 } from 'lucide-react';
export const RecoveryDetailPage = () => {
    const { id } = useParams();
    const [customerReplyInput, setCustomerReplyInput] = useState('');
    const [isSubmittingPTP, setIsSubmittingPTP] = useState(false);
    const [ptpResult, setPtpResult] = useState(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['recovery-detail', id],
        queryFn: () => fetchApi(`/api/recovery-cases/${id}`),
        refetchInterval: 3000
    });
    if (isLoading || !data) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx(RefreshCw, { className: "w-8 h-8 text-[#161618] animate-spin" }) }));
    }
    const { recoveryCase: rc, transaction: tx, customer: cust, aiDecision: ai, auditEvents: events } = data;
    const handleExecuteNext = async () => {
        try {
            await fetchApi(`/api/recovery-cases/${id}/execute`, { method: 'POST' });
            refetch();
        }
        catch (err) {
            console.error(err);
        }
    };
    const handleStopWorkflow = async () => {
        try {
            await fetchApi(`/api/recovery-cases/${id}/stop`, { method: 'POST' });
            refetch();
        }
        catch (err) {
            console.error(err);
        }
    };
    const handlePtpSubmit = async (replyText) => {
        if (!replyText.trim())
            return;
        setIsSubmittingPTP(true);
        setPtpResult(null);
        try {
            const res = await fetchApi(`/api/recovery-cases/${id}/hinglish-negotiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerReply: replyText })
            });
            setPtpResult(res.extraction);
            setCustomerReplyInput('');
            refetch();
        }
        catch (err) {
            console.error('Failed to negotiate PTP:', err);
        }
        finally {
            setIsSubmittingPTP(false);
        }
    };
    const playVoiceSimulation = () => {
        setIsPlayingAudio(true);
        const scriptText = ai?.hinglishScript ||
            `Namaste ${cust?.name || 'Customer'} ji! Acme Retail par aapka order #${tx?.orderId || '50001'} ka payment bank timeout ki wajah se pending hai. Humne aapke cart ko safe rakha hai. Kya hum payment retry aapke salary date par schedule karein?`;
        // 1. Play pleasant soft chime sound via Web Audio API
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            }
        }
        catch (e) {
            console.warn('AudioContext chime not available', e);
        }
        // 2. Speak using Web Speech API
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            const utterance = new SpeechSynthesisUtterance(scriptText);
            utterance.volume = 1.0;
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            // Select Indian English / Hindi voice if available
            const voices = window.speechSynthesis.getVoices();
            const inVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN') || v.name.includes('India'));
            if (inVoice) {
                utterance.voice = inVoice;
            }
            utterance.onend = () => setIsPlayingAudio(false);
            utterance.onerror = (e) => {
                console.error('SpeechSynthesis error:', e);
                setIsPlayingAudio(false);
            };
            // Small delay after chime
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 200);
        }
        else {
            setTimeout(() => setIsPlayingAudio(false), 4000);
        }
    };
    const quickPtpOptions = [
        'Salary 7th ko aayegi, tab auto-retry kar lena',
        'Kal shaam 5 baje try karo please',
        'Main abhi instant UPI link se pay kar deta hoon',
        'Order cancel kar do mujhe nahi chahiye'
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Link, { to: "/recoveries", className: "p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-700 transition shadow-sm", children: _jsx(ArrowLeft, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("h1", { className: "text-2xl font-black text-slate-900 font-mono tracking-tight", children: ["Case #", rc.id.slice(0, 12), "\u2026"] }), _jsx(StatusBadge, { status: rc.status }), rc.promiseToPayDate && (_jsxs("span", { className: "flex items-center space-x-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300", children: [_jsx(Calendar, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["PTP Scheduled: ", new Date(rc.promiseToPayDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })] })] }))] }), _jsxs("p", { className: "text-xs text-slate-500 mt-1 font-medium", children: ["Order ", _jsx("span", { className: "text-slate-900 font-mono font-black", children: tx.orderId }), " \u2022 Customer ", _jsx("span", { className: "text-slate-900 font-black", children: cust.name })] })] })] }), rc.status !== 'RECOVERED' && rc.status !== 'STOPPED' && (_jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("button", { onClick: handleExecuteNext, className: "flex items-center space-x-2 px-4 py-2.5 bg-[#161618] text-white text-xs font-black rounded-full shadow-sm hover:bg-slate-900 transition", children: [_jsx(Play, { className: "w-4 h-4 fill-current" }), _jsx("span", { children: "Execute Recovery Step" })] }), _jsxs("button", { onClick: handleStopWorkflow, className: "flex items-center space-x-2 px-4 py-2.5 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-full hover:bg-red-50 transition", children: [_jsx(StopCircle, { className: "w-4 h-4" }), _jsx("span", { children: "Stop" })] })] }))] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-5", children: [_jsxs("div", { className: "bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card", children: [_jsx("h2", { className: "text-sm font-black text-slate-900 mb-4 tracking-tight", children: "Transaction & Customer Overview" }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] text-slate-400 font-medium block", children: "Customer" }), _jsx("p", { className: "text-sm font-black text-slate-900 mt-0.5", children: cust.name }), _jsx("p", { className: "text-[11px] text-slate-400", children: cust.email })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[11px] text-slate-400 font-medium block", children: "Revenue at Risk" }), _jsx("p", { className: "text-sm font-black text-slate-950 font-mono mt-0.5", children: _jsx(FormatMoney, { amountMinor: rc.revenueAtRiskMinor, currency: tx.currency }) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[11px] text-slate-400 font-medium block", children: "Payment Method" }), _jsx("p", { className: "text-sm font-mono font-black text-purple-900 mt-0.5", children: tx.paymentMethod })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[11px] text-slate-400 font-medium block", children: "Attempt" }), _jsxs("p", { className: "text-sm font-mono font-black text-slate-900 mt-0.5", children: [rc.currentAttempt, " / ", rc.maxAttempts] })] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-slate-400 font-medium", children: "Initial Failure Reason:" }), _jsx("span", { className: "font-mono text-red-700 font-bold", children: tx.failureReason || 'Transient failure' })] })] }), _jsxs("div", { className: "bg-gradient-to-br from-white via-slate-50 to-[#e0d8ff]/30 border border-purple-200 rounded-3xl p-6 shadow-flux-card space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-2.5", children: [_jsx("div", { className: "p-2 rounded-2xl bg-[#d4ff32] text-slate-950 shadow-sm", children: _jsx(Sparkles, { className: "w-5 h-5 text-slate-950" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("h2", { className: "text-sm font-black text-slate-900 tracking-tight", children: "Hinglish AI Voice & Promise-to-Pay (PTP) Assistant" }), _jsx("span", { className: "text-[9px] font-black px-2 py-0.5 bg-[#161618] text-[#d4ff32] rounded-full uppercase", children: "NLP Negotiator" })] }), _jsx("p", { className: "text-[11px] text-slate-500 font-medium", children: "Localized conversational touchpoint & autonomous date extraction for Indian customers." })] })] }), _jsxs("button", { onClick: playVoiceSimulation, className: `flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition shadow-sm ${isPlayingAudio
                                                    ? 'bg-[#d4ff32] text-slate-950 ring-2 ring-lime-400 animate-pulse'
                                                    : 'bg-[#161618] text-white hover:bg-black'}`, children: [_jsx(Volume2, { className: `w-3.5 h-3.5 ${isPlayingAudio ? 'animate-bounce' : ''}` }), _jsx("span", { children: isPlayingAudio ? 'Playing Call Audio…' : 'Play Voice Script' })] })] }), _jsxs("div", { className: "bg-white border border-purple-200/80 rounded-2xl p-4 space-y-2 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] font-bold text-purple-900", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(MessageSquare, { className: "w-3.5 h-3.5 text-purple-700" }), _jsx("span", { children: "Personalized Hinglish Recovery Script (SMS / WhatsApp / AI Call):" })] }), _jsx("span", { className: "text-[10px] text-slate-400 font-mono", children: "Hindi + English Hybrid" })] }), _jsxs("p", { className: "text-xs text-slate-800 font-semibold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic", children: ["\"", ai?.hinglishScript ||
                                                        `Namaste ${cust.name} ji! Acme Retail par aapka order #${tx.orderId} hold par hai. Kya hum payment retry aapke salary credit date par schedule karein?`, "\""] })] }), _jsxs("div", { className: "space-y-3 pt-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-black text-slate-900", children: "Simulate Customer Response (Test Natural Language Date Extraction):" }), _jsx("span", { className: "text-[10px] text-slate-400 font-medium", children: "Click a preset or type below" })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: quickPtpOptions.map((opt, i) => (_jsxs("button", { disabled: isSubmittingPTP, onClick: () => handlePtpSubmit(opt), className: "text-left text-[11px] font-bold p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:bg-[#e0d8ff]/40 text-slate-700 transition duration-150 shadow-sm", children: ["\uD83D\uDCAC \"", opt, "\""] }, i))) }), _jsxs("div", { className: "flex items-center space-x-2 pt-1", children: [_jsx("input", { type: "text", value: customerReplyInput, onChange: (e) => setCustomerReplyInput(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handlePtpSubmit(customerReplyInput), placeholder: "Or type custom reply (e.g. 'Bhaiya 10th ko try karna salary aayegi')...", className: "flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d4ff32] shadow-sm" }), _jsxs("button", { disabled: isSubmittingPTP || !customerReplyInput.trim(), onClick: () => handlePtpSubmit(customerReplyInput), className: "px-4 py-2 bg-[#161618] hover:bg-black text-[#d4ff32] rounded-full text-xs font-black flex items-center space-x-1.5 shadow-sm transition disabled:opacity-40", children: [_jsx(Send, { className: "w-3.5 h-3.5" }), _jsx("span", { children: isSubmittingPTP ? 'Extracting…' : 'Send' })] })] }), ptpResult && (_jsxs("div", { className: "bg-[#d4ff32]/20 border border-lime-400 p-4 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200", children: [_jsxs("div", { className: "flex items-center justify-between text-xs font-black text-slate-950", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-slate-950" }), _jsx("span", { children: "AI Promise-to-Pay Extracted & Locked!" })] }), _jsxs("span", { className: "font-mono text-[11px] bg-slate-950 text-[#d4ff32] px-2 py-0.5 rounded-full", children: ["Confidence: ", Math.round(ptpResult.confidence * 100), "%"] })] }), _jsx("p", { className: "text-xs text-slate-900 font-bold", children: ptpResult.summary }), _jsxs("p", { className: "text-[11px] text-slate-700 font-medium bg-white/70 p-2.5 rounded-xl border border-lime-200", children: [_jsx("strong", { children: "AI Hinglish Response:" }), " \"", ptpResult.hinglishReply, "\""] })] }))] })] }), _jsxs("div", { className: "bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center space-x-2.5", children: [_jsx("div", { className: "p-2 rounded-2xl bg-[#e0d8ff] text-purple-900", children: _jsx(Cpu, { className: "w-4 h-4" }) }), _jsx("h2", { className: "text-sm font-black text-slate-900 tracking-tight", children: "AI Failure Diagnosis & Strategy" })] }), ai && (_jsxs("span", { className: "text-[11px] px-3 py-1 rounded-full bg-[#d4ff32] text-slate-950 font-black", children: ["Confidence: ", ai.confidence, "%"] }))] }), ai ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "bg-slate-50 p-4 rounded-2xl border border-slate-200", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-semibold", children: [_jsx("span", { children: "Failure Diagnosis" }), _jsx("span", { className: "font-mono text-amber-700 font-black", children: ai.failureCategory })] }), _jsx("p", { className: "text-sm font-bold text-slate-900", children: ai.diagnosis })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "bg-slate-50 p-4 rounded-2xl border border-slate-200", children: [_jsx("span", { className: "text-[11px] text-slate-400 block font-medium mb-1", children: "Recommended Action" }), _jsx("span", { className: "text-sm font-black text-purple-900 font-mono", children: ai.recommendedAction })] }), _jsxs("div", { className: "bg-slate-50 p-4 rounded-2xl border border-slate-200", children: [_jsx("span", { className: "text-[11px] text-slate-400 block font-medium mb-1", children: "Business Rationale" }), _jsx("p", { className: "text-xs text-slate-600 italic font-medium", children: ai.rationale })] })] })] })) : (_jsx("p", { className: "text-xs text-slate-400", children: "AI diagnosis pending execution." }))] }), _jsxs("div", { className: "bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card", children: [_jsxs("div", { className: "flex items-center space-x-2.5 mb-4", children: [_jsx("div", { className: "p-2 rounded-2xl bg-sky-100 text-sky-900", children: _jsx(ShieldCheck, { className: "w-4 h-4" }) }), _jsx("h2", { className: "text-sm font-black text-slate-900 tracking-tight", children: "Merchant Policy Engine Guardrails" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3 text-xs", children: [_jsxs("div", { className: "bg-slate-50 border border-slate-200 p-3.5 rounded-2xl", children: [_jsx("span", { className: "text-slate-400 block font-medium mb-0.5", children: "Eligibility" }), _jsx("span", { className: "font-black text-slate-950", children: "ELIGIBLE" })] }), _jsxs("div", { className: "bg-slate-50 border border-slate-200 p-3.5 rounded-2xl", children: [_jsx("span", { className: "text-slate-400 block font-medium mb-0.5", children: "Retry Limit" }), _jsxs("span", { className: "font-mono font-black text-slate-950", children: [rc.currentAttempt, " / ", rc.maxAttempts] })] }), _jsxs("div", { className: "bg-slate-50 border border-slate-200 p-3.5 rounded-2xl", children: [_jsx("span", { className: "text-slate-400 block font-medium mb-0.5", children: "Customer Opt-out" }), _jsx("span", { className: "font-black text-slate-950", children: cust.optedOut ? 'OPTED_OUT' : 'ACTIVE' })] })] })] })] }), _jsxs("div", { className: "bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card flex flex-col", children: [_jsx("h2", { className: "text-sm font-black text-slate-900 mb-4 tracking-tight", children: "Execution Timeline" }), _jsx("div", { className: "flex-1 overflow-y-auto max-h-[640px] pr-1", children: _jsx(Timeline, { events: events, amountMinor: rc.revenueAtRiskMinor }) })] })] })] }));
};
