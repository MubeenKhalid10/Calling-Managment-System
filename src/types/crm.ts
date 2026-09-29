export type CallStatus =
  | 'Not Called'
  | 'No Answer'
  | 'Busy'
  | 'Call Back'
  | 'Interested'
  | 'Not Interested'
  | 'Follow-up'
  | 'Appointment Booked'
  | 'Converted'
  | 'Wrong Number'
  | 'Do Not Call';

export interface Lead {
  leadId: number; // Unique sequential starting from 1001, permanent
  clientName: string; // Prospect Name
  phoneNumber: string; // Phone Number
  companyName: string; // Company
  region: string; // Location
  position?: string; // Job Title / Position
  designation?: string; // Backwards compatible alias
  email?: string;
  personLinkedInUrl?: string;
  campaignName?: string;
  responseType?: string;
  subject?: string;
  newEmail?: string;
  sendingStatus?: string;
  originalEmail?: string;
  emailSent?: string;
  responseReceived?: string; // Original client response from CSV

  // CRM Calling Tracking fields
  assignedCaller: string;
  currentStatus: CallStatus | string;
  lastCallDate: string; // YYYY-MM-DD or DD-MMM-YYYY
  nextFollowUpDate: string; // YYYY-MM-DD or DD-MMM-YYYY
  numberOfAttempts: number;
  latestComment: string;
  latestSummary?: string; // 1-3 sentence summary of complete interaction journey

  // Untouched raw input fields preserved from imported CSV/XLSX
  rawOriginalData?: Record<string, any>;

  createdAt: string;
  updatedAt: string;

  // Soft deletion support
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface CallLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  callerName: string;
  leadId: number;
  prospectName: string;
  phoneNumber: string;
  companyName: string;
  status: CallStatus | string;
  comment: string;
  nextFollowUpDate: string;
  timestamp: number;
}

export type SheetView = 'dashboard' | 'needs_to_call' | 'master' | 'daily_update' | 'history' | 'activity' | 'reports';
