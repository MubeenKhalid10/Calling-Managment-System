import React, { useState } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { exportMasterToCsv, exportCallHistoryToCsv } from '../utils/csvHelper';
import { SheetView } from '../types/crm';
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  Clock,
  History,
  BarChart3,
  Upload,
  Download,
  Settings,
  BookOpen,
  RotateCcw,
  Cloud,
  RefreshCw,
  AlertCircle,
  X,
  Headset,
  ChevronDown,
  User,
  Check,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImportModal: () => void;
  onOpenStatusModal: () => void;
  onOpenGuideModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenImportModal,
  onOpenStatusModal,
  onOpenGuideModal,
}) => {
  const {
    leads,
    callHistory,
    callers,
    currentView,
    setCurrentView,
    resetToDefaultData,
    cloudSyncStatus,
    lastSyncedAt,
  } = useCallingSystem();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedCaller, setSelectedCaller] = useState<string>(callers[0] || 'Ali');
  const [showCallerDropdown, setShowCallerDropdown] = useState(false);

  // Compute counters
  const totalLeads = leads.length;
  const todayStr = '2026-09-24';

  const remainingToCall = leads.filter((lead) => {
    if (lead.currentStatus === 'Converted' || lead.currentStatus === 'Do Not Call') return false;
    if (lead.nextFollowUpDate && lead.nextFollowUpDate > todayStr) return false;
    if (lead.nextFollowUpDate && lead.nextFollowUpDate <= todayStr) return true;
    if (lead.currentStatus === 'Not Called' || lead.numberOfAttempts === 0) return true;
    if (['No Answer', 'Busy', 'Call Back', 'Follow-up'].includes(lead.currentStatus)) return true;
    return false;
  }).length;

  const dueTodayCount = leads.filter(
    (l) => l.nextFollowUpDate === todayStr && l.currentStatus !== 'Converted' && l.currentStatus !== 'Do Not Call'
  ).length;

  interface NavItem {
    id: SheetView;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'needs_to_call',
      label: "Today's Calls",
      icon: <PhoneCall className="w-4 h-4" />,
      badge: remainingToCall,
      badgeColor: dueTodayCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800',
    },
    {
      id: 'master',
      label: 'Contacts',
      icon: <Users className="w-4 h-4" />,
      badge: totalLeads,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'daily_update',
      label: 'Quick Update',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Call History',
      icon: <History className="w-4 h-4" />,
      badge: callHistory.length,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  const handleNavClick = (viewId: SheetView) => {
    setCurrentView(viewId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } lg:static lg:z-30 lg:h-screen lg:shrink-0`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Headset className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-[15px] tracking-tight leading-snug">
                Cold Call Manager
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Calling CRM &amp; Pipeline
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  currentView === item.id ||
                  (item.id === 'dashboard' && currentView === 'activity');

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                          item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Actions & Tools */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Actions &amp; Data
            </div>
            <div className="space-y-1">
              {/* Import CSV */}
              <button
                onClick={() => {
                  onOpenImportModal();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Import CSV</span>
              </button>

              {/* Export Data Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>Export CSV</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      showExportMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showExportMenu && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1 py-1">
                    <button
                      onClick={() => {
                        exportMasterToCsv(leads);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded"
                    >
                      Export Contacts ({leads.length})
                    </button>
                    <button
                      onClick={() => {
                        exportCallHistoryToCsv(callHistory);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded"
                    >
                      Export Call History ({callHistory.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Status Manager */}
              <button
                onClick={() => {
                  onOpenStatusModal();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Status &amp; Callers</span>
              </button>

              {/* System Guide */}
              <button
                onClick={() => {
                  onOpenGuideModal();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left"
              >
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>System Guide</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-3">
          {/* Cloud Sync Status Pill */}
          <div
            className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
              cloudSyncStatus === 'connected'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                : cloudSyncStatus === 'syncing'
                ? 'bg-blue-50/80 border-blue-200 text-blue-800'
                : 'bg-amber-50/80 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {cloudSyncStatus === 'connected' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-[11px]">Cloud Live Synced</span>
                </>
              ) : cloudSyncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                  <span className="font-semibold text-[11px]">Syncing cloud...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 text-amber-600" />
                  <span className="font-semibold text-[11px]">Local storage mode</span>
                </>
              )}
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              {leads.length} leads
            </span>
          </div>

          {/* Caller Identity Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCallerDropdown(!showCallerDropdown)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedCaller.charAt(0)}
                </div>
                <div className="truncate">
                  <div className="text-[10px] uppercase font-bold text-slate-400 leading-tight">
                    Active Caller
                  </div>
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {selectedCaller}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showCallerDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                  Select Active Caller
                </div>
                {callers.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCaller(c);
                      setShowCallerDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      selectedCaller === c ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{c}</span>
                    {selectedCaller === c && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
              title="Reset to default mock dataset"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Data</span>
            </button>

            <span className="text-[10px] text-slate-400 font-mono">
              v2.4
            </span>
          </div>
        </div>
      </aside>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Reset All Data?</h3>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              This will restore all default mock prospects, clear custom entries, and reset team calling records.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await resetToDefaultData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
