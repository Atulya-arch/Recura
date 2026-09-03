import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FormatMoney } from '../components/FormatMoney';
import { StatusBadge } from '../components/StatusBadge';
import { fetchApi } from '../api/client';
import { Filter, RefreshCw } from 'lucide-react';
export const TransactionsPage = () => {
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState('ALL');
    useEffect(() => {
        const q = searchParams.get('q');
        if (q !== null) {
            setSearchTerm(q);
        }
    }, [searchParams]);
    const { data: txs, isLoading, refetch } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => fetchApi('/api/transactions'),
        refetchInterval: 3000
    });
    if (isLoading || !txs) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx(RefreshCw, { className: "w-8 h-8 text-[#161618] animate-spin" }) }));
    }
    const filtered = txs.filter((t) => {
        const matchesSearch = t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.failureReason && t.failureReason.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || t.paymentStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-black text-slate-900 tracking-tight", children: "Transaction Work Queue" }), _jsx("p", { className: "text-xs text-slate-500 font-medium mt-1", children: "Search and filter merchant payment transactions and authorization logs." })] }), _jsxs("button", { onClick: () => refetch(), className: "flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black rounded-full border border-slate-200 shadow-sm transition", children: [_jsx(RefreshCw, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Refresh Transactions" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-flux-card", children: [_jsxs("div", { className: "flex items-center space-x-3 w-full sm:w-auto", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Filter, { className: "w-4 h-4 text-slate-500" }), _jsx("span", { className: "text-xs font-black text-slate-800", children: "Filter Status:" })] }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs font-extrabold text-slate-800 focus:outline-none", children: [_jsx("option", { value: "ALL", children: "All Payment Statuses" }), _jsx("option", { value: "FAILED", children: "FAILED" }), _jsx("option", { value: "SUCCESS", children: "SUCCESS" }), _jsx("option", { value: "PENDING", children: "PENDING" })] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [searchTerm && (_jsxs("div", { className: "flex items-center space-x-1.5 bg-[#e0d8ff] border border-purple-300 px-3 py-1 rounded-full text-xs font-extrabold text-purple-950", children: [_jsxs("span", { children: ["Query: \"", searchTerm, "\""] }), _jsx("button", { onClick: () => setSearchTerm(''), className: "text-purple-700 hover:text-purple-950 font-black ml-1", title: "Clear search query", children: "\u00D7" })] })), _jsxs("span", { className: "text-xs font-bold text-slate-500", children: ["Showing ", _jsx("strong", { className: "text-slate-900 font-mono font-black", children: filtered.length }), " transactions"] })] })] }), _jsx("div", { className: "bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-flux-card", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-xs text-slate-700", children: [_jsx("thead", { className: "bg-slate-50 text-slate-900 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4", children: "Customer" }), _jsx("th", { className: "px-6 py-4", children: "Order ID" }), _jsx("th", { className: "px-6 py-4", children: "Amount" }), _jsx("th", { className: "px-6 py-4", children: "Method" }), _jsx("th", { className: "px-6 py-4", children: "Payment Status" }), _jsx("th", { className: "px-6 py-4", children: "Failure Reason" }), _jsx("th", { className: "px-6 py-4 text-center", children: "Attempts" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-100", children: [filtered.map((t) => (_jsxs("tr", { className: "hover:bg-slate-50/80 transition duration-150", children: [_jsxs("td", { className: "px-6 py-4", children: [_jsx("div", { className: "font-extrabold text-slate-900", children: t.customerName }), _jsx("div", { className: "text-[11px] text-slate-400 font-medium", children: t.customerEmail })] }), _jsx("td", { className: "px-6 py-4 font-mono font-black text-purple-900", children: t.orderId }), _jsx("td", { className: "px-6 py-4 font-black text-slate-950", children: _jsx(FormatMoney, { amountMinor: t.amountMinor, currency: t.currency }) }), _jsx("td", { className: "px-6 py-4 font-mono text-xs font-bold text-slate-600", children: t.paymentMethod }), _jsx("td", { className: "px-6 py-4", children: _jsx(StatusBadge, { status: t.paymentStatus }) }), _jsx("td", { className: "px-6 py-4 max-w-xs truncate font-medium text-slate-600", children: t.failureReason || 'N/A' }), _jsx("td", { className: "px-6 py-4 text-center font-mono font-black text-slate-900", children: t.attemptCount })] }, t.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-6 py-12 text-center text-slate-400 font-medium", children: "No transactions match the selected filter criteria." }) }))] })] }) }) })] }));
};
