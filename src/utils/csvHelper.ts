import Papa from 'papaparse';
import { Lead, CallLogEntry } from '../types/crm';

export function exportMasterToCsv(leads: Lead[]): void {
  const data = leads.map((lead) => ({
    'Lead ID': lead.leadId,
    'Prospect Name': lead.clientName,
    'Phone Number': lead.phoneNumber,
    Company: lead.companyName,
    Location: lead.region,
    Designation: lead.designation || '',
    Email: lead.email || '',
    'Current Status': lead.currentStatus,
    'Assigned Caller': lead.assignedCaller || '',
    'Last Call Date': lead.lastCallDate || '',
    'Next Follow-up Date': lead.nextFollowUpDate || '',
    'Number of Attempts': lead.numberOfAttempts,
    'Latest Comment': lead.latestComment || '',
    Campaign: lead.campaignName || '',
    'Response Type': lead.responseType || '',
    Subject: lead.subject || '',
    'LinkedIn URL': lead.personLinkedInUrl || '',
    'Client Response Received': lead.responseReceived || '',
    'Original Email Sent': lead.emailSent || '',
    'Created At': lead.createdAt,
    'Updated At': lead.updatedAt,
  }));

  const csv = Papa.unparse(data);
  downloadCsvFile(csv, `master-database-${getTodayDateString()}.csv`);
}

export function exportCallHistoryToCsv(logs: CallLogEntry[]): void {
  const data = logs.map((log) => ({
    'Log ID': log.id,
    Date: log.date,
    'Caller Name': log.callerName,
    'Lead ID': log.leadId,
    'Prospect Name': log.prospectName,
    'Phone Number': log.phoneNumber,
    Company: log.companyName,
    Status: log.status,
    Comment: log.comment,
    'Next Follow-up Date': log.nextFollowUpDate,
    'Logged At': new Date(log.timestamp).toISOString(),
  }));

  const csv = Papa.unparse(data);
  downloadCsvFile(csv, `call-history-${getTodayDateString()}.csv`);
}

export function exportDailyLogsToCsv(logs: CallLogEntry[], date: string): void {
  const daily = logs.filter((l) => l.date === date);
  const data = daily.map((log) => ({
    Date: log.date,
    'Caller Name': log.callerName,
    'Lead ID': log.leadId,
    'Prospect Name': log.prospectName,
    'Phone Number': log.phoneNumber,
    Company: log.companyName,
    Status: log.status,
    Comment: log.comment,
    'Next Follow-up Date': log.nextFollowUpDate,
  }));

  const csv = Papa.unparse(data);
  downloadCsvFile(csv, `caller-daily-update-${date}.csv`);
}

