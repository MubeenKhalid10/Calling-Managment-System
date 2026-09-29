/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CallingSystemProvider,
  useCallingSystem,
} from './context/CallingSystemContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DailyActivityDashboard } from './components/DailyActivityDashboard';
import { NeedsToCallSheet } from './components/NeedsToCallSheet';
import { MasterDatabaseSheet } from './components/MasterDatabaseSheet';
import { CallerDailyUpdateSheet } from './components/CallerDailyUpdateSheet';
import { CallHistorySheet } from './components/CallHistorySheet';
import { ReportsView } from './components/ReportsView';
import { LeadDetailModal } from './components/LeadDetailModal';
import { CreateContactModal } from './components/CreateContactModal';
import { CsvImportModal } from './components/CsvImportModal';
import { StatusManagerModal } from './components/StatusManagerModal';
import { SystemUsageGuideModal } from './components/SystemUsageGuideModal';
import { Lead } from './types/crm';

const CallingSystemApp: React.FC = () => {
  const {
    leads,
    currentView,
    setCurrentView,
    selectedLeadForModal,
    setSelectedLeadForModal,
    setPrefilledLeadIdForDailyUpdate,
  } = useCallingSystem();

  // Mobile sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalTab, setStatusModalTab] = useState<'callers' | 'statuses'>('callers');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isCreateContactModalOpen, setIsCreateContactModalOpen] = useState(false);

  const handleOpenCallerModal = () => {
    setStatusModalTab('callers');
    setIsStatusModalOpen(true);
  };

  const handleOpenStatusModal = () => {
    setStatusModalTab('statuses');
    setIsStatusModalOpen(true);
  };

  // 1-Click "Call Now" action from Master Database, Follow-up list, or Modal
  const handleCallLeadNow = (lead: Lead) => {
    setPrefilledLeadIdForDailyUpdate(lead.leadId);
    setCurrentView('daily_update');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased w-full max-w-full overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Left Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenStatusModal={handleOpenCallerModal}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenLeadModal={(lead) => setSelectedLeadForModal(lead)}
          onOpenCreateContactModal={() => setIsCreateContactModalOpen(true)}
        />

        {/* Main Content Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {(currentView === 'dashboard' || currentView === 'activity') && (
            <DailyActivityDashboard
              onOpenLeadModal={(lead) => setSelectedLeadForModal(lead)}
              onCallLeadNow={handleCallLeadNow}
            />
          )}

          {currentView === 'needs_to_call' && (
            <NeedsToCallSheet
              onOpenLeadModal={(lead) => setSelectedLeadForModal(lead)}
            />
          )}

          {currentView === 'master' && (
            <MasterDatabaseSheet
              onOpenLeadModal={(lead) => setSelectedLeadForModal(lead)}
              onCallLeadNow={handleCallLeadNow}
              onOpenCallerModal={handleOpenCallerModal}
            />
          )}

          {currentView === 'daily_update' && (
            <CallerDailyUpdateSheet
              onOpenLeadModal={(lead) => setSelectedLeadForModal(lead)}
              onOpenCallerModal={handleOpenCallerModal}
            />
          )}

          {currentView === 'history' && <CallHistorySheet />}

          {currentView === 'reports' && <ReportsView />}
        </main>

        {/* Minimal clean footer */}
        <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-500 font-mono">
          Cold Call Manager · Master Database &amp; Daily Caller Tracking · Realtime Cloud Sync
        </footer>
      </div>

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLeadForModal}
        onClose={() => setSelectedLeadForModal(null)}
        onCallLeadNow={handleCallLeadNow}
      />

      <CreateContactModal
        isOpen={isCreateContactModalOpen}
        onClose={() => setIsCreateContactModalOpen(false)}
        onContactCreated={(leadId) => {
          const created = leads.find((l) => l.leadId === leadId);
          if (created) {
            setSelectedLeadForModal(created);
          }
        }}
      />

      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <StatusManagerModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        initialTab={statusModalTab}
      />

      <SystemUsageGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <CallingSystemProvider>
      <CallingSystemApp />
    </CallingSystemProvider>
  );
}
