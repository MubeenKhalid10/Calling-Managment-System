import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Lead, CallStatus } from '../types/crm';
import { generateLeadSummary } from './summaryHelper';

export interface FieldMapping {
  clientName: string;
  companyName: string;
  position: string;
  phoneNumber: string;
  region: string;
  email: string;
  latestComment: string;
  leadId: string;
}

export interface RawFileAnalysis {
  fileName: string;
  headers: string[];
  rawRows: Record<string, string>[];
  hasConfidentHeaders: boolean;
  detectedMapping: FieldMapping;
  sampleRows: Record<string, string>[];
  totalRows: number;
}

export interface ImportExecutionResult {
  addedLeads: Lead[];
  updatedLeads: Lead[];
  totalImported: number;
  duplicateCount: number;
  errors: string[];
}

/**
 * Normalizes phone numbers by stripping non-digits to accurately compare for duplicates.
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Checks if a string looks like a phone number based on regex & digit count.
 */
function isLikelyPhone(val: string): boolean {
  const digits = val.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15 && /[0-9]/.test(val);
}

/**
 * Checks if a string looks like an email.
 */
function isLikelyEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

/**
 * Checks if a string looks like a job title / position.
 */
const POSITION_KEYWORDS = [
  'ceo', 'cto', 'cfo', 'coo', 'founder', 'co-founder', 'director', 'manager',
  'president', 'vp', 'vice president', 'head', 'lead', 'officer', 'executive',
  'partner', 'consultant', 'engineer', 'developer', 'specialist', 'associate',
  'supervisor', 'owner', 'principal', 'coordinator', 'analyst', 'strategist'
];

function isLikelyPosition(val: string): boolean {
  const lower = val.toLowerCase().trim();
  if (lower.length > 50) return false;
  return POSITION_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lower);
  });
}

/**
 * Analyzes a raw file (CSV or XLSX) and detects columns using header text + data heuristics.
 */
