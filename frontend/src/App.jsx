import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CopilotDrawer from './components/CopilotDrawer';
import EvidenceModal from './components/EvidenceModal';

import OverviewView from './views/OverviewView';
import CopilotView from './views/CopilotView';
import ForecastingView from './views/ForecastingView';
import InventoryView from './views/InventoryView';
import LogisticsView from './views/LogisticsView';
import SuppliersView from './views/SuppliersView';
import OptimizationView from './views/OptimizationView';
import KnowledgeView from './views/KnowledgeView';
import ActionCenterView from './views/ActionCenterView';

import { fetchActions } from './services/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Evidence modal state
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState(null);
  const [evidenceThought, setEvidenceThought] = useState('');
  const [evidenceTool, setEvidenceTool] = useState('');

  useEffect(() => {
    fetchActions()
      .then(actions => {
        const pending = actions.filter(a => a.status === 'Pending Approval').length;
        setPendingCount(pending);
      })
      .catch(() => {});
  }, [activeTab]);

  const handleOpenEvidence = (data, thought, tool) => {
    setEvidenceData(data);
    setEvidenceThought(thought);
    setEvidenceTool(tool);
    setEvidenceModalOpen(true);
  };

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenCopilot={() => setIsCopilotOpen(true)}
        pendingActionsCount={pendingCount}
      />

      {/* Main View Router */}
      <main className="main-content-container">
        {activeTab === 'overview' && (
          <OverviewView 
            onOpenCopilot={() => setIsCopilotOpen(true)} 
            onNavigateTab={setActiveTab} 
          />
        )}
        {activeTab === 'copilot' && (
          <CopilotView 
            onNavigateTab={setActiveTab}
            onInspectEvidence={handleOpenEvidence}
          />
        )}
        {activeTab === 'forecasting' && <ForecastingView />}
        {activeTab === 'inventory' && <InventoryView onNavigateTab={setActiveTab} />}
        {activeTab === 'logistics' && <LogisticsView onNavigateTab={setActiveTab} />}
        {activeTab === 'suppliers' && <SuppliersView onNavigateTab={setActiveTab} />}
        {activeTab === 'optimization' && <OptimizationView onNavigateTab={setActiveTab} />}
        {activeTab === 'knowledge' && <KnowledgeView />}
        {activeTab === 'actions' && <ActionCenterView />}
      </main>

      {/* Slide-Over Copilot Quick Drawer */}
      <CopilotDrawer 
        isOpen={isCopilotOpen} 
        onClose={() => setIsCopilotOpen(false)}
        onInspectEvidence={handleOpenEvidence}
        onNavigateToActionCenter={() => {
          setIsCopilotOpen(false);
          setActiveTab('actions');
        }}
      />

      {/* Inspectable Telemetry & Evidence Modal */}
      <EvidenceModal 
        isOpen={evidenceModalOpen} 
        onClose={() => setEvidenceModalOpen(false)}
        evidenceData={evidenceData}
        thoughtProcess={evidenceThought}
        toolCalled={evidenceTool}
      />
    </div>
  );
}
