import React, { useState, useMemo } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { Lead } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import {
  Calendar,
  PhoneCall,
  UserCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface DailyActivityDashboardProps {
  onOpenLeadModal: (lead: Lead) => void;
  onCallLeadNow: (lead: Lead) => void;
}

export const DailyActivityDashboard: React.FC<DailyActivityDashboardProps> = ({
  onOpenLeadModal,
  onCallLeadNow,
}) => {
  const { leads, callHistory, callers } = useCallingSystem();

  const todayStr = '2026-09-24';
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateRangeMode, setDateRangeMode] = useState<'today' | 'yesterday' | 'week' | 'custom' | 'all'>('today');

  // Handle quick date buttons
  const handleQuickDate = (mode: 'today' | 'yesterday' | 'week' | 'all') => {
    setDateRangeMode(mode);
    if (mode === 'today') {
      setSelectedDate(todayStr);
    } else if (mode === 'yesterday') {
      setSelectedDate('2026-09-23');
    }
  };

  // Filter logs for selected period
  const activityLogs = useMemo(() => {
    if (dateRangeMode === 'all') {
      return callHistory;
    }
    if (dateRangeMode === 'week') {
      // 7 days around 2026-09-24 (e.g. 2026-09-18 to 2026-09-24)
      return callHistory.filter((l) => l.date >= '2026-09-18' && l.date <= todayStr);
    }
    return callHistory.filter((l) => l.date === selectedDate);
  }, [callHistory, dateRangeMode, selectedDate, todayStr]);

  // Aggregate stats
  const totalCalls = activityLogs.length;

  const countByStatus = (statusName: string) => {
    return activityLogs.filter((l) => l.status === statusName).length;
  };

  const noAnswerCount = countByStatus('No Answer');
  const interestedCount = countByStatus('Interested');
  const followUpCount = countByStatus('Follow-up') + countByStatus('Call Back');
  const appointmentCount = countByStatus('Appointment Booked');
  const notInterestedCount = countByStatus('Not Interested');
  const convertedCount = countByStatus('Converted');
  const busyCount = countByStatus('Busy');

  // Total attempts across all prospects in master
  const totalCumulativeAttempts = leads.reduce(
    (sum, l) => sum + (l.numberOfAttempts || 0),
    0
  );

  // Breakdown by Caller
  const callerStats = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        interested: number;
        appointments: number;
        followUps: number;
        noAnswer: number;
        notInterested: number;
        converted: number;
      }
    > = {};

    activityLogs.forEach((log) => {
      const caller = log.callerName || 'Unspecified';
      if (!stats[caller]) {
        stats[caller] = {
          total: 0,
          interested: 0,
          appointments: 0,
          followUps: 0,
          noAnswer: 0,
          notInterested: 0,
          converted: 0,
        };
      }
      stats[caller].total += 1;
      if (log.status === 'Interested') stats[caller].interested += 1;
      if (log.status === 'Appointment Booked') stats[caller].appointments += 1;
      if (log.status === 'Follow-up' || log.status === 'Call Back') stats[caller].followUps += 1;
      if (log.status === 'No Answer' || log.status === 'Busy') stats[caller].noAnswer += 1;
      if (log.status === 'Not Interested') stats[caller].notInterested += 1;
      if (log.status === 'Converted') stats[caller].converted += 1;
    });

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [activityLogs]);

  // Follow-up Queue Breakdown
  const dueTodayLeads = useMemo(
    () =>
      leads.filter(
        (l) => l.nextFollowUpDate === todayStr && l.currentStatus !== 'Converted' && l.currentStatus !== 'Do Not Call'
      ),
    [leads, todayStr]
  );

  const overdueLeads = useMemo(
    () =>
      leads.filter(
        (l) => l.nextFollowUpDate && l.nextFollowUpDate < todayStr && l.currentStatus !== 'Converted' && l.currentStatus !== 'Do Not Call'
      ),
    [leads, todayStr]
  );

  const upcomingLeads = useMemo(
    () =>
      leads.filter(
        (l) => l.nextFollowUpDate && l.nextFollowUpDate > todayStr && l.currentStatus !== 'Converted' && l.currentStatus !== 'Do Not Call'
      ),
    [leads, todayStr]
  );

  // Weekly breakdown (calls grouped by date)
  const weeklyDayBreakdown = useMemo(() => {
    const days: Record<string, number> = {
      '2026-09-20': 0,
      '2026-09-21': 0,
      '2026-09-22': 0,
      '2026-09-23': 0,
      '2026-09-24': 0,
    };

    callHistory.forEach((log) => {
      if (days[log.date] !== undefined) {
        days[log.date] += 1;
      } else {
        days[log.date] = 1;
      }
    });

    return Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
  }, [callHistory]);

  return (
    <div className="space-y-6">
      {/* Date Selector Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Daily Activity &amp; Manager Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Analyze cold calling performance, caller productivity, conversion rates, and scheduled follow-ups.
            </p>
          </div>

          {/* Quick Date Presets + Custom Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => handleQuickDate('today')}
                className={`px-3 py-1 font-medium rounded-md transition-colors ${
                  dateRangeMode === 'today'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today (24-Sep)
              </button>
              <button
                onClick={() => handleQuickDate('yesterday')}
                className={`px-3 py-1 font-medium rounded-md transition-colors ${
                  dateRangeMode === 'yesterday'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => handleQuickDate('week')}
                className={`px-3 py-1 font-medium rounded-md transition-colors ${
                  dateRangeMode === 'week'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Past 7 Days
              </button>
              <button
                onClick={() => handleQuickDate('all')}
                className={`px-3 py-1 font-medium rounded-md transition-colors ${
                  dateRangeMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-xs text-slate-500">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDateRangeMode('custom');
                }}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono tabular-nums">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="block text-[11px] text-slate-500 font-sans uppercase font-medium">
            {dateRangeMode === 'week' ? 'Week Calls' : dateRangeMode === 'all' ? 'All Calls' : 'Calls Today'}
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {totalCalls}
          </span>
          <span className="text-[10px] text-slate-400 font-sans">
            Logged updates
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="block text-[11px] text-slate-500 font-sans uppercase font-medium">Total Attempts</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {totalCumulativeAttempts}
          </span>
          <span className="text-[10px] text-slate-400 font-sans">All prospects</span>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="block text-[11px] text-emerald-800 font-sans uppercase font-semibold">Interested</span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">
            {interestedCount}
          </span>
          <span className="text-[10px] text-emerald-700 font-sans">Positive interest</span>
        </div>

        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 shadow-xs">
          <span className="block text-[11px] text-indigo-800 font-sans uppercase font-semibold">Appointments</span>
          <span className="text-xl font-bold text-indigo-900 mt-1 block">
            {appointmentCount}
          </span>
          <span className="text-[10px] text-indigo-700 font-sans">Booked meetings</span>
        </div>

        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-xs">
          <span className="block text-[11px] text-amber-800 font-sans uppercase font-semibold">Follow-ups</span>
          <span className="text-xl font-bold text-amber-900 mt-1 block">
            {followUpCount}
          </span>
          <span className="text-[10px] text-amber-700 font-sans">Scheduled</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="block text-[11px] text-slate-700 font-sans uppercase font-medium">No Answer</span>
          <span className="text-xl font-bold text-slate-800 mt-1 block">
            {noAnswerCount}
          </span>
          <span className="text-[10px] text-slate-500 font-sans">Unreachable</span>
        </div>

        <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 shadow-xs">
          <span className="block text-[11px] text-rose-800 font-sans uppercase font-medium">Not Interested</span>
          <span className="text-xl font-bold text-rose-900 mt-1 block">
            {notInterestedCount}
          </span>
          <span className="text-[10px] text-rose-600 font-sans">Declined</span>
        </div>

        <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 shadow-xs">
          <span className="block text-[11px] text-teal-800 font-sans uppercase font-semibold">Converted</span>
          <span className="text-xl font-bold text-teal-900 mt-1 block">
            {convertedCount}
          </span>
          <span className="text-[10px] text-teal-700 font-sans">Won prospects</span>
        </div>
      </div>

      {/* Main Grid: Caller Productivity Table & Follow-up Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Caller Productivity Breakdown */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Total Calls by Each Caller
              </h2>
              <p className="text-xs text-slate-500">
                Performance breakdown for selected period ({activityLogs.length} total calls)
              </p>
            </div>
            <Award className="w-4 h-4 text-slate-400" />
          </div>

          {callerStats.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No caller activity recorded for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[11px]">
                    <th className="py-2 px-2">Caller</th>
                    <th className="py-2 px-2 text-center">Calls</th>
                    <th className="py-2 px-2 text-center">Interested</th>
                    <th className="py-2 px-2 text-center">Booked</th>
                    <th className="py-2 px-2 text-center">Follow-up</th>
                    <th className="py-2 px-2 text-center">No Answer</th>
                    <th className="py-2 px-2 text-right">Positive Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono tabular-nums">
                  {callerStats.map(([callerName, data]) => {
                    const positive = data.interested + data.appointments + data.converted;
                    const positiveRate = data.total > 0 ? Math.round((positive / data.total) * 100) : 0;

                    return (
                      <tr key={callerName} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-2 font-sans font-semibold text-neutral-900">
                          {callerName}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-neutral-900">
                          {data.total}
                        </td>
                        <td className="py-2.5 px-2 text-center text-emerald-700 font-semibold">
                          {data.interested}
                        </td>
                        <td className="py-2.5 px-2 text-center text-indigo-700 font-semibold">
                          {data.appointments}
                        </td>
                        <td className="py-2.5 px-2 text-center text-amber-700">
                          {data.followUps}
                        </td>
                        <td className="py-2.5 px-2 text-center text-neutral-500">
                          {data.noAnswer}
                        </td>
                        <td className="py-2.5 px-2 text-right font-sans font-bold text-neutral-900">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              positiveRate >= 40
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {positiveRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Weekly Totals Bar Summary */}
          <div className="mt-6 pt-4 border-t border-neutral-200">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide mb-2">
              Weekly Call Activity Trend
            </h3>
            <div className="flex items-end gap-2 h-20 pt-4">
              {weeklyDayBreakdown.map(([dayDate, count]) => {
                const max = Math.max(...weeklyDayBreakdown.map(([, c]) => c), 5);
                const heightPercent = Math.max(15, Math.round((count / max) * 100));
                const isSelected = dayDate === selectedDate;

                return (
                  <div
                    key={dayDate}
                    onClick={() => {
                      setSelectedDate(dayDate);
                      setDateRangeMode('custom');
                    }}
                    className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <span className="text-[10px] font-mono text-neutral-500 font-bold">
                      {count}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all ${
                        isSelected
                          ? 'bg-neutral-900'
                          : 'bg-neutral-300 group-hover:bg-neutral-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-mono whitespace-nowrap ${
                        isSelected ? 'font-bold text-neutral-900' : 'text-neutral-500'
                      }`}
                    >
                      {dayDate.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Follow-up Tracking Column */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Follow-Up Tracking
            </h2>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>

          {/* Due Today Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Follow-up Due Today ({dueTodayLeads.length})
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">{todayStr}</span>
            </div>

            {dueTodayLeads.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-2">
                No follow-ups due today. Great job!
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dueTodayLeads.map((lead) => (
                  <div
                    key={lead.leadId}
                    className="p-2.5 rounded border border-amber-200 bg-amber-50/40 hover:bg-amber-100/50 transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-900">
                          #{lead.leadId}
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {lead.clientName}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate max-w-[200px]">
                        {lead.companyName} · {lead.latestComment || 'Follow-up scheduled'}
                      </p>
                    </div>

                    <button
                      onClick={() => onCallLeadNow(lead)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded transition-colors whitespace-nowrap shadow-2xs"
                    >
                      Call Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue Section */}
          <div className="pt-3 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Overdue Follow-ups ({overdueLeads.length})
              </span>
            </div>

            {overdueLeads.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-1">
                No overdue follow-ups.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {overdueLeads.map((lead) => (
                  <div
                    key={lead.leadId}
                    className="p-2 rounded border border-rose-200 bg-rose-50/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-rose-900 mr-1.5">
                        #{lead.leadId}
                      </span>
                      <span className="font-medium text-neutral-900">{lead.clientName}</span>
                      <span className="text-[11px] text-rose-700 block font-mono">
                        Due: {lead.nextFollowUpDate}
                      </span>
                    </div>
                    <button
                      onClick={() => onCallLeadNow(lead)}
                      className="px-2 py-0.5 text-xs text-rose-800 hover:bg-rose-100 rounded border border-rose-300 font-semibold"
                    >
                      Call
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Section */}
          <div className="pt-3 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-700">
                Upcoming Follow-ups ({upcomingLeads.length})
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              {upcomingLeads.length} prospects scheduled for call-back in the coming days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
