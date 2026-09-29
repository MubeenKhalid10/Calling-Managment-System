import React, { useState, useMemo } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { CallLogEntry } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import { exportCallHistoryToCsv } from '../utils/csvHelper';
import {
  BarChart3,
  Calendar,
  Users,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  PhoneCall,
  User,
  ArrowUpRight,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { callHistory, callers, statuses } = useCallingSystem();

  // Active view: Daily | Weekly | Monthly
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Filters
  const [selectedDate, setSelectedDate] = useState('2026-09-24');
  const [selectedCaller, setSelectedCaller] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Helper to determine if call is "Connected"
  const isConnectedStatus = (st: string) => {
    return !['No Answer', 'Busy', 'Wrong Number', 'Not Called'].includes(st);
  };

  // Base filtered call history
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
      if (selectedCaller !== 'ALL' && log.callerName !== selectedCaller) {
        return false;
      }
      if (selectedStatus !== 'ALL' && log.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [callHistory, selectedCaller, selectedStatus]);

  // ===================== DAILY REPORT =====================
  const dailyLogs = useMemo(() => {
    return filteredHistory.filter((log) => log.date === selectedDate);
  }, [filteredHistory, selectedDate]);

  const dailyStats = useMemo(() => {
    const total = dailyLogs.length;
    const connected = dailyLogs.filter((l) => isConnectedStatus(l.status)).length;
    const noAnswer = dailyLogs.filter((l) => l.status === 'No Answer' || l.status === 'Busy').length;
    const followUps = dailyLogs.filter((l) => l.status === 'Follow-up' || l.status === 'Call Back').length;
    const interested = dailyLogs.filter((l) => l.status === 'Interested').length;
    const notInterested = dailyLogs.filter((l) => l.status === 'Not Interested').length;
    const appointments = dailyLogs.filter((l) => l.status === 'Appointment Booked').length;
    const converted = dailyLogs.filter((l) => l.status === 'Converted').length;

    // Caller activity map
    const callerCounts: Record<string, number> = {};
    dailyLogs.forEach((l) => {
      const name = l.callerName || 'Unknown';
      callerCounts[name] = (callerCounts[name] || 0) + 1;
    });

    return {
      total,
      connected,
      noAnswer,
      followUps,
      interested,
      notInterested,
      appointments,
      converted,
      callerCounts,
    };
  }, [dailyLogs]);

  // ===================== WEEKLY REPORT =====================
  // Computes the Monday-Sunday week bounds around the selected date
  const { weekStartStr, weekEndStr, weekDayMap, weeklyLogs } = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatYMD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const da = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    };

    const startStr = formatYMD(monday);
    const endStr = formatYMD(sunday);

    const logsInWeek = filteredHistory.filter(
      (l) => l.date >= startStr && l.date <= endStr
    );

    // Days of the week breakdown
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const map: Record<string, { count: number; dateStr: string }> = {};

    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const str = formatYMD(current);
      const name = dayNames[i];
      const count = logsInWeek.filter((l) => l.date === str).length;
      map[name] = { count, dateStr: str };
    }

    return {
      weekStartStr: startStr,
      weekEndStr: endStr,
      weekDayMap: map,
      weeklyLogs: logsInWeek,
    };
  }, [filteredHistory, selectedDate]);

  const weeklyStats = useMemo(() => {
    const total = weeklyLogs.length;
    const connected = weeklyLogs.filter((l) => isConnectedStatus(l.status)).length;
    const noAnswer = weeklyLogs.filter((l) => l.status === 'No Answer' || l.status === 'Busy').length;
    const followUps = weeklyLogs.filter((l) => l.status === 'Follow-up' || l.status === 'Call Back').length;
    const interested = weeklyLogs.filter((l) => l.status === 'Interested').length;
    const notInterested = weeklyLogs.filter((l) => l.status === 'Not Interested').length;
    const appointments = weeklyLogs.filter((l) => l.status === 'Appointment Booked').length;
    const converted = weeklyLogs.filter((l) => l.status === 'Converted').length;

    const callerCounts: Record<string, number> = {};
    weeklyLogs.forEach((l) => {
      const name = l.callerName || 'Unknown';
      callerCounts[name] = (callerCounts[name] || 0) + 1;
    });

    return {
      total,
      connected,
      noAnswer,
      followUps,
      interested,
      notInterested,
      appointments,
      converted,
      callerCounts,
    };
  }, [weeklyLogs]);

  // ===================== MONTHLY REPORT =====================
  const { monthYearStr, monthlyLogs, monthlyWeeks } = useMemo(() => {
    const [year, month] = selectedDate.split('-');
    const prefix = `${year}-${month}`;

    const logsInMonth = filteredHistory.filter((l) => l.date.startsWith(prefix));

    // Breakdown by week (Week 1: days 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29+)
    const weeks = [
      { name: 'Week 1 (Days 1–7)', count: 0 },
      { name: 'Week 2 (Days 8–14)', count: 0 },
      { name: 'Week 3 (Days 15–21)', count: 0 },
      { name: 'Week 4 (Days 22–28)', count: 0 },
      { name: 'Week 5 (Days 29–31)', count: 0 },
    ];

    logsInMonth.forEach((log) => {
      const dayNum = parseInt(log.date.split('-')[2], 10);
      if (dayNum <= 7) weeks[0].count++;
      else if (dayNum <= 14) weeks[1].count++;
      else if (dayNum <= 21) weeks[2].count++;
      else if (dayNum <= 28) weeks[3].count++;
      else weeks[4].count++;
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    const title = `${monthNames[monthIndex] || month} ${year}`;

    return {
      monthYearStr: title,
      monthlyLogs: logsInMonth,
      monthlyWeeks: weeks,
    };
  }, [filteredHistory, selectedDate]);

  const monthlyStats = useMemo(() => {
    const total = monthlyLogs.length;
    const connected = monthlyLogs.filter((l) => isConnectedStatus(l.status)).length;
    const noAnswer = monthlyLogs.filter((l) => l.status === 'No Answer' || l.status === 'Busy').length;
    const followUps = monthlyLogs.filter((l) => l.status === 'Follow-up' || l.status === 'Call Back').length;
    const interested = monthlyLogs.filter((l) => l.status === 'Interested').length;
    const notInterested = monthlyLogs.filter((l) => l.status === 'Not Interested').length;
    const appointments = monthlyLogs.filter((l) => l.status === 'Appointment Booked').length;
    const converted = monthlyLogs.filter((l) => l.status === 'Converted').length;

    const callerCounts: Record<string, number> = {};
    monthlyLogs.forEach((l) => {
      const name = l.callerName || 'Unknown';
      callerCounts[name] = (callerCounts[name] || 0) + 1;
    });

    return {
      total,
      connected,
      noAnswer,
      followUps,
      interested,
      notInterested,
      appointments,
      converted,
      callerCounts,
    };
  }, [monthlyLogs]);

  // Active stats depending on reportType
  const currentStats =
    reportType === 'daily'
      ? dailyStats
      : reportType === 'weekly'
      ? weeklyStats
      : monthlyStats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-neutral-800" />
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                Calling Performance Reports
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono font-medium">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Automatically calculated from actual call history records. View daily, weekly, or monthly progress.
            </p>
          </div>

          {/* Report Type Switcher: Daily | Weekly | Monthly */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-lg border border-neutral-200 text-xs font-semibold">
            <button
              onClick={() => setReportType('daily')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                reportType === 'daily'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Daily Report
            </button>
            <button
              onClick={() => setReportType('weekly')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                reportType === 'weekly'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Weekly Report
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                reportType === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Monthly Report
            </button>
          </div>
        </div>

        {/* Filter Controls (Section 16: Date, Caller, Status) */}
        <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-1 px-2 border border-neutral-300 rounded bg-white font-mono text-xs text-neutral-800"
              />
            </div>

            {/* Caller Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium">Caller:</span>
              <select
                value={selectedCaller}
                onChange={(e) => setSelectedCaller(e.target.value)}
                className="py-1 px-2 border border-neutral-300 rounded bg-white text-xs text-neutral-800"
              >
                <option value="ALL">All Callers</option>
                {callers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="py-1 px-2 border border-neutral-300 rounded bg-white text-xs text-neutral-800"
              >
                <option value="ALL">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context Header Label */}
          <div className="text-xs font-mono font-semibold text-neutral-700 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200">
            {reportType === 'daily' && `Date: ${selectedDate}`}
            {reportType === 'weekly' && `Week: ${weekStartStr} to ${weekEndStr}`}
            {reportType === 'monthly' && `Month: ${monthYearStr}`}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (Total Calls, Connected, No Answer, Follow-ups, Interested, Not Interested, Appointments, Converted) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white border border-neutral-200 rounded-lg p-3 text-center shadow-2xs">
          <span className="text-[11px] text-neutral-500 uppercase font-semibold block">Total Calls</span>
          <span className="text-xl font-mono font-bold text-neutral-900 mt-1 block">
            {currentStats.total}
          </span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-lg p-3 text-center shadow-2xs bg-emerald-50/30">
          <span className="text-[11px] text-emerald-800 uppercase font-semibold block">Connected</span>
          <span className="text-xl font-mono font-bold text-emerald-700 mt-1 block">
            {currentStats.connected}
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-3 text-center shadow-2xs">
          <span className="text-[11px] text-neutral-500 uppercase font-semibold block">No Answer</span>
          <span className="text-xl font-mono font-bold text-neutral-700 mt-1 block">
            {currentStats.noAnswer}
          </span>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg p-3 text-center shadow-2xs bg-amber-50/30">
          <span className="text-[11px] text-amber-800 uppercase font-semibold block">Follow-ups</span>
          <span className="text-xl font-mono font-bold text-amber-700 mt-1 block">
            {currentStats.followUps}
          </span>
        </div>

        <div className="bg-white border border-blue-200 rounded-lg p-3 text-center shadow-2xs bg-blue-50/30">
          <span className="text-[11px] text-blue-800 uppercase font-semibold block">Interested</span>
          <span className="text-xl font-mono font-bold text-blue-700 mt-1 block">
            {currentStats.interested}
          </span>
        </div>

        <div className="bg-white border border-rose-200 rounded-lg p-3 text-center shadow-2xs bg-rose-50/30">
          <span className="text-[11px] text-rose-800 uppercase font-semibold block">Not Int.</span>
          <span className="text-xl font-mono font-bold text-rose-700 mt-1 block">
            {currentStats.notInterested}
          </span>
        </div>

        <div className="bg-white border border-purple-200 rounded-lg p-3 text-center shadow-2xs bg-purple-50/30">
          <span className="text-[11px] text-purple-800 uppercase font-semibold block">Appts</span>
          <span className="text-xl font-mono font-bold text-purple-700 mt-1 block">
            {currentStats.appointments}
          </span>
        </div>

        <div className="bg-white border border-teal-200 rounded-lg p-3 text-center shadow-2xs bg-teal-50/30">
          <span className="text-[11px] text-teal-800 uppercase font-semibold block">Converted</span>
          <span className="text-xl font-mono font-bold text-teal-700 mt-1 block">
            {currentStats.converted}
          </span>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Caller Activity Breakdown */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-200">
            <Users className="w-4 h-4 text-neutral-800" />
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              Caller Activity Breakdown
            </h2>
          </div>

          {Object.keys(currentStats.callerCounts).length === 0 ? (
            <p className="text-xs text-neutral-400 py-6 text-center">
              No calls logged for this time range.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(currentStats.callerCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([caller, count]) => {
                  const percentage = currentStats.total > 0
                    ? Math.round((count / currentStats.total) * 100)
                    : 0;

                  return (
                    <div key={caller} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-900">{caller}</span>
                        <span className="font-mono text-neutral-600">
                          {count} calls ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-900 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right Column: Time Breakdown */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
          {reportType === 'daily' && (
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-800" />
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                    Daily Interaction Stream
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  {dailyLogs.length} calls on {selectedDate}
                </span>
              </div>

              {dailyLogs.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">
                  No call logs recorded on this date.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {dailyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-neutral-50 rounded border border-neutral-200 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{log.prospectName}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">#{log.leadId}</span>
                        </div>
                        <p className="text-neutral-600 text-[11px] mt-0.5 line-clamp-2">
                          {log.comment || 'No comment provided'}
                        </p>
                        <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                          Caller: {log.callerName} · {log.companyName}
                        </span>
                      </div>
                      <StatusBadge status={log.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reportType === 'weekly' && (
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-800" />
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                    Calls by Day (Weekly Breakdown)
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Total: {weeklyStats.total}
                </span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(weekDayMap).map(([dayName, { count, dateStr }]) => {
                  const maxDayCount = Math.max(...Object.values(weekDayMap).map((m) => m.count), 1);
                  const barWidth = Math.round((count / maxDayCount) * 100);

                  return (
                    <div key={dayName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-900">
                          {dayName} <span className="text-neutral-400 font-mono font-normal">({dateStr})</span>
                        </span>
                        <span className="font-mono font-bold text-neutral-900">{count} calls</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reportType === 'monthly' && (
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-800" />
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                    Weekly Activity (Monthly Breakdown)
                  </h2>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  {monthYearStr}
                </span>
              </div>

              <div className="space-y-3">
                {monthlyWeeks.map((week) => {
                  const maxWeek = Math.max(...monthlyWeeks.map((w) => w.count), 1);
                  const barWidth = Math.round((week.count / maxWeek) * 100);

                  return (
                    <div key={week.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-900">{week.name}</span>
                        <span className="font-mono font-bold text-neutral-900">{week.count} calls</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
