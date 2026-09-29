import React, { useState, useEffect, useMemo } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { Lead, CallStatus, CallLogEntry } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import {
  X,
  PhoneCall,
  Mail,
  Linkedin,
  Building,
  MapPin,
  Calendar,
  Clock,
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  History,
  Briefcase,
  AlertTriangle,
  Loader2,
  PlusCircle,
  Save,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onCallLeadNow: (lead: Lead) => void;
  onContactDeleted?: (name: string) => void;
  onContactUpdated?: (name: string) => void;
}

// Format YYYY-MM-DD to readable date like "September 25, 2026"
function formatPrettyDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onCallLeadNow,
  onContactDeleted,
  onContactUpdated,
}) => {
  const {
    callHistory,
    callers,
    statuses,
    updateLead,
    deleteLead,
    submitDailyCallUpdate,
  } = useCallingSystem();

  // Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [showAddCallForm, setShowAddCallForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState<CallStatus | string>('Not Called');
  const [editCaller, setEditCaller] = useState('');
  const [editNextCallDate, setEditNextCallDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Add Call form states
  const [callStatus, setCallStatus] = useState<CallStatus | string>('Interested');
  const [callerName, setCallerName] = useState(callers[0] || 'Ali');
  const [callComment, setCallComment] = useState('');
  const [callNextDate, setCallNextDate] = useState('');

  // Async loading & error states
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Sync state whenever selected lead changes
  useEffect(() => {
    if (lead) {
      setEditName(lead.clientName || '');
      setEditCompany(lead.companyName || '');
      setEditPosition(lead.position || lead.designation || '');
      setEditPhone(lead.phoneNumber || '');
      setEditEmail(lead.email || '');
      setEditLocation(lead.region || '');
      setEditStatus(lead.currentStatus || 'Not Called');
      setEditCaller(lead.assignedCaller || callers[0] || 'Ali');
      setEditNextCallDate(lead.nextFollowUpDate || '');
      setEditNotes(lead.latestComment || '');

      setCallerName(lead.assignedCaller || callers[0] || 'Ali');
      setCallStatus(
        lead.currentStatus === 'Not Called'
          ? 'Follow-up'
          : (lead.currentStatus as CallStatus) || 'Interested'
      );
      setCallNextDate(lead.nextFollowUpDate || '');
      setCallComment('');

      setIsEditing(false);
      setShowAddCallForm(false);
      setShowDeleteConfirm(false);
      setModalError(null);
      setModalSuccess(null);
    }
  }, [lead, callers]);

  // Filter and sort historical logs for this lead chronologically (newest first)
  const leadLogs = useMemo(() => {
    if (!lead) return [];
    const seen = new Set<string>();
    const unique: CallLogEntry[] = [];
    for (const log of callHistory) {
      if (log.leadId === lead.leadId) {
        if (!seen.has(log.id)) {
          seen.add(log.id);
          unique.push(log);
        }
      }
    }
    return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [callHistory, lead?.leadId]);

  if (!lead) return null;

  // 1. Handle Save Call / Comment
  const handleSaveCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callComment.trim()) {
      setModalError('Please enter a comment or call notes.');
      return;
    }

    setIsSavingCall(true);
    setModalError(null);
    setModalSuccess(null);

    const todayStr = '2026-09-24';
    const result = await submitDailyCallUpdate({
      leadId: lead.leadId,
      callerName: callerName.trim() || callers[0] || 'Ali',
      date: todayStr,
      status: callStatus,
      comment: callComment.trim(),
      nextFollowUpDate: callNextDate.trim(),
    });

    setIsSavingCall(false);

    if (!result.success) {
      setModalError(result.error || 'Unable to save call. Please try again.');
      return;
    }

    setModalSuccess('Call logged and recorded in call history.');
    setShowAddCallForm(false);
    setCallComment('');

    setTimeout(() => {
      setModalSuccess(null);
    }, 4000);
  };

  // 2. Handle Edit Contact Save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setModalError('Prospect name is required.');
      return;
    }
    if (!editCompany.trim()) {
      setModalError('Company name is required.');
      return;
    }
    if (!editPhone.trim()) {
      setModalError('Phone number is required.');
      return;
    }

    setIsSavingEdit(true);
    setModalError(null);
    setModalSuccess(null);

    const result = await updateLead(lead.leadId, {
      clientName: editName.trim(),
      companyName: editCompany.trim(),
      position: editPosition.trim(),
      designation: editPosition.trim(),
      phoneNumber: editPhone.trim(),
      email: editEmail.trim(),
      region: editLocation.trim(),
      currentStatus: editStatus,
      assignedCaller: editCaller.trim(),
      nextFollowUpDate: editNextCallDate.trim(),
      latestComment: editNotes.trim(),
    });

    setIsSavingEdit(false);

    if (!result.success) {
      setModalError(result.error || 'Unable to update contact. Please try again.');
      return;
    }

    setModalSuccess('Contact updated successfully.');
    setIsEditing(false);

    if (onContactUpdated) {
      onContactUpdated(editName.trim());
    }

    setTimeout(() => {
      setModalSuccess(null);
    }, 4000);
  };

  // 3. Handle Delete Contact (Soft Delete)
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setModalError(null);

    const result = await deleteLead(lead.leadId);
    setIsDeleting(false);

    if (!result.success) {
      setModalError(result.error || 'Unable to delete contact. Please try again.');
      return;
    }

    setShowDeleteConfirm(false);
    onClose();

    if (onContactDeleted) {
      onContactDeleted(lead.clientName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-600 text-white shadow-2xs">
              LEAD #{lead.leadId}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {lead.clientName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{lead.companyName}</span>
                {(lead.position || lead.designation) && (
                  <>
                    <span>·</span>
                    <span>{lead.position || lead.designation}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Call Now button */}
            <button
              onClick={() => {
                onClose();
                onCallLeadNow(lead);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors"
              title="Open in daily call logger"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Call Now</span>
            </button>

            {/* Add Call / Comment Button */}
            {!isEditing && (
              <button
                onClick={() => {
                  setShowAddCallForm(!showAddCallForm);
                  setModalError(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  showAddCallForm
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{showAddCallForm ? 'Hide Log Form' : 'Add Call / Comment'}</span>
              </button>
            )}

            {/* Edit Button */}
            {!showAddCallForm && (
              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  setModalError(null);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isEditing
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
              </button>
            )}

            {/* Delete Button */}
            {!isEditing && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Contact"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {modalSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{modalSuccess}</span>
            </div>
            <button
              onClick={() => setModalSuccess(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {modalError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{modalError}</span>
            </div>
            <button
              onClick={() => setModalError(null)}
              className="text-rose-700 hover:text-rose-950 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal / Banner */}
        {showDeleteConfirm && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-950">Delete Contact?</h3>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  This will remove <strong className="font-semibold">{lead.clientName}</strong> from your active contact list. Historical call logs and reports are safely preserved.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting Contact...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Contact</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto text-xs">
          {/* ================= EDIT MODE FORM ================= */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit Contact Details</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Lead ID #{lead.leadId} (Permanent)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Prospect Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Position / Job Title
                  </label>
                  <input
                    type="text"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Location / Region
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Current Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Next Call Date
                  </label>
                  <input
                    type="date"
                    value={editNextCallDate}
                    onChange={(e) => setEditNextCallDate(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Notes / Latest Comment
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={isSavingEdit}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingEdit}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Contact...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : null}

          {/* ================= INLINE ADD CALL / COMMENT FORM ================= */}
          {showAddCallForm && (
            <form onSubmit={handleSaveCall} className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <div className="flex items-center gap-2 text-blue-950 font-bold text-xs">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <span>Log New Call &amp; Add Comment</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCallForm(false)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Call Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={callStatus}
                    onChange={(e) => setCallStatus(e.target.value)}
                    disabled={isSavingCall}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Caller Name
                  </label>
                  <select
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    disabled={isSavingCall}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    {callers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={callNextDate}
                    onChange={(e) => setCallNextDate(e.target.value)}
                    disabled={isSavingCall}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Call Notes / Prospect Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={callComment}
                  onChange={(e) => setCallComment(e.target.value)}
                  placeholder="e.g. Sent pricing. Prospect will discuss internally and follow up next week."
                  disabled={isSavingCall}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                <button
                  type="button"
                  onClick={() => setShowAddCallForm(false)}
                  disabled={isSavingCall}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCall}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSavingCall ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Call...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Call</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= SECTION 1: CONTACT DETAILS ================= */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Contact Details
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Contact</span>
                </button>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono tabular-nums mb-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Current Status</span>
                <div className="mt-1">
                  <StatusBadge status={lead.currentStatus} size="sm" />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Call Attempts</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block font-sans">
                  {lead.numberOfAttempts} {lead.numberOfAttempts === 1 ? 'call' : 'calls'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Last Call</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">
                  {lead.lastCallDate || 'Never called'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Next Call</span>
                <span className="text-xs font-bold text-amber-900 mt-1 block font-mono">
                  {lead.nextFollowUpDate || 'None scheduled'}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Name</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                  {lead.clientName}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Company</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                  {lead.companyName || '-'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Position</span>
                <span className="text-slate-700 text-xs mt-0.5 block">
                  {lead.position || lead.designation || '-'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Phone</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {lead.phoneNumber || 'Not provided'}
                  </span>
                  {lead.phoneNumber && (
                    <a
                      href={`tel:${lead.phoneNumber}`}
                      className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-medium"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Dial</span>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Email</span>
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-blue-600 hover:underline flex items-center gap-1.5 mt-0.5"
                  >
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{lead.email}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 mt-0.5 block">-</span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Location</span>
                <span className="text-slate-700 text-xs mt-0.5 block">{lead.region || '-'}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Assigned Caller</span>
                <span className="font-medium text-slate-800 text-xs mt-0.5 block">
                  {lead.assignedCaller || 'Unassigned'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">LinkedIn Profile</span>
                {lead.personLinkedInUrl ? (
                  <a
                    href={lead.personLinkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Linkedin className="w-3 h-3 text-blue-700" />
                    <span>View LinkedIn Profile</span>
                  </a>
                ) : (
                  <span className="text-slate-400 mt-0.5 block">-</span>
                )}
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: LATEST COMMENT / SUMMARY ================= */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-blue-950 font-bold text-xs uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Latest Comment / Summary</span>
              </div>
              {lead.lastCallDate && (
                <span className="text-[10px] font-mono text-blue-700">
                  Last called: {lead.lastCallDate}
                </span>
              )}
            </div>

            <p className="text-slate-800 text-xs leading-relaxed bg-white/70 p-3 rounded-lg border border-blue-100/70">
              {lead.latestSummary || lead.latestComment || (
                <span className="text-slate-400 italic">No notes or call summary recorded yet.</span>
              )}
            </p>

            {lead.latestComment && lead.latestSummary && lead.latestComment !== lead.latestSummary && (
              <div className="mt-2 pt-2 border-t border-blue-100/70 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">Last note:</span> &ldquo;{lead.latestComment}&rdquo;
              </div>
            )}
          </div>

          {/* ================= SECTION 3: CALL HISTORY ================= */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span>Call History ({leadLogs.length} {leadLogs.length === 1 ? 'interaction' : 'interactions'})</span>
              </h3>

              {!showAddCallForm && (
                <button
                  onClick={() => setShowAddCallForm(true)}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Log New Call</span>
                </button>
              )}
            </div>

            {leadLogs.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400">
                <p>No call history recorded yet for this contact.</p>
                <button
                  onClick={() => setShowAddCallForm(true)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Record First Call</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {leadLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {formatPrettyDate(log.date)}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 font-medium text-[11px]">
                          Caller: <strong className="text-slate-800">{log.callerName}</strong>
                        </span>
                      </div>
                      <StatusBadge status={log.status} size="sm" />
                    </div>

                    <div className="mt-2 text-slate-800 leading-relaxed font-normal">
                      &ldquo;{log.comment || 'No comment recorded.'}&rdquo;
                    </div>

                    {log.nextFollowUpDate && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-amber-800">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>Scheduled Follow-up: <strong>{formatPrettyDate(log.nextFollowUpDate)}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= OPTIONAL RAW FILE FIELDS ================= */}
          {lead.rawOriginalData && Object.keys(lead.rawOriginalData).length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center justify-between py-1">
                  <span>View Original Raw Uploaded Fields ({Object.keys(lead.rawOriginalData).length} fields preserved)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Untouched File Data</span>
                </summary>
                <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono max-h-36 overflow-y-auto">
                  {Object.entries(lead.rawOriginalData).map(([k, v]) => (
                    <div key={k} className="overflow-hidden truncate">
                      <span className="text-slate-500 font-semibold">{k}:</span>{' '}
                      <span className="text-slate-900">{String(v || '-')}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            Lead #{lead.leadId}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
