import React, { useState, useMemo } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { Lead } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import { CreateContactModal } from './CreateContactModal';
import {
  Search,
  Filter,
  PhoneCall,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  Clock,
  Eye,
  Edit2,
  Check,
  X,
  UserPlus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Users,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { exportMasterToCsv } from '../utils/csvHelper';

function formatCreatedAt(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface MasterDatabaseSheetProps {
  onOpenLeadModal: (lead: Lead) => void;
  onCallLeadNow: (lead: Lead) => void;
  onOpenCallerModal?: () => void;
}

export const MasterDatabaseSheet: React.FC<MasterDatabaseSheetProps> = ({
  onOpenLeadModal,
  onCallLeadNow,
  onOpenCallerModal,
}) => {
  const {
    leads,
    deletedLeads,
    statuses,
    callers,
    updateLead,
    restoreLead,
    deleteAllLeads,
    restoreAllLeads,
    purgeAllDeletedLeads,
  } = useCallingSystem();

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [callerFilter, setCallerFilter] = useState('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<
    'ALL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'TRASH'
  >('ALL');
  const [sortField, setSortField] = useState<keyof Lead>('leadId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Multi-selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());

  // Inline editing state for phone number
  const [editingPhoneId, setEditingPhoneId] = useState<number | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Bulk action modals
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'all' | 'selected';
    count: number;
    leadIds?: number[];
  }>({ isOpen: false, mode: 'all', count: 0 });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [bulkRestoreModal, setBulkRestoreModal] = useState<{
    isOpen: boolean;
    mode: 'all' | 'selected';
    count: number;
    leadIds?: number[];
  }>({ isOpen: false, mode: 'all', count: 0 });
  const [isBulkRestoring, setIsBulkRestoring] = useState(false);

  const [bulkPurgeModal, setBulkPurgeModal] = useState<{
    isOpen: boolean;
    mode: 'all' | 'selected';
    count: number;
    leadIds?: number[];
  }>({ isOpen: false, mode: 'all', count: 0 });
  const [isBulkPurging, setIsBulkPurging] = useState(false);

  // Notifications
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Column visibility toggles for extra CSV fields
  const [showExtraCsvCols, setShowExtraCsvCols] = useState(false);

  // Today reference in app
  const todayStr = '2026-09-24';

  // Base list depending on Trash tab vs Active tabs
  const sourceList = followUpFilter === 'TRASH' ? deletedLeads : leads;

  // Quick stats computed on active leads
  const totalLeads = leads.length;
  const contactedLeads = leads.filter((l) => l.numberOfAttempts > 0).length;
  const interestedLeads = leads.filter((l) => l.currentStatus === 'Interested').length;
  const appointmentsBooked = leads.filter((l) => l.currentStatus === 'Appointment Booked').length;
  const dueTodayCount = leads.filter(
    (l) =>
      l.nextFollowUpDate === todayStr &&
      l.currentStatus !== 'Converted' &&
      l.currentStatus !== 'Do Not Call'
  ).length;
  const overdueCount = leads.filter(
    (l) =>
      l.nextFollowUpDate &&
      l.nextFollowUpDate < todayStr &&
      l.currentStatus !== 'Converted' &&
      l.currentStatus !== 'Do Not Call'
  ).length;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedbackNotice({ type, message });
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 4500);
  };

  // Sorting helper
  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered & sorted leads
  const filteredLeads = useMemo(() => {
    return sourceList
      .filter((lead) => {
        // Search text match
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matches =
            String(lead.leadId).includes(q) ||
            lead.clientName.toLowerCase().includes(q) ||
            lead.companyName.toLowerCase().includes(q) ||
            (lead.region && lead.region.toLowerCase().includes(q)) ||
            lead.phoneNumber.toLowerCase().includes(q) ||
            (lead.position && lead.position.toLowerCase().includes(q)) ||
            (lead.designation && lead.designation.toLowerCase().includes(q)) ||
            (lead.latestComment && lead.latestComment.toLowerCase().includes(q)) ||
            (lead.email && lead.email.toLowerCase().includes(q)) ||
            (lead.campaignName && lead.campaignName.toLowerCase().includes(q));

          if (!matches) return false;
        }

        // Status filter
        if (statusFilter !== 'ALL' && lead.currentStatus !== statusFilter) {
          return false;
        }

        // Caller filter
        if (callerFilter !== 'ALL') {
          if (callerFilter === 'UNASSIGNED') {
            if (lead.assignedCaller && lead.assignedCaller !== 'Unassigned') return false;
          } else if (lead.assignedCaller !== callerFilter) {
            return false;
          }
        }

        // Follow-up status category filters
        if (followUpFilter === 'DUE_TODAY') {
          return (
            lead.nextFollowUpDate === todayStr &&
            lead.currentStatus !== 'Converted' &&
            lead.currentStatus !== 'Do Not Call'
          );
        }
        if (followUpFilter === 'OVERDUE') {
          return (
            lead.nextFollowUpDate &&
            lead.nextFollowUpDate < todayStr &&
            lead.currentStatus !== 'Converted' &&
            lead.currentStatus !== 'Do Not Call'
          );
        }
        if (followUpFilter === 'UPCOMING') {
          return (
            lead.nextFollowUpDate &&
            lead.nextFollowUpDate > todayStr &&
            lead.currentStatus !== 'Converted' &&
            lead.currentStatus !== 'Do Not Call'
          );
        }

        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
  }, [
    sourceList,
    searchTerm,
    statusFilter,
    callerFilter,
    followUpFilter,
    sortField,
    sortDirection,
    todayStr,
  ]);

  // Selection helpers
  const isAllFilteredSelected =
    filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.has(l.leadId));
  const isSomeFilteredSelected =
    filteredLeads.some((l) => selectedLeadIds.has(l.leadId)) && !isAllFilteredSelected;

  const handleToggleSelectRow = (leadId: number) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const handleToggleSelectAllVisible = () => {
    if (isAllFilteredSelected) {
      // Unselect filtered
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        for (const l of filteredLeads) next.delete(l.leadId);
        return next;
      });
    } else {
      // Select all visible filtered
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        for (const l of filteredLeads) next.add(l.leadId);
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  // Inline phone update handler
  const handleStartEditPhone = (lead: Lead) => {
    setEditingPhoneId(lead.leadId);
    setTempPhone(lead.phoneNumber);
  };

  const handleSavePhone = async (leadId: number) => {
    if (!tempPhone.trim()) {
      showNotification('error', 'Phone number cannot be empty.');
      return;
    }
    setIsSavingPhone(true);
    const result = await updateLead(leadId, { phoneNumber: tempPhone.trim() });
    setIsSavingPhone(false);
    setEditingPhoneId(null);

    if (result.success) {
      showNotification('success', 'Phone number updated.');
    } else {
      showNotification('error', result.error || 'Failed to update phone number.');
    }
  };

  const handleRestoreSingle = async (leadId: number, name: string) => {
    const res = await restoreLead(leadId);
    if (res.success) {
      showNotification('success', `Restored "${name}" back to active contacts.`);
    } else {
      showNotification('error', res.error || 'Failed to restore contact.');
    }
  };

  // ================= BULK ACTIONS EXECUTION =================
  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    const targetIds =
      bulkDeleteModal.mode === 'selected' ? bulkDeleteModal.leadIds : undefined;

    const res = await deleteAllLeads(targetIds);
    setIsBulkDeleting(false);
    setBulkDeleteModal({ isOpen: false, mode: 'all', count: 0 });

    if (res.success) {
      handleClearSelection();
      showNotification(
        'success',
        `Successfully deleted ${res.count || 0} contact${(res.count || 0) === 1 ? '' : 's'}. Moved to Trash.`
      );
    } else {
      showNotification('error', res.error || 'Failed to delete contacts.');
    }
  };

  const handleConfirmBulkRestore = async () => {
    setIsBulkRestoring(true);
    const targetIds =
      bulkRestoreModal.mode === 'selected' ? bulkRestoreModal.leadIds : undefined;

    const res = await restoreAllLeads(targetIds);
    setIsBulkRestoring(false);
    setBulkRestoreModal({ isOpen: false, mode: 'all', count: 0 });

    if (res.success) {
      handleClearSelection();
      showNotification(
        'success',
        `Restored ${res.count || 0} contact${(res.count || 0) === 1 ? '' : 's'} back to active database.`
      );
    } else {
      showNotification('error', res.error || 'Failed to restore contacts.');
    }
  };

  const handleConfirmBulkPurge = async () => {
    setIsBulkPurging(true);
    const targetIds =
      bulkPurgeModal.mode === 'selected' ? bulkPurgeModal.leadIds : undefined;

    const res = await purgeAllDeletedLeads(targetIds);
    setIsBulkPurging(false);
    setBulkPurgeModal({ isOpen: false, mode: 'all', count: 0 });

    if (res.success) {
      handleClearSelection();
      showNotification(
        'success',
        `Permanently purged ${res.count || 0} contact${(res.count || 0) === 1 ? '' : 's'} from database.`
      );
    } else {
      showNotification('error', res.error || 'Failed to purge contacts.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Metrics bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Contacts &amp; Master Database
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-medium">
                {totalLeads} Active Contacts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative database of contacts. Manually create contacts, edit details, log calls, or review full timelines.
            </p>
          </div>

          {/* Quick Metrics and Add Contact CTA */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Metrics */}
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-medium">Total</span>
                <span className="text-sm font-bold text-slate-900">{totalLeads}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-medium">Contacted</span>
                <span className="text-sm font-bold text-slate-900">{contactedLeads}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-emerald-700 block text-[10px] uppercase font-sans font-medium">Interested</span>
                <span className="text-sm font-bold text-emerald-800">{interestedLeads}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-center">
                <span className="text-indigo-700 block text-[10px] uppercase font-sans font-medium">Appts</span>
                <span className="text-sm font-bold text-indigo-900">{appointmentsBooked}</span>
              </div>
            </div>

            {/* Manage Callers CTA */}
            {onOpenCallerModal && (
              <button
                type="button"
                onClick={onOpenCallerModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                title="Manage Callers and Statuses"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Callers ({callers.length})</span>
              </button>
            )}

            {/* Clear [ + Add Contact ] Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Contact</span>
            </button>
          </div>
        </div>

        {/* Success / Error notification */}
        {feedbackNotice && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between border ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{feedbackNotice.message}</span>
            </div>
            <button
              onClick={() => setFeedbackNotice(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        {/* Row 1: Category Tabs (All Contacts, Due Today, Overdue, Upcoming, Trash) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => {
                setFollowUpFilter('ALL');
                handleClearSelection();
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                followUpFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Contacts ({totalLeads})
            </button>
            <button
              onClick={() => {
                setFollowUpFilter('DUE_TODAY');
                handleClearSelection();
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                followUpFilter === 'DUE_TODAY'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Due Today</span>
              {dueTodayCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    followUpFilter === 'DUE_TODAY'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {dueTodayCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setFollowUpFilter('OVERDUE');
                handleClearSelection();
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                followUpFilter === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Overdue</span>
              {overdueCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    followUpFilter === 'OVERDUE'
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {overdueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setFollowUpFilter('UPCOMING');
                handleClearSelection();
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                followUpFilter === 'UPCOMING'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => {
                setFollowUpFilter('TRASH');
                handleClearSelection();
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                followUpFilter === 'TRASH'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash ({deletedLeads.length})</span>
            </button>
          </div>

          {/* Bulk Action Buttons (Delete All / Restore All / Empty Trash) */}
          <div className="flex items-center gap-2">
            {followUpFilter !== 'TRASH' ? (
              <button
                type="button"
                onClick={() =>
                  setBulkDeleteModal({
                    isOpen: true,
                    mode: 'all',
                    count: totalLeads,
                  })
                }
                disabled={totalLeads === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                title="Delete all active contacts at once"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Contacts</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setBulkRestoreModal({
                      isOpen: true,
                      mode: 'all',
                      count: deletedLeads.length,
                    })
                  }
                  disabled={deletedLeads.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore All ({deletedLeads.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBulkPurgeModal({
                      isOpen: true,
                      mode: 'all',
                      count: deletedLeads.length,
                    })
                  }
                  disabled={deletedLeads.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty Trash</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Search, Filters, Columns toggle, and CSV export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, name, company, position, region, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1 px-2 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Caller dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={callerFilter}
                onChange={(e) => setCallerFilter(e.target.value)}
                className="py-1 px-2 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Callers</option>
                <option value="UNASSIGNED">Unassigned</option>
                {callers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle extra CSV fields */}
            <button
              onClick={() => setShowExtraCsvCols(!showExtraCsvCols)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              {showExtraCsvCols ? 'Hide CSV Fields' : '+ Show CSV Fields'}
            </button>

            {/* Export CSV button */}
            <button
              onClick={() => exportMasterToCsv(filteredLeads)}
              title="Export Current Filtered List"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Selection Action Bar (appears when 1 or more contacts are selected) */}
        {selectedLeadIds.size > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="font-semibold text-blue-950">
                {selectedLeadIds.size} contact{selectedLeadIds.size === 1 ? '' : 's'} selected
              </span>
              <span className="text-blue-400">·</span>
              <button
                type="button"
                onClick={handleToggleSelectAllVisible}
                className="text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
              >
                {isAllFilteredSelected
                  ? 'Deselect visible'
                  : `Select all ${filteredLeads.length} visible`}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {followUpFilter !== 'TRASH' ? (
                <button
                  type="button"
                  onClick={() =>
                    setBulkDeleteModal({
                      isOpen: true,
                      mode: 'selected',
                      count: selectedLeadIds.size,
                      leadIds: Array.from(selectedLeadIds),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedLeadIds.size})</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkRestoreModal({
                        isOpen: true,
                        mode: 'selected',
                        count: selectedLeadIds.size,
                        leadIds: Array.from(selectedLeadIds),
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Selected ({selectedLeadIds.size})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkPurgeModal({
                        isOpen: true,
                        mode: 'selected',
                        count: selectedLeadIds.size,
                        leadIds: Array.from(selectedLeadIds),
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Selected ({selectedLeadIds.size})</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Frozen Header Row */}
            <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-xs border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px] shadow-2xs">
              <tr>
                {/* Select All Checkbox Column */}
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeFilteredSelected;
                    }}
                    onChange={handleToggleSelectAllVisible}
                    title={isAllFilteredSelected ? 'Deselect all' : 'Select all visible'}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>

                <th
                  onClick={() => handleSort('leadId')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Lead ID</span>
                    {sortField === 'leadId' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('clientName')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Prospect Name</span>
                    {sortField === 'clientName' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">
                  Phone Number
                </th>
                <th
                  onClick={() => handleSort('companyName')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Company</span>
                    {sortField === 'companyName' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('position')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Position</span>
                    {sortField === 'position' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('region')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    {sortField === 'region' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('currentStatus')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Current Status</span>
                    {sortField === 'currentStatus' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('assignedCaller')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Caller</span>
                    {sortField === 'assignedCaller' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('lastCallDate')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Last Call</span>
                    {sortField === 'lastCallDate' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nextFollowUpDate')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Follow-up Date</span>
                    {sortField === 'nextFollowUpDate' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('numberOfAttempts')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Attempts</span>
                    {sortField === 'numberOfAttempts' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[220px]">Latest Summary</th>
                <th className="py-2.5 px-3 min-w-[125px] whitespace-nowrap">Added</th>

                {/* Additional CSV fields (toggleable) */}
                {showExtraCsvCols && (
                  <>
                    <th className="py-2.5 px-3 whitespace-nowrap">Designation</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Email</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Campaign</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Response Received</th>
                  </>
                )}

                <th className="py-2.5 px-3 text-right whitespace-nowrap sticky right-0 bg-slate-100 z-10">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={showExtraCsvCols ? 18 : 14}
                    className="py-12 text-center text-slate-500"
                  >
                    <div className="max-w-xs mx-auto space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">No contacts found</p>
                      <p className="text-xs text-slate-400">
                        Try clearing search terms or changing your filter criteria.
                      </p>
                      {(searchTerm || statusFilter !== 'ALL' || callerFilter !== 'ALL') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('ALL');
                            setCallerFilter('ALL');
                          }}
                          className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isDueToday =
                    lead.nextFollowUpDate === todayStr &&
                    lead.currentStatus !== 'Converted' &&
                    lead.currentStatus !== 'Do Not Call';
                  const isOverdue =
                    lead.nextFollowUpDate &&
                    lead.nextFollowUpDate < todayStr &&
                    lead.currentStatus !== 'Converted' &&
                    lead.currentStatus !== 'Do Not Call';
                  const isSelected = selectedLeadIds.has(lead.leadId);

                  return (
                    <tr
                      key={lead.leadId}
                      className={`transition-colors group cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 hover:bg-blue-50'
                          : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => onOpenLeadModal(lead)}
                    >
                      {/* Selection Checkbox */}
                      <td
                        className="py-2 px-3 w-10 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(lead.leadId)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Lead ID */}
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                          {lead.leadId}
                        </span>
                      </td>

                      {/* Prospect Name */}
                      <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1 group/btn">
                          <span>{lead.clientName}</span>
                          <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        </div>
                        {(lead.position || lead.designation) && (
                          <span className="block text-[11px] text-slate-400 font-normal truncate max-w-[180px]">
                            {lead.position || lead.designation}
                          </span>
                        )}
                      </td>

                      {/* Phone Number */}
                      <td
                        className="py-2 px-3 font-mono tabular-nums text-slate-800 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editingPhoneId === lead.leadId ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempPhone}
                              onChange={(e) => setTempPhone(e.target.value)}
                              className="px-2 py-1 text-xs border border-blue-500 rounded bg-white font-mono w-32 focus:outline-hidden"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePhone(lead.leadId);
                                if (e.key === 'Escape') setEditingPhoneId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSavePhone(lead.leadId)}
                              disabled={isSavingPhone}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingPhoneId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group/phone">
                            <span>{lead.phoneNumber}</span>
                            <button
                              onClick={() => handleStartEditPhone(lead)}
                              title="Edit phone number inline"
                              className="opacity-0 group-hover/phone:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition-opacity"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Company Name */}
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {lead.companyName}
                      </td>

                      {/* Position */}
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {lead.position || lead.designation || '-'}
                      </td>

                      {/* Location / Region */}
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {lead.region || '-'}
                      </td>

                      {/* Current Status */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <StatusBadge status={lead.currentStatus} size="sm" />
                      </td>

                      {/* Assigned Caller */}
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {lead.assignedCaller ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>{lead.assignedCaller}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Last Call Date */}
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {lead.lastCallDate || '-'}
                      </td>

                      {/* Next Follow-up Date */}
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">
                        {lead.nextFollowUpDate ? (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : isDueToday
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{lead.nextFollowUpDate}</span>
                            {isDueToday && <span className="text-[9px] uppercase font-bold">Today</span>}
                            {isOverdue && <span className="text-[9px] uppercase font-bold">Late</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Attempts */}
                      <td className="py-2 px-3 font-mono tabular-nums text-center whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            lead.numberOfAttempts === 0
                              ? 'bg-slate-100 text-slate-500'
                              : lead.numberOfAttempts >= 3
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {lead.numberOfAttempts || 0}
                        </span>
                      </td>

                      {/* Latest Summary */}
                      <td className="py-2 px-3 text-slate-700 max-w-sm truncate" title={lead.latestSummary}>
                        {lead.latestSummary || lead.latestComment || '-'}
                      </td>

                      {/* Contact Created Date */}
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>{formatCreatedAt(lead.createdAt)}</span>
                        </span>
                      </td>

                      {/* Additional CSV Fields */}
                      {showExtraCsvCols && (
                        <>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {lead.designation || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {lead.email ? (
                              <a
                                href={`mailto:${lead.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:underline"
                              >
                                {lead.email}
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {lead.campaignName || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={lead.responseReceived}>
                            {lead.responseReceived || '-'}
                          </td>
                        </>
                      )}

                      {/* Row Actions */}
                      <td
                        className={`py-2 px-3 text-right whitespace-nowrap sticky right-0 z-10 ${
                          isSelected ? 'bg-blue-50/90' : 'bg-white group-hover:bg-slate-50/90'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {followUpFilter === 'TRASH' ? (
                            <button
                              onClick={() => handleRestoreSingle(lead.leadId, lead.clientName)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Restore contact"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <>
                              {/* Call Now button */}
                              <button
                                onClick={() => onCallLeadNow(lead)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                                title="Open in Quick Logger"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>Call Now</span>
                              </button>

                              {/* View Details button */}
                              <button
                                onClick={() => onOpenLeadModal(lead)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="View Details, Edit or Delete Contact"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Details</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredLeads.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{sourceList.length}</span>{' '}
            {followUpFilter === 'TRASH' ? 'deleted' : 'active'} contacts
          </div>
          <div className="flex items-center gap-3">
            <span>Use checkboxes to select contacts for batch deletion</span>
            <span>·</span>
            <span>Click &ldquo;+ Add Contact&rdquo; to create a new record</span>
          </div>
        </div>
      </div>

      {/* Manual Contact Creation Modal */}
      <CreateContactModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onContactCreated={(id, name) => {
          showNotification('success', `Contact #${id} (${name}) saved successfully to database.`);
        }}
      />

      {/* ================= MODAL: DELETE ALL / DELETE SELECTED CONTACTS ================= */}
      {bulkDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3 bg-rose-50/50">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {bulkDeleteModal.mode === 'all'
                    ? 'Delete All Contacts?'
                    : `Delete ${bulkDeleteModal.count} Selected Contacts?`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Safe soft deletion · Restorable from Trash anytime
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3.5 text-xs text-slate-600">
              <p>
                Are you sure you want to delete{' '}
                <strong className="text-slate-900 font-semibold">
                  {bulkDeleteModal.mode === 'all'
                    ? `all ${totalLeads} active contacts`
                    : `${bulkDeleteModal.count} selected contact(s)`}
                </strong>
                ?
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Call history and analytics records will remain intact.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Contacts are safely moved to the Trash tab and can be restored.</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkDeleteModal({ isOpen: false, mode: 'all', count: 0 })}
                disabled={isBulkDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {bulkDeleteModal.mode === 'all'
                        ? `Yes, Delete All (${totalLeads})`
                        : `Delete Selected (${bulkDeleteModal.count})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESTORE ALL / RESTORE SELECTED CONTACTS ================= */}
      {bulkRestoreModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3 bg-emerald-50/50">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {bulkRestoreModal.mode === 'all'
                    ? `Restore All ${deletedLeads.length} Contacts?`
                    : `Restore ${bulkRestoreModal.count} Contacts?`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restores records back to active database
                </p>
              </div>
            </div>

            <div className="p-6 text-xs text-slate-600">
              <p>
                This will restore{' '}
                <strong className="text-slate-900 font-semibold">
                  {bulkRestoreModal.mode === 'all'
                    ? `all ${deletedLeads.length} deleted contacts`
                    : `${bulkRestoreModal.count} selected contacts`}
                </strong>{' '}
                back to your active contact database.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkRestoreModal({ isOpen: false, mode: 'all', count: 0 })}
                disabled={isBulkRestoring}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkRestore}
                disabled={isBulkRestoring}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {isBulkRestoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Contacts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PURGE / EMPTY TRASH ================= */}
      {bulkPurgeModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3 bg-rose-50/50">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Permanently Purge Contacts?
                </h3>
                <p className="text-xs text-rose-600 font-medium mt-0.5">
                  Irreversible permanent removal from database
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-600">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-semibold">
                  {bulkPurgeModal.mode === 'all'
                    ? `all ${deletedLeads.length} contacts in Trash`
                    : `${bulkPurgeModal.count} selected contacts`}
                </strong>
                ? This cannot be undone.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                Historical call logs and interaction records associated with these leads will still remain in Call History.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkPurgeModal({ isOpen: false, mode: 'all', count: 0 })}
                disabled={isBulkPurging}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkPurge}
                disabled={isBulkPurging}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50"
              >
                {isBulkPurging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Purge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
