import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, Activity, BarChart3, Settings, ShieldAlert, Zap, Sparkles, ShieldCheck } from 'lucide-react';
export const Sidebar = () => {
    const navItems = [
        { to: '/', label: 'Overview', icon: LayoutDashboard, badge: 'Live' },
        { to: '/transactions', label: 'Transactions', icon: ListOrdered },
        { to: '/recoveries', label: 'Recovery Queue', icon: Activity },
        { to: '/audit', label: 'Audit Trail', icon: ShieldAlert },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/policy', label: 'Policy Guardrails', icon: Settings },
    ];
    return (_jsxs("aside", { className: "w-64 bg-[#161618] text-white flex flex-col justify-between p-5 rounded-3xl shrink-0 my-3 ml-3 min-h-[calc(100vh-1.5rem)] shadow-2xl", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2.5 px-3 py-2 mb-8", children: [_jsx("div", { className: "w-8 h-8 rounded-xl bg-[#d4ff32] text-slate-950 flex items-center justify-center shadow-flux-glow", children: _jsx(Zap, { className: "w-4 h-4 fill-current text-slate-950" }) }), _jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("span", { className: "text-2xl font-black tracking-tight text-white font-mono", children: "Recura" }), _jsx("span", { className: "text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#d4ff32] text-slate-950 uppercase tracking-widest", children: "AI" })] })] }), _jsx("nav", { className: "space-y-1.5", children: navItems.map((item) => {
                            const Icon = item.icon;
                            return (_jsx(NavLink, { to: item.to, className: ({ isActive }) => `flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${isActive
                                    ? 'bg-white text-slate-900 shadow-lg font-extrabold'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`, children: ({ isActive }) => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Icon, { className: `w-5 h-5 ${isActive ? 'text-slate-900' : 'text-slate-400'}` }), _jsx("span", { children: item.label })] }), item.badge && (_jsx("span", { className: `text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-[#d4ff32] text-black' : 'bg-slate-800 text-slate-300'}`, children: item.badge }))] })) }, item.to));
                        }) })] }), _jsxs("div", { className: "bg-[#d4ff32] text-slate-950 p-5 rounded-3xl space-y-3 relative overflow-hidden shadow-flux-glow mt-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-black tracking-wider uppercase bg-black/10 px-2.5 py-0.5 rounded-full text-slate-950", children: "AUTOPILOT" }), _jsx(Sparkles, { className: "w-5 h-5 text-slate-950 animate-pulse" })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-lg font-black tracking-tight leading-tight", children: "AI Engine Active" }), _jsx("p", { className: "text-xs text-slate-800 font-medium mt-1", children: "Autonomous revenue recovery running 24/7." })] }), _jsx("div", { className: "pt-1", children: _jsxs("div", { className: "w-full bg-[#161618] hover:bg-black text-white text-center py-2.5 rounded-2xl text-xs font-extrabold shadow-md flex items-center justify-center space-x-1.5 transition", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-[#d4ff32]" }), _jsx("span", { children: "Engine Status: OK" })] }) })] })] }));
};
