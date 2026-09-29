import React, { useState } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { exportMasterToCsv, exportCallHistoryToCsv } from '../utils/csvHelper';
import { SheetView } from '../types/crm';
import {
  Database,
  PhoneCall,
  History,
  BarChart3,
  Download,
  Upload,
  RotateCcw,
  BookOpen,
  Settings,
  AlertCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface NavbarProps {
  onOpenImportModal: () => void;
  onOpenStatusModal: () => void;
  onOpenGuideModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenImportModal,
  onOpenStatusModal,
  onOpenGuideModal,
}) => {
  const {
    leads,
    callHistory,
    currentView,
    setCurrentView,
    resetToDefaultData,
    cloudSyncStatus,
    lastSyncedAt,
  } = useCallingSystem();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Compute quick counters
  const totalLeads = leads.length;
  const todayStr = '2026-09-24';
  const followUpsDueToday = leads.filter(
    (l) => l.nextFollowUpDate === todayStr && l.currentStatus !== 'Converted' && l.currentStatus !== 'Do Not Call'
  ).length;

  const remainingToCall = leads.filter((lead) => {
    if (lead.currentStatus === 'Converted' || lead.currentStatus === 'Do Not Call') return false;
    if (lead.nextFollowUpDate && lead.nextFollowUpDate > todayStr) return false;
    if (lead.nextFollowUpDate && lead.nextFollowUpDate <= todayStr) return true;
    if (lead.currentStatus === 'Not Called' || lead.numberOfAttempts === 0) return true;
    if (['No Answer', 'Busy', 'Call Back', 'Follow-up'].includes(lead.currentStatus)) return true;
    return false;
  }).length;

  const navItems: { id: SheetView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'needs_to_call',
      label: 'Today / Needs to Call',
      badge: remainingToCall,
      icon: <PhoneCall className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'master',
      label: 'Contacts',
      icon: <Database className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'daily_update',
      label: 'Quick Update',
      icon: <Clock className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'history',
      label: 'Call History',
      icon: <History className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart3 className="w-4 h-4 mr-1.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-xs w-full">
      {/* Top Bar: Brand, Status, and Action Controls */}
      <div className="border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
            {/* Left: Brand Identity & Live Status */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-2xs">
                  CM
                </div>
                <span className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 whitespace-nowrap">
                  Calling Management
                </span>
              </div>

              {/* Status and count badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-neutral-200 text-xs">
                <span className="hidden md:inline-block text-neutral-500 font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded whitespace-nowrap">
                  {totalLeads} Prospects
                </span>

                {/* Cloud Sync Status */}
                <div
                  title={
                    cloudSyncStatus === 'connected'
                      ? 'Connected to Firebase Cloud Firestore. All updates sync live across the team in real time.'
                      : cloudSyncStatus === 'syncing'
                      ? 'Syncing changes with team cloud...'
                      : cloudSyncStatus === 'connecting'
                      ? 'Connecting to team cloud database...'
                      : 'Working locally (offline fallback active)'
                  }
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-sans font-medium whitespace-nowrap"
                  style={{
                    backgroundColor:
                      cloudSyncStatus === 'connected'
                        ? '#f0fdf4'
                        : cloudSyncStatus === 'syncing'
                        ? '#eff6ff'
                        : '#fefce8',
                    borderColor:
                      cloudSyncStatus === 'connected'
                        ? '#bbf7d0'
                        : cloudSyncStatus === 'syncing'
                        ? '#bfdbfe'
                        : '#fef08a',
                    color:
                      cloudSyncStatus === 'connected'
                        ? '#166534'
                        : cloudSyncStatus === 'syncing'
                        ? '#1e40af'
                        : '#854d0e',
                  }}
                >
                  {cloudSyncStatus === 'connected' && (
                    <>
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="hidden sm:inline">Team Cloud Live</span>
                      <span className="sm:hidden">Live</span>
                    </>
                  )}
                  {cloudSyncStatus === 'syncing' && (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
                      <span>Syncing...</span>
                    </>
                  )}
                  {cloudSyncStatus === 'connecting' && (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
                      <span className="hidden sm:inline">Connecting...</span>
                      <span className="sm:hidden">Connecting</span>
                    </>
                  )}
                  {cloudSyncStatus === 'offline' && (
                    <>
                      <CloudOff className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Offline</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Guide Button */}
              <button
                onClick={onOpenGuideModal}
                title="System Instructions & Guide"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="hidden md:inline">Workflow Guide</span>
              </button>

              {/* Status list manager */}
              <button
                onClick={onOpenStatusModal}
                title="Manage Status Dropdown Options"
                className="inline-flex items-center justify-center p-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 rounded-md transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* CSV / XLSX Import */}
              <button
                onClick={onOpenImportModal}
                title="Import raw CSV or Excel XLSX files with automatic column detection"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="hidden sm:inline">Import CSV / XLSX</span>
                <span className="sm:hidden">Import</span>
              </button>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </button>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div
                      className="absolute right-0 mt-1.5 w-52 bg-white rounded-md shadow-xl border border-neutral-200 py-1 z-50 text-xs"
                      onClick={() => setShowExportMenu(false)}
                    >
                      <button
                        onClick={() => exportMasterToCsv(leads)}
                        className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 text-neutral-800 flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-medium">Master Database</span>
                        <span className="text-neutral-400 font-mono text-[11px] bg-neutral-100 px-1.5 py-0.5 rounded">
                          {leads.length}
                        </span>
                      </button>
                      <button
                        onClick={() => exportCallHistoryToCsv(callHistory)}
                        className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 text-neutral-800 flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-medium">Call History Log</span>
                        <span className="text-neutral-400 font-mono text-[11px] bg-neutral-100 px-1.5 py-0.5 rounded">
                          {callHistory.length}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Reset sample data */}
              <button
                onClick={() => setShowResetConfirm(true)}
                title="Reset Database to original 16 CSV leads"
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Bar: Clean View Tabs & Quick Follow-up Alerts */}
      <div className="bg-neutral-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-11">
            {/* View Tabs */}
            <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 -mx-1 px-1" aria-label="Sheets navigation">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-emerald-500 text-white' : 'bg-neutral-200 text-neutral-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right side alert for followups */}
            <div className="hidden md:flex items-center gap-2 shrink-0 text-xs">
              {followUpsDueToday > 0 && (
                <button
                  onClick={() => setCurrentView('needs_to_call')}
                  className="inline-flex items-center gap-1 text-amber-800 bg-amber-100/80 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 font-medium transition-colors cursor-pointer text-[11px]"
                >
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>{followUpsDueToday} due today</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl border border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Reset to Original CSV Data?</h3>
            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              This will restore the Master Database back to the original 16 prospects from your uploaded CSV, keeping sequential IDs starting at 1001.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded border border-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToDefaultData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
