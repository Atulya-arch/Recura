import React, { useState } from 'react';
import { Play, CheckCircle, Clock, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';

export const DemoControls: React.FC<{ onScenarioRun?: () => void }> = ({ onScenarioRun }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const runScenario = async (scenario: 'SUCCESS' | 'TIMEOUT' | 'RETRY_LIMIT' | 'DUPLICATE') => {
    setLoading(scenario);
    try {
      const data = await fetchApi<any>('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      setLoading(null);
      if (onScenarioRun) onScenarioRun();

      if (data.recoveryCase?.id) {
        navigate(`/recoveries/${data.recoveryCase.id}`);
      }
    } catch (err) {
      setLoading(null);
      console.error('Scenario failed:', err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-flux-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-2xl bg-[#d4ff32] text-slate-950 font-black">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Hackathon Interactive Demo Controls</h3>
            <p className="text-xs text-slate-500 font-medium">Trigger live backend recovery scenarios to test AI diagnosis, policy guardrails, and idempotency.</p>
          </div>
        </div>
        <span className="text-[11px] font-black px-3 py-1 bg-slate-900 text-white rounded-full">
          INTERACTIVE
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          onClick={() => runScenario('SUCCESS')}
          disabled={Boolean(loading)}
          className="group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-[#e0d8ff] border border-slate-200 hover:border-purple-300 text-left transition duration-200"
        >
          <div className="flex items-center space-x-2 text-purple-950 font-extrabold text-xs mb-1">
            <CheckCircle className="w-4 h-4 text-purple-700 group-hover:scale-110 transition" />
            <span>1. Successful Recovery</span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium">Failure → AI Diagnosis → Retry → Verified Success</span>
        </button>

        <button
          onClick={() => runScenario('TIMEOUT')}
          disabled={Boolean(loading)}
          className="group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-sky-100 border border-slate-200 hover:border-sky-300 text-left transition duration-200"
        >
          <div className="flex items-center space-x-2 text-sky-950 font-extrabold text-xs mb-1">
            <Clock className="w-4 h-4 text-sky-700 group-hover:scale-110 transition" />
            <span>2. Gateway Timeout</span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium">Timeout → Status UNKNOWN → Authoritative Verify</span>
        </button>

        <button
          onClick={() => runScenario('RETRY_LIMIT')}
          disabled={Boolean(loading)}
          className="group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-pink-100 border border-slate-200 hover:border-pink-300 text-left transition duration-200"
        >
          <div className="flex items-center space-x-2 text-pink-950 font-extrabold text-xs mb-1">
            <AlertTriangle className="w-4 h-4 text-pink-700 group-hover:scale-110 transition" />
            <span>3. Retry Limit Policy</span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium">Repeated Failures → Max Limit → Escalation</span>
        </button>

        <button
          onClick={() => runScenario('DUPLICATE')}
          disabled={Boolean(loading)}
          className="group flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 text-left transition duration-200"
        >
          <div className="flex items-center space-x-2 text-amber-950 font-extrabold text-xs mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-700 group-hover:scale-110 transition" />
            <span>4. Duplicate Protection</span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium">Repeated Key Execution → Idempotency Blocked</span>
        </button>
      </div>
    </div>
  );
};
