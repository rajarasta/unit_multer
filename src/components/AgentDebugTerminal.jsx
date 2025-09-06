// src/components/AgentDebugTerminal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, Zap } from 'lucide-react';

const AgentDebugTerminal = ({ isVisible, debugLogs, onChatFallback }) => {
  const [transformMode, setTransformMode] = useState('none'); // 'none', 'slide', 'matrix', 'dissolve'
  const [showChat, setShowChat] = useState(false);
  const terminalRef = useRef(null);
  const logsEndRef = useRef(null);

  // Auto-scroll do kraja logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debugLogs]);

  // Simulate debug activity
  const [isProcessing, setIsProcessing] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setIsProcessing(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handler za aktivaciju chat fallback-a
  const handleFallbackActivation = (mode = 'matrix') => {
    setTransformMode(mode);
    
    if (mode === 'matrix') {
      // Matrix animacija traje 2 sekunde prije chat prikaza
      setTimeout(() => {
        setShowChat(true);
        onChatFallback?.();
      }, 2000);
    } else {
      setShowChat(true);
      onChatFallback?.();
    }
  };

  // Reset funkcija
  const handleChatExit = () => {
    setShowChat(false);
    setTransformMode('none');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-80 h-96 z-30">
      <AnimatePresence mode="wait">
        {!showChat ? (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-2xl"
            ref={terminalRef}
          >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-green-400" />
                <span className="text-green-400 font-mono text-sm">Agent Debug</span>
                {isProcessing && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Activity size={14} className="text-yellow-400" />
                  </motion.div>
                )}
              </div>
              
              {/* Test buttons za development */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleFallbackActivation('slide')}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  title="Test Slide"
                >
                  S
                </button>
                <button
                  onClick={() => handleFallbackActivation('matrix')}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  title="Test Matrix"
                >
                  M
                </button>
                <button
                  onClick={() => handleFallbackActivation('dissolve')}
                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                  title="Test Dissolve"
                >
                  D
                </button>
              </div>
            </div>

            {/* Terminal Content - Scroll Area */}
            <div className="h-full overflow-y-auto p-4 font-mono text-sm">
              <div className="space-y-1">
                {debugLogs?.map((log, index) => (
                  <div key={index} className={`flex gap-2 ${getLogColor(log.type)}`}>
                    <span className="text-gray-500 w-16 flex-shrink-0">
                      {log.timestamp?.split(' ')[1] || new Date().toLocaleTimeString().split(' ')[0]}
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
                {debugLogs?.length === 0 && (
                  <div className="text-gray-500 italic">Waiting for debug messages...</div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Matrix Rain Overlay */}
            <AnimatePresence>
              {transformMode === 'matrix' && (
                <MatrixRainOverlay onComplete={() => setTransformMode('none')} />
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <ChatFallbackComponent 
            key="chat"
            onExit={handleChatExit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper function za log colors
const getLogColor = (type) => {
  switch (type) {
    case 'error': return 'text-red-400';
    case 'warning': return 'text-yellow-400';
    case 'success': return 'text-green-400';
    case 'info': return 'text-blue-400';
    default: return 'text-gray-300';
  }
};

// Matrix Rain komponenta
const MatrixRainOverlay = ({ onComplete }) => {
  const [chars, setChars] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    // Generiramo padajuće karaktere
    const matrixChars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newChars = [];
    
    // Kreiramo 15 kolona padajućih karaktera
    for (let col = 0; col < 15; col++) {
      for (let row = 0; row < 20; row++) {
        newChars.push({
          id: `${col}-${row}`,
          char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
          x: col * 20,
          y: -row * 20,
          delay: col * 0.1 + row * 0.05,
        });
      }
    }
    setChars(newChars);

    // Auto-complete nakon 2 sekunde
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute inset-0 bg-black bg-opacity-90 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      ref={containerRef}
    >
      {chars.map((char) => (
        <motion.div
          key={char.id}
          className="absolute text-green-400 font-mono text-sm font-bold"
          style={{
            left: char.x,
          }}
          initial={{ y: char.y, opacity: 0 }}
          animate={{ 
            y: 400, 
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: char.delay,
            ease: "linear",
          }}
        >
          {char.char}
        </motion.div>
      ))}
      
      {/* Matrix fade overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900 to-black opacity-60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  );
};

// Chat Fallback komponenta (placeholder)
const ChatFallbackComponent = ({ onExit }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full bg-white rounded-lg border border-gray-300 overflow-hidden shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Zap size={16} />
          <span className="font-semibold">Chat Fallback</span>
        </div>
        <button 
          onClick={onExit}
          className="text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
      <div className="p-4 h-full">
        <div className="text-gray-700">
          <p>Chat fallback aktiviran.</p>
          <p className="text-sm text-gray-500 mt-2">
            Ovdje će se prikazati chat interface kada se agent debug ne može riješiti sam.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AgentDebugTerminal;