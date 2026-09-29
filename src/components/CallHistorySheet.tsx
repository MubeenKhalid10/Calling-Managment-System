import React, { useState, useMemo } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { CallLogEntry } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import { exportCallHistoryToCsv } from '../utils/csvHelper';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export const CallHistorySheet: React.FC = () => {
  const { callHistory, callers, statuses, deleteCallLog } = useCallingSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [callerFilter, setCallerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const handleDelete = async (logId: string, leadId: number, prospectName: string) => {
    setDeletingId(null);
    try {
      await deleteCallLog(logId);
      setDeleteNotice(`Interaction record for Lead #${leadId} (${prospectName}) has been deleted.`);
      setTimeout(() => {
        setDeleteNotice(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to delete log entry:', err);
    }
  };

  const filteredHistory = useMemo(() => {
    const seen = new Set<string>();
    const unique: CallLogEntry[] = [];
    for (const log of callHistory) {
      if (!seen.has(log.id)) {
        seen.add(log.id);
        unique.push(log);
      }
    }

    return unique.filter((log) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          String(log.leadId).includes(q) ||
          log.prospectName.toLowerCase().includes(q) ||
          log.companyName.toLowerCase().includes(q) ||
          log.callerName.toLowerCase().includes(q) ||
          log.comment.toLowerCase().includes(q);

        if (!matches) return false;
      }

      // Caller filter
      if (callerFilter !== 'ALL' && log.callerName !== callerFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter && log.date !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [callHistory, searchTerm, callerFilter, statusFilter, dateFilter]);

  return (
    <div className="space-y-4">
      {/* Deletion Toast / Notice */}
      {deleteNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-md text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium">{deleteNotice}</span>
          </div>
          <button
            onClick={() => setDeleteNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-neutral-800" />
              <h1 className="text-lg font-bold text-neutral-900">
                Call History Log
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono font-medium">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Permanent immutable record of every call interaction. Master Database displays the latest status, while this sheet retains the complete chronological journey.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCallHistoryToCsv(filteredHistory)}
              disabled={filteredHistory.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded-md transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export History CSV ({filteredHistory.length})</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Lead ID, Caller, Prospect, Comment..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-neutral-500">Date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="py-1 px-2 text-xs border border-neutral-300 rounded bg-white font-mono"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  ×
                </button>
              )}
            </div>

            {/* Caller filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-neutral-500">Caller:</span>
              <select
                value={callerFilter}
                onChange={(e) => setCallerFilter(e.target.value)}
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

            {/* Status filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-neutral-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1 px-2 text-xs border border-neutral-300 rounded bg-white text-neutral-800"
              >
                <option value="ALL">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || callerFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCallerFilter('ALL');
                  setStatusFilter('ALL');
                  setDateFilter('');
                }}
                className="px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 rounded border border-neutral-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-neutral-100 border-b border-neutral-200 text-neutral-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Caller</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Lead ID</th>
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">Prospect Name</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Company</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 min-w-[240px]">Comment</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Next Follow-up</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    No call history records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-2 px-3 font-mono tabular-nums text-neutral-700 whitespace-nowrap">
                      {log.date}
                    </td>
                    <td className="py-2 px-3 font-semibold text-neutral-900 whitespace-nowrap">
                      {log.callerName}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-neutral-900 tabular-nums whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800">
                        {log.leadId}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-neutral-900 font-medium whitespace-nowrap">
                      {log.prospectName}
                    </td>
                    <td className="py-2 px-3 text-neutral-700 whitespace-nowrap">
                      {log.companyName || '-'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge status={log.status} size="sm" />
                    </td>
                    <td className="py-2 px-3 text-neutral-700 max-w-sm break-words">
                      {log.comment || '-'}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-neutral-700 whitespace-nowrap">
                      {log.nextFollowUpDate || '-'}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {deletingId === log.id ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleDelete(log.id, log.leadId, log.prospectName)}
                            className="px-2 py-0.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors shadow-2xs cursor-pointer"
                            title="Confirm delete"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-1.5 py-0.5 text-[11px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(log.id)}
                          title={`Delete call record for Lead #${log.leadId}`}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500 font-mono tabular-nums">
          <span>Total Logged Interactions: {callHistory.length}</span>
          <span>Showing: {filteredHistory.length}</span>
        </div>
      </div>
    </div>
  );
};
