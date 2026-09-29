import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Lead, CallLogEntry, CallStatus, SheetView } from '../types/crm';
import {
  INITIAL_LEADS,
  INITIAL_CALL_HISTORY,
  INITIAL_CALLERS,
  INITIAL_STATUSES,
} from '../data/initialData';
import { generateLeadSummary } from '../utils/summaryHelper';
import { db } from '../firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

export type CloudSyncStatus = 'connecting' | 'connected' | 'syncing' | 'offline' | 'error';

export interface CreateContactParams {
  name: string;
  company: string;
  position?: string;
  phoneNumber: string;
  email?: string;
  location?: string;
  status?: CallStatus | string;
  nextCallDate?: string;
  notes?: string;
  callerName?: string;
}

interface CallingSystemContextType {
  leads: Lead[]; // Active leads (isDeleted !== true)
  allLeads: Lead[]; // All leads including soft-deleted
  deletedLeads: Lead[]; // Soft-deleted leads only
  callHistory: CallLogEntry[];
  callers: string[];
  statuses: string[];
  currentView: SheetView;
  setCurrentView: (view: SheetView) => void;
  selectedLeadForModal: Lead | null;
  setSelectedLeadForModal: (lead: Lead | null) => void;
  prefilledLeadIdForDailyUpdate: number | null;
  setPrefilledLeadIdForDailyUpdate: (id: number | null) => void;

  // Cloud status
  cloudSyncStatus: CloudSyncStatus;
  lastSyncedAt: Date | null;
  isFirebaseActive: boolean;

  // Actions
  getLeadById: (leadId: number) => Lead | undefined;
  createContact: (params: CreateContactParams) => Promise<{ success: boolean; lead?: Lead; error?: string }>;
  updateLead: (leadId: number, updates: Partial<Lead>) => Promise<{ success: boolean; lead?: Lead; error?: string }>;
  deleteLead: (leadId: number) => Promise<{ success: boolean; error?: string }>;
  restoreLead: (leadId: number) => Promise<{ success: boolean; error?: string }>;
  deleteAllLeads: (leadIds?: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  restoreAllLeads: (leadIds?: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  purgeAllDeletedLeads: (leadIds?: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  submitDailyCallUpdate: (params: {
    leadId: number;
    callerName: string;
    date: string;
    status: CallStatus | string;
    comment: string;
    nextFollowUpDate: string;
  }) => Promise<{ success: boolean; error?: string; lead?: Lead }>;
  importLeads: (newLeads: Lead[], updatedLeads?: Lead[]) => Promise<void>;
  resetToDefaultData: () => Promise<void>;
  addCaller: (name: string) => Promise<{ success: boolean; error?: string }>;
  updateCaller: (oldName: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  deleteCaller: (name: string, reassignTo?: string) => Promise<{ success: boolean; error?: string }>;
  addStatus: (status: string) => Promise<void>;
  removeStatus: (status: string) => Promise<void>;
  deleteCallLog: (logId: string) => Promise<{ success: boolean; error?: string }>;
}

const CallingSystemContext = createContext<CallingSystemContextType | undefined>(
  undefined
);

const STORAGE_KEY_LEADS = 'calling_crm_leads_v2';
const STORAGE_KEY_HISTORY = 'calling_crm_history_v2';
const STORAGE_KEY_CALLERS = 'calling_crm_callers_v2';
const STORAGE_KEY_STATUSES = 'calling_crm_statuses_v2';

// Helper to remove undefined properties which are not permitted by Firestore
function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export const CallingSystemProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Master leads list in state
  const [rawLeads, setRawLeads] = useState<Lead[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LEADS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<number, Lead>();
          for (const item of parsed) {
            if (item && typeof item.leadId === 'number') {
              map.set(item.leadId, item);
            }
          }
          return Array.from(map.values());
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_LEADS;
  });

  const [callHistory, setCallHistory] = useState<CallLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const map = new Map<string, CallLogEntry>();
          for (const item of parsed) {
            if (item && item.id) {
              map.set(item.id, item);
            }
          }
          return Array.from(map.values());
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_CALL_HISTORY;
  });

