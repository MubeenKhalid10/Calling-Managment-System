import React, { useState } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { SheetView, Lead } from '../types/crm';
import {
  Menu,
  Search,
  Plus,
  Cloud,
  RefreshCw,
  PhoneCall,
  Upload,
  Calendar,
  X,
  ExternalLink,
  UserPlus,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenImportModal: () => void;
  onOpenLeadModal: (lead: Lead) => void;
  onOpenCreateContactModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenImportModal,
  onOpenLeadModal,
  onOpenCreateContactModal,
}) => {
  const {
    leads,
    currentView,
    setCurrentView,
    cloudSyncStatus,
    setPrefilledLeadIdForDailyUpdate,
  } = useCallingSystem();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // View Title and Subtitle Mapping
  const viewTitles: Record<SheetView, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Calling performance, team analytics, and follow-up queue',
    },
    activity: {
      title: 'Dashboard',
      subtitle: 'Calling performance, team analytics, and follow-up queue',
    },
    needs_to_call: {
      title: "Today's Calls & Queue",
      subtitle: 'Prospects due for follow-up and priority calling pipeline',
    },
    master: {
      title: 'Contacts & Master Database',
      subtitle: 'Complete directory of all imported prospect accounts',
    },
    daily_update: {
      title: 'Quick Call Logger',
      subtitle: 'Submit fast call outcomes, notes, and scheduled follow-ups',
    },
    history: {
      title: 'Call History Audit Log',
      subtitle: 'Permanent timestamped record of every call interaction',
    },
    reports: {
      title: 'Reports & Analytics',
      subtitle: 'Comprehensive daily, weekly, and monthly caller metrics',
    },
  };

  const currentMeta = viewTitles[currentView] || {
    title: 'Cold Call Manager',
    subtitle: 'Prospect Management & Caller Tracking System',
  };

  // Search matches
  const matchedLeads = searchQuery.trim()
    ? leads
        .filter((l) => {
          const q = searchQuery.toLowerCase();
          return (
            l.clientName.toLowerCase().includes(q) ||
            l.companyName.toLowerCase().includes(q) ||
            l.phoneNumber.toLowerCase().includes(q) ||
            (l.region && l.region.toLowerCase().includes(q)) ||
            (l.assignedCaller && l.assignedCaller.toLowerCase().includes(q))
          );
        })
        .slice(0, 6)
    : [];

  const handleSelectLead = (lead: Lead) => {
    onOpenLeadModal(lead);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleCallFromSearch = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setPrefilledLeadIdForDailyUpdate(lead.leadId);
    setCurrentView('daily_update');
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug truncate">
              {currentMeta.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-normal truncate hidden sm:block">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Center / Right: Search & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Prospect Search */}
          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search leads, phone..."
                className="w-36 sm:w-56 md:w-64 pl-9 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.trim().length > 0 && (
              <div className="absolute top-full right-0 mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
                  <span>Matched Prospects ({matchedLeads.length})</span>
                  <button
                    onClick={() => setShowSearchResults(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>

                {matchedLeads.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No matching prospects found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {matchedLeads.map((lead) => (
                      <div
                        key={lead.leadId}
                        onClick={() => handleSelectLead(lead)}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {lead.clientName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              #{lead.leadId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                            <span>{lead.companyName}</span>
                            <span>·</span>
                            <span className="font-mono">{lead.phoneNumber}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleCallFromSearch(e, lead)}
                          className="shrink-0 p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                          title="Log call now"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Action: Add Contact */}
          {onOpenCreateContactModal && (
            <button
              onClick={onOpenCreateContactModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Contact</span>
            </button>
          )}

          {/* Quick Action: Log Call */}
          <button
            onClick={() => setCurrentView('daily_update')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all shrink-0 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Log Call</span>
          </button>

          {/* Import CSV Quick Button */}
          <button
            onClick={onOpenImportModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import</span>
          </button>

          {/* Cloud Sync Status Indicator */}
          <div
            title={
              cloudSyncStatus === 'connected'
                ? 'Firebase Firestore Live Cloud Sync active'
                : 'Offline storage active'
            }
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium shrink-0 ${
              cloudSyncStatus === 'connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            {cloudSyncStatus === 'connected' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                <span>Sync</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