export async function analyzeRawFile(file: File): Promise<RawFileAnalysis> {
  const fileName = file.name;
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  let rawRows: Record<string, string>[] = [];
  let headers: string[] = [];

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Read as array of arrays first to inspect header row
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawMatrix.length === 0) {
      throw new Error('The uploaded Excel file appears to be empty.');
    }

    // Determine if row 0 has headers or raw data
    const row0 = rawMatrix[0].map((v) => String(v || '').trim());
    const hasHeaderRow = row0.some((cell) =>
      /name|phone|company|title|role|city|email|comment|status|id|prospect/i.test(cell)
    );

    if (hasHeaderRow) {
      headers = row0.map((h, i) => h || `Column_${i + 1}`);
      for (let r = 1; r < rawMatrix.length; r++) {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = String(rawMatrix[r][colIdx] || '').trim();
        });
        rawRows.push(rowObj);
      }
    } else {
      // Headerless Excel: synthesize Col A, Col B, etc.
      headers = row0.map((_, i) => `Column_${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`);
      for (let r = 0; r < rawMatrix.length; r++) {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = String(rawMatrix[r][colIdx] || '').trim();
        });
        rawRows.push(rowObj);
      }
    }
  } else {
    // CSV file parsing
    const text = await file.text();
    const parsed = Papa.parse<any[]>(text, {
      skipEmptyLines: 'greedy',
    });

    const matrix = parsed.data;
    if (!matrix || matrix.length === 0) {
      throw new Error('The uploaded CSV file appears to be empty.');
    }

    const row0 = (matrix[0] || []).map((v: any) => String(v || '').trim());
    const hasHeaderRow = row0.some((cell: string) =>
      /name|phone|company|title|role|city|email|comment|status|id|prospect/i.test(cell)
    );

    if (hasHeaderRow) {
      headers = row0.map((h: string, i: number) => h || `Column_${i + 1}`);
      for (let r = 1; r < matrix.length; r++) {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = String(matrix[r][colIdx] || '').trim();
        });
        rawRows.push(rowObj);
      }
    } else {
      // Headerless CSV
      headers = row0.map((_: any, i: number) => `Column_${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`);
      for (let r = 0; r < matrix.length; r++) {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = String(matrix[r][colIdx] || '').trim();
        });
        rawRows.push(rowObj);
      }
    }
  }

  // Detect column mapping using header text + data heuristics
  const sampleRows = rawRows.slice(0, 10);
  const detectedMapping: FieldMapping = {
    clientName: '',
    companyName: '',
    position: '',
    phoneNumber: '',
    region: '',
    email: '',
    latestComment: '',
    leadId: '',
  };

  const scores: Record<keyof FieldMapping, { col: string; score: number }[]> = {
    clientName: [],
    companyName: [],
    position: [],
    phoneNumber: [],
    region: [],
    email: [],
    latestComment: [],
    leadId: [],
  };

  for (const col of headers) {
    const colLower = col.toLowerCase().trim();
    const sampleValues = sampleRows.map((r) => r[col] || '').filter(Boolean);

    // 1. Prospect Name
    let nameScore = 0;
    if (/^(prospect|contact\s*name|client\s*name|full\s*name|name|person)$/i.test(colLower)) nameScore += 60;
    else if (/name/i.test(colLower) && !/company|campaign/i.test(colLower)) nameScore += 40;
    if (sampleValues.some((v) => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(v))) nameScore += 25;
    scores.clientName.push({ col, score: nameScore });

    // 2. Company
    let companyScore = 0;
    if (/^(company|company\s*name|organization|organisation|business|firm|employer)$/i.test(colLower)) companyScore += 60;
    else if (/company|org/i.test(colLower)) companyScore += 35;
    if (sampleValues.some((v) => /\b(inc|llc|ltd|technologies|solutions|group|real estate|corp|services|enterprises)\b/i.test(v))) companyScore += 25;
    scores.companyName.push({ col, score: companyScore });

    // 3. Position / Job Title
    let posScore = 0;
    if (/^(job\s*title|designation|title|position|role|job)$/i.test(colLower)) posScore += 60;
    else if (/title|role|pos/i.test(colLower)) posScore += 35;
    if (sampleValues.some((v) => isLikelyPosition(v))) posScore += 30;
    scores.position.push({ col, score: posScore });

    // 4. Phone Number
    let phoneScore = 0;
    if (/^(phone|phone\s*number|mobile|telephone|cell|contact\s*number|tel)$/i.test(colLower)) phoneScore += 60;
    else if (/phone|mobile|tel/i.test(colLower)) phoneScore += 40;
    if (sampleValues.some((v) => isLikelyPhone(v))) phoneScore += 35;
    scores.phoneNumber.push({ col, score: phoneScore });

    // 5. Region / Location
    let locScore = 0;
    if (/^(location|city|country|region|state|address|territory)$/i.test(colLower)) locScore += 60;
    else if (/loc|city|region/i.test(colLower)) locScore += 35;
    if (sampleValues.some((v) => /\b(dubai|uae|usa|uk|canada|london|york|saudi|riyadh|ontario|doha)\b/i.test(v))) locScore += 25;
    scores.region.push({ col, score: locScore });

    // 6. Email
    let emailScore = 0;
    if (/^(email|email\s*address|e-mail)$/i.test(colLower)) emailScore += 60;
    else if (/email/i.test(colLower)) emailScore += 40;
    if (sampleValues.some((v) => isLikelyEmail(v))) emailScore += 40;
    scores.email.push({ col, score: emailScore });

    // 7. Latest Comment / Notes
    let commentScore = 0;
    if (/^(comments?|notes?|call\s*notes?|previous\s*comments?|history|response\s*received|latest\s*comment)$/i.test(colLower)) commentScore += 60;
    else if (/comment|note|history|response/i.test(colLower)) commentScore += 35;
    if (sampleValues.some((v) => v.length > 25 && /[\.\,\s]/.test(v))) commentScore += 20;
    scores.latestComment.push({ col, score: commentScore });

    // 8. Lead ID
    let idScore = 0;
    if (/^(lead\s*id|leadid|prospect\s*id|id)$/i.test(colLower)) idScore += 60;
    if (sampleValues.some((v) => /^\d{4,6}$/.test(v.trim()))) idScore += 25;
    scores.leadId.push({ col, score: idScore });
  }

  // Assign best non-overlapping column for each field
  const assignedCols = new Set<string>();

  const fieldsPriority: (keyof FieldMapping)[] = [
    'phoneNumber',
    'email',
    'clientName',
    'companyName',
    'position',
    'leadId',
    'latestComment',
    'region',
  ];

  for (const field of fieldsPriority) {
    const candidates = scores[field]
      .filter((c) => !assignedCols.has(c.col) && c.score >= 25)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      detectedMapping[field] = candidates[0].col;
      assignedCols.add(candidates[0].col);
    }
  }

  // Check if we have confidence in name and phone
  const hasConfidentHeaders = Boolean(detectedMapping.clientName || detectedMapping.phoneNumber);

  return {
    fileName,
    headers,
    rawRows,
    hasConfidentHeaders,
    detectedMapping,
    sampleRows,
    totalRows: rawRows.length,
  };
}

/**
 * Executes import with automatic duplicate detection and data preservation.
 */
