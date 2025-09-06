import { useState, lazy, Suspense, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import { navItems } from './constants/navigation';
import ErrorBoundary from './components/ErrorBoundary';
import TabErrorBoundary from './components/TabErrorBoundary';
import { useUserStore } from './store/useUserStore';
import AuthPage from './components/auth/AuthPage';
import ProfileSettings from './components/auth/ProfileSettings';
import { LLMSessionProvider } from './components/tabs/LLMServerManager/llmSessionStore';
// Lazy load all components (kao Å¡to veÄ‡ imaÅ¡)
const MaterialsGrid = lazy(() => import('./components/tabs/MaterialsGrid'));
const GanttChart = lazy(() => import('./components/tabs/GanttChart'));
const TimelineVisualization = lazy(() => import('./components/tabs/TimelineVisualization'));
const InvoiceProcessing = lazy(() => import('./components/tabs/InvoiceProcessing'));
const InvoiceProcessor2 = lazy(() => import('./components/tabs/InvoiceProcessor2'));
const InvoiceProcessorV2Simple = lazy(() => import('./components/tabs/InvoiceProcessorV2Simple'));
const FloorManagement = lazy(() => import('./components/tabs/FloorManagement'));
const DocumentsProccessor = lazy(() => import('./components/tabs/DocumentsProccessor'));
const Reports = lazy(() => import('./components/tabs/Reports'));
const Warehouse = lazy(() => import('./components/tabs/Warehouse'));
const ShowcasePanel = lazy(() => import('./components/tabs/ShowcasePanel'));
const AnimationPlayground = lazy(() => import('./components/tabs/AnimationPlayground'));
const AnimationPlaygroundV2 = lazy(() => import('./components/tabs/AnimationPlaygroundV2'));
const BackgroundLab = lazy(() => import('./components/tabs/BackgroundLab'));
const FluentHoverPeek = lazy(() => import('./components/tabs/FluentHoverPeek'));
const FsHoverPreview = lazy(() => import('./components/tabs/FsHoverPreview'));
const BoQReaderAnalyzer = lazy(() => import('./components/tabs/BoQReaderAnalyzer'));
const ProjectView = lazy(() => import('./components/tabs/ProjectView'));
const PlannerGanttTab = lazy(() => import('./components/tabs/PlannerGanttTab'));
const PlannerGanttTab1 = lazy(() => import('./components/planner'));
const PlannerGantt = lazy(() => import('./components/tabs/PlannerGantt'));
const Asistent = lazy(() => import('./components/tabs/AsistentTab'));
/* 
 * CHANGE: 2025-09-01 - Added lazy-loaded AIInference component import
 * WHY: User requested new AI Inference tab functionality
 * IMPACT: Enables AI Inference component to be loaded on-demand when tab is accessed
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #lazy-loading #ai-inference #react-lazy
 */
const AIInference = lazy(() => import('./components/tabs/AIInference'));
/* 
 * CHANGE: 2025-09-01 - Added lazy-loaded BarcodeScanner component import
 * WHY: User requested barcode and QR code scanning functionality
 * IMPACT: Enables BarcodeScanner component to be loaded on-demand when tab is accessed
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #lazy-loading #barcode-scanner #qr-code #react-lazy
 */
const BarcodeScanner = lazy(() => import('./components/tabs/BarcodeScanner'));
/* 
 * CHANGE: 2025-09-01 - Added lazy-loaded AI File Processor component import
 * WHY: Enable file upload and processing with OpenWebUI and LM Studio
 * IMPACT: Enables AI File Processor component to be loaded on-demand when tab is accessed
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #lazy-loading #ai-file-processor #file-upload #react-lazy
 */
const AIFileProcessor = lazy(() => import('./components/tabs/AIFileProcessor'));
const Chat = lazy(() => import('./components/tabs/Chat'));
const LLMServerManager = lazy(() => import('./components/tabs/LLMServerManager'));
const Circus = lazy(() => import('./components/tabs/Circus'));
const UserManagement = lazy(() => import('./components/tabs/UserManagement'));
const Employogram = lazy(() => import('./components/tabs/PlannerGanttV2'));
const EmployogramOriginal = lazy(() => import('./components/tabs/EmployogramOriginal'));
const Employogram2 = lazy(() => import('./components/tabs/Employogram2'));
const AgbimFieldSimulatorTab = lazy(() => import('./components/tabs/AgbimFieldSimulatorTab'));
const TaskHub = lazy(() => import('./components/tabs/TaskHub'));
const DispatchTab = lazy(() => import('./components/tabs/DispatchTab'));
const AccountingTab = lazy(() => import('./components/tabs/AccountingTab'));
const VoiceTab = lazy(() => import('./components/tabs/VoiceTab'));
const AIAgentGuide = lazy(() => import('./components/tabs/AIAgentGuide'));
const VoiceAgentHR = lazy(() => import('./components/tabs/VoiceAgentHR'));
const VoiceHRV2 = lazy(() => import('./components/tabs/VoiceHRV2'));
const GanttAgent = lazy(() => import('./components/tabs/GanttAgent'));
const VoiceOrchestratorTab = lazy(() => import('./components/tabs/VoiceOrchestrator'));
const GVAv2 = lazy(() => import('./components/tabs/GVAv2'));
const CodexControl = lazy(() => import('./components/tabs/CodexControl'));
const DocumentSorterTab = lazy(() => import('./components/tabs/DocumentSorterTab'));


// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-pulse">
      <div className="text-lg text-slate-600">UÄitavanje...</div>
    </div>
  </div>
);

