import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Play, Square, Command, Palette, Sliders, Send } from 'lucide-react';
import { cycleTheme } from '../../../theme/manager';
import { chatCompletions } from '../../../agent/llmClient.js';

const IRIS3 = () => {
  const [activeTab, setActiveTab] = useState('prodaja');
  const [isListening, setIsListening] = useState(false);
  const [apiData, setApiData] = useState({
    lastPayload: null,
    lastResponse: null,
    timestamp: null
  });
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [glowIntensity, setGlowIntensity] = useState(1);
  const [glowDurationMs, setGlowDurationMs] = useState(200);
  const [showGlowSettings, setShowGlowSettings] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [prodajaResponse, setProdajaResponse] = useState('');
  const [schuroAnalysis, setSchuroAnalysis] = useState(null);
  const [showMiniContainers, setShowMiniContainers] = useState(false);
  const [projektDetails, setProjektDetails] = useState(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const recognitionRef = useRef(null);

  const tabs = [
    { id: 'prodaja', label: 'Prodaja' },
    { id: 'projektiranje', label: 'Projektiranje' },
    { id: 'priprema', label: 'Priprema' },
    { id: 'proizvodnja', label: 'Proizvodnja' }
  ];

  const startVoiceRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.error('Speech Recognition not supported');
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'hr-HR';
    
    recognition.onstart = () => {
      setCurrentTranscript('Slušam...');
      setApiData({
        lastPayload: { action: 'start_listening', timestamp: new Date().toISOString() },
        lastResponse: { status: 'success', message: 'Voice recognition started' },
        timestamp: new Date().toLocaleTimeString()
      });
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        setCurrentTranscript(interimTranscript);
      }

      if (finalTranscript.trim()) {
        processVoiceCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setCurrentTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setCurrentTranscript('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setCurrentTranscript('');
  };

  const checkImageExists = async (systemName) => {
    const imageName = `${systemName}.png`;
    try {
      const response = await fetch(`/demo_data/${imageName}`, { method: 'HEAD' });
      return response.ok ? `/demo_data/${imageName}` : null;
    } catch {
      return null;
    }
  };

  const checkDetailImage = async (imageName) => {
    try {
      const response = await fetch(`/demo_data2/${imageName}`, { method: 'HEAD' });
      return response.ok ? `/demo_data2/${imageName}` : null;
    } catch {
      return null;
    }
  };

  const extractJsonFromText = (text) => {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return text.slice(jsonStart, jsonEnd + 1);
    }
    return null;
  };

  const executeProdajaTool = async (llmResponse, userInput) => {
    try {
      let jsonStr = extractJsonFromText(llmResponse);
      
      if (!jsonStr) {
        throw new Error('No JSON found in response');
      }
      
      const analysis = JSON.parse(jsonStr);
      
      let imageUrl = null;
      if (analysis.brochure && analysis.brochure.system) {
        imageUrl = await checkImageExists(analysis.brochure.system);
      }
      
      // Check if user requested troskovnik comparison
      const checkTroskovnik = userInput.toLowerCase().includes('provjeri u troškovniku') || 
                            userInput.toLowerCase().includes('provjeri troškovnik') ||
                            userInput.toLowerCase().includes('usporedba troškovnik');
      
      let troskovnikComparison = null;
      if (checkTroskovnik && analysis.pricing && analysis.pricing.total) {
        const troskovnikPrice = 2000; // EUR - Fixed price from troskovnik
        const llmPrice = analysis.pricing.total;
        const difference = Math.abs(llmPrice - troskovnikPrice);
        const isHigher = llmPrice > troskovnikPrice;
        
        troskovnikComparison = {
          troskovnik_price: troskovnikPrice,
          llm_price: llmPrice,
          difference: difference,
          is_llm_higher: isHigher,
          color: isHigher ? 'red' : 'green',
          status: isHigher ? 'skuplje' : 'jeftinije'
        };
      }
      
      const enhancedAnalysis = {
        ...analysis,
        brochure: {
          ...analysis.brochure,
          image_url: imageUrl,
          has_image: !!imageUrl
        },
        troskovnik_check: troskovnikComparison
      };
      
      setSchuroAnalysis(enhancedAnalysis);
      setShowMiniContainers(true);
      
      const prodajaMessage = checkTroskovnik && troskovnikComparison 
        ? `${analysis.analysis?.sistema_selected} - ${analysis.tip?.selected} | Troškovnik: ${troskovnikComparison.difference}€ ${troskovnikComparison.status}`
        : `Analiziram Schüco sistem: ${analysis.analysis?.sistema_selected || 'N/A'} - ${analysis.tip?.selected || 'N/A'}`;
      setProdajaResponse(prodajaMessage);
      
      return prodajaMessage;
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.log('Original LLM Response:', llmResponse);
      console.log('User Input:', userInput);
      
      // Generate more realistic mock based on user input
      let detectedTip = 'prozor';
      if (userInput.toLowerCase().includes('vrata') || userInput.toLowerCase().includes('door')) {
        detectedTip = 'vrata';
      } else if (userInput.toLowerCase().includes('fasad') || userInput.toLowerCase().includes('facade')) {
        detectedTip = 'fasada';
      } else if (userInput.toLowerCase().includes('prozor') || userInput.toLowerCase().includes('window')) {
        detectedTip = 'prozor';
      }
      
      let detectedSystem = 'AWS 65';
      if (userInput.toLowerCase().includes('50')) {
        detectedSystem = 'AWS 50';
      } else if (userInput.toLowerCase().includes('70')) {
        detectedSystem = 'AWS 70';
      } else if (userInput.toLowerCase().includes('ad up')) {
        detectedSystem = 'AD UP';
      }
      
      const mockAnalysis = {
        analysis: {
          sistema_considered: ["AWS 50", "AWS 65", "AWS 70"],
          sistema_selected: detectedSystem,
          reasoning: `Analizirano na temelju transkripte: "${userInput}"`
        },
        tip: {
          considered: ["vrata", "prozor", "fasada"],
          selected: detectedTip,
          reasoning: `Detektirano iz glasovnog unosa korisnika`
        },
        brochure: {
          system: detectedSystem,
          image_url: null,
          has_image: false
        },
        pricing: {
          materijal: Math.floor(Math.random() * 800) + 800,
          staklo: Math.floor(Math.random() * 400) + 400,
          rad: Math.floor(Math.random() * 300) + 300,
          total: 0,
          currency: "EUR"
        },
        location: "Zagreb, Hrvatska"
      };
      
      // Calculate total
      mockAnalysis.pricing.total = mockAnalysis.pricing.materijal + mockAnalysis.pricing.staklo + mockAnalysis.pricing.rad;
      
      // Check for troskovnik comparison in fallback mode too
      const checkTroskovnik = userInput.toLowerCase().includes('provjeri u troškovniku') || 
                            userInput.toLowerCase().includes('provjeri troškovnik') ||
                            userInput.toLowerCase().includes('usporedba troškovnik');
      
      let troskovnikComparison = null;
      if (checkTroskovnik && mockAnalysis.pricing && mockAnalysis.pricing.total) {
        const troskovnikPrice = 2000; // EUR - Fixed price from troskovnik
        const llmPrice = mockAnalysis.pricing.total;
        const difference = Math.abs(llmPrice - troskovnikPrice);
        const isHigher = llmPrice > troskovnikPrice;
        
        troskovnikComparison = {
          troskovnik_price: troskovnikPrice,
          llm_price: llmPrice,
          difference: difference,
          is_llm_higher: isHigher,
          color: isHigher ? 'red' : 'green',
          status: isHigher ? 'skuplje' : 'jeftinije'
        };
      }
      
      mockAnalysis.troskovnik_check = troskovnikComparison;
      
      let imageUrl = await checkImageExists(mockAnalysis.brochure.system);
      mockAnalysis.brochure.image_url = imageUrl;
      mockAnalysis.brochure.has_image = !!imageUrl;
      
      setSchuroAnalysis(mockAnalysis);
      setShowMiniContainers(true);
      
      const fallbackMessage = checkTroskovnik && troskovnikComparison 
        ? `[DEMO] ${mockAnalysis.analysis.sistema_selected} - ${mockAnalysis.tip.selected} | Troškovnik: ${troskovnikComparison.difference}€ ${troskovnikComparison.status}`
        : `[SMART DEMO] ${mockAnalysis.analysis.sistema_selected} - ${mockAnalysis.tip.selected} (iz transkripte)`;
      setProdajaResponse(fallbackMessage);
      return fallbackMessage;
    }
  };

  const executeProjektiranjeStandardniTool = async (userInput) => {
    try {
      // Check if user requested standard details
      if (userInput.toLowerCase().includes('primjeni standardne detalje') || 
          userInput.toLowerCase().includes('standardni detalji')) {
        
        const currentSystem = schuroAnalysis?.analysis?.sistema_selected || 'AWS 65';
        
        // Load default detail images
        const detailImages = {
          shema: await checkDetailImage('shema.png'),
          donji_detalj: await checkDetailImage('donji_detalj1.png'),
          bocni_detalj: await checkDetailImage('bocni_detalj.png'),
          gornji_detalj: await checkDetailImage('gornji_detalj1.png')
        };
        
        const projektData = {
          system: currentSystem,
          product_type: schuroAnalysis?.tip?.selected || 'prozor',
          details: {
            shema: {
              image_url: detailImages.shema,
              name: 'Shema',
              has_image: !!detailImages.shema
            },
            donji_detalj: {
              image_url: detailImages.donji_detalj,
              name: 'Donji detalj',
              variant: 'donji_detalj1',
              has_image: !!detailImages.donji_detalj
            },
            bocni_detalj: {
              image_url: detailImages.bocni_detalj,
              name: 'Bočni detalj',
              has_image: !!detailImages.bocni_detalj
            },
            gornji_detalj: {
              image_url: detailImages.gornji_detalj,
              name: 'Gornji detalj',
              variant: 'gornji_detalj1',
              has_image: !!detailImages.gornji_detalj
            }
          },
          transferred_from_prodaja: true,
          original_analysis: schuroAnalysis
        };
        
        setProjektDetails(projektData);
        setShowProjectDetails(true);
        setShowMiniContainers(false); // Hide prodaja containers (1. tura)
        
        // Turn off microphone after showing projektiranje containers
        setTimeout(() => {
          stopVoiceRecognition();
          setIsListening(false);
        }, 1000);
        
        return `Primjenjeni standardni detalji za ${currentSystem}`;
      }
      
      // Handle detail switching commands
      if (projektDetails && (userInput.toLowerCase().includes('promijeni donji') || userInput.toLowerCase().includes('donji detalj 2'))) {
        const newVariant = projektDetails.details.donji_detalj.variant === 'donji_detalj1' ? 'donji_detalj2' : 'donji_detalj1';
        const newImageUrl = await checkDetailImage(`${newVariant}.png`);
        
        const updatedDetails = {
          ...projektDetails,
          details: {
            ...projektDetails.details,
            donji_detalj: {
              ...projektDetails.details.donji_detalj,
              image_url: newImageUrl,
              variant: newVariant,
              has_image: !!newImageUrl
            }
          }
        };
        
        setProjektDetails(updatedDetails);
        return `Promijenjen donji detalj na ${newVariant}`;
      }
      
      if (projektDetails && (userInput.toLowerCase().includes('promijeni gornji') || userInput.toLowerCase().includes('gornji detalj 2'))) {
        const newVariant = projektDetails.details.gornji_detalj.variant === 'gornji_detalj1' ? 'gornji_detalj2' : 'gornji_detalj1';
        const newImageUrl = await checkDetailImage(`${newVariant}.png`);
        
        const updatedDetails = {
          ...projektDetails,
          details: {
            ...projektDetails.details,
            gornji_detalj: {
              ...projektDetails.details.gornji_detalj,
              image_url: newImageUrl,
              variant: newVariant,
              has_image: !!newImageUrl
            }
          }
        };
        
        setProjektDetails(updatedDetails);
        return `Promijenjen gornji detalj na ${newVariant}`;
      }
      
      return 'Nepoznata naredba za projektiranje. Koristite "Primjeni standardne detalje", "Promijeni donji detalj" ili "Promijeni gornji detalj"';
    } catch (error) {
      console.error('Projektiranje tool error:', error);
      return 'Greška pri primjeni standardnih detalja';
    }
  };

  const processVoiceCommand = async (transcript) => {
    setIsProcessing(true);
    
    let systemPrompt, payload;

    if (activeTab === 'prodaja') {
      systemPrompt = `Ti si specijalist za SCHÜCO aluminijske sustave. Analiziraj korisnikov glasovni unos.

VAŽNO: Korisnik traži SCHÜCO aluminijske profile za gradnju, NE IT sustave!

DOSTUPNI SCHÜCO SISTEMI:
- AD UP (aluminijski sistem za vrata)
- AWS 50 (prozorski sistem) 
- AWS 65 (prozorski sistem)
- AWS 70 (prozorski sistem)
- FW 50+ SG (fasadni sistem)
- FWS 50 S (fasadni sistem)
- FWS 50 (fasadni sistem)

Analiziraj transkript: "${transcript}"

OBAVEZNO vrati TOČNO ovaj JSON format (ništa drugo):

{
  "analysis": {
    "sistema_considered": ["AWS 50", "AWS 65", "AWS 70"],
    "sistema_selected": "AWS 65",
    "reasoning": "Korisnik je spomenuo..."
  },
  "tip": {
    "considered": ["vrata", "prozor", "fasada"],
    "selected": "prozor",
    "reasoning": "Na temelju konteksta..."
  },
  "brochure": {
    "system": "AWS 65"
  },
  "pricing": {
    "materijal": 1200,
    "staklo": 650,
    "rad": 450,
    "total": 2300,
    "currency": "EUR"
  },
  "location": "Zagreb, Hrvatska"
}`;

      payload = {
        command: transcript,
        tool_call: 'schuco_analysis',
        context: {
          active_tab: activeTab,
          system_prompt: systemPrompt,
          location: "Zagreb, Hrvatska",
          timestamp: new Date().toISOString()
        }
      };
    } else if (activeTab === 'projektiranje') {
      // Handle projektiranje tab voice commands
      systemPrompt = `Ti si SCHÜCO projektant specijalist za standardne detalje.
Tvoja uloga je obrada glasovnih naredbi za projektiranje aluminijskih sustava.

DOSTUPNE NAREDBE:
- "Primjeni standardne detalje" - učitaj standardne detalje za trenutni sistem
- "Promijeni donji detalj" - prebaci na donji_detalj2
- "Promijeni gornji detalj" - prebaci na gornji_detalj2
- "Vrati na originalne detalje" - vrati donji_detalj1 i gornji_detalj1

Trenutni sistem: ${schuroAnalysis?.analysis?.sistema_selected || 'N/A'}
Komanda: "${transcript}"`;

      payload = {
        command: transcript,
        tool_call: 'projektiranje_details',
        context: {
          active_tab: activeTab,
          system_prompt: systemPrompt,
          current_system: schuroAnalysis?.analysis?.sistema_selected,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      systemPrompt = `Ti si AI asistent za IRI S3 sistem (Intelligent Resource Integration - Storage 3).
Tvoja uloga je da pomogneš korisnicima sa pitanjima vezanim za:
- Upravljanje resursima i skladištem
- S3 storage sisteme  
- Prodaju, projektovanje, pripremu i proizvodnju
- Opšta pitanja vezana za poslovne procese

Odgovaraj kratko i jasno na hrvatskom jeziku. Trenutno aktivni tab je: ${tabs.find(t => t.id === activeTab)?.label}`;

      payload = {
        command: transcript,
        context: {
          active_tab: activeTab,
          system_prompt: systemPrompt,
          timestamp: new Date().toISOString()
        }
      };
    }

    setApiData({
      lastPayload: payload,
      lastResponse: null,
      timestamp: new Date().toLocaleTimeString()
    });

    try {
      const response = await fetch('/api/llm/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const llmResponse = result.response || result.message || 'No response';
      
      let finalResponse = llmResponse;
      
      if (activeTab === 'prodaja') {
        finalResponse = await executeProdajaTool(llmResponse, transcript);
      } else if (activeTab === 'projektiranje') {
        finalResponse = await executeProjektiranjeStandardniTool(transcript);
      }
      
      const chatEntry = {
        id: Date.now(),
        user: transcript,
        assistant: finalResponse,
        timestamp: new Date().toLocaleTimeString(),
        activeTab: activeTab,
        isToolCall: activeTab === 'prodaja' || activeTab === 'projektiranje'
      };

      setChatHistory(prev => [...prev, chatEntry]);
      
      setApiData(prev => ({
        ...prev,
        lastResponse: {
          status: response.ok ? 'success' : 'error',
          ...result,
          tool_executed: activeTab === 'prodaja' ? 'prodaja_tool' : activeTab === 'projektiranje' ? 'projektiranje_tool' : null
        }
      }));

      if (window.speechSynthesis && llmResponse) {
        const utterance = new SpeechSynthesisUtterance(llmResponse);
        utterance.lang = 'hr-HR';
        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      const errorResponse = `Greška pri komunikaciji sa serverom: ${error.message}`;
      
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        user: transcript,
        assistant: errorResponse,
        timestamp: new Date().toLocaleTimeString(),
        activeTab: activeTab,
        isError: true
      }]);

      setApiData(prev => ({
        ...prev,
        lastResponse: { 
          status: 'error', 
          message: error.message 
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      setIsListening(true);
      startVoiceRecognition();
    }
  };

  const handleTransfer = () => {
    if (schuroAnalysis) {
      // Transfer data and switch to projektiranje tab
      console.log('Prenošenje na projektiranje:', schuroAnalysis);
      
      // Switch to projektiranje tab
      setActiveTab('projektiranje');
      
      // Keep prodaja containers visible on projektiranje tab (1. tura)
      setShowMiniContainers(true);
      
      // Auto-activate microphone for projektiranje commands
      setIsListening(true);
      startVoiceRecognition();
      
      console.log(`Prebačeno na projektiranje: ${schuroAnalysis.analysis?.sistema_selected} - ${schuroAnalysis.tip?.selected}`);
    } else {
      alert('Nema podataka za prenošenje. Prvo izvedite analizu.');
    }
  };

  return (
    <div className="h-screen flex">
      <div className="flex-1 w-3/4 panel border-r border-theme">
        <div className="h-full flex flex-col">
          <header className="flex justify-between items-center p-4 px-8">
            <div className="flex items-center gap-4">
              <Command className="text-accent w-6 h-6"/>
              <h1 className="text-xl font-bold text-primary">IRI S3 Workspace</h1>
              <span className="input-bg px-3 py-1 rounded-full text-sm text-secondary border border-theme">Intelligent Resource Integration</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleListening}
                className={`panel p-2 rounded-full text-white transition shadow-md ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-accent hover:bg-accent/80'
                }`}
                title={isListening ? 'Zaustavi slušanje' : 'Započni slušanje'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button 
                onClick={handleTransfer}
                className={`panel p-2 rounded-full transition shadow-md ${
                  schuroAnalysis
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
                title={schuroAnalysis ? 'Prenesi analizu' : 'Nema podataka za prenos'}
                disabled={!schuroAnalysis}
              >
                <Send size={18} />
              </button>
              <div className="relative">
                <button onClick={()=>setShowGlowSettings(v=>!v)} className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" title="Glow postavke">
                  <Sliders size={18}/>
                </button>
                {showGlowSettings && (
                  <div className="absolute right-0 mt-2 w-64 panel p-3 border border-theme rounded-xl shadow-xl z-40">
                    <div className="text-sm font-semibold text-primary mb-2">Ambient Glow</div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span className="text-secondary">Uključen</span>
                      <input type="checkbox" checked={glowEnabled} onChange={(e)=>setGlowEnabled(e.target.checked)} />
                    </label>
                    <div className="mb-2">
                      <div className="text-xs text-secondary mb-1">Intenzitet: <span className="font-mono">{glowIntensity.toFixed(2)}</span></div>
                      <input type="range" min="0" max="1" step="0.05" value={glowIntensity} onChange={(e)=>setGlowIntensity(parseFloat(e.target.value))} className="w-full" />
                    </div>
                    <div className="mb-2">
                      <div className="text-xs text-secondary mb-1">Trajanje: <span className="font-mono">{glowDurationMs}ms</span></div>
                      <input type="range" min="100" max="800" step="25" value={glowDurationMs} onChange={(e)=>setGlowDurationMs(parseInt(e.target.value))} className="w-full" />
                    </div>
                  </div>
                )}
              </div>
              <button onClick={()=>cycleTheme()} className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" title="Promijeni stil">
                <Palette size={20}/>
              </button>
            </div>
          </header>
          
          <div className="border-b border-theme">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-secondary hover:text-primary hover:border-theme'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 flex flex-col p-8">
            {/* Mikrofon Section - Only show if no results */}
            {!(activeTab === 'prodaja' && showMiniContainers && schuroAnalysis) && (
              <div className="flex items-center justify-center mb-8">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleListening}
                  className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-300 ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-accent hover:bg-accent/80'
                  }`}
                  animate={isListening ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
                  style={glowEnabled && isListening ? {
                    boxShadow: `0 0 ${20 * glowIntensity}px rgba(239, 68, 68, ${0.5 * glowIntensity}), 0 0 ${40 * glowIntensity}px rgba(239, 68, 68, ${0.3 * glowIntensity})`
                  } : {}}
                >
                  {isListening ? (
                    <MicOff size={48} />
                  ) : (
                    <Mic size={48} />
                  )}
                </motion.button>
              </div>
            )}
            
            {/* Schüco Analysis Results - 1. tura (Prodaja i Projektiranje) */}
            {(activeTab === 'prodaja' || activeTab === 'projektiranje') && showMiniContainers && schuroAnalysis && (
              <div className="flex-1 overflow-y-auto">
                <div className="mb-4 text-center">
                  <button 
                    onClick={() => {
                      setShowMiniContainers(false);
                      setSchuroAnalysis(null);
                    }}
                    className="text-sm text-secondary hover:text-primary transition-colors"
                  >
                    ← Povratak na mikrofon
                  </button>
                  {activeTab === 'projektiranje' && (
                    <div className="text-xs text-accent mt-1">
                      Rečite "Primjeni standardne detalje" za prelazak na projektiranje prikaz
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-w-5xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg p-4 flex-1 flex flex-col"
                  >
                    <div className="text-xs text-accent font-semibold mb-3">1. SISTEM ANALIZA</div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {schuroAnalysis.analysis?.sistema_considered?.map((sistem, index) => (
                          <motion.div
                            key={sistem}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            className={`p-2 rounded-lg text-center text-xs font-medium border-2 ${
                              sistem === schuroAnalysis.analysis?.sistema_selected
                                ? 'bg-green-100 border-green-500 text-green-700'
                                : 'bg-red-100 border-red-300 text-red-600'
                            }`}
                          >
                            {sistem}
                          </motion.div>
                        ))}
                      </div>
                      
                      <div className="mt-auto">
                        <div className="text-xs font-medium text-primary mb-1">
                          Odabrano: {schuroAnalysis.analysis?.sistema_selected}
                        </div>
                        <div className="text-xs text-secondary">
                          {schuroAnalysis.analysis?.reasoning}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg p-4 flex-1 flex flex-col"
                  >
                    <div className="text-xs text-accent font-semibold mb-3">2. TIP PROIZVODA</div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between gap-2 mb-3">
                        {/* Vrata */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, duration: 0.3 }}
                          className={`flex-1 p-3 rounded-lg text-center border-2 ${
                            schuroAnalysis.tip?.selected === 'vrata'
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : schuroAnalysis.tip?.considered?.includes('vrata')
                              ? 'bg-red-100 border-red-300 text-red-600'
                              : 'bg-gray-100 border-gray-300 text-gray-500'
                          }`}
                        >
                          <div className="w-8 h-12 mx-auto mb-1 relative">
                            <div className="w-full h-full border-2 border-current rounded"></div>
                            <div className="absolute right-1 top-6 w-1 h-1 bg-current rounded-full"></div>
                            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-current"></div>
                          </div>
                          <div className="text-xs font-medium">Vrata</div>
                        </motion.div>

                        {/* Prozor */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.3 }}
                          className={`flex-1 p-3 rounded-lg text-center border-2 ${
                            schuroAnalysis.tip?.selected === 'prozor'
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : schuroAnalysis.tip?.considered?.includes('prozor')
                              ? 'bg-red-100 border-red-300 text-red-600'
                              : 'bg-gray-100 border-gray-300 text-gray-500'
                          }`}
                        >
                          <div className="w-8 h-10 mx-auto mb-1 relative">
                            <div className="w-full h-full border-2 border-current rounded"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-current"></div>
                            <div className="absolute top-1/2 left-1 right-1 transform -translate-y-1/2 h-0.5 bg-current"></div>
                          </div>
                          <div className="text-xs font-medium">Prozor</div>
                        </motion.div>

                        {/* Fasada */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8, duration: 0.3 }}
                          className={`flex-1 p-3 rounded-lg text-center border-2 ${
                            schuroAnalysis.tip?.selected === 'fasada'
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : schuroAnalysis.tip?.considered?.includes('fasada')
                              ? 'bg-red-100 border-red-300 text-red-600'
                              : 'bg-gray-100 border-gray-300 text-gray-500'
                          }`}
                        >
                          <div className="w-8 h-10 mx-auto mb-1 relative">
                            <div className="w-full h-full border-2 border-current rounded-sm"></div>
                            <div className="absolute top-0 left-0 right-0 h-3 border-b border-current"></div>
                            <div className="absolute top-3 left-0 right-0 h-3 border-b border-current"></div>
                            <div className="absolute top-6 left-0 right-0 h-3 border-b border-current"></div>
                            <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-0.5 bg-current"></div>
                          </div>
                          <div className="text-xs font-medium">Fasada</div>
                        </motion.div>
                      </div>
                      
                      <div className="mt-auto">
                        <div className="text-xs font-medium text-primary mb-1">
                          Odabrano: {schuroAnalysis.tip?.selected}
                        </div>
                        <div className="text-xs text-secondary">
                          {schuroAnalysis.tip?.reasoning}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg flex-1 overflow-hidden relative"
                  >
                    {schuroAnalysis.brochure?.has_image ? (
                      <>
                        <img 
                          src={schuroAnalysis.brochure.image_url} 
                          alt={schuroAnalysis.brochure.system}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                          <div className="text-xs text-white font-semibold">3. BROŠURA</div>
                          <div className="text-xs text-white/90">
                            {schuroAnalysis.brochure?.system}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center">
                        <div className="text-xs text-accent font-semibold mb-2">3. BROŠURA</div>
                        <div className="text-sm text-secondary mb-2">
                          Sistem: {schuroAnalysis.brochure?.system}
                        </div>
                        <div className="text-xs text-secondary">
                          Brošura nije dostupna
                        </div>
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg p-4 flex-1"
                  >
                    <div className="text-xs text-accent font-semibold mb-2">4. CIJENA</div>
                    <div className="text-sm text-primary space-y-1">
                      <div className="flex justify-between">
                        <span>Materijal:</span>
                        <span>{schuroAnalysis.pricing?.materijal} {schuroAnalysis.pricing?.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Staklo:</span>
                        <span>{schuroAnalysis.pricing?.staklo} {schuroAnalysis.pricing?.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rad:</span>
                        <span>{schuroAnalysis.pricing?.rad} {schuroAnalysis.pricing?.currency}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t border-theme pt-1">
                        <span>Ukupno:</span>
                        <span>{schuroAnalysis.pricing?.total} {schuroAnalysis.pricing?.currency}</span>
                      </div>
                      
                      {/* Troskovnik comparison section */}
                      {schuroAnalysis.troskovnik_check && (
                        <div className="mt-3 p-2 border border-theme rounded bg-slate-50">
                          <div className="text-xs text-accent font-semibold mb-1">PROVJERA TROŠKOVNIK</div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Troškovnik:</span>
                              <span>{schuroAnalysis.troskovnik_check.troskovnik_price} EUR</span>
                            </div>
                            <div className="flex justify-between">
                              <span>LLM procjena:</span>
                              <span>{schuroAnalysis.troskovnik_check.llm_price} EUR</span>
                            </div>
                            <div className={`flex justify-between font-medium ${
                              schuroAnalysis.troskovnik_check.color === 'red' 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              <span>Razlika:</span>
                              <span>{schuroAnalysis.troskovnik_check.difference} EUR {schuroAnalysis.troskovnik_check.status}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-secondary mt-2">
                        Lokacija: {schuroAnalysis.location}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
            
            {/* Projektiranje Details */}
            {activeTab === 'projektiranje' && showProjectDetails && projektDetails && (
              <div className="flex-1 overflow-y-auto">
                <div className="mb-4 text-center">
                  <button 
                    onClick={() => {
                      setShowProjectDetails(false);
                      setProjektDetails(null);
                    }}
                    className="text-sm text-secondary hover:text-primary transition-colors"
                  >
                    ← Povratak na mikrofon
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6 h-full max-w-6xl mx-auto p-4">
                  {/* 1. Shema */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg overflow-hidden flex flex-col min-h-[300px]"
                  >
                    {projektDetails.details?.shema?.has_image ? (
                      <>
                        <img 
                          src={projektDetails.details.shema.image_url} 
                          alt="Shema"
                          className="w-full flex-1 object-cover"
                        />
                        <div className="p-3 bg-gradient-to-r from-accent to-accent/80">
                          <div className="text-sm text-white font-semibold">1. SHEMA</div>
                          <div className="text-xs text-white/90">
                            Sistem: {projektDetails.system}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex-1 bg-slate-200 flex flex-col items-center justify-center p-4">
                        <div className="text-sm text-accent font-semibold mb-2">1. SHEMA</div>
                        <div className="text-sm text-secondary mb-2">
                          Sistem: {projektDetails.system}
                        </div>
                        <div className="text-xs text-secondary">
                          Shema nije dostupna
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* 2. Donji detalj */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg overflow-hidden flex flex-col min-h-[300px]"
                  >
                    {projektDetails.details?.donji_detalj?.has_image ? (
                      <>
                        <img 
                          src={projektDetails.details.donji_detalj.image_url} 
                          alt="Donji detalj"
                          className="w-full flex-1 object-cover"
                        />
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600">
                          <div className="text-sm text-white font-semibold">2. DONJI DETALJ</div>
                          <div className="text-xs text-white/90">
                            Varijanta: {projektDetails.details.donji_detalj.variant}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex-1 bg-slate-200 flex flex-col items-center justify-center p-4">
                        <div className="text-sm text-blue-600 font-semibold mb-2">2. DONJI DETALJ</div>
                        <div className="text-xs text-secondary">
                          Detalj nije dostupan
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* 3. Bočni detalj */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg overflow-hidden flex flex-col min-h-[300px]"
                  >
                    {projektDetails.details?.bocni_detalj?.has_image ? (
                      <>
                        <img 
                          src={projektDetails.details.bocni_detalj.image_url} 
                          alt="Bočni detalj"
                          className="w-full flex-1 object-cover"
                        />
                        <div className="p-3 bg-gradient-to-r from-green-500 to-green-600">
                          <div className="text-sm text-white font-semibold">3. BOČNI DETALJ</div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex-1 bg-slate-200 flex flex-col items-center justify-center p-4">
                        <div className="text-sm text-green-600 font-semibold mb-2">3. BOČNI DETALJ</div>
                        <div className="text-xs text-secondary">
                          Detalj nije dostupan
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* 4. Gornji detalj */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    className="input-bg border border-theme rounded-lg overflow-hidden flex flex-col min-h-[300px]"
                  >
                    {projektDetails.details?.gornji_detalj?.has_image ? (
                      <>
                        <img 
                          src={projektDetails.details.gornji_detalj.image_url} 
                          alt="Gornji detalj"
                          className="w-full flex-1 object-cover"
                        />
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600">
                          <div className="text-sm text-white font-semibold">4. GORNJI DETALJ</div>
                          <div className="text-xs text-white/90">
                            Varijanta: {projektDetails.details.gornji_detalj.variant}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex-1 bg-slate-200 flex flex-col items-center justify-center p-4">
                        <div className="text-sm text-purple-600 font-semibold mb-2">4. GORNJI DETALJ</div>
                        <div className="text-xs text-secondary">
                          Detalj nije dostupan
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 input-bg border-t border-theme">
            <div className="text-center space-y-2">
              <p className="text-primary">
                Aktivni tab: <span className="font-medium text-accent">{tabs.find(t => t.id === activeTab)?.label}</span>
              </p>
              <p className="text-sm text-secondary">
                {isListening ? 'Slušam...' : isProcessing ? 'Obrađujem...' : 'Kliknite mikrofon za početak'}
              </p>
              {currentTranscript && (
                <div className="text-xs text-secondary bg-slate-100 rounded px-2 py-1 inline-block">
                  {currentTranscript}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-1/4 panel border-l border-theme">
        <div className="h-full flex flex-col">
          <div className="input-bg px-4 py-3 border-b border-theme">
            <h2 className="text-lg font-semibold text-primary">API Monitor</h2>
            <p className="text-xs text-secondary mt-1">Real-time API communication</p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="text-xs text-secondary font-semibold border-b border-theme pb-1">
                Chat Povijest ({chatHistory.length})
              </div>
              
              {chatHistory.map((entry) => (
                <div key={entry.id} className="space-y-2 pb-3 border-b border-theme/30">
                  <div className="text-xs text-secondary font-mono">
                    {entry.timestamp} | {entry.activeTab}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-accent">User:</span>
                    <div className="text-primary mt-1 pl-2 border-l-2 border-accent/30">
                      {entry.user}
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-accent">
                      {entry.isToolCall ? 'Tool Call:' : 'Assistant:'}
                    </span>
                    <div className={`mt-1 pl-2 border-l-2 ${
                      entry.isError 
                        ? 'text-red-600 border-red-300' 
                        : entry.isToolCall 
                        ? 'text-blue-600 border-blue-300' 
                        : 'text-primary border-accent/30'
                    }`}>
                      {entry.assistant}
                    </div>
                  </div>
                </div>
              ))}
              
              {apiData.timestamp && (
                <div className="space-y-3 mt-4 pt-4 border-t border-theme">
                  <div className="text-xs text-secondary font-semibold">
                    Zadnji API poziv ({apiData.timestamp})
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-accent mb-2">Payload:</h3>
                    <pre className="text-xs input-bg border border-theme p-2 rounded overflow-x-auto text-primary">
                      {JSON.stringify(apiData.lastPayload, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-accent mb-2">Response:</h3>
                    <pre className="text-xs input-bg border border-theme p-2 rounded overflow-x-auto text-primary">
                      {JSON.stringify(apiData.lastResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {chatHistory.length === 0 && !apiData.timestamp && (
                <div className="text-center text-secondary mt-8">
                  <p className="text-sm">Nema chat povijesti</p>
                  <p className="text-xs mt-2 opacity-60">Aktivirajte mikrofon za početak razgovora</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IRIS3;