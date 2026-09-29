import React, { useState, useEffect, useMemo } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { CallStatus, Lead, CallLogEntry } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import { exportDailyLogsToCsv } from '../utils/csvHelper';
import {
  PhoneCall,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  User,
  Search,
  Download,
  Building,
  MapPin,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Settings,
} from 'lucide-react';

interface CallerDailyUpdateSheetProps {
  onOpenLeadModal: (lead: Lead) => void;
  onOpenCallerModal?: () => void;
}

export const CallerDailyUpdateSheet: React.FC<CallerDailyUpdateSheetProps> = ({
  onOpenLeadModal,
  onOpenCallerModal,
}) => {
  const {
    leads,
    callHistory,
    callers,
    statuses,
    submitDailyCallUpdate,
    prefilledLeadIdForDailyUpdate,
    setPrefilledLeadIdForDailyUpdate,
    addCaller,
  } = useCallingSystem();

  // Today reference
  const todayStr = '2026-09-24';

  // Form states
  const [callDate, setCallDate] = useState(todayStr);
  const [callerName, setCallerName] = useState(callers[0] || 'Ali');
  const [newCallerInput, setNewCallerInput] = useState('');
  const [showAddCaller, setShowAddCaller] = useState(false);
  const [leadIdInput, setLeadIdInput] = useState<string>('');
  const [callStatus, setCallStatus] = useState<CallStatus | string>('Interested');
  const [comment, setComment] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  // If a lead was prefilled (e.g. caller clicked "Call Now" in Sheet 1)
  useEffect(() => {
    if (prefilledLeadIdForDailyUpdate) {
      setLeadIdInput(String(prefilledLeadIdForDailyUpdate));
      const lead = leads.find((l) => l.leadId === prefilledLeadIdForDailyUpdate);
      if (lead) {
        if (lead.assignedCaller && callers.includes(lead.assignedCaller)) {
          setCallerName(lead.assignedCaller);
        }
      }
      // Clear prefill trigger
      setPrefilledLeadIdForDailyUpdate(null);
    }
  }, [prefilledLeadIdForDailyUpdate, leads, callers, setPrefilledLeadIdForDailyUpdate]);

  // Automatic Lookup from Master Database based on Lead ID
  const matchedLead = useMemo(() => {
    const idNum = parseInt(leadIdInput.trim(), 10);
    if (isNaN(idNum) || !leadIdInput.trim()) return null;
    return leads.find((l) => l.leadId === idNum) || null;
  }, [leadIdInput, leads]);

  const isInvalidLeadId = useMemo(() => {
    if (!leadIdInput.trim()) return false;
    const idNum = parseInt(leadIdInput.trim(), 10);
    if (isNaN(idNum)) return true;
    return matchedLead === null;
  }, [leadIdInput, matchedLead]);

  // Today's logs
  const todayLogs = useMemo(() => {
    const seen = new Set<string>();
    const unique: CallLogEntry[] = [];
    for (const log of callHistory) {
      if (log.date === callDate) {
        if (!seen.has(log.id)) {
          seen.add(log.id);
          unique.push(log);
        }
      }
    }
    return unique;
  }, [callHistory, callDate]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccessMsg(null);
    setSubmitErrorMsg(null);

    const idNum = parseInt(leadIdInput.trim(), 10);
    if (isNaN(idNum)) {
      setSubmitErrorMsg('Please enter a valid numeric Lead ID.');
      return;
    }

    if (!callerName.trim()) {
      setSubmitErrorMsg('Please select or specify a Caller Name.');
      return;
    }

    if (!callStatus) {
      setSubmitErrorMsg('Please select a Status.');
      return;
    }

    setIsSubmitting(true);

    // Submit update to master database and history
    const result = await submitDailyCallUpdate({
      leadId: idNum,
      callerName: callerName.trim(),
      date: callDate,
      status: callStatus,
      comment: comment.trim(),
      nextFollowUpDate: nextFollowUpDate.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitErrorMsg(result.error || 'Failed to update record.');
      return;
    }

    // Success feedback
    setSubmitSuccessMsg(
      `Update Saved! Lead #${idNum} (${result.lead?.clientName}) was successfully synchronized with Master Database and recorded in Call History.`
    );

    // Reset inputs for the next call
    setLeadIdInput('');
    setComment('');
    setNextFollowUpDate('');
    setCallStatus('Interested');

    // Auto dismiss success after 5 seconds
    setTimeout(() => {
      setSubmitSuccessMsg(null);
    }, 6000);
  };

  const handleAddNewCaller = () => {
    if (newCallerInput.trim()) {
      addCaller(newCallerInput.trim());
      setCallerName(newCallerInput.trim());
      setNewCallerInput('');
      setShowAddCaller(false);
    }
  };

  // Quick select helper from queue
  const dueTodayQueue = useMemo(() => {
    return leads.filter(
      (l) => l.nextFollowUpDate === todayStr && l.currentStatus !== 'Converted' && l.currentStatus !== 'Do Not Call'
    );
  }, [leads, todayStr]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Overview */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900">
                Sheet 2: Caller Daily Update
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                Cold Caller Workstation
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Enter Lead ID to auto-populate prospect name and phone number. Submitting automatically writes updates back to Sheet 1 Master Database and records history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-neutral-500 block">Today&apos;s Date</span>
              <span className="text-xs font-mono font-bold text-neutral-800">{callDate}</span>
            </div>
            <div className="text-right pl-3 border-l border-neutral-200">
              <span className="text-xs text-neutral-500 block">Calls Logged Today</span>
              <span className="text-sm font-mono font-bold text-neutral-900">{todayLogs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Entry Station Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-neutral-800" />
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              Log Call Interaction
            </h2>
          </div>
          <span className="text-xs text-neutral-400">
            Fields marked with <span className="text-red-500 font-bold">*</span> are required
          </span>
        </div>

        {/* Success Alert Banner */}
        {submitSuccessMsg && (
          <div className="mb-5 p-3.5 rounded-md bg-emerald-50 border border-emerald-300 flex items-start gap-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-950">Success</p>
              <p className="mt-0.5 leading-relaxed">{submitSuccessMsg}</p>
            </div>
            <button
              onClick={() => setSubmitSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-950 text-sm font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {submitErrorMsg && (
          <div className="mb-5 p-3.5 rounded-md bg-rose-50 border border-rose-300 flex items-start gap-3 text-xs text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-950">Validation Error</p>
              <p className="mt-0.5 leading-relaxed">{submitErrorMsg}</p>
            </div>
            <button
              onClick={() => setSubmitErrorMsg(null)}
              className="text-rose-700 hover:text-rose-950 text-sm font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Date, Caller Name, and Lead ID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Date */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                1. Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={callDate}
                onChange={(e) => setCallDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 font-mono"
              />
            </div>

            {/* 2. Caller Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700">
                  2. Caller Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCaller(!showAddCaller)}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    {showAddCaller ? 'Select Existing' : '+ Quick Add'}
                  </button>
                  {onOpenCallerModal && (
                    <>
                      <span className="text-neutral-300">·</span>
                      <button
                        type="button"
                        onClick={onOpenCallerModal}
                        className="text-[11px] text-neutral-600 hover:text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Manage Team Callers"
                      >
                        <Settings className="w-3 h-3 text-neutral-400" />
                        <span>Manage Callers</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showAddCaller ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Enter caller name..."
                    value={newCallerInput}
                    onChange={(e) => setNewCallerInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCaller}
                    className="px-3 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 font-medium text-neutral-800"
                >
                  {callers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. Lead ID */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                3. Lead ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  placeholder="e.g. 1001"
                  value={leadIdInput}
                  onChange={(e) => {
                    setLeadIdInput(e.target.value);
                    setSubmitErrorMsg(null);
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-md font-mono tabular-nums focus:outline-hidden focus:ring-1 ${
                    isInvalidLeadId
                      ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-red-600'
                      : matchedLead
                      ? 'border-emerald-500 bg-emerald-50/20 text-neutral-900 focus:ring-emerald-600'
                      : 'border-neutral-300 bg-white focus:ring-neutral-900'
                  }`}
                />
                {matchedLead && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* INVALID LEAD ID ERROR NOTIFICATION */}
          {isInvalidLeadId && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong>Lead ID #{leadIdInput} does not exist</strong> in the Master Database.
                Please check the Lead ID from Sheet 1. New prospects will NOT be created automatically.
              </span>
            </div>
          )}

          {/* AUTOMATIC RETRIEVAL CARD: Prospect Name & Phone Number */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                <span>Automatic Master Database Lookup</span>
                <span className="text-neutral-400 font-normal">(Read-only)</span>
              </span>
              {matchedLead && (
                <button
                  type="button"
                  onClick={() => onOpenLeadModal(matchedLead)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>View Full Profile & Outreach History</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {matchedLead ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* Auto Prospect Name */}
                <div className="bg-white p-3 rounded border border-neutral-200">
                  <span className="block text-[11px] text-neutral-500 uppercase">Prospect Name</span>
                  <span className="font-bold text-neutral-900 text-sm block mt-0.5">
                    {matchedLead.clientName}
                  </span>
                  {matchedLead.designation && (
                    <span className="text-xs text-neutral-500 block truncate">
                      {matchedLead.designation}
                    </span>
                  )}
                </div>

                {/* Auto Phone Number */}
                <div className="bg-white p-3 rounded border border-neutral-200">
                  <span className="block text-[11px] text-neutral-500 uppercase">Phone Number</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-neutral-900 text-sm">
                      {matchedLead.phoneNumber || 'No phone recorded'}
                    </span>
                    {matchedLead.phoneNumber && (
                      <a
                        href={`tel:${matchedLead.phoneNumber}`}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Call Phone"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Auto Company & Region */}
                <div className="bg-white p-3 rounded border border-neutral-200">
                  <span className="block text-[11px] text-neutral-500 uppercase">Company & Location</span>
                  <span className="font-medium text-neutral-800 text-xs block mt-0.5 truncate">
                    {matchedLead.companyName || '-'}
                  </span>
                  <span className="text-[11px] text-neutral-500 block truncate">
                    {matchedLead.region || '-'}
                  </span>
                </div>

                {/* Current Status & Attempts */}
                <div className="bg-white p-3 rounded border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] text-neutral-500 uppercase">Current Status</span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {matchedLead.numberOfAttempts} attempt(s)
                    </span>
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={matchedLead.currentStatus} size="sm" />
                  </div>
                  {matchedLead.latestComment && (
                    <span className="text-[11px] text-neutral-500 truncate block mt-1">
                      Prev: &ldquo;{matchedLead.latestComment}&rdquo;
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-neutral-500">
                {leadIdInput ? (
                  <span>Awaiting valid Lead ID lookup...</span>
                ) : (
                  <span>
                    Enter a Lead ID above (e.g. <button type="button" onClick={() => setLeadIdInput('1001')} className="font-mono font-bold text-blue-600 hover:underline">1001</button>,{' '}
                    <button type="button" onClick={() => setLeadIdInput('1006')} className="font-mono font-bold text-blue-600 hover:underline">1006</button>,{' '}
                    <button type="button" onClick={() => setLeadIdInput('1008')} className="font-mono font-bold text-blue-600 hover:underline">1008</button>) to automatically retrieve Prospect Name & Phone.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Status, Comment, and Next Follow-up Date */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 4. Status Dropdown */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                4. Call Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 font-medium text-neutral-800"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Next Follow-up Date */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                5. Next Follow-up Date
              </label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 font-mono"
              />
            </div>

            {/* 6. Comment */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                6. Comment / Call Notes <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Asked for more information, requested AI case studies"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Action Row: SUBMIT / SAVE UPDATE */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-200">
            <div className="text-xs text-neutral-500">
              When submitted, Lead #{leadIdInput || '...'} will update in Sheet 1: Last Call Date = {callDate}, Attempts + 1, Status = {callStatus}.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setLeadIdInput('');
                  setComment('');
                  setNextFollowUpDate('');
                  setSubmitErrorMsg(null);
                  setSubmitSuccessMsg(null);
                }}
                className="px-3 py-2 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md border border-neutral-200 transition-colors"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={!matchedLead || isInvalidLeadId || isSubmitting}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-md shadow-xs transition-all whitespace-nowrap ${
                  !matchedLead || isInvalidLeadId || isSubmitting
                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Update...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>SUBMIT / SAVE UPDATE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Access Queue: Follow-up Due Today */}
      {dueTodayQueue.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Quick Queue: Follow-ups Due Today ({dueTodayQueue.length})</span>
            </div>
            <span className="text-[11px] text-amber-700">Click any prospect to load into form</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dueTodayQueue.map((lead) => (
              <button
                key={lead.leadId}
                type="button"
                onClick={() => {
                  setLeadIdInput(String(lead.leadId));
                  if (lead.assignedCaller && callers.includes(lead.assignedCaller)) {
                    setCallerName(lead.assignedCaller);
                  }
                }}
                className="px-2.5 py-1 rounded bg-white hover:bg-amber-100 border border-amber-300 text-xs text-neutral-800 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span className="font-mono font-bold text-amber-900">#{lead.leadId}</span>
                <span className="font-medium">{lead.clientName}</span>
                <span className="text-neutral-400">({lead.companyName})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Daily Update Log Sheet */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Today&apos;s Call Log (Sheet 2 Log)
            </h3>
            <p className="text-xs text-neutral-500">
              Calls recorded for date: <span className="font-mono font-bold text-neutral-700">{callDate}</span>
            </p>
          </div>

          <button
            onClick={() => exportDailyLogsToCsv(callHistory, callDate)}
            disabled={todayLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Today&apos;s Log ({todayLogs.length})</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-100 border-b border-neutral-200 text-neutral-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Caller Name</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Lead ID</th>
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">Prospect Name</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Phone Number</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 min-w-[200px]">Comment</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Next Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {todayLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    No calls logged for {callDate} yet. Use the form above to record caller activity.
                  </td>
                </tr>
              ) : (
                todayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-2 px-3 font-mono tabular-nums text-neutral-700 whitespace-nowrap">
                      {log.date}
                    </td>
                    <td className="py-2 px-3 font-semibold text-neutral-900 whitespace-nowrap">
                      {log.callerName}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-neutral-900 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100">
                        {log.leadId}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-neutral-900 font-medium whitespace-nowrap">
                      {log.prospectName}
                      <span className="block text-[11px] text-neutral-500 font-normal">
                        {log.companyName}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-neutral-700 whitespace-nowrap">
                      {log.phoneNumber || '-'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge status={log.status} size="sm" />
                    </td>
                    <td className="py-2 px-3 text-neutral-700 max-w-xs break-words">
                      {log.comment || '-'}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-neutral-700 whitespace-nowrap">
                      {log.nextFollowUpDate || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
