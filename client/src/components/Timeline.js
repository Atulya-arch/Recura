import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle2, AlertTriangle, ShieldCheck, Clock, RefreshCw, XCircle, ArrowRight } from 'lucide-react';
import { FormatMoney } from './FormatMoney';
export const Timeline = ({ events, amountMinor }) => {
    if (!events || events.length === 0) {
        return _jsx("div", { className: "text-slate-400 text-sm py-4", children: "No timeline events recorded yet." });
    }
    const sorted = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return (_jsx("div", { className: "relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200", children: sorted.map((evt) => {
            const timeStr = new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            let icon = _jsx(Clock, { className: "w-3.5 h-3.5 text-slate-400" });
            let dotBg = 'bg-slate-100 border-slate-300';
            let title = evt.eventType;
            let titleColor = 'text-slate-800';
            switch (evt.eventType) {
                case 'PAYMENT_FAILED':
                    icon = _jsx(XCircle, { className: "w-3.5 h-3.5 text-red-600" });
                    title = 'Payment Failed';
                    dotBg = 'bg-red-100 border-red-300';
                    titleColor = 'text-red-700';
                    break;
                case 'DIAGNOSIS_CREATED':
                    icon = _jsx(AlertTriangle, { className: "w-3.5 h-3.5 text-amber-600" });
                    title = `Failure Diagnosed: ${evt.metadata?.failureCategory || 'TRANSIENT'}`;
                    dotBg = 'bg-amber-100 border-amber-300';
                    titleColor = 'text-amber-800';
                    break;
                case 'AI_RECOMMENDATION':
                    icon = _jsx(ArrowRight, { className: "w-3.5 h-3.5 text-purple-600" });
                    title = `AI Recommended: ${evt.metadata?.recommendedAction || 'RETRY'}`;
                    dotBg = 'bg-[#e0d8ff] border-purple-300';
                    titleColor = 'text-purple-900';
                    break;
                case 'POLICY_CHECK':
                    icon = _jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-sky-600" });
                    title = `Policy Check: ${evt.metadata?.status || 'PASSED'}`;
                    dotBg = 'bg-sky-100 border-sky-300';
                    titleColor = 'text-sky-900';
                    break;
                case 'POLICY_BLOCKED':
                    icon = _jsx(XCircle, { className: "w-3.5 h-3.5 text-red-600" });
                    title = `Policy Blocked: ${evt.metadata?.reason || 'Limit reached'}`;
                    dotBg = 'bg-red-100 border-red-300';
                    titleColor = 'text-red-800';
                    break;
                case 'ACTION_EXECUTED':
                    icon = _jsx(RefreshCw, { className: "w-3.5 h-3.5 text-blue-600" });
                    title = `Action: ${evt.metadata?.actionType || 'RETRY'}`;
                    dotBg = 'bg-blue-100 border-blue-300';
                    titleColor = 'text-blue-900';
                    break;
                case 'PROVIDER_TIMEOUT':
                    icon = _jsx(Clock, { className: "w-3.5 h-3.5 text-amber-600" });
                    title = 'Gateway Timeout (UNKNOWN)';
                    dotBg = 'bg-amber-100 border-amber-300';
                    titleColor = 'text-amber-800';
                    break;
                case 'VERIFICATION':
                    icon = _jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-purple-600" });
                    title = `Verification: ${evt.metadata?.verification?.actualStatus || 'SUCCESS'}`;
                    dotBg = 'bg-[#e0d8ff] border-purple-300';
                    titleColor = 'text-purple-900';
                    break;
                case 'PAYMENT_RECOVERED':
                    icon = _jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-slate-950" });
                    title = 'Payment Successfully Recovered';
                    dotBg = 'bg-[#d4ff32] border-lime-400';
                    titleColor = 'text-slate-950';
                    break;
                case 'WORKFLOW_STOPPED':
                    icon = _jsx(XCircle, { className: "w-3.5 h-3.5 text-slate-500" });
                    title = `Workflow Stopped: ${evt.metadata?.reason || 'FINISHED'}`;
                    dotBg = 'bg-slate-100 border-slate-300';
                    titleColor = 'text-slate-600';
                    break;
            }
            return (_jsxs("div", { className: "relative flex items-start space-x-3 text-sm", children: [_jsx("div", { className: `absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full border ${dotBg} shrink-0`, children: icon }), _jsxs("div", { className: "flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: `font-extrabold text-xs ${titleColor}`, children: title }), _jsx("span", { className: "text-[10px] text-slate-400 font-mono shrink-0", children: timeStr })] }), evt.eventType === 'PAYMENT_RECOVERED' && (_jsxs("div", { className: "mt-1 text-slate-950 font-black text-xs", children: ["Recovered: ", _jsx(FormatMoney, { amountMinor: amountMinor })] })), evt.metadata?.diagnosis && (_jsx("p", { className: "mt-1 text-[11px] text-slate-600 font-medium", children: evt.metadata.diagnosis })), evt.metadata?.rationale && (_jsxs("p", { className: "mt-1 text-[11px] text-slate-500 italic", children: ["\"", evt.metadata.rationale, "\""] }))] })] }, evt.id));
        }) }));
};
