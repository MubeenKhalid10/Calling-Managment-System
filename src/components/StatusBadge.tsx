import React from 'react';
import { CallStatus } from '../types/crm';

interface StatusBadgeProps {
  status: CallStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  // Return clean, high contrast semantic styling with subtle borders without AI pill clutter
  const getStatusStyles = (s: string) => {
    switch (s) {
      case 'Interested':
        return 'text-emerald-800 bg-emerald-50 border-emerald-300';
      case 'Appointment Booked':
        return 'text-indigo-800 bg-indigo-50 border-indigo-300 font-semibold';
      case 'Converted':
        return 'text-teal-900 bg-teal-100 border-teal-400 font-bold';
      case 'Follow-up':
      case 'Call Back':
        return 'text-amber-800 bg-amber-50 border-amber-300';
      case 'No Answer':
      case 'Busy':
        return 'text-slate-700 bg-slate-100 border-slate-300';
      case 'Not Interested':
        return 'text-rose-800 bg-rose-50 border-rose-300';
      case 'Wrong Number':
      case 'Do Not Call':
        return 'text-red-900 bg-red-100 border-red-300';
      case 'Not Called':
      default:
        return 'text-neutral-600 bg-neutral-100 border-neutral-300';
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-medium whitespace-nowrap ${sizeClasses} ${getStatusStyles(
        status
      )}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'Interested' || status === 'Appointment Booked' || status === 'Converted'
            ? 'bg-emerald-600'
            : status === 'Follow-up' || status === 'Call Back'
            ? 'bg-amber-500'
            : status === 'Not Interested' || status === 'Do Not Call'
            ? 'bg-red-500'
            : 'bg-neutral-400'
        }`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
};
