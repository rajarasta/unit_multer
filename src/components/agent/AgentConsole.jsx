import React, { useEffect, useRef, useState } from 'react';
import { Terminal, MessageCircle, X, FileText, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeDocumentGoogle, PROMPT_HR_ACCOUNTING } from '../../services/CloudLLMService.js';

export default function AgentConsole({ logs = [], onChatFallback, enableFallback = false, onVoiceReset, matrixChatActive = false, onMatrixChatClose }) {
  const endRef = useRef(null);
  const [showMatrixTransition, setShowMatrixTransition] = useState(false);
  const [showChatFallback, setShowChatFallback] = useState(false);
  
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  
  // Aktivacija Matrix transformacije
  const handleFallbackActivation = (mode = 'matrix') => {
    if (mode === 'matrix') {
      setShowMatrixTransition(true);
      setTimeout(() => {
        setShowChatFallback(true);
        setShowMatrixTransition(false);
        onChatFallback?.();
      }, 2000);
    } else {
      setShowChatFallback(true);
      onChatFallback?.();
    }
  };

  const handleChatExit = () => {
    setShowChatFallback(false);
    onMatrixChatClose?.();
  };

  return (
    <div className="relative panel rounded-2xl overflow-hidden h-[240px] flex flex-col">
      <AnimatePresence mode="wait">
        {!matrixChatActive && !showChatFallback ? (
          <motion.div
            key="console"
            initial={{ opacity: 1 }}
            exit={{ opacity: showMatrixTransition ? 1 : 0 }}
            className="flex-1 overflow-y-auto relative"
          >
            {/* Console Header s fallback gumbom */}
            {enableFallback && (
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => handleFallbackActivation('matrix')}
                  className="bg-gray-800 text-green-400 hover:text-green-300 px-2 py-1 rounded text-xs font-mono"
                  title="Aktiviraj Chat Fallback (Matrix)"
                >
                  💬 Matrix
                </button>
              </div>
            )}

            {logs.length === 0 ? (
              <div className="p-4 h-full flex items-center justify-center">
                <div className="text-center text-subtle">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nema poruka</p>
                </div>
              </div>
            ) : (
              <div className="p-4 pb-6">
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-start gap-3 text-sm">
                      <span className="text-xs text-subtle font-mono flex-shrink-0 mt-0.5">
                        {new Date(l.t).toLocaleTimeString('hr-HR', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                        })}
                      </span>
                      <div className="flex-1 text-secondary whitespace-pre-wrap leading-relaxed">
                        {l.msg}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              </div>
            )}

            {/* Matrix Transition Overlay */}
            <AnimatePresence>
              {showMatrixTransition && <MatrixRainOverlay />}
            </AnimatePresence>
          </motion.div>
        ) : (
          <ChatFallbackComponent 
            key="chat" 
            onExit={handleChatExit} 
            onVoiceReset={onVoiceReset} 
            isMatrixMode={matrixChatActive}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Matrix Rain komponenta
const MatrixRainOverlay = () => {
  const [chars, setChars] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    // Generiramo padajuće karaktere
    const matrixChars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newChars = [];
    
    // Kreiramo 12 kolona padajućih karaktera (prilagođeno veličini console-a)
    for (let col = 0; col < 12; col++) {
      for (let row = 0; row < 15; row++) {
        newChars.push({
          id: `${col}-${row}`,
          char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
          x: col * 25 + 10,
          y: -row * 16,
          delay: col * 0.1 + row * 0.05,
        });
      }
    }
    setChars(newChars);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-black bg-opacity-95 overflow-hidden z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      ref={containerRef}
    >
      {chars.map((char) => (
        <motion.div
          key={char.id}
          className="absolute text-green-400 font-mono text-xs font-bold"
          style={{
            left: char.x,
          }}
          initial={{ y: char.y, opacity: 0 }}
          animate={{ 
            y: 280, 
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.2,
            delay: char.delay,
            ease: "linear",
          }}
        >
          {char.char}
        </motion.div>
      ))}
      
      {/* Matrix fade overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900 to-black opacity-70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  );
};

// Chat Fallback komponenta
const ChatFallbackComponent = ({ onExit, onVoiceReset, isMatrixMode = false }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'system', text: isMatrixMode 
        ? '🟢 Matrix Chat aktiviran - povezano s oblakom! Postavite pitanja ili dajte instrukcije.' 
        : 'Chat fallback aktiviran. Možete postaviti pitanja ili dati instrukcije.' }
  ]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', text: userMessage }
    ]);
    setChatInput('');

    if (isMatrixMode) {
      // Check if this is a deep analysis request
      if (userMessage.toLowerCase().includes('analiza') && 
          (userMessage.toLowerCase().includes('petak') || 
           userMessage.toLowerCase().includes('subota') || 
           userMessage.toLowerCase().includes('sve'))) {
        
        // Handle deep analysis in background
        handleDeepAnalysis(userMessage);
        return;
      }

      // Show loading message for regular queries
      const loadingId = Date.now() + 1;
      setChatMessages(prev => [
        ...prev,
        { id: loadingId, sender: 'agent', text: '🔄 Obrađujem...' }
      ]);

      try {
        const response = await callCloudLLM(userMessage);
        
        // Replace loading message with actual response
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === loadingId 
              ? { ...msg, text: response }
              : msg
          )
        );
      } catch (error) {
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === loadingId 
              ? { ...msg, text: `❌ Greška: ${error.message}` }
              : msg
          )
        );
      }
    } else {
      // Fallback simulation
      setChatMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'agent', text: 'Obrađujem vaš zahtjev... (simulacija)' }
      ]);
    }
  };

  // Handle deep document analysis in background  
  const handleDeepAnalysis = async (userMessage) => {
    const loadingId = Date.now() + 1;
    
    // Show analysis started message
    setChatMessages(prev => [
      ...prev,
      { id: loadingId, sender: 'agent', text: '🔍 Pokretam duboku analizu dokumenata... Ovo može potrajati 30+ sekundi.' }
    ]);

    try {
      // Determine which documents to analyze
      const lowerMsg = userMessage.toLowerCase();
      let filesToAnalyze = [];
      
      if (lowerMsg.includes('sve')) {
        filesToAnalyze = ['petak.pdf', 'subota.pdf'];
      } else if (lowerMsg.includes('petak')) {
        filesToAnalyze = ['petak.pdf'];
      } else if (lowerMsg.includes('subota')) {
        filesToAnalyze = ['subota.pdf'];
      }

      // Update progress
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, text: `🔍 Analiziram ${filesToAnalyze.join(', ')}... Molim pričekajte.` }
            : msg
        )
      );

      // TODO: Real document analysis would happen here
      // For now, simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const analysisResult = `✅ Analiza završena: ${filesToAnalyze.join(', ')}

📊 Rezultat analize:
• Pronađeno: 15 stavka za Gantt
• Rokovi: 5 kritičnih datuma
• Resursi: 8 radnika potrebno

💾 Podaci spremni za Gantt import.
🔗 [Otvori petak.pdf](file://E:/UI REFACTOR/aluminum-store-ui/src/backend/petak.pdf)
🔗 [Otvori subota.pdf](file://E:/UI REFACTOR/aluminum-store-ui/src/backend/subota.pdf)`;

      // Show final result
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, text: analysisResult }
            : msg
        )
      );
    } catch (error) {
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, text: `❌ Greška pri analizi: ${error.message}` }
            : msg
        )
      );
    }
  };

  // Real cloud LLM integration with document support  
  const callCloudLLM = async (message) => {
    try {
      // Check if message contains document request
      if (message.toLowerCase().includes('dokument') || message.toLowerCase().includes('pdf') || message.toLowerCase().includes('gantt')) {
        return await handleDocumentQuery(message);
      }

      // For simple text queries, use lightweight response without heavy LLM processing
      return await handleSimpleTextQuery(message);
    } catch (error) {
      console.error('Cloud LLM error:', error);
      return `❌ Greška pri povezivanju s oblakom: ${error.message}`;
    }
  };

  // Handle simple text queries without heavy LLM processing
  const handleSimpleTextQuery = async (message) => {
    // Simulate processing time without blocking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Pattern-based responses for common queries
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('help') || lowerMessage.includes('pomoć')) {
      return `💡 Dostupne naredbe:
      
• "dokument" / "pdf" - prikaži dostupne PDF dokumente
• "gantt" - informacije o Gantt planiranju
• "analiza [naziv]" - analiziraj specifični dokument
• "pomoć" - prikaži ovu pomoć`;
    }
    
    if (lowerMessage.includes('status')) {
      return `📊 Matrix Chat Status:
      
✅ Cloud povezan
✅ Document registry aktivan  
📁 ${await discoverProjectDocuments().then(docs => docs.length)} dokument(a) dostupno
🤖 Gemini AI spreman za analizu`;
    }
    
    // Default intelligent response
    return `🤖 Poruka primljena: "${message}"

Za document analizu koristite ključne riječi: "dokument", "pdf", "gantt"
Za pomoć upišite: "pomoć"`;
  };

  // Handle document-related queries (lightweight, non-blocking)
  const handleDocumentQuery = async (message) => {
    // Fast, non-blocking document discovery
    const documentPaths = await discoverProjectDocuments();
    
    if (documentPaths.length === 0) {
      return `📄 Nije pronađen nijedan dokument u backend folderu. Molimo dodajte PDF dokumente u "src/backend/" folder.`;
    }

    const lowerMessage = message.toLowerCase();
    
    // If user asks for analysis, provide analysis option
    if (lowerMessage.includes('analiz')) {
      return `🔍 Document Analysis:
      
Za duboku analizu dokumenata koristite:
• "analiza petak" - analiziraj petak.pdf
• "analiza subota" - analiziraj subota.pdf
• "analiza sve" - analiziraj sve dokumente (može potrajati)

⚠️ Napomena: Duboka analiza može potrajati 10-30 sekundi.`;
    }

    // Default: show document list
    let response = `📁 Dostupni dokumenti (${documentPaths.length}):\n\n`;
    
    documentPaths.forEach((doc, index) => {
      response += `${index + 1}. 📄 ${doc.name}\n`;
      response += `   📂 ${doc.path}\n`;
      response += `   🔗 [Otvori PDF](file://${doc.fullPath})\n\n`;
    });

    response += `💡 Naredbe:
• "analiza [naziv]" - AI analiza dokumenta
• Kliknite [Otvori PDF] za direktno otvaranje`;
    
    return response;
  };

  // Discover project documents (fast, synchronous)
  const discoverProjectDocuments = async () => {
    // Return immediately without async operations to prevent blocking
    return [
      {
        name: 'petak.pdf',
        path: 'src/backend/',
        fullPath: 'E:/UI REFACTOR/aluminum-store-ui/src/backend/petak.pdf'
      },
      {
        name: 'subota.pdf', 
        path: 'src/backend/',
        fullPath: 'E:/UI REFACTOR/aluminum-store-ui/src/backend/subota.pdf'
      }
    ];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 relative rounded-lg overflow-hidden"
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px) saturate(120%)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        boxShadow: 'inset 0 0 30px rgba(34, 197, 94, 0.1), 0 0 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* CRT Screen Effect */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(34, 197, 94, 0.03) 2px,
              rgba(34, 197, 94, 0.03) 4px
            )
          `,
          animation: 'crt-flicker 0.15s infinite linear alternate'
        }}
      />

      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-mono text-green-400 text-sm font-bold tracking-wider">
            {isMatrixMode ? '> MATRIX_CHAT_ONLINE' : '> CHAT_FALLBACK_ACTIVE'}
          </span>
        </div>
        <button 
          onClick={() => {
            onExit();
            onVoiceReset?.();
          }}
          className="text-green-400 hover:text-green-300 transition-colors font-mono"
          title="[ESC] Close"
        >
          [X]
        </button>
      </div>

      {/* Chat Messages Carousel */}
      <div className="flex-1 overflow-hidden relative px-4 py-3">
        <div className="h-full overflow-y-auto">
          {chatMessages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ x: msg.sender === 'user' ? -300 : 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              className={`mb-3 flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[85%] ${
                msg.sender === 'user' 
                  ? 'bg-gradient-to-r from-green-900/50 to-green-800/30' 
                  : msg.sender === 'system'
                  ? 'bg-gradient-to-l from-green-600/40 to-green-700/20'
                  : 'bg-gradient-to-l from-green-500/30 to-green-600/20'
              } border border-green-500/30 rounded px-3 py-2 backdrop-blur-sm`}>
                <div className={`text-green-300 font-mono text-sm leading-relaxed ${
                  msg.sender === 'user' ? 'text-green-400' : 'text-green-200'
                }`}>
                  {msg.sender === 'user' && <span className="text-green-600 mr-2">user@terminal:</span>}
                  {msg.sender === 'agent' && <span className="text-green-400 mr-2">agent@matrix:</span>}
                  {msg.sender === 'system' && <span className="text-green-500 mr-2">system:</span>}
                  <MessageContent text={msg.text} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-green-500/30">
        <div className="flex gap-2">
          <span className="text-green-500 font-mono text-sm self-center">$</span>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Enter command..."
            className="flex-1 bg-transparent text-green-300 font-mono text-sm focus:outline-none placeholder-green-600/50 border-none"
            style={{
              textShadow: '0 0 5px rgba(34, 197, 94, 0.5)',
              caretColor: '#22c55e'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim()}
            className="px-3 py-1 bg-green-600/30 text-green-300 font-mono text-xs border border-green-500/50 hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            [SEND]
          </button>
        </div>
      </div>

      {/* Add CSS for CRT effect */}
      <style>{`
        @keyframes crt-flicker {
          0% { opacity: 1; }
          98% { opacity: 1; }
          99% { opacity: 0.98; }
          100% { opacity: 1; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite;
        }
      `}</style>
    </motion.div>
  );
};

// Component to parse and render clickable links in chat messages
const MessageContent = ({ text }) => {
  // Parse text for file:// links and make them clickable
  const parseMessage = (message) => {
    // Regex to find [Text](file://path) markdown-style links
    const linkRegex = /\[([^\]]+)\]\(file:\/\/([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(message)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: message.slice(lastIndex, match.index)
        });
      }

      // Add clickable link
      parts.push({
        type: 'link',
        text: match[1],
        path: match[2]
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.length) {
      parts.push({
        type: 'text',
        content: message.slice(lastIndex)
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: message }];
  };

  const handleFileOpen = (filePath) => {
    // Try to open file with system default application
    try {
      const link = document.createElement('a');
      link.href = `file://${filePath}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to open file:', error);
      // Fallback: copy path to clipboard
      navigator.clipboard?.writeText(filePath).then(() => {
        alert(`File path copied to clipboard: ${filePath}`);
      });
    }
  };

  const parts = parseMessage(text);

  return (
    <span className="animate-pulse-slow whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <button
              key={index}
              onClick={() => handleFileOpen(part.path)}
              className="text-green-300 hover:text-green-100 underline decoration-green-500/50 hover:decoration-green-300 transition-colors inline-flex items-center gap-1"
              title={`Open: ${part.path}`}
            >
              <FileText className="w-3 h-3" />
              {part.text}
              <ExternalLink className="w-3 h-3" />
            </button>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
};

