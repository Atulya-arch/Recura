import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, X, Clock, Zap, Check } from 'lucide-react';
import { fetchApi } from '../api/client';

export const NotificationsPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [readEventIds, setReadEventIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('recura_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Save read notification IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('recura_read_notifications', JSON.stringify(Array.from(readEventIds)));
    } catch (e) {
      console.error(e);
    }
  }, [readEventIds]);

  // Query recent audit events
  const { data: logs } = useQuery<any[]>({
    queryKey: ['recent-notifications'],
    queryFn: () => fetchApi<any[]>('/api/audit'),
    refetchInterval: 4000
  });

  // Filter priority notifications
  const allPriorityLogs = (logs || []).filter((l) =>
    ['PAYMENT_RECOVERED', 'POLICY_BLOCKED', 'PROVIDER_TIMEOUT', 'AI_FAILURE', 'AI_RECOMMENDATION'].includes(
      l.eventType
    )
  );

  // ONLY show UNREAD notifications in the list (already read notifications are completely removed)
  const unreadLogs = allPriorityLogs.filter((l) => !readEventIds.has(l.id)).slice(0, 10);
  const unreadCount = unreadLogs.length;

  const dismissSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setReadEventIds((prev) => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const newRead = new Set([...readEventIds, ...unreadLogs.map((l) => l.id)]);
    setReadEventIds(newRead);
  };

  const handleNotificationClick = (id: string, caseId?: string) => {
    // Dismiss/remove this notification immediately upon reading
    setReadEventIds((prev) => new Set([...prev, id]));
    setIsOpen(false);
    if (caseId) {
      navigate(`/recoveries/${caseId}`);
    } else {
      navigate('/audit');
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEventMeta = (eventType: string) => {
    switch (eventType) {
      case 'PAYMENT_RECOVERED':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-slate-950" />,
          bg: 'bg-[#d4ff32]',
          label: 'Revenue Recovered'
        };
      case 'POLICY_BLOCKED':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
          bg: 'bg-red-100',
          label: 'Policy Blocked'
        };
      case 'PROVIDER_TIMEOUT':
        return {
          icon: <Clock className="w-4 h-4 text-amber-700" />,
          bg: 'bg-amber-100',
          label: 'Gateway Timeout Safety'
        };
      case 'AI_RECOMMENDATION':
        return {
          icon: <Zap className="w-4 h-4 text-purple-700" />,
          bg: 'bg-[#e0d8ff]',
          label: 'AI Strategy Decided'
        };
      default:
        return {
          icon: <AlertTriangle className="w-4 h-4 text-slate-700" />,
          bg: 'bg-slate-100',
          label: 'System Alert'
        };
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className={`relative p-2.5 bg-white rounded-full border transition-all duration-200 shadow-sm flex items-center justify-center ${
          isOpen
            ? 'border-[#161618] ring-2 ring-[#d4ff32]'
            : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#d4ff32] text-slate-950 font-black text-[9px] flex items-center justify-center border border-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Active Recovery Alerts</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#d4ff32] text-slate-950">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-900 transition flex items-center space-x-1"
                  title="Clear all active notifications"
                >
                  <Check className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of Unread Alerts */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {unreadLogs.length > 0 ? (
              unreadLogs.map((item) => {
                const meta = getEventMeta(item.eventType);
                const timeAgo = new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item.id, item.recoveryCaseId)}
                    className="group relative p-4 flex items-start space-x-3 cursor-pointer transition duration-150 hover:bg-slate-50 bg-[#d4ff32]/5"
                  >
                    <div className={`p-2 rounded-2xl ${meta.bg} shrink-0 mt-0.5 shadow-sm`}>
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0 pr-5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 truncate">{meta.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{timeAgo}</span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-2">
                        {item.metadata?.diagnosis ||
                          item.metadata?.rationale ||
                          item.metadata?.reason ||
                          `Event ${item.eventType} recorded successfully.`}
                      </p>

                      {item.recoveryCaseId && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-purple-900 mt-1">
                          <span>Case #{item.recoveryCaseId.slice(0, 8)}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Single notification dismiss (X) button */}
                    <button
                      onClick={(e) => dismissSingle(e, item.id)}
                      className="absolute right-3 top-4 p-1 text-slate-300 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-10 px-6 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#d4ff32]/30 text-slate-900 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-black text-slate-900">All Caught Up!</p>
                <p className="text-[11px] text-slate-400 font-medium">
                  No unread recovery notifications. New alerts will appear here as transactions process.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/audit');
              }}
              className="text-xs font-black text-slate-900 hover:text-purple-950 flex items-center justify-center space-x-1.5 w-full py-1.5 transition"
            >
              <span>View Full Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
