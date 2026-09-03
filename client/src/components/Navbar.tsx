import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, ListOrdered, Activity, BarChart3, Settings, ShieldAlert, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ListOrdered },
    { to: '/recoveries', label: 'Recovery Queue', icon: Activity },
    { to: '/audit', label: 'Audit Trail', icon: ShieldAlert },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/policy', label: 'Policy Guardrails', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#070a14]/85 backdrop-blur-md border-b border-purple-500/20 shadow-neon-purple">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 text-white rounded-xl shadow-lg shadow-purple-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 font-mono">
                  RECURA
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
                  AUTOPILOT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Autonomous Revenue Recovery Agent</p>
            </div>
          </div>

          <nav className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-900/60 to-cyan-900/40 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
