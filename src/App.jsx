import { useState, lazy, Suspense } from 'react';
import MainLayout from './components/layout/MainLayout';
import { navItems } from './constants/navigation';
import ErrorBoundary from './components/ErrorBoundary';
import TabErrorBoundary from './components/TabErrorBoundary';
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
const Circus = lazy(() => import('./components/tabs/Circus'));



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
        case 'circus':
          return <Circus />;
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
    // Global error boundary
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
  );
}

