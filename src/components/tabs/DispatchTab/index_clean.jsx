import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Truck, 
  Search, 
  Filter, 
  Plus,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  FileText,
  Download
} from 'lucide-react';
import ProjectDataService from '../../../services/ProjectDataService';
import AgbimDataService from '../../../services/AgbimDataService';
import { eventService } from '../../../services/eventService';
import { exportService } from '../../../services/exportService';
import PositionCard from './PositionCard';
import ShipmentBatch from './ShipmentBatch';
import DispatchModal from './DispatchModal';
import ShapeLegend from './ShapeLegend';
import { demoPositions } from './DemoPositions';
import { integrateWithAgbimDatabase } from '../../../utils/databaseIntegration';

const DispatchTab = () => {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [positions, setPositions] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [batchItems, setBatchItems] = useState([]);
  const [showBatch, setShowBatch] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  const projectDataService = useRef(new ProjectDataService());
  const agbimDataService = useRef(new AgbimDataService());

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // FORCE DEMO INTEGRATION FOR NOW - until AGBIM has full data
      console.log('🔧 FORCING demo integration with 20 positions...');
      
      // Always integrate demo data into AGBIM format for now
      const integratedData = integrateWithAgbimDatabase();
      
      // Create enhanced project with integrated data
      const enhancedProject = {
        id: 'ZErU46IjfLOOUsoxiPy1a',
        name: 'Demo Aluminum Project - Integrated',
        orderNo: 'ORD-2025-001',
        client: 'Aluminum Solutions d.o.o.',
        currency: 'EUR',
        status: 'active',
        positions: integratedData.positions,
        dispatches: integratedData.dispatches,
        warehouse: integratedData.warehouse,
        processes: integratedData.processes,
        materials: integratedData.materials
      };
      
      setProjects([enhancedProject]);
      setActiveProject(enhancedProject);
      setPositions(enhancedProject.positions);
      
      console.log(`🎯 FORCED integration: ${enhancedProject.positions.length} positions loaded`);
      console.log('📋 Positions titles:', enhancedProject.positions.map(p => p.title));
      
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      
      // Fallback to demo data with integration
      console.log('🔄 Falling back to demo data...');
      const integratedData = integrateWithAgbimDatabase();
      const fallbackProject = {
        id: 'demo_fallback',
        name: 'Demo Aluminum Project - Fallback',
        positions: integratedData.positions
      };
      
      setProjects([fallbackProject]);
      setActiveProject(fallbackProject);
      setPositions(fallbackProject.positions);
      
      console.log(`🎯 Fallback loaded ${fallbackProject.positions.length} positions`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleProjectChange = useCallback((projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setActiveProject(project);
      setPositions(project.positions || []);
      setBatchItems([]);
    }
  }, [projects]);

  const filteredPositions = positions.filter(position => {
    const matchesSearch = !search || 
      position.title?.toLowerCase().includes(search.toLowerCase()) ||
      position.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || position.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const addToBatch = useCallback((position, quantity = 1) => {
    setBatchItems(prev => {
      const existing = prev.find(item => item.positionId === position.id);
      if (existing) {
        return prev.map(item => 
          item.positionId === position.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        id: `batch_${Date.now()}_${position.id}`,
        positionId: position.id,
        position: position,
        quantity: quantity,
        plannedQty: position.qty || 0,
        status: 'ready'
      }];
    });
    setShowBatch(true);
  }, []);

  const openPositionDetails = useCallback((position) => {
    setSelectedPosition(position);
    setShowModal(true);
  }, []);

  const generateDispatchDocuments = useCallback(async () => {
    try {
      const documents = await exportService.generateDispatchDocuments({
        project: activeProject,
        items: batchItems,
        timestamp: new Date().toISOString()
      });
      
      eventService.emit('dispatch:documents-generated', {
        projectId: activeProject.id,
        documents,
        items: batchItems
      });
      
      return documents;
    } catch (error) {
      console.error('Error generating dispatch documents:', error);
      return null;
    }
  }, [activeProject, batchItems]);

  const confirmDispatch = useCallback(async () => {
    if (batchItems.length === 0) return;

    try {
      const documents = await generateDispatchDocuments();
      
      const dispatchRecord = {
        id: `dispatch_${Date.now()}`,
        projectId: activeProject.id,
        items: batchItems,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        documents: documents || []
      };

      eventService.emit('dispatch:confirmed', dispatchRecord);
      
      setBatchItems([]);
      setShowBatch(false);
      
      console.log('Dispatch confirmed:', dispatchRecord);
    } catch (error) {
      console.error('Error confirming dispatch:', error);
    }
  }, [activeProject, batchItems, generateDispatchDocuments]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return 'text-green-600 bg-green-50';
      case 'In Progress': return 'text-blue-600 bg-blue-50';
      case 'Planned': return 'text-yellow-600 bg-yellow-50';
      case 'Blocked': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavam pozicije...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Toolbar */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Otprema</h1>
            </div>
            
            <select
              value={activeProject?.id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm min-w-48"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Traži pozicije..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Sve pozicije</option>
              <option value="Done">Završeno</option>
              <option value="In Progress">U radu</option>
              <option value="Planned">Planirano</option>
              <option value="Blocked">Problem</option>
            </select>

            {batchItems.length > 0 && (
              <button
                onClick={() => setShowBatch(!showBatch)}
                className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Šarža</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {batchItems.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Positions Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredPositions.map((position, index) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  index={index}
                  onAddToBatch={addToBatch}
                  onViewDetails={openPositionDetails}
                  getStatusColor={getStatusColor}
                />
              ))}
            </AnimatePresence>
          </div>

          {filteredPositions.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nema pozicija
              </h3>
              <p className="text-gray-600">
                {search || filter !== 'all' 
                  ? 'Pokušajte promijeniti filtere ili pretragu.'
                  : 'Izabrani projekt nema pozicija.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Shipment Batch Sidebar */}
        <AnimatePresence>
          {showBatch && (
            <ShipmentBatch
              items={batchItems}
              onUpdateItems={setBatchItems}
              onClose={() => setShowBatch(false)}
              onConfirm={confirmDispatch}
              project={activeProject}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Position Details Modal */}
      <AnimatePresence>
        {showModal && selectedPosition && (
          <DispatchModal
            position={selectedPosition}
            onClose={() => setShowModal(false)}
            onAddToBatch={addToBatch}
            project={activeProject}
          />
        )}
      </AnimatePresence>

      {/* Shape Legend Help */}
      <ShapeLegend />
    </div>
  );
};

export default DispatchTab;