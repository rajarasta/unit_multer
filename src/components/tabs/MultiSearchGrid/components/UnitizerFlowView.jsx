import React, { useMemo, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  useNodesState, 
  useEdgesState,
  Panel,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';

const UnitizerFlowView = ({ fusedUnits, className = "" }) => {
  // Generate nodes based on fused units
  const initialNodes = useMemo(() => {
    const inputNodes = fusedUnits.map((unit, index) => ({
      id: unit.id,
      type: 'input',
      data: { 
        label: (
          <div className="text-center">
            <div className="font-semibold text-sm">{unit.contentType}</div>
            <div className="text-xs text-gray-500 mt-1">{unit.unitName}</div>
          </div>
        )
      },
      position: { x: 50, y: index * 120 + 50 },
      style: {
        background: getTypeColor(unit.contentType),
        color: 'white',
        border: '2px solid #ffffff',
        borderRadius: '12px',
        fontSize: '12px',
        width: 120,
        height: 60
      }
    }));

    // Central processing node
    const processingNode = {
      id: 'processing',
      type: 'default',
      data: { 
        label: (
          <div className="text-center">
            <div className="font-bold text-sm">AI Fusion</div>
            <div className="text-xs mt-1">Processing...</div>
          </div>
        )
      },
      position: { x: 300, y: (fusedUnits.length * 120) / 2 },
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: '3px solid #4f46e5',
        borderRadius: '16px',
        width: 140,
        height: 80,
        boxShadow: '0 8px 25px rgba(79, 70, 229, 0.3)'
      }
    };

    // Output node
    const outputNode = {
      id: 'fused-output',
      type: 'output',
      data: { 
        label: (
          <div className="text-center">
            <div className="font-bold text-sm">Fused Result</div>
            <div className="text-xs mt-1">{generateFusionLabel(fusedUnits)}</div>
          </div>
        )
      },
      position: { x: 550, y: (fusedUnits.length * 120) / 2 },
      style: {
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        border: '2px solid #10b981',
        borderRadius: '12px',
        width: 140,
        height: 70
      }
    };

    return [...inputNodes, processingNode, outputNode];
  }, [fusedUnits]);

  // Generate edges (connections)
  const initialEdges = useMemo(() => {
    const inputToProcessing = fusedUnits.map(unit => ({
      id: `e${unit.id}-processing`,
      source: unit.id,
      target: 'processing',
      animated: true,
      style: { 
        stroke: getTypeColor(unit.contentType), 
        strokeWidth: 3,
        opacity: 0.8
      },
      markerEnd: { 
        type: MarkerType.ArrowClosed, 
        color: getTypeColor(unit.contentType),
        width: 20,
        height: 20
      }
    }));

    const processingToOutput = {
      id: 'eprocessing-output',
      source: 'processing',
      target: 'fused-output',
      animated: true,
      style: { 
        stroke: '#4f46e5', 
        strokeWidth: 4,
        opacity: 0.9
      },
      markerEnd: { 
        type: MarkerType.ArrowClosed, 
        color: '#4f46e5',
        width: 25,
        height: 25
      },
      label: 'AI Processing',
      labelStyle: { fill: '#4f46e5', fontWeight: 600 }
    };

    return [...inputToProcessing, processingToOutput];
  }, [fusedUnits]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Utility functions
  const getTypeColor = useCallback((contentType) => {
    const colors = {
      picture: '#f59e0b', // amber
      chat: '#3b82f6',    // blue  
      table: '#10b981',   // emerald
      drawing: '#8b5cf6', // purple
      default: '#6b7280'  // gray
    };
    return colors[contentType] || colors.default;
  }, []);

  const generateFusionLabel = useCallback((units) => {
    const types = units.map(u => u.contentType);
    return `${types.join(' + ')} Fusion`;
  }, []);

  return (
    <div className={`w-full h-full bg-gray-50 rounded-lg overflow-hidden ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background 
          variant="dots" 
          gap={20} 
          size={1} 
          color="#94a3b8"
        />
        
        <MiniMap
          nodeColor={(node) => {
            if (node.id === 'processing') return '#4f46e5';
            if (node.id === 'fused-output') return '#10b981';
            return '#6b7280';
          }}
          style={{
            height: 80,
            width: 120,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}
        />
        
        <Controls
          style={{
            button: {
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#374151'
            }
          }}
        />
        
        <Panel position="top-left" className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-sm font-semibold text-gray-700">
            Data Flow Visualization
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {fusedUnits.length} units → AI Fusion
          </div>
        </Panel>

        <Panel position="top-right" className="bg-indigo-100/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs text-indigo-800">
            <div className="font-semibold">Processing Status</div>
            <div className="mt-1">
              ✓ Units connected<br/>
              ✓ Data flowing<br/>
              ⚡ AI processing active
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default UnitizerFlowView;