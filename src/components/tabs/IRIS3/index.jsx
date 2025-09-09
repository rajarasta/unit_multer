/**
 * IRIS3 - Intelligent Resource Integration Storage 3
 * 
 * REFACTORED COMPONENT ARCHITECTURE:
 * ✅ Modular hook-based design
 * ✅ Separated UI components  
 * ✅ Service layer abstraction
 * ✅ Clean imports and dependencies
 * ✅ Single Responsibility Principle
 */

import React, { useState } from 'react';

// Hooks
import useVoiceRecognition from './hooks/useVoiceRecognition.js';
import useSchuroAnalysis from './hooks/useSchuroAnalysis.js';
import useProjektDetails from './hooks/useProjektDetails.js';
import useApiIntegration from './hooks/useApiIntegration.js';

// Components
import Header from './components/Header.jsx';
import TabNavigation from './components/TabNavigation.jsx';
import ProdajaContainers from './components/ProdajaContainers.jsx';
import ProjektiranjeContainers from './components/ProjektiranjeContainers.jsx';
import ApiMonitor from './components/ApiMonitor.jsx';

// Constants
import { IRIS3_TABS } from '../../../utils/schutoConstants.js';

const IRIS3 = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const [activeTab, setActiveTab] = useState('prodaja');
  
  // Glow settings (could be extracted to useGlowSettings hook if needed elsewhere)
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [glowIntensity, setGlowIntensity] = useState(1);
  const [glowDurationMs, setGlowDurationMs] = useState(200);
  const [showGlowSettings, setShowGlowSettings] = useState(false);

  // ==========================================
  // CUSTOM HOOKS
  // ==========================================
  
  const voiceRecognition = useVoiceRecognition();
  const schuroAnalysis = useSchuroAnalysis();
  const projektDetails = useProjektDetails();
  const apiIntegration = useApiIntegration();

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  const handleTranscriptComplete = async (transcript) => {
    voiceRecognition.setIsProcessing(true);
    
    try {
      await apiIntegration.processVoiceCommand(
        transcript,
        activeTab,
        schuroAnalysis.executeProdajaTool,
        (userInput) => projektDetails.executeProjektiranjeStandardniTool(userInput, schuroAnalysis.schuroAnalysis)
      );
    } catch (error) {
      console.error('Voice command processing error:', error);
    } finally {
      voiceRecognition.setIsProcessing(false);
    }
  };

  const handleToggleListening = () => {
    if (voiceRecognition.isListening) {
      voiceRecognition.stopVoiceRecognition();
    } else {
      apiIntegration.updateApiStatus('start_listening');
      voiceRecognition.toggleListening(handleTranscriptComplete);
    }
  };

  const handleTransfer = () => {
    if (schuroAnalysis.schuroAnalysis) {
      setActiveTab('projektiranje');
      schuroAnalysis.setShowMiniContainers(true);
      voiceRecognition.toggleListening(handleTranscriptComplete);
      
      console.log(`Prebačeno na projektiranje: ${schuroAnalysis.schuroAnalysis.analysis?.sistema_selected} - ${schuroAnalysis.schuroAnalysis.tip?.selected}`);
    } else {
      alert('Nema podataka za prenošenje. Prvo izvedite analizu.');
    }
  };

  const handleCloseProdajaContainers = () => {
    schuroAnalysis.clearAnalysis();
  };

  const handleCloseProjektiranjeContainers = () => {
    projektDetails.clearProjektDetails();
  };

  // ==========================================
  // RENDER
  // ==========================================
  
  return (
    <div className="h-screen flex">
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-3/4 panel border-r border-theme">
        <div className="h-full flex flex-col">
          {/* HEADER */}
          <Header
            isListening={voiceRecognition.isListening}
            onToggleListening={handleToggleListening}
            canTransfer={!!schuroAnalysis.schuroAnalysis}
            onTransfer={handleTransfer}
            glowEnabled={glowEnabled}
            glowIntensity={glowIntensity}
            glowDurationMs={glowDurationMs}
            showGlowSettings={showGlowSettings}
            onToggleGlowSettings={() => setShowGlowSettings(v => !v)}
            onGlowEnabledChange={setGlowEnabled}
            onGlowIntensityChange={setGlowIntensity}
            onGlowDurationChange={setGlowDurationMs}
          />
          
          {/* TAB NAVIGATION */}
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col p-8">
            
            {/* PRODAJA CONTAINERS */}
            {/* 1. tura containers (same for Prodaja & Projektiranje tabs) */}
            {(activeTab === 'prodaja' || activeTab === 'projektiranje') && 
             schuroAnalysis.showMiniContainers && schuroAnalysis.schuroAnalysis && 
             !projektDetails.showProjectDetails && (
              <ProdajaContainers
                schuroAnalysis={schuroAnalysis.schuroAnalysis}
                activeTab={activeTab}
                onClose={handleCloseProdajaContainers}
              />
            )}
            
            {/* PROJEKTIRANJE CONTAINERS */}
            {/* 2. tura containers (projektiranje detail images) */}
            {activeTab === 'projektiranje' && 
             projektDetails.showProjectDetails && projektDetails.projektDetails && (
              <ProjektiranjeContainers
                projektDetails={projektDetails.projektDetails}
                onClose={handleCloseProjektiranjeContainers}
              />
            )}
          </div>

          {/* FOOTER STATUS */}
          <div className="p-6 input-bg border-t border-theme">
            <div className="text-center space-y-2">
              <p className="text-primary">
                Aktivni tab: <span className="font-medium text-accent">{IRIS3_TABS.find(t => t.id === activeTab)?.label}</span>
              </p>
              <p className="text-sm text-secondary">
                {voiceRecognition.isListening ? 'Slušam...' : voiceRecognition.isProcessing ? 'Obrađujem...' : 'Kliknite mikrofon za početak'}
              </p>
              {voiceRecognition.currentTranscript && (
                <div className="text-xs text-secondary bg-slate-100 rounded px-2 py-1 inline-block">
                  {voiceRecognition.currentTranscript}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API MONITOR SIDEBAR */}
      <ApiMonitor
        chatHistory={apiIntegration.chatHistory}
        apiData={apiIntegration.apiData}
      />
    </div>
  );
};

export default IRIS3;