  const [callers, setCallers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CALLERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_CALLERS;
  });

  const [statuses, setStatuses] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATUSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_STATUSES;
  });

  const [currentView, setCurrentView] = useState<SheetView>('dashboard');
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null);
  const [prefilledLeadIdForDailyUpdate, setPrefilledLeadIdForDailyUpdate] = useState<number | null>(null);

  // Cloud sync state
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('connecting');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isFirebaseActive = true;
  const isInitialSeedingRef = useRef(false);

  // Active leads filter: excludes soft-deleted contacts
  const leads = useMemo(() => {
    return rawLeads.filter((l) => !l.isDeleted);
  }, [rawLeads]);

  // Soft-deleted leads
  const deletedLeads = useMemo(() => {
    return rawLeads.filter((l) => l.isDeleted);
  }, [rawLeads]);

  // Persist to local storage as fallback and cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(rawLeads));
    } catch {
      // Ignore storage quota errors
    }
  }, [rawLeads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(callHistory));
    } catch {
      // Ignore
    }
  }, [callHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CALLERS, JSON.stringify(callers));
    } catch {
      // Ignore
    }
  }, [callers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATUSES, JSON.stringify(statuses));
    } catch {
      // Ignore
    }
  }, [statuses]);

  // Seed initial data to Firestore if collection is empty
  const seedInitialFirestoreData = useCallback(async () => {
    if (isInitialSeedingRef.current) return;
    isInitialSeedingRef.current = true;

    try {
      setCloudSyncStatus('syncing');
      const batch = writeBatch(db);
      for (const lead of INITIAL_LEADS) {
        const docRef = doc(db, 'leads', String(lead.leadId));
        batch.set(docRef, cleanForFirestore(lead));
      }
      for (const log of INITIAL_CALL_HISTORY) {
        const logRef = doc(db, 'callLogs', log.id);
        batch.set(logRef, cleanForFirestore(log));
      }
      const settingsRef = doc(db, 'settings', 'config');
      batch.set(settingsRef, {
        callers: INITIAL_CALLERS,
        statuses: INITIAL_STATUSES,
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Failed to seed initial Firestore data:', err);
      setCloudSyncStatus('connected');
    } finally {
      isInitialSeedingRef.current = false;
    }
  }, []);

  // Set up real-time Firestore listeners
  useEffect(() => {
    setCloudSyncStatus('connecting');

    // 1. Leads Listener (Master Database)
    const leadsCol = collection(db, 'leads');
    const unsubscribeLeads = onSnapshot(
      leadsCol,
      (snapshot) => {
        if (snapshot.empty) {
          seedInitialFirestoreData();
        } else {
          const map = new Map<number, Lead>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Lead;
            if (data && typeof data.leadId === 'number') {
              map.set(data.leadId, data);
            }
          });
          const remoteLeads = Array.from(map.values());
          remoteLeads.sort((a, b) => a.leadId - b.leadId);
          setRawLeads(remoteLeads);
          setCloudSyncStatus('connected');
          setLastSyncedAt(new Date());
        }
      },
      (error) => {
        console.warn('Leads snapshot listener note:', error);
        setCloudSyncStatus('offline');
      }
    );

    // 2. Call Logs Listener (Call History)
    const historyCol = collection(db, 'callLogs');
    const unsubscribeHistory = onSnapshot(
      historyCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, CallLogEntry>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as CallLogEntry;
            if (data && data.id) {
              map.set(data.id, data);
            }
          });
          const remoteHistory = Array.from(map.values());
          remoteHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setCallHistory(remoteHistory);
        }
      },
      (error) => {
        console.warn('History snapshot listener note:', error);
      }
    );

    // 3. Settings Listener (Callers & Statuses)
    const configDoc = doc(db, 'settings', 'config');
    const unsubscribeSettings = onSnapshot(
      configDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.callers) && data.callers.length > 0) {
            setCallers(data.callers);
          }
          if (Array.isArray(data.statuses) && data.statuses.length > 0) {
            setStatuses(data.statuses);
          }
        }
      },
      (error) => {
        console.warn('Settings snapshot listener note:', error);
      }
    );

    return () => {
      unsubscribeLeads();
      unsubscribeHistory();
      unsubscribeSettings();
    };
  }, [seedInitialFirestoreData]);

  // Keep selectedLeadForModal in sync with latest state
  useEffect(() => {
    if (selectedLeadForModal) {
      const fresh = rawLeads.find((l) => l.leadId === selectedLeadForModal.leadId);
      if (fresh) {
        setSelectedLeadForModal(fresh);
      }
    }
  }, [rawLeads]);

  const getLeadById = (leadId: number): Lead | undefined => {
    return rawLeads.find((l) => l.leadId === leadId);
  };

  /**
   * MANUAL CONTACT CREATION:
   * Saves to Firestore database first.
   * Generates sequential permanent Lead ID.
   * On success: adds to leads, records initial note/call history if given.
   */
  const createContact = async (
    params: CreateContactParams
  ): Promise<{ success: boolean; lead?: Lead; error?: string }> => {
    // 1. Frontend validation
    const name = params.name?.trim();
    const company = params.company?.trim();
    const phone = params.phoneNumber?.trim();

    if (!name) {
      return { success: false, error: 'Prospect name is required.' };
    }
    if (!company) {
      return { success: false, error: 'Company name is required.' };
    }
    if (!phone) {
      return { success: false, error: 'Phone number is required.' };
    }

    // 2. Generate permanent unique sequential Lead ID
    const existingIds = rawLeads.map((l) => l.leadId);
    const nextId = (existingIds.length > 0 ? Math.max(...existingIds) : 1000) + 1;

    const assignedCaller = params.callerName?.trim() || callers[0] || 'Ali';
    const status = params.status || 'Not Called';
    const hasNotes = Boolean(params.notes && params.notes.trim().length > 0);
    const todayStr = '2026-09-24';

    let summary = '';
    if (hasNotes) {
      summary = generateLeadSummary({
        currentStatus: status,
        latestComment: params.notes!.trim(),
        nextFollowUpDate: params.nextCallDate?.trim() || '',
      });
    }

    const newLead: Lead = {
      leadId: nextId,
      clientName: name,
      phoneNumber: phone,
      companyName: company,
      position: params.position?.trim() || '',
      designation: params.position?.trim() || '',
      email: params.email?.trim() || '',
      region: params.location?.trim() || '',
      assignedCaller,
      currentStatus: status,
      lastCallDate: hasNotes ? todayStr : '',
      nextFollowUpDate: params.nextCallDate?.trim() || '',
      numberOfAttempts: hasNotes ? 1 : 0,
      latestComment: params.notes?.trim() || '',
      latestSummary: summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    // If initial notes are provided, also record an initial CallLogEntry
    let logEntry: CallLogEntry | null = null;
    if (hasNotes) {
      logEntry = {
        id: `log-${nextId}-${Date.now()}`,
        date: todayStr,
        callerName: assignedCaller,
        leadId: nextId,
        prospectName: name,
        phoneNumber: phone,
        companyName: company,
        status,
        comment: params.notes!.trim(),
        nextFollowUpDate: params.nextCallDate?.trim() || '',
        timestamp: Date.now(),
      };
    }

    // 3. Save to actual Firestore Database BEFORE claiming success
    try {
      setCloudSyncStatus('syncing');
      const batch = writeBatch(db);
      batch.set(doc(db, 'leads', String(nextId)), cleanForFirestore(newLead));
      if (logEntry) {
        batch.set(doc(db, 'callLogs', logEntry.id), cleanForFirestore(logEntry));
      }
      await batch.commit();

      // 4. Update UI state from confirmed database response
      setRawLeads((prev) => {
        const map = new Map<number, Lead>();
        for (const item of prev) map.set(item.leadId, item);
        map.set(newLead.leadId, newLead);
        return Array.from(map.values());
      });
      if (logEntry) {
        setCallHistory((prev) => {
          const map = new Map<string, CallLogEntry>();
          map.set(logEntry.id, logEntry);
          for (const item of prev) {
            if (!map.has(item.id)) map.set(item.id, item);
          }
          return Array.from(map.values());
        });
      }
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true, lead: newLead };
    } catch (err) {
      console.error('Firestore create contact error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to save contact to database. Please try again.' };
    }
  };

  /**
   * EDIT CONTACT:
   * Updates existing record in database. Lead ID stays strictly immutable.
   */
  const updateLead = async (
    leadId: number,
    updates: Partial<Lead>
  ): Promise<{ success: boolean; lead?: Lead; error?: string }> => {
    const existing = rawLeads.find((l) => l.leadId === leadId);
    if (!existing) {
      return { success: false, error: `Contact #${leadId} not found.` };
    }

    let latestSummary = updates.latestSummary || existing.latestSummary;
    if (
      updates.latestComment &&
      updates.latestComment !== existing.latestComment &&
      !updates.latestSummary
    ) {
      latestSummary = generateLeadSummary({
        existingSummary: existing.latestSummary,
        currentStatus: updates.currentStatus || existing.currentStatus,
        latestComment: updates.latestComment,
        nextFollowUpDate: updates.nextFollowUpDate || existing.nextFollowUpDate,
        callLogs: callHistory.filter((l) => l.leadId === leadId),
      });
    }

    const updated: Lead = {
      ...existing,
      ...updates,
      latestSummary,
      leadId: existing.leadId, // Permanent
      updatedAt: new Date().toISOString(),
    };

    try {
      setCloudSyncStatus('syncing');
      await setDoc(doc(db, 'leads', String(leadId)), cleanForFirestore(updated), { merge: true });

      setRawLeads((prev) => prev.map((l) => (l.leadId === leadId ? updated : l)));
      if (selectedLeadForModal?.leadId === leadId) {
        setSelectedLeadForModal(updated);
      }
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true, lead: updated };
    } catch (err) {
      console.error('Firestore lead update error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to update contact. Please try again.' };
    }
  };

  /**
   * DELETE CONTACT (Soft Delete):
   * Marks isDeleted = true and deletedAt timestamp in database.
   * Historical call records and analytics remain fully intact!
   */
  const deleteLead = async (
    leadId: number
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = rawLeads.find((l) => l.leadId === leadId);
    if (!existing) {
      return { success: false, error: `Contact #${leadId} not found.` };
    }

    const softDeleted: Lead = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setCloudSyncStatus('syncing');
      await setDoc(doc(db, 'leads', String(leadId)), cleanForFirestore(softDeleted), { merge: true });

      setRawLeads((prev) => prev.map((l) => (l.leadId === leadId ? softDeleted : l)));
      if (selectedLeadForModal?.leadId === leadId) {
        setSelectedLeadForModal(null);
      }
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true };
    } catch (err) {
      console.error('Firestore delete contact error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to delete contact. Please try again.' };
    }
  };

  /**
   * RESTORE CONTACT:
   * Reverses soft delete.
   */
  const restoreLead = async (
    leadId: number
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = rawLeads.find((l) => l.leadId === leadId);
    if (!existing) {
      return { success: false, error: `Contact #${leadId} not found.` };
    }

    const restored: Lead = {
      ...existing,
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      setCloudSyncStatus('syncing');
      await setDoc(doc(db, 'leads', String(leadId)), cleanForFirestore(restored), { merge: true });

      setRawLeads((prev) => prev.map((l) => (l.leadId === leadId ? restored : l)));
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true };
    } catch (err) {
      console.error('Firestore restore contact error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to restore contact. Please try again.' };
    }
  };

  /**
   * DELETE MULTIPLE / ALL CONTACTS (Soft Delete):
   * If leadIds provided, soft-deletes those leads.
   * If no leadIds provided, soft-deletes ALL active (non-deleted) contacts.
   * Call history and reports remain completely preserved!
   */
  const deleteAllLeads = async (
    leadIds?: number[]
  ): Promise<{ success: boolean; count?: number; error?: string }> => {
    const targets =
      leadIds && leadIds.length > 0
        ? rawLeads.filter((l) => leadIds.includes(l.leadId) && !l.isDeleted)
        : rawLeads.filter((l) => !l.isDeleted);

    if (targets.length === 0) {
      return { success: true, count: 0 };
    }

    const now = new Date().toISOString();
    const updatedMap = new Map<number, Lead>();
    for (const item of targets) {
      updatedMap.set(item.leadId, {
        ...item,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    try {
      setCloudSyncStatus('syncing');
      const batchSize = 400;
      const targetList = Array.from(updatedMap.values());
      for (let i = 0; i < targetList.length; i += batchSize) {
        const chunk = targetList.slice(i, i + batchSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.set(doc(db, 'leads', String(item.leadId)), cleanForFirestore(item), { merge: true });
        }
        await batch.commit();
      }

      setRawLeads((prev) =>
        prev.map((l) => (updatedMap.has(l.leadId) ? updatedMap.get(l.leadId)! : l))
      );

      if (selectedLeadForModal && updatedMap.has(selectedLeadForModal.leadId)) {
        setSelectedLeadForModal(null);
      }

      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true, count: targets.length };
    } catch (err) {
      console.error('Firestore bulk delete contacts error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to delete contacts. Please try again.' };
    }
  };

  /**
   * RESTORE MULTIPLE / ALL CONTACTS:
   * If leadIds provided, restores those leads.
   * If no leadIds provided, restores ALL soft-deleted contacts.
   */
  const restoreAllLeads = async (
    leadIds?: number[]
  ): Promise<{ success: boolean; count?: number; error?: string }> => {
    const targets =
      leadIds && leadIds.length > 0
        ? rawLeads.filter((l) => leadIds.includes(l.leadId) && l.isDeleted)
        : rawLeads.filter((l) => l.isDeleted);

    if (targets.length === 0) {
      return { success: true, count: 0 };
    }

    const now = new Date().toISOString();
    const updatedMap = new Map<number, Lead>();
    for (const item of targets) {
      updatedMap.set(item.leadId, {
        ...item,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: now,
      });
    }

    try {
      setCloudSyncStatus('syncing');
      const batchSize = 400;
      const targetList = Array.from(updatedMap.values());
      for (let i = 0; i < targetList.length; i += batchSize) {
        const chunk = targetList.slice(i, i + batchSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.set(doc(db, 'leads', String(item.leadId)), cleanForFirestore(item), { merge: true });
        }
        await batch.commit();
      }

      setRawLeads((prev) =>
        prev.map((l) => (updatedMap.has(l.leadId) ? updatedMap.get(l.leadId)! : l))
      );

      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true, count: targets.length };
    } catch (err) {
      console.error('Firestore bulk restore contacts error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to restore contacts. Please try again.' };
    }
  };

  /**
   * PURGE / PERMANENTLY DELETE TRASH CONTACTS:
   * Permanently deletes selected or all soft-deleted records from Firestore.
   */
  const purgeAllDeletedLeads = async (
    leadIds?: number[]
  ): Promise<{ success: boolean; count?: number; error?: string }> => {
    const targets =
      leadIds && leadIds.length > 0
        ? rawLeads.filter((l) => leadIds.includes(l.leadId) && l.isDeleted)
        : rawLeads.filter((l) => l.isDeleted);

    if (targets.length === 0) {
      return { success: true, count: 0 };
    }

    const targetSet = new Set(targets.map((l) => l.leadId));

    try {
      setCloudSyncStatus('syncing');
      const batchSize = 400;
      for (let i = 0; i < targets.length; i += batchSize) {
        const chunk = targets.slice(i, i + batchSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.delete(doc(db, 'leads', String(item.leadId)));
        }
        await batch.commit();
      }

      setRawLeads((prev) => prev.filter((l) => !targetSet.has(l.leadId)));
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true, count: targets.length };
    } catch (err) {
      console.error('Firestore purge deleted contacts error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to permanently delete contacts. Please try again.' };
    }
  };

  /**
   * SUBMIT CALL UPDATE / LOG:
   * 1. Finds matching Lead ID
   * 2. Creates new CALL_HISTORY record in Firestore
   * 3. Updates Lead current status, last call date, next follow up, attempts + 1, latest comment, latest summary
   * 4. Awaits Firestore commit
   * 5. Returns confirmed response
   */
  const submitDailyCallUpdate = async ({
    leadId,
    callerName,
    date,
    status,
    comment,
    nextFollowUpDate,
  }: {
    leadId: number;
    callerName: string;
    date: string;
    status: CallStatus | string;
    comment: string;
    nextFollowUpDate: string;
  }): Promise<{ success: boolean; error?: string; lead?: Lead }> => {
    const existingIndex = rawLeads.findIndex((l) => l.leadId === leadId);
    if (existingIndex === -1) {
      return {
        success: false,
        error: `Error: Lead ID #${leadId} does not exist in the Master Database. Please enter a valid Lead ID.`,
      };
    }

    const currentLead = rawLeads[existingIndex];
    const relevantLogs = callHistory.filter((l) => l.leadId === leadId);
    const updatedSummary = generateLeadSummary({
      existingSummary: currentLead.latestSummary,
      currentStatus: status,
      latestComment: comment.trim(),
      nextFollowUpDate,
      callLogs: relevantLogs,
    });

    const updatedLead: Lead = {
      ...currentLead,
      assignedCaller: callerName.trim() || currentLead.assignedCaller,
      currentStatus: status,
      lastCallDate: date,
      nextFollowUpDate: nextFollowUpDate,
      numberOfAttempts: (currentLead.numberOfAttempts || 0) + 1,
      latestComment: comment.trim(),
      latestSummary: updatedSummary,
      updatedAt: new Date().toISOString(),
    };

    const newLogEntry: CallLogEntry = {
      id: `log-${leadId}-${Date.now()}`,
      date,
      callerName: callerName.trim(),
      leadId,
      prospectName: currentLead.clientName,
      phoneNumber: currentLead.phoneNumber,
      companyName: currentLead.companyName,
      status,
      comment: comment.trim(),
      nextFollowUpDate,
      timestamp: Date.now(),
    };

    // Await database confirmation before marking success!
    try {
      setCloudSyncStatus('syncing');
      const batch = writeBatch(db);
      batch.set(doc(db, 'leads', String(leadId)), cleanForFirestore(updatedLead));
      batch.set(doc(db, 'callLogs', newLogEntry.id), cleanForFirestore(newLogEntry));
      await batch.commit();

      // Database confirmed: update UI
      setRawLeads((prev) => {
        const next = [...prev];
        const idx = next.findIndex((l) => l.leadId === leadId);
        if (idx !== -1) next[idx] = updatedLead;
        else next.push(updatedLead);
        return next;
      });
      setCallHistory((prev) => {
        const map = new Map<string, CallLogEntry>();
        map.set(newLogEntry.id, newLogEntry);
        for (const item of prev) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        }
        return Array.from(map.values());
      });

      if (selectedLeadForModal?.leadId === leadId) {
        setSelectedLeadForModal(updatedLead);
      }

      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());

      return { success: true, lead: updatedLead };
    } catch (err) {
      console.error('Firestore save failed for call update:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to save call update to database. Please try again.' };
    }
  };

  const importLeads = async (newLeads: Lead[], updatedLeads: Lead[] = []) => {
    const updatedMap = new Map<number, Lead>();
    for (const u of updatedLeads) {
      updatedMap.set(u.leadId, u);
    }

    const existingIds = new Set(rawLeads.map((l) => l.leadId));
    let nextId = Math.max(...Array.from(existingIds), 1000) + 1;

    const sanitizedNew = newLeads.map((l) => {
      let id = l.leadId;
      if (existingIds.has(id) || !id || id < 1001) {
        id = nextId++;
      }
      existingIds.add(id);
      return {
        ...l,
        leadId: id,
        position: l.position || l.designation,
        designation: l.designation || l.position,
        latestSummary:
          l.latestSummary ||
          generateLeadSummary({
            currentStatus: l.currentStatus,
            latestComment: l.latestComment,
          }),
        createdAt: l.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      };
    });

    try {
      setCloudSyncStatus('syncing');
      const allToSave = [...updatedLeads, ...sanitizedNew];
      const batchSize = 400;
      for (let i = 0; i < allToSave.length; i += batchSize) {
        const chunk = allToSave.slice(i, i + batchSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.set(doc(db, 'leads', String(item.leadId)), cleanForFirestore(item), { merge: true });
        }
        await batch.commit();
      }

      setRawLeads((prev) => {
        const leadMap = new Map<number, Lead>();
        for (const l of prev) {
          leadMap.set(l.leadId, updatedMap.has(l.leadId) ? updatedMap.get(l.leadId)! : l);
        }
        for (const l of sanitizedNew) {
          leadMap.set(l.leadId, l);
        }
        return Array.from(leadMap.values());
      });

      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Batch import to Firestore error:', err);
      setCloudSyncStatus('error');
    }
  };

  const resetToDefaultData = async () => {
    try {
      setCloudSyncStatus('syncing');
      const batch = writeBatch(db);
      for (const lead of INITIAL_LEADS) {
        batch.set(doc(db, 'leads', String(lead.leadId)), cleanForFirestore(lead));
      }
      for (const log of INITIAL_CALL_HISTORY) {
        batch.set(doc(db, 'callLogs', log.id), cleanForFirestore(log));
      }
      batch.set(doc(db, 'settings', 'config'), {
        callers: INITIAL_CALLERS,
        statuses: INITIAL_STATUSES,
        updatedAt: new Date().toISOString(),
      });
      await batch.commit();

      setRawLeads(INITIAL_LEADS);
      setCallHistory(INITIAL_CALL_HISTORY);
      setCallers(INITIAL_CALLERS);
      setStatuses(INITIAL_STATUSES);
      setSelectedLeadForModal(null);

      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Reset to default in Firestore error:', err);
      setCloudSyncStatus('error');
    }
  };

  const addCaller = async (name: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Caller name cannot be empty.' };
    }
    if (callers.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: `Caller "${trimmed}" already exists.` };
    }

    const nextCallers = [...callers, trimmed];
    try {
      setCloudSyncStatus('syncing');
      await setDoc(
        doc(db, 'settings', 'config'),
        { callers: nextCallers, statuses },
        { merge: true }
      );
      setCallers(nextCallers);
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());
      return { success: true };
    } catch (err) {
      console.error('Firestore save caller error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Failed to save caller to database.' };
    }
  };

  const updateCaller = async (
    oldName: string,
    newName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      return { success: false, error: 'Caller name cannot be empty.' };
    }
    if (
      trimmedOld.toLowerCase() !== trimmedNew.toLowerCase() &&
      callers.some((c) => c.toLowerCase() === trimmedNew.toLowerCase())
    ) {
      return { success: false, error: `Caller "${trimmedNew}" already exists.` };
    }

    const nextCallers = callers.map((c) => (c === trimmedOld ? trimmedNew : c));
    const leadsToUpdate = rawLeads.filter((l) => l.assignedCaller === trimmedOld);

    try {
      setCloudSyncStatus('syncing');
      const batchSize = 400;

      // Update settings document
      await setDoc(
        doc(db, 'settings', 'config'),
        { callers: nextCallers, statuses },
        { merge: true }
      );

      // Update any assigned contacts
      if (leadsToUpdate.length > 0) {
        for (let i = 0; i < leadsToUpdate.length; i += batchSize) {
          const chunk = leadsToUpdate.slice(i, i + batchSize);
          const batch = writeBatch(db);
          for (const lead of chunk) {
            batch.update(doc(db, 'leads', String(lead.leadId)), {
              assignedCaller: trimmedNew,
              updatedAt: new Date().toISOString(),
            });
          }
          await batch.commit();
        }

        setRawLeads((prev) =>
          prev.map((l) => (l.assignedCaller === trimmedOld ? { ...l, assignedCaller: trimmedNew } : l))
        );
      }

      setCallers(nextCallers);
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());
      return { success: true };
    } catch (err) {
      console.error('Firestore update caller error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Failed to update caller in database.' };
    }
  };

  const deleteCaller = async (
    name: string,
    reassignTo?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (callers.length <= 1) {
      return { success: false, error: 'At least one caller must remain in the team.' };
    }

    const nextCallers = callers.filter((c) => c !== trimmed);
    const replacementCaller = reassignTo && reassignTo.trim() ? reassignTo.trim() : 'Unassigned';
    const leadsToUpdate = rawLeads.filter((l) => l.assignedCaller === trimmed);

    try {
      setCloudSyncStatus('syncing');
      const batchSize = 400;

      await setDoc(
        doc(db, 'settings', 'config'),
        { callers: nextCallers, statuses },
        { merge: true }
      );

      if (leadsToUpdate.length > 0) {
        for (let i = 0; i < leadsToUpdate.length; i += batchSize) {
          const chunk = leadsToUpdate.slice(i, i + batchSize);
          const batch = writeBatch(db);
          for (const lead of chunk) {
            batch.update(doc(db, 'leads', String(lead.leadId)), {
              assignedCaller: replacementCaller,
              updatedAt: new Date().toISOString(),
            });
          }
          await batch.commit();
        }

        setRawLeads((prev) =>
          prev.map((l) => (l.assignedCaller === trimmed ? { ...l, assignedCaller: replacementCaller } : l))
        );
      }

      setCallers(nextCallers);
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());
      return { success: true };
    } catch (err) {
      console.error('Firestore delete caller error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Failed to remove caller from database.' };
    }
  };

  const addStatus = async (status: string) => {
    const trimmed = status.trim();
    if (trimmed && !statuses.includes(trimmed)) {
      const nextStatuses = [...statuses, trimmed];
      try {
        await setDoc(
          doc(db, 'settings', 'config'),
          { callers, statuses: nextStatuses },
          { merge: true }
        );
        setStatuses(nextStatuses);
      } catch (err) {
        console.error('Firestore save status error:', err);
      }
    }
  };

  const removeStatus = async (status: string) => {
    if (statuses.length <= 1) return;
    const nextStatuses = statuses.filter((s) => s !== status);
    try {
      await setDoc(
        doc(db, 'settings', 'config'),
        { callers, statuses: nextStatuses },
        { merge: true }
      );
      setStatuses(nextStatuses);
    } catch (err) {
      console.error('Firestore remove status error:', err);
    }
  };

  const deleteCallLog = async (logId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setCloudSyncStatus('syncing');
      await deleteDoc(doc(db, 'callLogs', logId));
      setCallHistory((prev) => prev.filter((l) => l.id !== logId));
      setCloudSyncStatus('connected');
      setLastSyncedAt(new Date());
      return { success: true };
    } catch (err) {
      console.error('Firestore delete call log error:', err);
      setCloudSyncStatus('error');
      return { success: false, error: 'Unable to delete call record.' };
    }
  };

  return (
    <CallingSystemContext.Provider
      value={{
        leads,
        allLeads: rawLeads,
        deletedLeads,
        callHistory,
        callers,
        statuses,
        currentView,
        setCurrentView,
        selectedLeadForModal,
        setSelectedLeadForModal,
        prefilledLeadIdForDailyUpdate,
        setPrefilledLeadIdForDailyUpdate,
        cloudSyncStatus,
        lastSyncedAt,
        isFirebaseActive,
        getLeadById,
        createContact,
        updateLead,
        deleteLead,
        restoreLead,
        deleteAllLeads,
        restoreAllLeads,
        purgeAllDeletedLeads,
        submitDailyCallUpdate,
        importLeads,
        resetToDefaultData,
        addCaller,
        updateCaller,
        deleteCaller,
        addStatus,
        removeStatus,
        deleteCallLog,
      }}
    >
      {children}
    </CallingSystemContext.Provider>
  );
};

export const useCallingSystem = () => {
  const context = useContext(CallingSystemContext);
  if (!context) {
    throw new Error('useCallingSystem must be used within a CallingSystemProvider');
  }
  return context;
};
