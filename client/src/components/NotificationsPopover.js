import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, X, Clock, Zap, Check } from 'lucide-react';
import { fetchApi } from '../api/client';
export const NotificationsPopover = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [readEventIds, setReadEventIds] = useState(() => {
        try {
            const saved = localStorage.getItem('recura_read_notifications');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        catch {
            return new Set();
        }
    });
    const popoverRef = useRef(null);
    const navigate = useNavigate();
    // Save read notification IDs to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('recura_read_notifications', JSON.stringify(Array.from(readEventIds)));
        }
        catch (e) {
            console.error(e);
        }
    }, [readEventIds]);
    // Query recent audit events
    const { data: logs } = useQuery({
        queryKey: ['recent-notifications'],
        queryFn: () => fetchApi('/api/audit'),
        refetchInterval: 4000
    });
    // Filter priority notifications
    const allPriorityLogs = (logs || []).filter((l) => ['PAYMENT_RECOVERED', 'POLICY_BLOCKED', 'PROVIDER_TIMEOUT', 'AI_FAILURE', 'AI_RECOMMENDATION'].includes(l.eventType));
    // ONLY show UNREAD notifications in the list (already read notifications are completely removed)
    const unreadLogs = allPriorityLogs.filter((l) => !readEventIds.has(l.id)).slice(0, 10);
    const unreadCount = unreadLogs.length;
    const dismissSingle = (e, id) => {
        e.stopPropagation();
        setReadEventIds((prev) => new Set([...prev, id]));
    };
    const markAllAsRead = () => {
        const newRead = new Set([...readEventIds, ...unreadLogs.map((l) => l.id)]);
        setReadEventIds(newRead);
    };
    const handleNotificationClick = (id, caseId) => {
        // Dismiss/remove this notification immediately upon reading
        setReadEventIds((prev) => new Set([...prev, id]));
        setIsOpen(false);
        if (caseId) {
            navigate(`/recoveries/${caseId}`);
        }
        else {
            navigate('/audit');
        }
    };
    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const getEventMeta = (eventType) => {
        switch (eventType) {
            case 'PAYMENT_RECOVERED':
                return {
                    icon: _jsx(CheckCircle2, { className: "w-4 h-4 text-slate-950" }),
                    bg: 'bg-[#d4ff32]',
                    label: 'Revenue Recovered'
                };
            case 'POLICY_BLOCKED':
                return {
                    icon: _jsx(ShieldAlert, { className: "w-4 h-4 text-red-600" }),
                    bg: 'bg-red-100',
                    label: 'Policy Blocked'
                };
            case 'PROVIDER_TIMEOUT':
                return {
                    icon: _jsx(Clock, { className: "w-4 h-4 text-amber-700" }),
                    bg: 'bg-amber-100',
                    label: 'Gateway Timeout Safety'
                };
            case 'AI_RECOMMENDATION':
                return {
                    icon: _jsx(Zap, { className: "w-4 h-4 text-purple-700" }),
                    bg: 'bg-[#e0d8ff]',
                    label: 'AI Strategy Decided'
                };
            default:
                return {
                    icon: _jsx(AlertTriangle, { className: "w-4 h-4 text-slate-700" }),
                    bg: 'bg-slate-100',
                    label: 'System Alert'
                };
        }
    };
    return (_jsxs("div", { className: "relative", ref: popoverRef, children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), "aria-label": "Notifications", className: `relative p-2.5 bg-white rounded-full border transition-all duration-200 shadow-sm flex items-center justify-center ${isOpen
                    ? 'border-[#161618] ring-2 ring-[#d4ff32]'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`, children: [_jsx(Bell, { className: "w-4 h-4" }), unreadCount > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#d4ff32] text-slate-950 font-black text-[9px] flex items-center justify-center border border-white shadow-sm animate-pulse", children: unreadCount > 9 ? '9+' : unreadCount }))] }), isOpen && (_jsxs("div", { className: "absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("h3", { className: "text-sm font-black text-slate-900 tracking-tight", children: "Active Recovery Alerts" }), unreadCount > 0 && (_jsxs("span", { className: "text-[10px] font-black px-2 py-0.5 rounded-full bg-[#d4ff32] text-slate-950", children: [unreadCount, " unread"] }))] }), _jsxs("div", { className: "flex items-center space-x-2", children: [unreadCount > 0 && (_jsxs("button", { onClick: markAllAsRead, className: "text-[11px] font-bold text-slate-500 hover:text-slate-900 transition flex items-center space-x-1", title: "Clear all active notifications", children: [_jsx(Check, { className: "w-3 h-3" }), _jsx("span", { children: "Clear all" })] })), _jsx("button", { onClick: () => setIsOpen(false), className: "p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100", children: _jsx(X, { className: "w-4 h-4" }) })] })] }), _jsx("div", { className: "max-h-80 overflow-y-auto divide-y divide-slate-100", children: unreadLogs.length > 0 ? (unreadLogs.map((item) => {
                            const meta = getEventMeta(item.eventType);
                            const timeAgo = new Date(item.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            return (_jsxs("div", { onClick: () => handleNotificationClick(item.id, item.recoveryCaseId), className: "group relative p-4 flex items-start space-x-3 cursor-pointer transition duration-150 hover:bg-slate-50 bg-[#d4ff32]/5", children: [_jsx("div", { className: `p-2 rounded-2xl ${meta.bg} shrink-0 mt-0.5 shadow-sm`, children: meta.icon }), _jsxs("div", { className: "flex-1 min-w-0 pr-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-1", children: [_jsx("span", { className: "text-xs font-black text-slate-900 truncate", children: meta.label }), _jsx("span", { className: "text-[10px] text-slate-400 font-mono shrink-0", children: timeAgo })] }), _jsx("p", { className: "text-xs text-slate-600 font-medium mt-0.5 line-clamp-2", children: item.metadata?.diagnosis ||
                                                    item.metadata?.rationale ||
                                                    item.metadata?.reason ||
                                                    `Event ${item.eventType} recorded successfully.` }), item.recoveryCaseId && (_jsxs("span", { className: "inline-flex items-center space-x-1 text-[10px] font-extrabold text-purple-900 mt-1", children: [_jsxs("span", { children: ["Case #", item.recoveryCaseId.slice(0, 8)] }), _jsx(ArrowRight, { className: "w-2.5 h-2.5" })] }))] }), _jsx("button", { onClick: (e) => dismissSingle(e, item.id), className: "absolute right-3 top-4 p-1 text-slate-300 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition", title: "Dismiss notification", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }, item.id));
                        })) : (_jsxs("div", { className: "py-10 px-6 text-center space-y-2", children: [_jsx("div", { className: "w-10 h-10 mx-auto rounded-full bg-[#d4ff32]/30 text-slate-900 flex items-center justify-center font-bold", children: _jsx(CheckCircle2, { className: "w-5 h-5" }) }), _jsx("p", { className: "text-xs font-black text-slate-900", children: "All Caught Up!" }), _jsx("p", { className: "text-[11px] text-slate-400 font-medium", children: "No unread recovery notifications. New alerts will appear here as transactions process." })] })) }), _jsx("div", { className: "p-3 border-t border-slate-100 bg-slate-50/50 text-center", children: _jsxs("button", { onClick: () => {
                                setIsOpen(false);
                                navigate('/audit');
                            }, className: "text-xs font-black text-slate-900 hover:text-purple-950 flex items-center justify-center space-x-1.5 w-full py-1.5 transition", children: [_jsx("span", { children: "View Full Audit Trail" }), _jsx(ArrowRight, { className: "w-3.5 h-3.5" })] }) })] }))] }));
};
