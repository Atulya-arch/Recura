import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, ListOrdered, Activity, BarChart3, Settings, ShieldAlert, Sparkles } from 'lucide-react';
export const Navbar = () => {
    const navItems = [
        { to: '/', label: 'Overview', icon: LayoutDashboard },
        { to: '/transactions', label: 'Transactions', icon: ListOrdered },
        { to: '/recoveries', label: 'Recovery Queue', icon: Activity },
        { to: '/audit', label: 'Audit Trail', icon: ShieldAlert },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/policy', label: 'Policy Guardrails', icon: Settings },
    ];
    return (_jsx("header", { className: "sticky top-0 z-50 bg-[#070a14]/85 backdrop-blur-md border-b border-purple-500/20 shadow-neon-purple", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex items-center justify-between h-16", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "p-2 bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 text-white rounded-xl shadow-lg shadow-purple-500/30", children: _jsx(ShieldCheck, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 font-mono", children: "RECURA" }), _jsxs("span", { className: "text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1", children: [_jsx(Sparkles, { className: "w-3 h-3 text-pink-400 animate-pulse" }), "AUTOPILOT"] })] }), _jsx("p", { className: "text-[11px] text-slate-400 font-medium", children: "Autonomous Revenue Recovery Agent" })] })] }), _jsx("nav", { className: "flex space-x-1", children: navItems.map((item) => {
                            const Icon = item.icon;
                            return (_jsxs(NavLink, { to: item.to, className: ({ isActive }) => `flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-purple-900/60 to-cyan-900/40 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`, children: [_jsx(Icon, { className: "w-4 h-4" }), _jsx("span", { children: item.label })] }, item.to));
                        }) })] }) }) }));
};
