import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { Filter, RefreshCw } from 'lucide-react';
export const AuditTrailPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState('ALL');
    const { data: logs, isLoading, refetch } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: () => fetchApi('/api/audit'),
        refetchInterval: 5000
    });
    if (isLoading || !logs) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx(RefreshCw, { className: "w-8 h-8 text-[#161618] animate-spin" }) }));
    }
    const filtered = logs.filter((l) => {
        const metaStr = l.metadata ? JSON.stringify(l.metadata).toLowerCase() : '';
        const matchesSearch = l.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.recoveryCaseId && l.recoveryCaseId.toLowerCase().includes(searchTerm.toLowerCase())) ||
            metaStr.includes(searchTerm.toLowerCase());
        const matchesEvent = eventFilter === 'ALL' || l.eventType === eventFilter;
        return matchesSearch && matchesEvent;
    });
    const eventTypeColor = {
        PAYMENT_RECOVERED: 'bg-[#d4ff32] text-slate-950',
        PROMISE_REGISTERED: 'bg-amber-100 text-amber-900 border border-amber-300 font-black',
        CUSTOMER_READY_PAY: 'bg-[#d4ff32] text-slate-950 font-black',
        PAYMENT_FAILED: 'bg-red-100 text-red-800',
        POLICY_BLOCKED: 'bg-red-100 text-red-800',
        DIAGNOSIS_CREATED: 'bg-amber-100 text-amber-800',
        AI_RECOMMENDATION: 'bg-[#e0d8ff] text-purple-900',
        POLICY_CHECK: 'bg-sky-100 text-sky-900',
        ACTION_EXECUTED: 'bg-blue-100 text-blue-900',
        PROVIDER_TIMEOUT: 'bg-amber-100 text-amber-800',
        VERIFICATION: 'bg-purple-100 text-purple-900',
        DUPLICATE_BLOCKED: 'bg-slate-200 text-slate-800',
        AI_FAILURE: 'bg-orange-100 text-orange-900',
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-black text-slate-900 tracking-tight", children: "System Audit Trail" }), _jsx("p", { className: "text-xs text-slate-500 font-medium mt-1", children: "Complete immutable event ledger \u2014 payment failures, AI decisions, policy checks, and verification logs." })] }), _jsxs("button", { onClick: () => refetch(), className: "flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-full border border-slate-200 shadow-sm transition", children: [_jsx(RefreshCw, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Refresh Logs" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-flux-card", children: [_jsxs("div", { className: "flex items-center space-x-3 w-full sm:w-auto", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Filter, { className: "w-4 h-4 text-slate-500" }), _jsx("span", { className: "text-xs font-black text-slate-800", children: "Filter Event Type:" })] }), _jsxs("select", { value: eventFilter, onChange: (e) => setEventFilter(e.target.value), className: "bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs font-extrabold text-slate-800 focus:outline-none", children: [_jsx("option", { value: "ALL", children: "All Event Types" }), _jsx("option", { value: "PAYMENT_RECOVERED", children: "PAYMENT_RECOVERED" }), _jsx("option", { value: "PROMISE_REGISTERED", children: "PROMISE_REGISTERED (PTP)" }), _jsx("option", { value: "CUSTOMER_READY_PAY", children: "CUSTOMER_READY_PAY" }), _jsx("option", { value: "PAYMENT_FAILED", children: "PAYMENT_FAILED" }), _jsx("option", { value: "DIAGNOSIS_CREATED", children: "DIAGNOSIS_CREATED" }), _jsx("option", { value: "AI_RECOMMENDATION", children: "AI_RECOMMENDATION" }), _jsx("option", { value: "POLICY_CHECK", children: "POLICY_CHECK" }), _jsx("option", { value: "POLICY_BLOCKED", children: "POLICY_BLOCKED" }), _jsx("option", { value: "ACTION_EXECUTED", children: "ACTION_EXECUTED" }), _jsx("option", { value: "PROVIDER_TIMEOUT", children: "PROVIDER_TIMEOUT" }), _jsx("option", { value: "VERIFICATION", children: "VERIFICATION" }), _jsx("option", { value: "DUPLICATE_BLOCKED", children: "DUPLICATE_BLOCKED" }), _jsx("option", { value: "AI_FAILURE", children: "AI_FAILURE" })] })] }), _jsxs("span", { className: "text-xs font-bold text-slate-500", children: ["Showing ", _jsx("strong", { className: "text-slate-900 font-mono font-black", children: filtered.length }), " immutable audit records"] })] }), _jsx("div", { className: "bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-flux-card", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-xs text-slate-700", children: [_jsx("thead", { className: "bg-slate-50 text-slate-900 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4", children: "Timestamp" }), _jsx("th", { className: "px-6 py-4", children: "Event Type" }), _jsx("th", { className: "px-6 py-4", children: "Case ID" }), _jsx("th", { className: "px-6 py-4", children: "Metadata Payload" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-100 font-mono", children: [filtered.map((l) => (_jsxs("tr", { className: "hover:bg-slate-50/80 transition duration-150", children: [_jsx("td", { className: "px-6 py-3.5 text-slate-500 font-sans text-[11px]", children: new Date(l.createdAt).toLocaleString() }), _jsx("td", { className: "px-6 py-3.5", children: _jsx("span", { className: `inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black ${eventTypeColor[l.eventType] || 'bg-slate-100 text-slate-700'}`, children: l.eventType }) }), _jsx("td", { className: "px-6 py-3.5 text-purple-900 text-[11px] font-bold", children: l.recoveryCaseId || '—' }), _jsx("td", { className: "px-6 py-3.5 text-slate-500 max-w-lg truncate text-[10px]", children: l.metadata ? JSON.stringify(l.metadata) : '{}' })] }, l.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-6 py-12 text-center text-slate-400 font-sans font-medium", children: "No audit records match the current filter selection." }) }))] })] }) }) })] }));
};
