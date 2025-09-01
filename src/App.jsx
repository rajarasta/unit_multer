import { useState, lazy, Suspense, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import { navItems } from './constants/navigation';
import ErrorBoundary from './components/ErrorBoundary';
import TabErrorBoundary from './components/TabErrorBoundary';
import { useUserStore } from './store/useUserStore';
import AuthPage from './components/auth/AuthPage';
import ProfileSettings from './components/auth/ProfileSettings';
// Lazy load all components (kao Å¡to veÄ‡ imaÅ¡)
const MaterialsGrid = lazy(() => import('./components/tabs/MaterialsGrid'));
const GanttChart = lazy(() => import('./components/tabs/GanttChart'));
const TimelineVisualization = lazy(() => import('./components/tabs/TimelineVisualization'));
const InvoiceProcessing = lazy(() => import('./components/tabs/InvoiceProcessing'));
const FloorManagement = lazy(() => import('./components/tabs/FloorManagement'));
const DocumentsProccessor = lazy(() => import('./components/tabs/DocumentsProccessor'));
const Reports = lazy(() => import('./components/tabs/Reports'));
const Warehouse = lazy(() => import('./components/tabs/Warehouse'));
const ShowcasePanel = lazy(() => import('./components/tabs/ShowcasePanel'));
const AnimationPlayground = lazy(() => import('./components/tabs/AnimationPlayground'));
const FluentHoverPeek = lazy(() => import('./components/tabs/FluentHoverPeek'));
const FsHoverPreview = lazy(() => import('./components/tabs/FsHoverPreview'));
const BoQReaderAnalyzer = lazy(() => import('./components/tabs/BoQReaderAnalyzer'));
const ProjectView = lazy(() => import('./components/tabs/ProjectView'));
const PlannerGanttTab = lazy(() => import('./components/tabs/PlannerGanttTab'));
const PlannerGanttTab1 = lazy(() => import('./components/planner'));
const PlannerGantt = lazy(() => import('./components/tabs/PlannerGantt'));
const Asistent = lazy(() => import('./components/tabs/Asistent'));
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
const Circus = lazy(() => import('./components/tabs/Circus'));
const UserManagement = lazy(() => import('./components/tabs/UserManagement'));
const Employogram = lazy(() => import('./components/tabs/PlannerGanttV2'));



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
        case 'invoice':
          return <InvoiceProcessing />;
        case 'floorplan':
          return <FloorManagement />;
        case 'proccessor':
          return <DocumentsProccessor />;
        case 'gantt':
          return <PlannerGantt />;
        case 'asistent':
          return <Asistent />;
        /* 
         * CHANGE: 2025-09-01 - Added AI Inference case to router switch
         * WHY: Routes 'ai-inference' key to AIInference component
         * IMPACT: Enables AI Inference tab to render when selected in navigation
         * AUTHOR: Claude Code Assistant
         * SEARCH_TAGS: #routing #ai-inference #switch-case
         */
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
        case 'circus':
          return <Circus />;
        case 'users':
          return <UserManagement />;
        case 'employogram':
          return <Employogram />;
        case 'home':
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
    <>
      {/* Global error boundary */}
      <ErrorBoundary 
      fallbackMessage="Aplikacija je naiÅ¡la na greÅ¡ku. Molimo osvjeÅ¾ite stranicu."
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
    </>
  );
}

