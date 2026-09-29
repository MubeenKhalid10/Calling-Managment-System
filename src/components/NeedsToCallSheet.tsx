import React, { useState, useMemo } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { Lead, CallStatus } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import {
  PhoneCall,
  Phone,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ExternalLink,
  X,
  Save,
  Clock,
  Sparkles,
  Loader2,
  User,
  Building,
  Briefcase,
  MapPin,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface NeedsToCallSheetProps {
  onOpenLeadModal: (lead: Lead) => void;
}

export const NeedsToCallSheet: React.FC<NeedsToCallSheetProps> = ({
  onOpenLeadModal,
}) => {
  const {
    leads,
    callHistory,
    callers,
    statuses,
    submitDailyCallUpdate,
    updateLead,
  } = useCallingSystem();

  // Simulated today date in app
  const todayStr = '2026-09-24';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'DUE_TODAY' | 'OVERDUE' | 'NEW' | 'RETRY'>('ALL');
  const [selectedCaller, setSelectedCaller] = useState('ALL');

  // Active call modal state
  const [callingLead, setCallingLead] = useState<Lead | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | string>('Interested');
  const [callerName, setCallerName] = useState(callers[0] || 'Ali');
  const [callComment, setCallComment] = useState('');
  const [nextCallDate, setNextCallDate] = useState('');
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [callSaveSuccess, setCallSaveSuccess] = useState<string | null>(null);
  const [callSaveError, setCallSaveError] = useState<string | null>(null);

  // Compute Today's Top Metrics (Section 7: Calls Made, Remaining, Follow-ups, Interested)
  const todayLogs = useMemo(() => {
    return callHistory.filter((l) => l.date === todayStr);
  }, [callHistory, todayStr]);

  const callsMadeToday = todayLogs.length;

  // Filter leads that actually need a call:
  // - New / Not Called
  // - Follow-ups due today (<= todayStr)
  // - Overdue follow-ups
  // - Contacts needing another attempt (No Answer, Busy, Call Back)
  // - EXCLUDE: Converted, Do Not Call, or future follow-ups (> todayStr)
  const allNeedsCallLeads = useMemo(() => {
    return leads.filter((lead) => {
      const status = lead.currentStatus;

      // Never call Converted or Do Not Call
      if (status === 'Converted' || status === 'Do Not Call') {
        return false;
      }

      // If scheduled for future, do not show today
      if (lead.nextFollowUpDate && lead.nextFollowUpDate > todayStr) {
        return false;
      }

      // Due today or overdue
      if (lead.nextFollowUpDate && lead.nextFollowUpDate <= todayStr) {
        return true;
      }

      // New / Not called
      if (status === 'Not Called' || lead.numberOfAttempts === 0) {
        return true;
      }

      // Needs another attempt
      if (status === 'No Answer' || status === 'Busy' || status === 'Call Back' || status === 'Follow-up') {
        return true;
      }

      return false;
    });
  }, [leads, todayStr]);

  const remainingToCall = allNeedsCallLeads.length;

  const followUpsDueCount = useMemo(() => {
    return leads.filter(
      (l) => l.nextFollowUpDate === todayStr && l.currentStatus !== 'Converted' && l.currentStatus !== 'Do Not Call'
    ).length;
  }, [leads, todayStr]);

  const interestedCount = useMemo(() => {
    return leads.filter((l) => l.currentStatus === 'Interested').length;
  }, [leads]);

  // Tab filtering
  const filteredQueue = useMemo(() => {
    return allNeedsCallLeads.filter((lead) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          String(lead.leadId).includes(q) ||
          lead.clientName.toLowerCase().includes(q) ||
          lead.companyName.toLowerCase().includes(q) ||
          (lead.position && lead.position.toLowerCase().includes(q)) ||
          lead.phoneNumber.toLowerCase().includes(q) ||
          (lead.latestSummary && lead.latestSummary.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Caller filter
      if (selectedCaller !== 'ALL' && lead.assignedCaller !== selectedCaller) {
        return false;
      }

      // Sub-category tabs
      if (activeTab === 'DUE_TODAY') {
        return lead.nextFollowUpDate === todayStr;
      }
      if (activeTab === 'OVERDUE') {
        return lead.nextFollowUpDate && lead.nextFollowUpDate < todayStr;
      }
      if (activeTab === 'NEW') {
        return lead.currentStatus === 'Not Called' || lead.numberOfAttempts === 0;
      }
      if (activeTab === 'RETRY') {
        return lead.currentStatus === 'No Answer' || lead.currentStatus === 'Busy' || lead.currentStatus === 'Call Back';
      }

      return true;
    });
  }, [allNeedsCallLeads, searchTerm, selectedCaller, activeTab, todayStr]);

  // Start Call Handler
  const handleOpenCallModal = (lead: Lead) => {
    setCallingLead(lead);
    setCallerName(lead.assignedCaller || callers[0] || 'Ali');
    setCallStatus(
      lead.currentStatus === 'Not Called' ? 'Follow-up' : (lead.currentStatus as CallStatus) || 'Interested'
    );
    setCallComment('');
    setNextCallDate(lead.nextFollowUpDate || '');
    setCallSaveSuccess(null);
    setCallSaveError(null);
  };

  // Submit Call Interaction
  const handleSaveCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callingLead) return;

    if (!callerName.trim()) {
      setCallSaveError('Please select caller name.');
      return;
    }

    setIsSavingCall(true);
    setCallSaveError(null);

    const result = await submitDailyCallUpdate({
      leadId: callingLead.leadId,
      callerName: callerName.trim(),
      date: todayStr,
      status: callStatus,
      comment: callComment.trim(),
      nextFollowUpDate: nextCallDate.trim(),
    });

    setIsSavingCall(false);

    if (!result.success) {
      setCallSaveError(result.error || 'Failed to save call.');
      return;
    }

    setCallSaveSuccess(`Call logged for ${callingLead.clientName}. Master database & summary updated.`);

    setTimeout(() => {
      setCallingLead(null);
      setCallSaveSuccess(null);
    }, 1200);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Small top stats (Section 7) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h1 className="text-base font-bold text-neutral-900 tracking-tight">
                Today / Needs to Call
              </h1>
              <span className="text-xs font-mono text-neutral-500 px-2 py-0.5 rounded bg-neutral-100">
                {todayStr}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Active calling queue. Pick a prospect, click <span className="font-semibold text-neutral-700">Call</span>, and save your notes in one step.
            </p>
          </div>

          {/* Quick Metrics Bar: Today - Calls Made, Remaining, Follow-ups, Interested */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-2 rounded-md border border-neutral-200 text-xs">
            <div className="px-3 py-1 bg-white rounded border border-neutral-200/70">
              <span className="text-[11px] text-neutral-500 block">Calls Made</span>
              <span className="text-sm font-mono font-bold text-neutral-900">{callsMadeToday}</span>
            </div>
            <div className="px-3 py-1 bg-white rounded border border-neutral-200/70">
              <span className="text-[11px] text-neutral-500 block">Remaining</span>
              <span className="text-sm font-mono font-bold text-neutral-900">{remainingToCall}</span>
            </div>
            <div className="px-3 py-1 bg-white rounded border border-neutral-200/70">
              <span className="text-[11px] text-neutral-500 block">Follow-ups</span>
              <span className="text-sm font-mono font-bold text-amber-700">{followUpsDueCount}</span>
            </div>
            <div className="px-3 py-1 bg-white rounded border border-neutral-200/70">
              <span className="text-[11px] text-neutral-500 block">Interested</span>
              <span className="text-sm font-mono font-bold text-emerald-700">{interestedCount}</span>
            </div>
          </div>
        </div>

        {/* Filter bar & Tabs */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Queue Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              All Needs Call ({allNeedsCallLeads.length})
            </button>
            <button
              onClick={() => setActiveTab('DUE_TODAY')}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'DUE_TODAY'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Due Today ({followUpsDueCount})
            </button>
            <button
              onClick={() => setActiveTab('OVERDUE')}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'OVERDUE'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'NEW'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              New Contacts
            </button>
            <button
              onClick={() => setActiveTab('RETRY')}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'RETRY'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Needs Retry (No Answer/Busy)
            </button>
          </div>

          {/* Search & Caller filter */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search queue..."
                className="w-full pl-8 pr-3 py-1 text-xs border border-neutral-300 rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <select
              value={selectedCaller}
              onChange={(e) => setSelectedCaller(e.target.value)}
              className="py-1 px-2 text-xs border border-neutral-300 rounded bg-white text-neutral-800"
            >
              <option value="ALL">All Callers</option>
              {callers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calling Table (Section 8: Prospect, Company, Position, Phone, Status, Last Comment/Summary, Action) */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-neutral-100 border-b border-neutral-200 text-neutral-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Prospect</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Company</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Position</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Phone</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 min-w-[280px]">Latest Summary</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-neutral-800 text-sm">All caught up!</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      No contacts currently need a call under this filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((lead) => {
                  const isDueToday = lead.nextFollowUpDate === todayStr;
                  const isOverdue = lead.nextFollowUpDate && lead.nextFollowUpDate < todayStr;

                  return (
                    <tr
                      key={lead.leadId}
                      className="hover:bg-neutral-50/80 transition-colors group"
                    >
                      {/* Prospect */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => onOpenLeadModal(lead)}
                          className="font-bold text-neutral-900 hover:text-blue-600 hover:underline text-left block"
                        >
                          {lead.clientName}
                        </button>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          ID: #{lead.leadId}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-neutral-800">
                        {lead.companyName || '-'}
                      </td>

                      {/* Position */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-neutral-600">
                        {lead.position || lead.designation || '-'}
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                        <a
                          href={`tel:${lead.phoneNumber}`}
                          className="inline-flex items-center gap-1 text-neutral-900 hover:text-blue-600"
                        >
                          <Phone className="w-3 h-3 text-neutral-400" />
                          <span>{lead.phoneNumber || 'No phone'}</span>
                        </a>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={lead.currentStatus} size="sm" />
                          {isDueToday && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                              Today
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold border border-rose-200">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Latest Summary (1-3 sentences) */}
                      <td className="py-2.5 px-3 text-neutral-700 text-xs leading-relaxed max-w-md">
                        {lead.latestSummary || lead.latestComment || (
                          <span className="text-neutral-400 italic">No notes yet.</span>
                        )}
                      </td>

                      {/* Action [Call] button */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCallModal(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded transition-colors shadow-2xs cursor-pointer"
                        >
                          <PhoneCall className="w-3 h-3 text-emerald-400" />
                          <span>Call</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500 font-mono tabular-nums">
          <span>Contacts in Queue: {filteredQueue.length}</span>
          <span>Target Date: {todayStr}</span>
        </div>
      </div>

      {/* Streamlined Call Log Modal (Section 9: Status, Comment, Next Call Date) */}
      {callingLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl border border-neutral-300 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    Call: {callingLead.clientName}
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Lead #{callingLead.leadId} · {callingLead.companyName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCallingLead(null)}
                className="p-1 text-neutral-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Prospect Details Card */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-neutral-500 block">Phone Number</span>
                <a
                  href={`tel:${callingLead.phoneNumber}`}
                  className="text-base font-mono font-bold text-neutral-900 hover:text-blue-600 flex items-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{callingLead.phoneNumber}</span>
                </a>
              </div>
              {callingLead.position && (
                <div className="text-right">
                  <span className="text-[11px] text-neutral-500 block">Position</span>
                  <span className="text-xs font-semibold text-neutral-800">
                    {callingLead.position || callingLead.designation}
                  </span>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCall} className="p-5 space-y-4 text-xs">
              {callSaveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{callSaveSuccess}</span>
                </div>
              )}

              {callSaveError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-950 rounded flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{callSaveError}</span>
                </div>
              )}

              {/* Status and Caller */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Call Outcome Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={callStatus}
                    onChange={(e) => setCallStatus(e.target.value)}
                    required
                    className="w-full py-1.5 px-2.5 border border-neutral-300 rounded bg-white text-neutral-900 font-medium"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Caller Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    required
                    className="w-full py-1.5 px-2.5 border border-neutral-300 rounded bg-white text-neutral-900"
                  >
                    {callers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Call Comment */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Call Notes / Conversation Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={callComment}
                  onChange={(e) => setCallComment(e.target.value)}
                  placeholder="e.g. Spoke with prospect. Interested in engineering support, asked to email pricing and follow up Friday."
                  rows={3}
                  required
                  className="w-full p-2.5 border border-neutral-300 rounded bg-white text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Next Call Date */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Next Follow-up Date (if needed)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={nextCallDate}
                    onChange={(e) => setNextCallDate(e.target.value)}
                    className="py-1.5 px-2.5 border border-neutral-300 rounded bg-white font-mono text-xs flex-1"
                  />
                  {nextCallDate && (
                    <button
                      type="button"
                      onClick={() => setNextCallDate('')}
                      className="px-2 py-1.5 text-neutral-500 hover:text-neutral-800 border border-neutral-200 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenLeadModal(callingLead)}
                  className="text-neutral-600 hover:text-neutral-900 underline text-xs"
                >
                  View Full Lead Details &amp; History
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCallingLead(null)}
                    disabled={isSavingCall}
                    className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCall}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSavingCall ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Call...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Update</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
