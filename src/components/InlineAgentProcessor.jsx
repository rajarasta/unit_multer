import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const InlineAgentProcessor = ({ 
  isActive, 
  input, 
  endpoint = 'http://10.71.21.136:1234/v1/chat/completions',
  onComplete,
  onError,
  showCoT = true // Development mode - set to false for production
}) => {
  const [thoughts, setThoughts] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('thinking'); // thinking, processing, completed, error
  const [currentThought, setCurrentThought] = useState('');
  const [result, setResult] = useState(null);
  const [proposals, setProposals] = useState([]); // 3 AI proposals
  const [cotThoughts, setCotThoughts] = useState([]); // Chain of Thought reasoning
  const [currentCotThought, setCurrentCotThought] = useState('');
  const [streamingBuffer, setStreamingBuffer] = useState('');
  const streamingRef = useRef(null);
  const thoughtStreamRef = useRef(null);

  const thoughtSequences = {
    analysis: [
      "Analiziram opis...",
      "Identificiram ključne pojmove",
      "Generiram poboljšanja..."
    ],
    processing: [
      "Obrađujem AI odgovor",
      "Parsiram prijedloge",
      "Primjenjujem najbolji rezultat"
    ]
  };

  useEffect(() => {
    if (isActive) {
      setThoughts([]);
      setProgress(0);
      setStatus('thinking');
      setCurrentThought('');
      setResult(null);
      setCotThoughts([]);
      setCurrentCotThought('');
      setStreamingBuffer('');
      setProposals([]);
      startProcessing();
    }
  }, [isActive, input]);

  useEffect(() => {
    if (thoughtStreamRef.current) {
      thoughtStreamRef.current.scrollTop = thoughtStreamRef.current.scrollHeight;
    }
  }, [thoughts]);

  useEffect(() => {
    if (streamingRef.current) {
      streamingRef.current.scrollTop = streamingRef.current.scrollHeight;
    }
  }, [streamingBuffer]);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const displayThought = async (text, type = 'secondary') => {
    setCurrentThought('');
    
    // Typewriter effect
    for (let i = 0; i <= text.length; i++) {
      setCurrentThought(text.slice(0, i));
      await delay(15);
    }
    
    await delay(200);
    setThoughts(prev => [...prev, { 
      text, 
      type, 
      id: Date.now() + Math.random() 
    }]);
    setCurrentThought('');
  };

  const addToStreamingBuffer = (newContent) => {
    console.log('📝 Adding to streaming buffer:', newContent);
    setStreamingBuffer(prev => {
      const updated = prev + newContent;
      console.log('📝 Buffer now has', updated.length, 'characters');
      return updated;
    });
  };

  const displayCotThought = async (text, type = 'reasoning') => {
    setCotThoughts(prev => [...prev, { 
      text, 
      type, 
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Extract JSON from text with repair attempts
  const tryExtractJson = (text) => {
    console.log('🔍 Trying to extract JSON from:', text);
    
    // Method 1: Find complete JSON
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      const candidate = text.slice(firstOpen, lastClose + 1);
      try {
        const parsed = JSON.parse(candidate);
        console.log('✅ JSON parsed successfully:', parsed);
        return parsed;
      } catch (e) {
        console.log('❌ JSON parse failed:', e.message);
      }
    }
    
    // Method 2: Try to repair incomplete JSON
    if (firstOpen !== -1) {
      let candidate = text.slice(firstOpen);
      
      // Add missing closing braces
      const openBraces = (candidate.match(/\{/g) || []).length;
      const closeBraces = (candidate.match(/\}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      
      if (missingBraces > 0) {
        candidate += '}]'.repeat(Math.min(missingBraces, 2)); // Add closing braces
        console.log('🔧 Trying repaired JSON:', candidate);
        try {
          const parsed = JSON.parse(candidate);
          console.log('✅ Repaired JSON parsed:', parsed);
          return parsed;
        } catch (e) {
          console.log('❌ Repaired JSON failed:', e.message);
        }
      }
    }
    
    return null;
  };

  // Fallback parser for non-JSON proposals
  const fallbackParseProposals = (text) => {
    // Try numbered lines
    const lines = text.split('\n').filter(l => l.trim());
    const proposals = [];
    let currentProposal = '';
    
    for (const line of lines) {
      if (/^\s*\d+[\.\)]\s/.test(line)) {
        if (currentProposal) {
          proposals.push(currentProposal.trim());
        }
        currentProposal = line.replace(/^\s*\d+[\.\)]\s/, '');
      } else if (currentProposal) {
        currentProposal += ' ' + line;
      }
    }
    
    if (currentProposal) {
      proposals.push(currentProposal.trim());
    }
    
    return proposals.slice(0, 2).map((text, idx) => ({
      id: idx + 1,
      title: text.split(' ').slice(0, 5).join(' ') + '...',
      description: text,
      notes: ''
    }));
  };

  // Normalize proposal object
  const normalizeProposal = (rawObj, idx) => {
    if (typeof rawObj === 'string') {
      return {
        id: idx + 1,
        title: rawObj.slice(0, 50) + (rawObj.length > 50 ? '...' : ''),
        description: rawObj,
        notes: ''
      };
    }
    return {
      id: rawObj.id ?? (idx + 1),
      title: rawObj.title ?? rawObj.name ?? `Prijedlog ${idx + 1}`,
      description: rawObj.description ?? rawObj.detail ?? JSON.stringify(rawObj),
      notes: rawObj.notes ?? ''
    };
  };

  // Parse Harmony response format for CoT
  const parseHarmonyResponse = (chunk) => {
    try {
      // Look for different channels in the response
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          // Check for analysis channel (CoT)
          if (data.choices?.[0]?.delta?.content) {
            const content = data.choices[0].delta.content;
            
            // Simple heuristic to detect reasoning vs final content
            if (content.includes('<analysis>') || content.includes('thinking:') || 
                content.includes('reasoning:') || content.includes('step:')) {
              return { type: 'analysis', content };
            }
            
            // Check for commentary channel
            if (content.includes('<commentary>') || content.includes('note:')) {
              return { type: 'commentary', content };
            }
            
            // Default to final content
            return { type: 'final', content };
          }
        }
      }
    } catch (e) {
      console.log('Parse error:', e);
    }
    return null;
  };

  const startProcessing = async () => {
    try {
      setStatus('thinking');
      
      let progressStep = 0;
      const totalSteps = thoughtSequences.analysis.length + thoughtSequences.processing.length;
      
      // Analysis phase - faster for inline
      for (let i = 0; i < thoughtSequences.analysis.length; i++) {
        await displayThought(thoughtSequences.analysis[i], i === 0 ? 'primary' : 'secondary');
        progressStep++;
        setProgress((progressStep / totalSteps) * 60);
        await delay(400 + Math.random() * 200);
      }

      // API call with streaming for CoT
      setStatus('processing');
      await displayThought("Šaljem AI zahtjev s CoT streaming...", 'highlight');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-no-key-required'
        },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            {
              role: 'system',
              content: `Ti si ekspert za analizu troškovnika. Prikaži svoj reasoning proces korak po korak.

OBAVEZNO koristi ovaj format:
<analysis>
step 1: analiziram problem
step 2: identificiram ključne pojmove  
step 3: generiram prijedloge
reasoning: objašnjavam zašto su ovi prijedlozi najbolji
</analysis>

<final>
{"proposals":[
  {"id":1,"title":"Kratki naslov","description":"Potpuni poboljšani opis...","notes":"tehničke napomene"},
  {"id":2,"title":"Drugi naslov","description":"Drugi poboljšani opis...","notes":"dodatne napomene"}
]}
</final>

Važno: UVIJEK koristi <analysis> i <final> tagove! U <final> OBAVEZNO vrati JSON s točno 2 prijedloga!`
            },
            {
              role: 'user',
              content: `Analiziraj ovaj opis iz troškovnika: "${input}"

Istraži šta ovaj opis znači i predloži TOČNO 2 bolja opisa koja su:
- Jasnija i preciznija
- Više tehnički specifična
- Lakša za razumijevanje

Prikaži svoj korak-po-korak reasoning proces u <analysis>, zatim u <final> vrati JSON s "proposals" (točno 2 stavke).`
            }
          ],
          temperature: 0.7,
          max_tokens: 4096,
          stream: true
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      // Process streaming response for CoT
      const reader = response.body.getReader();
      let improvedDescription = '';
      let finalContent = '';
      let cotBuffer = '';
      let inAnalysis = false;
      let inFinal = false;
      
      await displayCotThought("🧠 Počinje AI reasoning proces...", 'start');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        cotBuffer += chunk;
        
        // Look for complete lines
        const lines = cotBuffer.split('\n');
        cotBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || '';
              
              if (content) {
                // Check for analysis tags (more flexible detection)
                if (content.includes('<analysis>') || (content.includes('analysis>') && !inAnalysis)) {
                  inAnalysis = true;
                  await displayCotThought("📋 Analiza počinje...", 'analysis-start');
                  console.log('🎯 ENTERING ANALYSIS MODE');
                  // Don't continue - process the content that comes with the tag
                }
                
                if (content.includes('</analysis>') || (content.includes('/analysis>') && inAnalysis)) {
                  inAnalysis = false;
                  await displayCotThought("✅ Analiza završena", 'analysis-end');
                  console.log('🎯 EXITING ANALYSIS MODE');
                  // Don't continue - process remaining content
                }
                
                if (content.includes('<final>') || (content.includes('final>') && !inFinal)) {
                  inFinal = true;
                  await displayCotThought("🎯 Generiram konačni odgovor...", 'final-start');
                  console.log('🎯 ENTERING FINAL MODE');
                  // Don't continue - process the content that comes with the tag
                }
                
                if (content.includes('</final>') || (content.includes('/final>') && inFinal)) {
                  inFinal = false;
                  // Parse proposals when final section ends
                  if (finalContent.trim()) {
                    console.log('🔍 Final content for parsing:', finalContent);
                    const parsed = tryExtractJson(finalContent);
                    console.log('🔍 Parsed JSON:', parsed);
                    if (parsed && Array.isArray(parsed.proposals)) {
                      const normalizedProposals = parsed.proposals.slice(0, 2).map((p, idx) => normalizeProposal(p, idx));
                      console.log('✅ Normalized proposals:', normalizedProposals);
                      setProposals(normalizedProposals);
                      improvedDescription = normalizedProposals[0]?.description || '';
                    } else {
                      console.log('🔄 Using fallback parsing...');
                      // Fallback parsing
                      const fallbackProposals = fallbackParseProposals(finalContent);
                      console.log('🔄 Fallback proposals:', fallbackProposals);
                      setProposals(fallbackProposals);
                      improvedDescription = fallbackProposals[0]?.description || '';
                    }
                  }
                  continue;
                }
                
                // Clean content from tags for display
                let cleanContent = content;
                cleanContent = cleanContent.replace(/<\/?analysis>/g, '');
                cleanContent = cleanContent.replace(/<\/?final>/g, '');
                
                // Debug logging
                console.log('🔍 Received content chunk:', content);
                console.log('📍 Current state - inAnalysis:', inAnalysis, 'inFinal:', inFinal);
                console.log('📦 Clean content:', cleanContent);
                
                // Process content based on current section
                if (inAnalysis) {
                  // Add directly to streaming buffer for continuous display
                  if (cleanContent.trim()) {
                    addToStreamingBuffer(cleanContent);
                    console.log('💭 ANALYSIS - Adding to stream:', cleanContent);
                  }
                } else if (inFinal) {
                  // Collect final content for parsing (keep original with tags)
                  finalContent += content;
                  console.log('📝 FINAL - Collecting content:', content);
                  // Also show final content in stream for debugging (use clean content)
                  if (cleanContent.trim()) {
                    addToStreamingBuffer(`[FINAL] ${cleanContent}`);
                  }
                } else {
                  // Generic content - smart detection for analysis vs final
                  if (content.trim()) {
                    // Enhanced detection for different content types
                    const isJSON = content.includes('{') || content.includes('"proposals"') || content.includes('"id"');
                    const isReasoningStep = content.includes('step ') || content.includes('reasoning:') || 
                                          content.includes('analiziram') || content.includes('identificiram') || 
                                          content.includes('generiram');
                    const isPlainDescription = !content.includes('<') && !isJSON && !isReasoningStep && content.length > 10;
                    
                    console.log('🔍 Content classification:', {
                      isJSON, isReasoningStep, isPlainDescription, 
                      length: content.length, 
                      hasAngleBrackets: content.includes('<')
                    });
                    
                    if (isJSON) {
                      // Treat as final content
                      finalContent += content;
                      console.log('📝 AUTO-FINAL - Detected JSON:', content);
                      addToStreamingBuffer(`[JSON] ${content}`);
                    } else if (isReasoningStep) {
                      // Clearly reasoning content - show prominently
                      addToStreamingBuffer(content);
                      console.log('💭 AUTO-ANALYSIS - Reasoning step:', content);
                    } else if (isPlainDescription) {
                      // Plain description - could be final answer
                      addToStreamingBuffer(content);
                      improvedDescription += content;
                      console.log('📄 AUTO-FINAL - Plain description:', content);
                    } else {
                      // Show all other content for debugging
                      addToStreamingBuffer(content);
                      console.log('🔄 GENERIC - Other content:', content);
                    }
                  }
                }
              }
            } catch (e) {
              console.log('Streaming parse error:', e);
            }
          }
        }
      }
      
      // Final fallback processing after stream ends
      console.log('🔍 Stream ended. Final proposals count:', proposals.length);
      console.log('🔍 Final content available:', finalContent.trim().length, 'chars');
      
      if (proposals.length === 0) {
        // Try to extract from any content we have
        const allContent = finalContent || cotBuffer || streamingBuffer;
        console.log('🔍 Trying to extract from all content:', allContent);
        
        if (allContent.trim()) {
          const parsed = tryExtractJson(allContent);
          if (parsed && Array.isArray(parsed.proposals)) {
            const normalizedProposals = parsed.proposals.slice(0, 2).map((p, idx) => normalizeProposal(p, idx));
            console.log('✅ Final extraction successful:', normalizedProposals);
            setProposals(normalizedProposals);
            improvedDescription = normalizedProposals[0]?.description || '';
          } else {
            console.log('🔄 Using final fallback parsing...');
            const fallbackProposals = fallbackParseProposals(allContent);
            console.log('🔄 Final fallback result:', fallbackProposals);
            setProposals(fallbackProposals);
            improvedDescription = fallbackProposals[0]?.description || '';
          }
        }
      }
      
      // Ensure we have at least one result
      if (proposals.length === 0) {
        setProposals([{
          id: 1,
          title: 'Poboljšani opis',
          description: `${input} (poboljšano)`,
          notes: ''
        }]);
        improvedDescription = `${input} (poboljšano)`;
      }
      
      // Processing phase
      for (let i = 0; i < thoughtSequences.processing.length; i++) {
        await displayThought(thoughtSequences.processing[i], 'secondary');
        progressStep++;
        setProgress(60 + ((progressStep - thoughtSequences.analysis.length) / thoughtSequences.processing.length) * 40);
        await delay(300);
      }

      await displayThought(`Generirano ${proposals.length} prijedloga!`, 'success');
      setProgress(100);
      setStatus('completed');
      setResult(proposals);

      // Don't auto-apply - let user choose
      // setTimeout(() => {
      //   onComplete(proposals[0]?.description || improvedDescription);
      // }, 1000);

    } catch (error) {
      console.error('Inline Agent error:', error);
      await displayThought(`Greška: ${error.message}`, 'error');
      setStatus('error');
      if (onError) onError(error);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'thinking':
      case 'processing':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Brain className="w-3 h-3 text-blue-500" />;
    }
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="border-t border-slate-200 bg-slate-50 overflow-hidden"
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            {getStatusIcon()}
            <span className="text-xs font-medium text-slate-700">
              {status === 'thinking' && 'AI Agent razmišlja...'}
              {status === 'processing' && 'Obrađujem odgovor...'}
              {status === 'completed' && 'Analiza završena'}
              {status === 'error' && 'Greška u obradi'}
            </span>
          </div>

          {/* Main Thought Stream */}
          <div 
            ref={thoughtStreamRef}
            className="space-y-1 text-xs font-mono max-h-20 overflow-y-auto mb-3"
          >
            {thoughts.map((thought) => (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`${
                  thought.type === 'primary' ? 'text-slate-900 font-medium' :
                  thought.type === 'highlight' ? 'text-blue-600 font-medium' :
                  thought.type === 'success' ? 'text-green-600 font-medium' :
                  thought.type === 'error' ? 'text-red-600 font-medium' :
                  'text-slate-600'
                }`}
              >
                {thought.text}
              </motion.div>
            ))}
            
            {currentThought && (
              <div className="text-slate-600">
                {currentThought}
                <span className="animate-pulse text-blue-500">|</span>
              </div>
            )}
          </div>

          {/* Continuous Streaming Display */}
          {showCoT && (streamingBuffer || cotThoughts.length > 0) && (
            <div className="border-l-2 border-purple-300 pl-3 mb-3">
              <div className="text-xs font-medium text-purple-700 mb-2">🧠 AI Reasoning Stream</div>
              <div 
                ref={streamingRef}
                className="text-xs font-mono max-h-32 overflow-y-auto bg-purple-50 p-2 rounded"
              >
                {/* Historical thoughts */}
                {cotThoughts.map((cot) => (
                  <motion.div
                    key={cot.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`mb-1 ${
                      cot.type === 'start' ? 'text-purple-800 font-medium' :
                      cot.type === 'analysis-start' ? 'text-blue-700 font-medium' :
                      cot.type === 'analysis-end' ? 'text-green-700 font-medium' :
                      cot.type === 'final-start' ? 'text-orange-700 font-medium' :
                      cot.type === 'reasoning' ? 'text-slate-700' :
                      'text-slate-600'
                    }`}
                  >
                    <span className="text-xs text-slate-400">{cot.timestamp}</span> {cot.text}
                  </motion.div>
                ))}
                
                {/* Live streaming content with word wrapping */}
                {streamingBuffer && (
                  <div className="text-slate-700 whitespace-pre-wrap break-words">
                    <span className="text-xs text-slate-400">{new Date().toLocaleTimeString()}</span> {streamingBuffer}
                    <span className="animate-pulse text-purple-500">|</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Proposals Selection - Always at the bottom */}
          {result && Array.isArray(result) && result.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-green-200 rounded p-3 mt-4"
            >
              <div className="text-green-700 font-medium mb-3 text-xs">Izaberite prijedlog:</div>
              <div className="space-y-2">
                {result.map((proposal, idx) => (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="border border-slate-200 rounded p-2 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onComplete && onComplete(proposal.description)}
                  >
                    <div className="font-medium text-slate-800 text-xs mb-1">
                      {idx + 1}. {proposal.title}
                    </div>
                    <div className="text-slate-600 text-xs leading-relaxed">
                      {proposal.description}
                    </div>
                    {proposal.notes && (
                      <div className="text-slate-500 text-xs mt-1 italic">
                        {proposal.notes}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InlineAgentProcessor;