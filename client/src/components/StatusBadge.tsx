import React from 'react';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let badgeStyle = 'bg-slate-200 text-slate-700 border-slate-300';

  switch (status) {
    case 'RECOVERED':
    case 'SUCCESS':
    case 'ALLOWED':
    case 'PASSED':
      badgeStyle = 'bg-[#d4ff32] text-slate-950 border-[#b8ee10] font-black shadow-sm';
      break;
    case 'PENDING':
    case 'DETECTED':
    case 'DIAGNOSING':
    case 'PLANNED':
    case 'POLICY_CHECK':
    case 'READY':
    case 'EXECUTING':
    case 'VERIFYING':
      badgeStyle = 'bg-[#e0d8ff] text-purple-950 border-purple-300 font-extrabold';
      break;
    case 'PROMISE_TO_PAY':
      badgeStyle = 'bg-amber-100 text-amber-950 border-amber-300 font-black shadow-sm';
      break;
    case 'RETRY_SCHEDULED':
      badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200 font-bold';
      break;
    case 'ESCALATED':
      badgeStyle = 'bg-pink-100 text-pink-900 border-pink-200 font-bold';
      break;
    case 'STOPPED':
      badgeStyle = 'bg-slate-200 text-slate-700 border-slate-300 font-semibold';
      break;
    case 'FAILED':
    case 'BLOCKED':
      badgeStyle = 'bg-red-100 text-red-800 border-red-200 font-bold';
      break;
    case 'UNKNOWN':
      badgeStyle = 'bg-sky-100 text-sky-900 border-sky-200 font-bold';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border tracking-tight ${badgeStyle}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
