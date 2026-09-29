import React from 'react';
import {
  BookOpen,
  X,
  Database,
  PhoneCall,
  History,
  BarChart3,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface SystemUsageGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemUsageGuideModal: React.FC<SystemUsageGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-neutral-800" />
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              Calling Management System — Standard Operating Procedure
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto leading-relaxed">
          {/* Section 1: Overview */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3.5">
            <h3 className="font-bold text-blue-950 text-sm mb-1">
              System Architecture & Data Flow
            </h3>
            <p className="text-blue-900">
              The system operates on <strong>2 Core Sheets</strong> with automated synchronization and a permanent audit trail:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-medium text-[11px]">
              <div className="bg-white p-2 rounded border border-blue-200">
                <span className="font-bold text-neutral-900 block">Sheet 1: Master Database</span>
                Permanent master list of all prospects. Every prospect has an immutable sequential Lead ID starting at 1001.
              </div>
              <div className="bg-white p-2 rounded border border-blue-200">
                <span className="font-bold text-neutral-900 block">Sheet 2: Caller Daily Update</span>
                Fast cold caller workstation. Entering a Lead ID automatically retrieves Prospect Name and Phone.
              </div>
            </div>
          </div>

          {/* Section 2: Caller Daily Workflow */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-neutral-700" />
              <span>Caller Daily Workflow (11 Simple Steps)</span>
            </h3>
            <ol className="space-y-1.5 list-decimal list-inside text-neutral-700 pl-1">
              <li>
                <strong>Open Sheet 2:</strong> Go to &ldquo;Sheet 2: Caller Daily Update&rdquo; tab or click &ldquo;Call Now&rdquo; next to any lead in Sheet 1.
              </li>
              <li>
                <strong>Select Caller Name:</strong> Pick your name from the dropdown (e.g. Ali, Sarah, Sohail). You can also add your name if new.
              </li>
              <li>
                <strong>Confirm Date:</strong> Date defaults to today (e.g. 24-Sep-2026).
              </li>
              <li>
                <strong>Enter Lead ID:</strong> Type the Lead ID (e.g. <code>1001</code>).
              </li>
              <li>
                <strong>Auto-Lookup:</strong> The system automatically retrieves and displays the <strong>Prospect Name</strong> and <strong>Phone Number</strong>. You do NOT manually type them!
              </li>
              <li>
                <strong>Verification:</strong> If an invalid Lead ID is entered, a clear error appears and submission is blocked to protect data safety.
              </li>
              <li>
                <strong>Make the Call:</strong> Click the phone icon or dial the retrieved number directly.
              </li>
              <li>
                <strong>Select Status:</strong> Choose disposition (Not Called, No Answer, Busy, Call Back, Interested, Not Interested, Follow-up, Appointment Booked, Converted, Wrong Number, Do Not Call).
              </li>
              <li>
                <strong>Enter Comment:</strong> Write notes from the conversation (e.g. &ldquo;Asked for more information&rdquo;).
              </li>
              <li>
                <strong>Enter Follow-up Date:</strong> If scheduled for a future call, select the date.
              </li>
              <li>
                <strong>Click SUBMIT / SAVE UPDATE:</strong> The system immediately updates Sheet 1 Master Database and records a permanent entry in Call History.
              </li>
            </ol>
          </div>

          {/* Section 3: Synchronization Rules */}
          <div className="pt-3 border-t border-neutral-200">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Automated Master Database Synchronization</span>
            </h3>
            <p className="text-neutral-600 mb-2">
              When a caller submits an interaction for Lead <code>#1001</code>:
            </p>
            <div className="bg-neutral-50 p-3 rounded border border-neutral-200 font-mono text-[11px] space-y-1 text-neutral-800">
              <p>• Current Status &rarr; updated to submitted status</p>
              <p>• Last Call Date &rarr; updated to call date</p>
              <p>• Next Follow-up Date &rarr; updated to scheduled follow-up</p>
              <p>• Latest Comment &rarr; updated to new comment</p>
              <p>• Number of Attempts &rarr; previous attempts + 1</p>
              <p>• Assigned Caller &rarr; assigned to the active caller</p>
              <p>• Call History &rarr; permanent timestamped record added without losing prior calls</p>
            </div>
          </div>

          {/* Section 4: Team Cloud Synchronization */}
          <div className="pt-3 border-t border-neutral-200">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Team Cloud Access & Real-Time Sync</span>
            </h3>
            <p className="text-neutral-600 mb-2">
              This system is connected to <strong>Firebase Cloud Firestore</strong>, enabling real-time collaboration across all team members:
            </p>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2.5 text-emerald-950 font-sans text-[11px] space-y-1">
              <p>• <strong>Instant Multi-User Sync:</strong> When any cold caller submits a call update, Sheet 1 and Call History update on all team members&apos; screens simultaneously without page refresh.</p>
              <p>• <strong>Shared Master Database:</strong> All callers work off the same live prospect list, preventing duplicate calls or conflicting changes.</p>
              <p>• <strong>Device Independent:</strong> Any teammate can access the app from their laptop or workstation and stay 100% in sync.</p>
            </div>
          </div>

          {/* Section 5: CSV Fields Preserved */}
          <div className="pt-3 border-t border-neutral-200">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-neutral-700" />
              <span>Original CSV Fields Mapped & Preserved</span>
            </h3>
            <p className="text-neutral-600 mb-2">
              All 14 original columns from your uploaded CSV are preserved without loss:
            </p>
            <div className="grid grid-cols-2 gap-2 text-neutral-700 font-mono text-[10px]">
              <div>• Client Name &rarr; Prospect Name</div>
              <div>• Company Name &rarr; Company</div>
              <div>• Region &rarr; Location</div>
              <div>• Designation &rarr; Job Title</div>
              <div>• Email &rarr; Direct Email</div>
              <div>• LinkedIn URL &rarr; Person LinkedIn</div>
              <div>• Campaign Name &rarr; Campaign</div>
              <div>• Response Type &rarr; Outreach Tier</div>
              <div>• Response Received &rarr; Prospect Quote</div>
              <div>• Original/New Email &rarr; Email Copy</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
