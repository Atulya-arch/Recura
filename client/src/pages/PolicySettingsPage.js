import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { ShieldCheck, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
export const PolicySettingsPage = () => {
    const queryClient = useQueryClient();
    const [successMsg, setSuccessMsg] = useState(false);
    const { data: policy, isLoading } = useQuery({
        queryKey: ['policy-settings'],
        queryFn: () => fetchApi('/api/policies')
    });
    const [maxRetries, setMaxRetries] = useState(3);
    const [maxRecoveryWindowHours, setMaxRecoveryWindowHours] = useState(72);
    const [maxReminders, setMaxReminders] = useState(2);
    const [maxAutomatedActions, setMaxAutomatedActions] = useState(3);
    const [minimumAiConfidence, setMinimumAiConfidence] = useState(0.65);
    useEffect(() => {
        if (policy) {
            setMaxRetries(policy.maxRetries ?? 3);
            setMaxRecoveryWindowHours(policy.maxRecoveryWindowHours ?? 72);
            setMaxReminders(policy.maxReminders ?? 2);
            setMaxAutomatedActions(policy.maxAutomatedActions ?? 3);
            setMinimumAiConfidence((policy.minimumAiConfidencePercent ?? 65) / 100);
        }
    }, [policy]);
    const updateMutation = useMutation({
        mutationFn: (updated) => fetchApi('/api/policies', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policy-settings'] });
            setSuccessMsg(true);
            setTimeout(() => setSuccessMsg(false), 4000);
        }
    });
    const handleSave = (e) => {
        e.preventDefault();
        updateMutation.mutate({ maxRetries, maxRecoveryWindowHours, maxReminders, maxAutomatedActions, minimumAiConfidence });
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx(RefreshCw, { className: "w-8 h-8 text-[#161618] animate-spin" }) }));
    }
    return (_jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-black text-slate-900 tracking-tight", children: "Merchant Policy Guardrails" }), _jsx("p", { className: "text-xs text-slate-500 font-medium mt-1", children: "Configure deterministic thresholds. All AI decisions are checked against these policies before execution." })] }), _jsxs("div", { className: "bg-[#161618] text-white rounded-3xl p-6 flex items-start space-x-4 shadow-2xl", children: [_jsx("div", { className: "p-2.5 rounded-2xl bg-[#d4ff32] text-slate-950 shrink-0", children: _jsx(ShieldCheck, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-extrabold text-white", children: "Core Governance Principle" }), _jsxs("p", { className: "text-xs text-slate-400 mt-1 font-medium leading-relaxed", children: [_jsx("strong", { className: "text-[#d4ff32]", children: "AI recommends. Policy governs. Code executes. Verification confirms. Audit explains." }), _jsx("br", {}), "No AI decision can ever override or bypass these configurable merchant policies."] })] })] }), successMsg && (_jsxs("div", { className: "bg-[#d4ff32]/20 border border-[#d4ff32] p-4 rounded-2xl flex items-center space-x-2 text-slate-900 text-sm font-black", children: [_jsx(CheckCircle2, { className: "w-5 h-5 text-slate-900" }), _jsx("span", { children: "Policy settings updated successfully. Immediate effect on subsequent recovery workflows." })] })), _jsxs("form", { onSubmit: handleSave, className: "bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-flux-card", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-black text-slate-900 mb-1", children: "Maximum Payment Retries" }), _jsx("p", { className: "text-xs text-slate-400 mb-2 font-medium", children: "Hard limit on automated retry attempts per transaction." }), _jsx("input", { type: "number", min: 1, max: 10, value: maxRetries, onChange: (e) => setMaxRetries(Number(e.target.value)), className: "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono font-black focus:outline-none focus:ring-2 focus:ring-[#d4ff32]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-black text-slate-900 mb-1", children: "Max Recovery Window (Hours)" }), _jsx("p", { className: "text-xs text-slate-400 mb-2 font-medium", children: "Recovery is blocked after this window expires." }), _jsx("input", { type: "number", min: 1, max: 720, value: maxRecoveryWindowHours, onChange: (e) => setMaxRecoveryWindowHours(Number(e.target.value)), className: "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono font-black focus:outline-none focus:ring-2 focus:ring-[#d4ff32]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-black text-slate-900 mb-1", children: "Maximum Reminders" }), _jsx("p", { className: "text-xs text-slate-400 mb-2 font-medium", children: "Max automated customer payment reminder notifications." }), _jsx("input", { type: "number", min: 0, max: 10, value: maxReminders, onChange: (e) => setMaxReminders(Number(e.target.value)), className: "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono font-black focus:outline-none focus:ring-2 focus:ring-[#d4ff32]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-black text-slate-900 mb-1", children: "Minimum AI Confidence Threshold" }), _jsx("p", { className: "text-xs text-slate-400 mb-2 font-medium", children: "AI recommendations below this % trigger safe escalation." }), _jsxs("div", { className: "flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3", children: [_jsx("input", { type: "range", min: 0.5, max: 0.95, step: 0.05, value: minimumAiConfidence, onChange: (e) => setMinimumAiConfidence(Number(e.target.value)), className: "flex-1 accent-[#161618]" }), _jsxs("span", { className: "text-sm font-black text-slate-950 font-mono w-12 text-right", children: [Math.round(minimumAiConfidence * 100), "%"] })] })] })] }), _jsx("div", { className: "pt-4 border-t border-slate-100 flex justify-end", children: _jsxs("button", { type: "submit", disabled: updateMutation.isPending, className: "flex items-center space-x-2 px-6 py-3 bg-[#161618] hover:bg-slate-900 text-white font-black text-sm rounded-full shadow-sm transition duration-200", children: [_jsx(Save, { className: "w-4 h-4" }), _jsx("span", { children: "Save Policy Configuration" })] }) })] })] }));
};
