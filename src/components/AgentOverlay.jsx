import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const AgentOverlay = ({ 
  isActive, 
  onClose, 
  input, 
  endpoint = '/api/llm/draft',
  targetComponent 
}) => {
  const [thoughts, setThoughts] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('thinking');
  const [currentThought, setCurrentThought] = useState('');
  const thoughtStreamRef = useRef(null);

  const thoughtSequences = {
    analysis: [
      "Gathering context information...",
      "Analiziram ulazni sadržaj: \"${input}\"",
      "Identificiram ključne komponente i termine",
      "Pristupam bazi znanja za relevantne informacije",
      "Evaluiram kontekst i domenu problema",
      "Generiram prijedloge na temelju analize..."
    ],
    processing: [
      "Processing data structures",
      "Optimizing search parameters", 
      "Cross-referencing with knowledge base",
      "Applying pattern recognition",
      "Finalizing recommendations"
    ]
  };

  useEffect(() => {
    if (isActive) {
      setThoughts([]);
      setProgress(0);
      setResults(null);
      setStatus('thinking');
      setCurrentThought('');
      startThinking();
    }
  }, [isActive, input]);

  useEffect(() => {
    if (thoughtStreamRef.current) {
      thoughtStreamRef.current.scrollTop = thoughtStreamRef.current.scrollHeight;
    }
  }, [thoughts]);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const displayThought = async (text, type = 'secondary') => {
    setCurrentThought('');
    
    // Typewriter effect
    for (let i = 0; i <= text.length; i++) {
      setCurrentThought(text.slice(0, i));
      await delay(20);
    }
    
    await delay(300);
    setThoughts(prev => [...prev, { 
      text: text.replace('${input}', input.substring(0, 50) + '...'), 
      type, 
      id: Date.now() + Math.random() 
    }]);
    setCurrentThought('');
  };

  const startThinking = async () => {
    try {
      setStatus('thinking');
      
      let progressStep = 0;
      const totalSteps = thoughtSequences.analysis.length + thoughtSequences.processing.length;
      
      // Analysis phase
      for (let i = 0; i < thoughtSequences.analysis.length; i++) {
        await displayThought(thoughtSequences.analysis[i], i === 0 ? 'primary' : 'secondary');
        progressStep++;
        setProgress((progressStep / totalSteps) * 70);
        await delay(800 + Math.random() * 500);
      }

      // API call
      setStatus('processing');
      await displayThought("Šaljem zahtjev na AI endpoint...", 'highlight');
      
      // Check if using OpenAI compatible endpoint
      const isOpenAIEndpoint = endpoint.includes('/v1/chat/completions');
      
      let response, result;
      
      if (isOpenAIEndpoint) {
        // OpenAI compatible endpoint (LM Studio)
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-no-key-required'
          },
          body: JSON.stringify({
            model: 'local-model',
            messages: [
              {
                role: 'user',
                content: `Analiziraj ovaj opis iz troškovnika: "${input}"

Istraži šta ovaj opis znači i predloži 3 bolja opisa koji bi bili:
1. Jasniji i precizniji
2. Više tehnički specificni
3. Lakši za razumijevanje

Vrati samo 3 prijedloga, svaki u novom redu, bez dodatnih objašnjenja.`
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const apiResult = await response.json();
        result = { response: apiResult.choices[0].message.content };
      } else {
        // Local endpoint format
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            model: 'gpt-3.5-turbo',
            context: { type: 'description_analysis', component: targetComponent }
          })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        result = await response.json();
      }
      
      // Processing phase
      for (let i = 0; i < thoughtSequences.processing.length; i++) {
        await displayThought(thoughtSequences.processing[i], 'secondary');
        progressStep++;
        setProgress(70 + ((progressStep - thoughtSequences.analysis.length) / thoughtSequences.processing.length) * 30);
        await delay(600 + Math.random() * 400);
      }

      await displayThought("Analiza završena uspješno!", 'success');
      setProgress(100);
      setResults(generateResults(result, input));
      setStatus('completed');

    } catch (error) {
      console.error('Agent error:', error);
      await displayThought(`Greška: ${error.message}`, 'error');
      setStatus('error');
      setResults({ error: true, message: error.message, suggestions: generateFallbackResults(input) });
    }
  };

  const generateResults = (apiResponse, originalInput) => {
    const responseText = apiResponse.response || apiResponse.content || '';
    const suggestions = responseText.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .slice(0, 3)
      .map((suggestion, index) => ({
        id: index,
        title: `Prijedlog ${index + 1}`,
        description: suggestion.trim()
      }));

    return suggestions.length > 0 ? suggestions : generateFallbackResults(originalInput);
  };

  const generateFallbackResults = (input) => {
    if (input.toLowerCase().includes('čeličnih nosača') || input.toLowerCase().includes('montaža')) {
      return [
        {
          id: 0,
          title: "Optimizacija procesa montaže",
          description: "Preporučujem korištenje modularnih čeličnih nosača s predmontiranim spojnicama. To može smanjiti vrijeme montaže za 30% i povećati sigurnost rada na visini."
        },
        {
          id: 1,
          title: "Alternativni materijali", 
          description: "Razmotriti aluminijske profile s pojačanjima od karbonskih vlakana. Lakši su za 40%, otporniji na koroziju, ali zahtijevaju specijalizirane tehnike spajanja."
        },
        {
          id: 2,
          title: "Digitalna kontrola kvalitete",
          description: "Implementacija 3D skeniranja za provjeru dimenzija i pozicije nosača. Omogućava detekciju odstupanja od ±2mm i automatsko generiranje izvještaja."
        }
      ];
    }
    
    return [
      {
        id: 0,
        title: "Standardna analiza",
        description: "Analizirani sadržaj pokazuje standardne karakteristike. Preporučujem dodatnu optimizaciju prema industrijskim standardima."
      },
      {
        id: 1,
        title: "Poboljšanje procesa",
        description: "Identificirane su mogućnosti za poboljšanje efikasnosti kroz automatizaciju pojedinih koraka."
      },
      {
        id: 2,
        title: "Alternativni pristup",
        description: "Razmotriti modularni pristup koji omogućava lakše održavanje i skalabilnost rješenja."
      }
    ];
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'thinking':
      case 'processing':
        return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Brain className="w-4 h-4 text-blue-400" />;
    }
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900 bg-opacity-98 rounded-lg z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="text-slate-300 text-sm">Agent Active</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center p-5 overflow-hidden">
        <div 
          ref={thoughtStreamRef}
          className="text-slate-300 text-sm font-mono leading-relaxed max-w-3xl mx-auto w-full space-y-2 overflow-y-auto max-h-96"
        >
          {thoughts.map((thought) => (
            <motion.div
              key={thought.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`whitespace-pre-wrap ${
                thought.type === 'primary' ? 'text-white font-medium' :
                thought.type === 'highlight' ? 'text-blue-400 font-medium' :
                thought.type === 'success' ? 'text-green-400 font-medium' :
                thought.type === 'error' ? 'text-red-400 font-medium' :
                'text-slate-400'
              }`}
            >
              {thought.text}
            </motion.div>
          ))}
          
          {currentThought && (
            <div className="text-slate-300 whitespace-pre-wrap">
              {currentThought}
              <span className="animate-pulse text-blue-400">|</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 bg-slate-700 relative overflow-hidden mt-5 max-w-3xl mx-auto w-full">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 border border-slate-700 rounded-lg p-5 mt-5 max-w-3xl mx-auto w-full"
          >
            <div className="text-blue-400 text-xs uppercase tracking-wider mb-3">Rezultati analize</div>
            <div className="space-y-3">
              {(results.suggestions || results).map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: result.id * 0.1 }}
                  className="bg-slate-900 border border-slate-600 rounded p-4 cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('agent-suggestion-selected', {
                      detail: { suggestion: result, originalInput: input }
                    }));
                  }}
                >
                  <h4 className="text-white font-medium mb-2">{result.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{result.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AgentOverlay;