// Default home content (kao Å¡to veÄ‡ imaÅ¡)
const HomeContent = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold">Prvi paket za app</h1>
    <p className="text-lg text-slate-600">Računnik, dokumetnik, tlocrtnik, gantnik</p>
    {/* rest of HomeContent */}
  </div>
); 

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const { isAuthenticated, initAuth } = useUserStore();
  
  // Handle domain selection from VoiceOrchestrator
  const handleDomainSelect = (domain) => {
    console.log(`🎯 App: Domain selected: ${domain.id}`);
    if (domain.id === 'gantt') {
      setActiveTab('gantt-agent');
    }
    // Add other domain mappings as needed
  };
  
  // Initialize auth on app load
  useEffect(() => {
    initAuth();
  }, [initAuth]);
  
  // Listen for profile settings modal open event
  useEffect(() => {
    const handleOpenProfileSettings = () => {
      setShowProfileSettings(true);
    };
    
    window.addEventListener('openProfileSettings', handleOpenProfileSettings);
    return () => window.removeEventListener('openProfileSettings', handleOpenProfileSettings);
  }, []);
  
  // Show auth page if user is not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderContent = () => {
    // Wrap each component in TabErrorBoundary
    const getComponent = () => {
      switch (activeTab) {
        case 'document-sorter':
          return <DocumentSorterTab />;
        case 'invoice':
          return <InvoiceProcessing />;
        case 'invoice2':
          return <InvoiceProcessor2 />;
        case 'invoice-simple':
          return <InvoiceProcessorV2Simple />;
        case 'floorplan':
          return <FloorManagement />;
        case 'proccessor':
          return <DocumentsProccessor />;
        case 'gantt':
          return <PlannerGantt />;
        case 'asistent':
          return <Asistent />;
        case 'ai-inference':
          return <AIInference />;
        /* 
         * CHANGE: 2025-09-01 - Added Barcode Scanner case to router switch
         * WHY: Routes 'barcode-scanner' key to BarcodeScanner component
         * IMPACT: Enables Barcode Scanner tab to render when selected in navigation
         * AUTHOR: Claude Code Assistant
         * SEARCH_TAGS: #routing #barcode-scanner #switch-case
         */
        case 'barcode-scanner':
          return <BarcodeScanner />;
        /* 
         * CHANGE: 2025-09-01 - Added AI File Processor case to router switch
         * WHY: Routes 'ai-file-processor' key to AIFileProcessor component
         * IMPACT: Enables AI File Processor tab to render when selected in navigation
         * AUTHOR: Claude Code Assistant
         * SEARCH_TAGS: #routing #ai-file-processor #switch-case
         */
        case 'ai-file-processor':
          return <AIFileProcessor />;
        case 'chat':
          return <Chat />;
        case 'llm-server':
          return <LLMServerManager />;
        case 'circus':
          return <Circus />;
        case 'users':
          return <UserManagement />;
        case 'employogram':
          return <Employogram />;
        case 'employogram-original':
          return <EmployogramOriginal />;
        case 'employogram2':
          return <Employogram2 />;
        case 'agbim-field':
          return <AgbimFieldSimulatorTab />;
        case 'hover':
          return <FsHoverPreview />;
        case 'animations':
          return <AnimationPlayground />;
        case 'animations-v2':
          return <AnimationPlaygroundV2 />;
        case 'background-lab':
          return <BackgroundLab />;
        case 'reports':
          return <Reports />;
        case 'warehouse':
          return <Warehouse />;
        case 'showcase':
          return <ShowcasePanel />;
        case 'fluent':
          return <FluentHoverPeek />;
        case 'BoQ':
          return <BoQReaderAnalyzer />;
        case 'ProjectView':
          return <ProjectView />;
        case 'task-hub':
          return <TaskHub />;
        case 'dispatch':
          return <DispatchTab />;
        case 'accounting':
          return <AccountingTab />;
        case 'voice':
          return <VoiceTab />;
        case 'ai-agent-guide':
          return <AIAgentGuide />;
        case 'voice-agent-hr':
          return <VoiceAgentHR />;
        case 'voice-hr-v2':
          return <VoiceHRV2 />;
        case 'gantt-agent':
          return <GanttAgent />;
        case 'gva-v2':
          return <GVAv2 />;
        case 'voice-orchestrator':
          return <VoiceOrchestratorTab onDomainSelect={handleDomainSelect} />;
        case 'codex-control':
          return <CodexControl />;
        default:
          return <HomeContent />;
      }
    };

    // Wrap component in tab-specific error boundary
    return (
      <TabErrorBoundary tabName={activeTab}>
        {getComponent()}
      </TabErrorBoundary>
    );
  };

  return (
    <LLMSessionProvider>
      {/* Global error boundary */}
      <ErrorBoundary 
      fallbackMessage="Aplikacija je naišla na grešku. Molimo osvježite stranicu."
      onReset={() => setActiveTab('home')}
    >
      <MainLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        navItems={navItems}
      >
        <Suspense fallback={<LoadingFallback />}>
          {renderContent()}
        </Suspense>
      </MainLayout>
      </ErrorBoundary>
      
      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <ProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}
    </LLMSessionProvider>
  );
}
