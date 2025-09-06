// src/components/tabs/DocumentSorterTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ProjectData, InboxDocuments } from '../../data/MockData';
import DocumentCarousel from '../DocumentCarousel';
import TargetArea from '../TargetArea';
import AgentDebugTerminal from '../AgentDebugTerminal';
import { Mic } from 'lucide-react';

const DocumentSorterTab = () => {
  const [documents, setDocuments] = useState(InboxDocuments);
  const [activeIndex, setActiveIndex] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugTerminal, setShowDebugTerminal] = useState(true);

  const activeDocument = documents[activeIndex] || null;

  // Simuliranje debug logova
  useEffect(() => {
    const addDebugLog = (type, message) => {
      const newLog = {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
      };
      setDebugLogs(prev => [...prev.slice(-20), newLog]); // Čuva zadnjih 20 logova
    };

    // Početni debug log
    addDebugLog('info', 'Agent Debug Terminal inicijalizovan');
    addDebugLog('info', `Učitano ${documents.length} dokumenata`);
    
    // Simulacija debug aktivnosti
    const interval = setInterval(() => {
      const messages = [
        { type: 'info', msg: 'Skeniranje AI koeficijenata...' },
        { type: 'success', msg: 'Pronađena visoka vjerojatnost match-a' },
        { type: 'warning', msg: 'Niska confidence za neki projekt' },
        { type: 'info', msg: 'Ažuriranje glow efekta' },
      ];
      
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      addDebugLog(randomMsg.type, randomMsg.msg);
    }, 3000);

    return () => clearInterval(interval);
  }, [documents.length]);

  // Pripremi sve pozicije u jednu listu za donji dio
  const allPositions = useMemo(() => {
    return ProjectData.flatMap(p =>
      p.positions.map(pos => ({ ...pos, name: pos.title, projectName: p.name, projectColor: p.color }))
    );
  }, []);

  const handleAssign = (docId, targetId, targetType) => {
    console.log(`Assigned Doc ${docId} to ${targetType}: ${targetId}`);
    // Logika za uklanjanje dokumenta i ažuriranje stanja
    const newDocuments = documents.filter(doc => doc.id !== docId);

     // Mali delay za bolji UX
     setTimeout(() => {
        setDocuments(newDocuments);
        // Reset index da se fokusira na sljedeći dokument
        if (activeIndex >= newDocuments.length && newDocuments.length > 0) {
            setActiveIndex(newDocuments.length - 1);
        } else if (newDocuments.length === 0) {
            setActiveIndex(0);
        }
    }, 200);
  };

  const handleVoiceCommand = () => {
      alert("Glasovno upravljanje aktivirano. Npr. 'Dodijeli Projektu Istok' ili 'Potvrdi sugestiju'.");
      // Ovdje bi išla stvarna implementacija Web Speech API-ja
  };

  // Handler za chat fallback aktivaciju
  const handleChatFallback = () => {
    setDebugLogs(prev => [...prev, {
      type: 'warning',
      message: 'Chat fallback aktiviran - prebacivanje na interaktivni mod',
      timestamp: new Date().toLocaleTimeString(),
    }]);
  };

  // Efekt paralakse: Pomicanje gornjeg/donjeg sloja suprotno od indeksa karusela
  // Ovo stvara suptilan osjećaj dubine pri navigaciji
  const parallaxOffset = (activeIndex - (documents.length - 1) / 2) * -10;

  // Postavljanje teme (npr. dark-fluent) na body za ispravan prikaz stilova i pozadine
  useEffect(() => {
    document.body.classList.add('theme-dark-fluent');
    return () => document.body.classList.remove('theme-dark-fluent');
  }, []);

  return (
    // Koristimo flex-col za vertikalni raspored i podjelu visine (cca 25%, 45%, 30%)
    <div className="relative h-screen w-full overflow-hidden flex flex-col p-8 fade-in-up">

       {/* Pozadinski Blobs (trebali bi biti u root elementu aplikacije) */}
       <div className="app-bg">
        <div className="app-bg__blobs">
          <div className="blob blob1"></div>
          <div className="blob blob2"></div>
          <div className="blob blob3"></div>
        </div>
      </div>

      {/* 1. Gornji dio: Projekti (Koristi Paralaxu) */}
      <motion.div
        className="flex-none h-1/4 relative z-10"
        animate={{ x: parallaxOffset }}
        transition={{ type: "spring", stiffness: 150, damping: 25 }}
      >
        <TargetArea
          title="Projekti"
          items={ProjectData}
          activeProbabilities={activeDocument?.aiProbabilities}
          onDrop={(targetId) => handleAssign(activeDocument.id, targetId, 'Project')}
          type="project"
        />
      </motion.div>

      {/* 2. Središnji dio: Karusel Dokumenata */}
      <div className="flex-shrink-0 h-[45%] py-6 relative z-20 border-t border-b border-theme">
        {documents.length > 0 ? (
            <DocumentCarousel
                documents={documents}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
            />
        ) : (
            <div className="flex items-center justify-center h-full text-theme-heading text-2xl">
                Svi dokumenti su uspješno raspoređeni. Bravo!
            </div>
        )}

        {/* Voice Command Button & Debug Toggle */}
        {documents.length > 0 && (
            <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3'>
                <button
                    onClick={handleVoiceCommand}
                    className="l-btn--primary l-btn shadow-xl rounded-full p-4 hover:scale-110 transition-transform"
                    title="Glasovno dodjeljivanje"
                >
                    <Mic size={24}/>
                </button>
                
                <button
                    onClick={() => setShowDebugTerminal(!showDebugTerminal)}
                    className={`l-btn shadow-xl rounded-full p-4 hover:scale-110 transition-transform ${
                        showDebugTerminal ? 'l-btn--success' : 'l-btn--subtle'
                    }`}
                    title="Toggle Debug Terminal"
                >
                    🐛
                </button>
            </div>
        )}
      </div>

      {/* 3. Donji dio: Pozicije (Koristi Paralaxu, malo sporiju) */}
      <motion.div
        className="flex-none h-[30%] pt-4 relative z-10"
        animate={{ x: parallaxOffset * 0.8 }}
        transition={{ type: "spring", stiffness: 150, damping: 25 }}
      >
        <TargetArea
          title="Pozicije"
          items={allPositions}
          activeProbabilities={activeDocument?.aiProbabilities}
          onDrop={(targetId) => handleAssign(activeDocument.id, targetId, 'Position')}
          type="position"
        />
      </motion.div>

      {/* Agent Debug Terminal - Positioned to the right */}
      <AgentDebugTerminal
        isVisible={showDebugTerminal}
        debugLogs={debugLogs}
        onChatFallback={handleChatFallback}
      />
    </div>
  );
};

export default DocumentSorterTab;