function downloadCsvFile(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getTodayDateString(): string {
  // Returns 'YYYY-MM-DD'
  // In our simulated environment it is 2026-09-24
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ParseCsvResult {
  newLeads: Lead[];
  errors: string[];
  totalParsed: number;
}

export function parseUploadedCsv(
  csvText: string,
  existingLeads: Lead[]
): Promise<ParseCsvResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const errors: string[] = [];
        const newLeads: Lead[] = [];

        // Find max existing leadId or default to 1000
        let nextLeadId =
          existingLeads.length > 0
            ? Math.max(...existingLeads.map((l) => l.leadId)) + 1
            : 1001;

        if (nextLeadId < 1001) nextLeadId = 1001;

        const rows = results.data;
        if (!rows || rows.length === 0) {
          errors.push('No valid rows found in the uploaded CSV.');
          resolve({ newLeads: [], errors, totalParsed: 0 });
          return;
        }

        const nowIso = new Date().toISOString();

        rows.forEach((row, idx) => {
          // Normalize keys by trimming spaces
          const normalizedRow: Record<string, string> = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[k.trim().toLowerCase()] = row[k] ? row[k].trim() : '';
          });

          // Detect prospect name
          const clientName =
            normalizedRow['client name'] ||
            normalizedRow['prospect name'] ||
            normalizedRow['name'] ||
            normalizedRow['full name'] ||
            normalizedRow['contact'] ||
            '';

          if (!clientName) {
            // Check if row has some other identifiable text
            const firstVal = Object.values(row).find((v) => v && v.trim().length > 0);
            if (!firstVal) return; // Empty row
          }

          const companyName =
            normalizedRow['company name'] ||
            normalizedRow['company'] ||
            normalizedRow['organization'] ||
            '';

          const region =
            normalizedRow['region'] ||
            normalizedRow['location'] ||
            normalizedRow['country'] ||
            normalizedRow['city'] ||
            '';

          const email =
            normalizedRow['email'] ||
            normalizedRow['email address'] ||
            '';

          const phoneNumber =
            normalizedRow['phone number'] ||
            normalizedRow['phone'] ||
            normalizedRow['mobile'] ||
            normalizedRow['contact number'] ||
            '';

          const designation =
            normalizedRow['designation'] ||
            normalizedRow['title'] ||
            normalizedRow['job title'] ||
            normalizedRow['role'] ||
            '';

          const personLinkedInUrl =
            normalizedRow['person linkedin url'] ||
            normalizedRow['linkedin'] ||
            normalizedRow['linkedin url'] ||
            '';

          const campaignName =
            normalizedRow['campaign name'] ||
            normalizedRow['campaign'] ||
            '';

          const responseType =
            normalizedRow['response type'] ||
            normalizedRow['type'] ||
            '';

          const subject =
            normalizedRow['subject'] ||
            normalizedRow['email subject'] ||
            '';

          const responseReceived =
            normalizedRow['response received'] ||
            normalizedRow['response'] ||
            normalizedRow['client response'] ||
            '';

          const originalEmail =
            normalizedRow['original email'] ||
            normalizedRow['initial email'] ||
            '';

          const emailSent =
            normalizedRow['email sent'] ||
            '';

          const newEmail =
            normalizedRow['new email'] ||
            '';

          const sendingStatus =
            normalizedRow['sending status'] ||
            '';

          // Check if an existing Lead ID is provided in CSV, otherwise assign new sequential ID
          const existingIdNum = parseInt(
            normalizedRow['lead id'] || normalizedRow['leadid'] || normalizedRow['id'] || '',
            10
          );

          let assignedLeadId = nextLeadId++;
          if (
            !isNaN(existingIdNum) &&
            existingIdNum >= 1001 &&
            !existingLeads.some((l) => l.leadId === existingIdNum) &&
            !newLeads.some((l) => l.leadId === existingIdNum)
          ) {
            assignedLeadId = existingIdNum;
          }

          const lead: Lead = {
            leadId: assignedLeadId,
            clientName: clientName || `Prospect #${assignedLeadId}`,
            phoneNumber: phoneNumber || '',
            companyName: companyName || '',
            region: region || '',
            designation,
            email,
            personLinkedInUrl,
            campaignName,
            responseType,
            subject,
            responseReceived,
            originalEmail,
            emailSent,
            newEmail,
            sendingStatus,
            assignedCaller: normalizedRow['assigned caller'] || '',
            currentStatus: normalizedRow['current status'] || normalizedRow['status'] || 'Not Called',
            lastCallDate: normalizedRow['last call date'] || '',
            nextFollowUpDate: normalizedRow['next follow-up date'] || normalizedRow['next followup date'] || '',
            numberOfAttempts: parseInt(normalizedRow['number of attempts'] || normalizedRow['attempts'] || '0', 10) || 0,
            latestComment: normalizedRow['latest comment'] || normalizedRow['comment'] || '',
            createdAt: nowIso,
            updatedAt: nowIso,
          };

          newLeads.push(lead);
        });

        resolve({
          newLeads,
          errors,
          totalParsed: newLeads.length,
        });
      },
      error: (err: Error) => {
        resolve({
          newLeads: [],
          errors: [err.message],
          totalParsed: 0,
        });
      },
    });
  });
}