export function executeImportWithDeduplication(params: {
  rawRows: Record<string, string>[];
  mapping: FieldMapping;
  existingLeads: Lead[];
}): ImportExecutionResult {
  const { rawRows, mapping, existingLeads } = params;

  const addedLeads: Lead[] = [];
  const updatedLeads: Lead[] = [];
  const errors: string[] = [];

  // Index existing leads for fast lookup
  const leadsByPhone = new Map<string, Lead>();
  const leadsByEmail = new Map<string, Lead>();
  const leadsByNameCompany = new Map<string, Lead>();
  const leadsById = new Map<number, Lead>();

  for (const l of existingLeads) {
    const normP = normalizePhone(l.phoneNumber);
    if (normP) leadsByPhone.set(normP, l);
    if (l.email) leadsByEmail.set(l.email.toLowerCase().trim(), l);
    const key = `${l.clientName.toLowerCase().trim()}|${l.companyName.toLowerCase().trim()}`;
    leadsByNameCompany.set(key, l);
    leadsById.set(l.leadId, l);
  }

  // Next sequential ID
  let nextLeadId =
    existingLeads.length > 0
      ? Math.max(...existingLeads.map((l) => l.leadId), 1000) + 1
      : 1001;

  const nowIso = new Date().toISOString();

  for (const row of rawRows) {
    const rawName = (mapping.clientName ? row[mapping.clientName] : '')?.trim() || '';
    const rawCompany = (mapping.companyName ? row[mapping.companyName] : '')?.trim() || '';
    const rawPosition = (mapping.position ? row[mapping.position] : '')?.trim() || '';
    const rawPhone = (mapping.phoneNumber ? row[mapping.phoneNumber] : '')?.trim() || '';
    const rawRegion = (mapping.region ? row[mapping.region] : '')?.trim() || '';
    const rawEmail = (mapping.email ? row[mapping.email] : '')?.trim() || '';
    const rawComment = (mapping.latestComment ? row[mapping.latestComment] : '')?.trim() || '';
    const rawIdStr = (mapping.leadId ? row[mapping.leadId] : '')?.trim() || '';
    const parsedId = parseInt(rawIdStr, 10);

    // Skip totally blank rows
    if (!rawName && !rawPhone && !rawCompany) {
      continue;
    }

    // 1. DUPLICATE DETECTION CHECK
    const normPhone = normalizePhone(rawPhone);
    const normEmail = rawEmail.toLowerCase();
    const nameCompKey = `${rawName.toLowerCase()}|${rawCompany.toLowerCase()}`;

    let match: Lead | undefined;

    if (!isNaN(parsedId) && leadsById.has(parsedId)) {
      match = leadsById.get(parsedId);
    } else if (normPhone && leadsByPhone.has(normPhone)) {
      match = leadsByPhone.get(normPhone);
    } else if (normEmail && leadsByEmail.has(normEmail)) {
      match = leadsByEmail.get(normEmail);
    } else if (rawName && rawCompany && leadsByNameCompany.has(nameCompKey)) {
      match = leadsByNameCompany.get(nameCompKey);
    }

    if (match) {
      // DUPLICATE FOUND: ENRICH EXISTING RECORD WITHOUT OVERWRITING CALL HISTORY
      const enriched: Lead = {
        ...match,
        // Only enrich empty fields, don't overwrite user changes
        clientName: match.clientName || rawName,
        companyName: match.companyName || rawCompany,
        position: match.position || rawPosition || match.designation,
        designation: match.designation || rawPosition,
        phoneNumber: match.phoneNumber || rawPhone,
        region: match.region || rawRegion,
        email: match.email || rawEmail,
        // Preserve untouched raw record
        rawOriginalData: {
          ...(match.rawOriginalData || {}),
          ...row,
        },
        // If the imported row has a new comment, update latestComment if empty
        latestComment: match.latestComment || rawComment,
        updatedAt: nowIso,
      };

      // Generate or update latestSummary if none exists or new info added
      if (!enriched.latestSummary && rawComment) {
        enriched.latestSummary = generateLeadSummary({
          currentStatus: enriched.currentStatus,
          latestComment: rawComment,
          allComments: [rawComment],
        });
      }

      updatedLeads.push(enriched);
      // Update in lookup maps
      leadsById.set(enriched.leadId, enriched);
    } else {
      // NEW CONTACT: CREATE FRESH RECORD
      const assignedId = !isNaN(parsedId) && parsedId >= 1001 && !leadsById.has(parsedId)
        ? parsedId
        : nextLeadId++;

      const initialSummary = rawComment
        ? generateLeadSummary({
            currentStatus: 'Not Called',
            latestComment: rawComment,
            allComments: [rawComment],
          })
        : 'New prospect. No calls made yet.';

      const newLead: Lead = {
        leadId: assignedId,
        clientName: rawName || `Prospect #${assignedId}`,
        companyName: rawCompany || '',
        position: rawPosition,
        designation: rawPosition,
        phoneNumber: rawPhone,
        region: rawRegion,
        email: rawEmail,
        assignedCaller: '',
        currentStatus: 'Not Called',
        lastCallDate: '',
        nextFollowUpDate: '',
        numberOfAttempts: 0,
        latestComment: rawComment,
        latestSummary: initialSummary,
        rawOriginalData: row, // Preserve 100% of raw fields!
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      addedLeads.push(newLead);
      leadsById.set(assignedId, newLead);
      if (normPhone) leadsByPhone.set(normPhone, newLead);
      if (normEmail) leadsByEmail.set(normEmail, newLead);
      if (rawName && rawCompany) leadsByNameCompany.set(nameCompKey, newLead);
    }
  }

  return {
    addedLeads,
    updatedLeads,
    totalImported: addedLeads.length + updatedLeads.length,
    duplicateCount: updatedLeads.length,
    errors,
  };
}
