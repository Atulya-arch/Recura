import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { RecoveryQueuePage } from './pages/RecoveryQueuePage';
import { RecoveryDetailPage } from './pages/RecoveryDetailPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PolicySettingsPage } from './pages/PolicySettingsPage';
import { Search, Calendar } from 'lucide-react';

export const App: React.FC = () => {
  const [globalSearch, setGlobalSearch] = useState('');
  const navigate = useNavigate();
  const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/transactions?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div className="flex bg-[#121214] min-h-screen text-slate-900 font-sans p-2 overflow-x-hidden">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Container Canvas */}
      <div className="flex-1 bg-[#e7e7e9] rounded-3xl my-3 mr-3 ml-3 p-6 md:p-8 flex flex-col min-h-[calc(100vh-1.5rem)] shadow-2xl overflow-y-auto">
        {/* Top Bar with Search, Profile Avatar & Live Notifications */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-300/70">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#161618] text-white flex items-center justify-center font-bold text-sm shadow-md">
                MB
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Merchant Ops Console</h3>
                <p className="text-xs text-slate-500 font-medium">Acme Retail India • merchant@acme.com</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Functional Search Pill */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search transactions, orders..."
                className="bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d4ff32] shadow-sm w-48 sm:w-64"
              />
            </form>

            {/* Today Date Pill */}
            <div className="hidden sm:flex items-center space-x-2 bg-white px-3.5 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentDate}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/recoveries" element={<RecoveryQueuePage />} />
            <Route path="/recoveries/:id" element={<RecoveryDetailPage />} />
            <Route path="/audit" element={<AuditTrailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/policy" element={<PolicySettingsPage />} />
          </Routes>
        </main>

        <footer className="mt-8 pt-4 border-t border-slate-300/70 text-center text-xs text-slate-500 font-medium">
          Recura — AI Revenue Recovery Agent • Flux Operational System
        </footer>
      </div>
    </div>
  );
};
