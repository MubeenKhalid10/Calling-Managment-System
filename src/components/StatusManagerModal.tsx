import React, { useState } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { StatusBadge } from './StatusBadge';
import {
  Settings,
  Plus,
  Trash2,
  X,
  Check,
  Edit2,
  Users,
  Tag,
  AlertTriangle,
  Loader2,
  UserCheck,
} from 'lucide-react';

interface StatusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'callers' | 'statuses';
}

export const StatusManagerModal: React.FC<StatusManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'callers',
}) => {
  const {
    leads,
    callers,
    statuses,
    addCaller,
    updateCaller,
    deleteCaller,
    addStatus,
    removeStatus,
  } = useCallingSystem();

  const [activeTab, setActiveTab] = useState<'callers' | 'statuses'>(initialTab);

  // Caller state
  const [newCallerInput, setNewCallerInput] = useState('');
  const [editingCaller, setEditingCaller] = useState<string | null>(null);
  const [editingCallerInput, setEditingCallerInput] = useState('');
  const [callerToDelete, setCallerToDelete] = useState<string | null>(null);
  const [reassignToCaller, setReassignToCaller] = useState<string>('Unassigned');
  const [callerLoading, setCallerLoading] = useState(false);
  const [callerMessage, setCallerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status state
  const [newStatusInput, setNewStatusInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Count leads per caller
  const getCallerLeadsCount = (callerName: string) => {
    return leads.filter((l) => l.assignedCaller === callerName).length;
  };

  // Add Caller Handler
  const handleAddCaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallerInput.trim()) return;

    setCallerLoading(true);
    setCallerMessage(null);
    const result = await addCaller(newCallerInput.trim());
    setCallerLoading(false);

    if (result.success) {
      setCallerMessage({ type: 'success', text: `Caller "${newCallerInput.trim()}" added successfully.` });
      setNewCallerInput('');
    } else {
      setCallerMessage({ type: 'error', text: result.error || 'Failed to add caller.' });
    }
  };

  // Start Editing Caller
  const handleStartEdit = (caller: string) => {
    setEditingCaller(caller);
    setEditingCallerInput(caller);
    setCallerMessage(null);
  };

  // Save Edited Caller
  const handleSaveEdit = async (oldName: string) => {
    if (!editingCallerInput.trim()) return;
    if (editingCallerInput.trim() === oldName) {
      setEditingCaller(null);
      return;
    }

    setCallerLoading(true);
    setCallerMessage(null);
    const result = await updateCaller(oldName, editingCallerInput.trim());
    setCallerLoading(false);

    if (result.success) {
      setCallerMessage({
        type: 'success',
        text: `Caller renamed to "${editingCallerInput.trim()}". Assigned contacts updated.`,
      });
      setEditingCaller(null);
    } else {
      setCallerMessage({ type: 'error', text: result.error || 'Failed to update caller.' });
    }
  };

  // Delete Caller Handler
  const handleConfirmDeleteCaller = async () => {
    if (!callerToDelete) return;

    setCallerLoading(true);
    setCallerMessage(null);
    const result = await deleteCaller(callerToDelete, reassignToCaller);
    setCallerLoading(false);

    if (result.success) {
      setCallerMessage({
        type: 'success',
        text: `Caller "${callerToDelete}" removed. Contacts reassigned to "${reassignToCaller}".`,
      });
      setCallerToDelete(null);
    } else {
      setCallerMessage({ type: 'error', text: result.error || 'Failed to delete caller.' });
    }
  };

  // Add Status Handler
  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusInput.trim()) return;

    if (statuses.some((s) => s.toLowerCase() === newStatusInput.trim().toLowerCase())) {
      setStatusMessage({ type: 'error', text: `Status "${newStatusInput.trim()}" already exists.` });
      return;
    }

    await addStatus(newStatusInput.trim());
    setStatusMessage({ type: 'success', text: `Status "${newStatusInput.trim()}" added.` });
    setNewStatusInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Team &amp; Settings Management
              </h2>
              <p className="text-xs text-slate-500">
                Manage cold callers and disposition statuses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-200 flex gap-4">
          <button
            onClick={() => {
              setActiveTab('callers');
              setCallerMessage(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'callers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Callers &amp; Team</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
              {callers.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('statuses');
              setStatusMessage(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'statuses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Call Statuses</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
              {statuses.length}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* ================= CALLERS TAB ================= */}
          {activeTab === 'callers' && (
            <div className="space-y-4">
              <p className="text-slate-500 text-xs">
                Add, rename, or delete cold callers in your organization. Editing a caller automatically updates their assigned contacts across the system.
              </p>

              {/* Feedback Alert */}
              {callerMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    callerMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <span>{callerMessage.text}</span>
                  <button
                    onClick={() => setCallerMessage(null)}
                    className="font-bold text-sm px-1 opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Add New Caller Form */}
              <form onSubmit={handleAddCaller} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new caller full name (e.g. Jessica Taylor)"
                  value={newCallerInput}
                  onChange={(e) => setNewCallerInput(e.target.value)}
                  disabled={callerLoading}
                  className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={!newCallerInput.trim() || callerLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-xs disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {callerLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Add Caller</span>
                </button>
              </form>

              {/* Delete Confirmation Box */}
              {callerToDelete && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-xs">
                        Delete caller &ldquo;{callerToDelete}&rdquo;?
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        This caller has <strong>{getCallerLeadsCount(callerToDelete)}</strong> assigned contacts. Choose where to reassign these contacts:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-medium text-amber-900 whitespace-nowrap">
                      Reassign to:
                    </label>
                    <select
                      value={reassignToCaller}
                      onChange={(e) => setReassignToCaller(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {callers
                        .filter((c) => c !== callerToDelete)
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => setCallerToDelete(null)}
                      disabled={callerLoading}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-amber-100/60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteCaller}
                      disabled={callerLoading}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs"
                    >
                      {callerLoading ? 'Deleting...' : 'Confirm Delete Caller'}
                    </button>
                  </div>
                </div>
              )}

              {/* Callers List */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-2xs">
                {callers.map((caller) => {
                  const leadsCount = getCallerLeadsCount(caller);
                  const isEditing = editingCaller === caller;

                  return (
                    <div
                      key={caller}
                      className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors gap-3"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingCallerInput}
                            onChange={(e) => setEditingCallerInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 border border-blue-400 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(caller);
                              if (e.key === 'Escape') setEditingCaller(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(caller)}
                            disabled={callerLoading || !editingCallerInput.trim()}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg font-bold"
                            title="Save Changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCaller(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                              {caller.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 text-xs block truncate">
                                {caller}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {leadsCount} contact{leadsCount !== 1 ? 's' : ''} assigned
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Edit / Update Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(caller)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Update Caller Name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Caller Button */}
                            {callers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCallerToDelete(caller);
                                  setReassignToCaller(
                                    callers.find((c) => c !== caller) || 'Unassigned'
                                  );
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Caller"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STATUSES TAB ================= */}
          {activeTab === 'statuses' && (
            <div className="space-y-4">
              <p className="text-slate-500 text-xs">
                Customize call disposition statuses available to cold callers across the system.
              </p>

              {statusMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <span>{statusMessage.text}</span>
                  <button
                    onClick={() => setStatusMessage(null)}
                    className="font-bold text-sm px-1 opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Add New Status */}
              <form onSubmit={handleAddStatus} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Needs Technical Demo"
                  value={newStatusInput}
                  onChange={(e) => setNewStatusInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={!newStatusInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-xs disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Status</span>
                </button>
              </form>

              {/* Status List */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-2xs">
                {statuses.map((s) => (
                  <div
                    key={s}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s} size="sm" />
                    </div>

                    {statuses.length > 1 && (
                      <button
                        onClick={() => removeStatus(s)}
                        title="Remove status"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Changes are securely synchronized to cloud database
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
