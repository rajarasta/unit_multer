import { useState } from 'react';
import { parseGantWakePhrase } from '../voice/parseGantWakePhrase';

export default function useGanttAgent() {
  const [state, setState] = useState('idle');
  const [isListening, setIsListening] = useState(false);
  const [processStages, setProcessStages] = useState([]);
  const [lastResponse, setLastResponse] = useState(null);
  const [transcript, setTranscript] = useState('');

  const startListening = () => { 
    console.log('▶️ useGanttAgent: startListening() called');
    setIsListening(true); 
    setState('listening'); 
    setTranscript('Slušam...'); 
    console.log('✅ useGanttAgent: Voice listening activated');
  };
  const stopListening = () => { 
    console.log('⏹️ useGanttAgent: stopListening() called');
    setIsListening(false); 
    if (state==='listening') setState('idle'); 
    setTranscript(''); 
    console.log('❌ useGanttAgent: Voice listening stopped');
  };

  const processTextCommand = async (command, updateGanttJson, initializeGanttByScope) => {
    setState('processing'); setTranscript(`Obrada: "${command}"`);
    // trigger background highlight for context
    try { window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } })); } catch {}

    const stages = [
      { id:'nlu', name:'NLU', status:'active' },
      { id:'ctx', name:'Kontekst', status:'idle' },
      { id:'plan', name:'Planiranje', status:'idle' },
      { id:'apply', name:'Primjena', status:'idle' },
    ];
    setProcessStages(stages);

    const step = (id) => new Promise(r=>setTimeout(()=>{
      setProcessStages(prev=>prev.map((s,i)=> s.id===id?{...s,status:'completed'}: (prev[i-1]?.id===id?{...s,status:'active'}:s)));
      r();
    }, 400));

    await step('nlu'); await step('ctx'); await step('plan');

    let modification=null, responseText='Nisam prepoznao naredbu.';
    const lowerCommand = (command || '').toLowerCase();

    // Check for "Gant X" voice launcher phrases first
    const gantScope = parseGantWakePhrase(command);
    console.log(`🎤 Voice command: "${command}" → Parsed scope: "${gantScope}"`);
    if (gantScope && typeof initializeGanttByScope === 'function') {
      try {
        await initializeGanttByScope(gantScope);
        const scopeTitles = {
          'prodaja': 'prodaju',
          'proizvodnja': 'proizvodnju',
          'opcenito': 'općenite procese',
          'sve': 'sve procese'
        };
        responseText = `Učitavam ${scopeTitles[gantScope] || 'procese'}...`;
        
        // Focus Mode will handle voice activation automatically
        
        await step('apply');
        setTimeout(()=> setProcessStages([]), 1200);
        setLastResponse({ tts: responseText });
        setState('idle'); setTranscript('');
        return;
      } catch (error) {
        responseText = `Greška pri učitavanju ${gantScope}: ${error.message}`;
      }
    }

    // Enhanced prodaja-specific commands
    if (lowerCommand.includes('pomakni') && lowerCommand.includes('prodaja')) {
      const firstProdajaId = updateGanttJson?.ganttJson?.pozicije?.[0]?.id;
      if (firstProdajaId) {
        if (lowerCommand.includes('za 2 dana')) {
          modification={ operation:'shift_date', pozicija_id: firstProdajaId, days:2 };
          responseText=`Pomaknuo sam proces prodaje ${firstProdajaId} za 2 dana unaprijed.`;
        } else if (lowerCommand.includes('za 1 dan')) {
          modification={ operation:'shift_date', pozicija_id: firstProdajaId, days:1 };
          responseText=`Pomaknuo sam proces prodaje ${firstProdajaId} za 1 dan unaprijed.`;
        }
      }
    }
    // Legacy P-001 format for backward compatibility
    else if (lowerCommand.includes('pomakni p-001 za 2 dana')) {
      modification={ operation:'shift_date', pozicija_id:'P-001', days:2 };
      responseText='Pomaknuo sam poziciju P-001 za 2 dana unaprijed.';
    }
    // Enhanced process identification by project name
    else if (lowerCommand.includes('stambena zgrada') && lowerCommand.includes('pomakni')) {
      const stambenoId = updateGanttJson?.ganttJson?.pozicije?.find(p => p.naziv?.toLowerCase().includes('stambena zgrada'))?.id;
      if (stambenoId) {
        modification={ operation:'shift_date', pozicija_id: stambenoId, days:1 };
        responseText=`Pomaknuo sam prodaju za Stambenu zgradu za 1 dan unaprijed.`;
      }
    }

    if (modification && typeof updateGanttJson === 'function') updateGanttJson(modification);
    await step('apply');
    setTimeout(()=> setProcessStages([]), 1200);
    setLastResponse({ tts: responseText });
    setState('idle'); setTranscript('');
  };

  return {
    state, isListening, processStages, lastResponse, transcript,
    startListening, stopListening,
    setTranscript: (t) => setTranscript(t),
    setProcessStages: (updater) => setProcessStages(updater),
    addStage: (stage) => setProcessStages(prev => [...prev, stage]),
    processTextCommand,
    resetAgent: () => { setLastResponse(null); setProcessStages([]); setState('idle'); }
  };
}

