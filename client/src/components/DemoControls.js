import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';
export const DemoControls = ({ onScenarioRun }) => {
    const [loading, setLoading] = useState(null);
    const navigate = useNavigate();
    const runScenario = async (scenario) => {
        setLoading(scenario);
        try {
            const data = await fetchApi('/api/simulation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario })
            });
            setLoading(null);
            if (onScenarioRun)
                onScenarioRun();
            if (data.recoveryCase?.id) {
                navigate(`/recoveries/${data.recoveryCase.id}`);
            }
        }
        catch (err) {
            setLoading(null);
            console.error('Scenario failed:', err);
        }
    };
    return (_jsxs("div", { className: "bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-2.5", children: [_jsx("div", { className: "p-2 rounded-2xl bg-[#d4ff32] text-slate-950 font-black", children: _jsx(Zap, { className: "w-5 h-5 fill-current" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-base font-black text-slate-900 tracking-tight", children: "Hackathon Interactive Demo Controls" }), _jsx("p", { className: "text-xs text-slate-500 font-medium", children: "Trigger live backend recovery scenarios to test AI diagnosis, policy guardrails, and idempotency." })] })] }), _jsx("span", { className: "text-[11px] font-black px-3 py-1 bg-slate-900 text-white rounded-full", children: "INTERACTIVE" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5", children: [_jsxs("button", { onClick: () => runScenario('SUCCESS'), disabled: Boolean(loading), className: "group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-[#e0d8ff] border border-slate-200 hover:border-purple-300 text-left transition duration-200", children: [_jsxs("div", { className: "flex items-center space-x-2 text-purple-950 font-extrabold text-xs mb-1", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-purple-700 group-hover:scale-110 transition" }), _jsx("span", { children: "1. Successful Recovery" })] }), _jsx("span", { className: "text-[11px] text-slate-600 font-medium", children: "Failure \u2192 AI Diagnosis \u2192 Retry \u2192 Verified Success" })] }), _jsxs("button", { onClick: () => runScenario('TIMEOUT'), disabled: Boolean(loading), className: "group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-sky-100 border border-slate-200 hover:border-sky-300 text-left transition duration-200", children: [_jsxs("div", { className: "flex items-center space-x-2 text-sky-950 font-extrabold text-xs mb-1", children: [_jsx(Clock, { className: "w-4 h-4 text-sky-700 group-hover:scale-110 transition" }), _jsx("span", { children: "2. Gateway Timeout" })] }), _jsx("span", { className: "text-[11px] text-slate-600 font-medium", children: "Timeout \u2192 Status UNKNOWN \u2192 Authoritative Verify" })] }), _jsxs("button", { onClick: () => runScenario('RETRY_LIMIT'), disabled: Boolean(loading), className: "group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-pink-100 border border-slate-200 hover:border-pink-300 text-left transition duration-200", children: [_jsxs("div", { className: "flex items-center space-x-2 text-pink-950 font-extrabold text-xs mb-1", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-pink-700 group-hover:scale-110 transition" }), _jsx("span", { children: "3. Retry Limit Policy" })] }), _jsx("span", { className: "text-[11px] text-slate-600 font-medium", children: "Repeated Failures \u2192 Max Limit \u2192 Escalation" })] }), _jsxs("button", { onClick: () => runScenario('DUPLICATE'), disabled: Boolean(loading), className: "group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 text-left transition duration-200", children: [_jsxs("div", { className: "flex items-center space-x-2 text-amber-950 font-extrabold text-xs mb-1", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-amber-700 group-hover:scale-110 transition" }), _jsx("span", { children: "4. Duplicate Protection" })] }), _jsx("span", { className: "text-[11px] text-slate-600 font-medium", children: "Repeated Key Execution \u2192 Idempotency Blocked" })] })] })] }));
};
