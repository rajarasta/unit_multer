# Gantt Agent Tab - README

## Pregled

Gantt Agent Tab je napredniji modul za glasovno upravljanje Gantt dijagramima s fokusom na proces Montaže. Omogućava korisniku glasovno upravljanje rasporedom montaže pozicija kroz interaktivnu konverzaciju s AI agentom.

**Sve je programibilno kroz naš UI i backend servise - bez vanjskih ovisnosti.**

## Ključne funkcionalnosti

### 🎤 Glasovno upravljanje
- **Hrvatsko prepoznavanje govora** - OpenAI Whisper preko našeg backend-a
- **NLU (Natural Language Understanding)** - AgentOrchestrator.js routing
- **Kontekst-svjesni dijalog** - agent pamti kontekst razgovora u session store
- **TTS (Text-to-Speech)** - OpenAI TTS kroz naše API-je

### 📊 Gantt manipulacija
- **Draft režim** - sve promjene privremene u frontend store-u
- **Linija-po-linija potvrda** - korisnik potvrđuje svaku poziciju
- **Automatsko planiranje** - AI predlaže optimalne termine
- **Validacija resursa** - provjera preklapanja kroz naš planning engine

### 🧠 AI Agent funkcionalnosti
- **Intent prepoznavanje** - prepoznaje glasovne naredbe 
- **Context engine** - gradi kontekst iz Zustand store-a
- **JSON response format** - standardizirani odgovori za UI
- **Multi-modal planning** - kombinira naše normative i user input

## Arhitektura - Full Stack programska

### Backend Integration

```
Backend Services (Naši):
├── server.js (port 3002)
│   ├── /api/agent/gantt-voice     # Glavna voice-to-gantt ruta
│   ├── /api/transcribe            # Whisper ASR
│   ├── /api/llm/gantt-intent     # Intent recognition
│   └── DocumentRegistry          # Auto-scan dokumenata
├── file-writer.cjs (port 3001)  
│   ├── /api/llm/draft            # Draft workflow
│   └── /api/llm/confirm          # Potvrda promjena
└── AgentOrchestrator.js
    ├── routeLLMRequest()         # Smart routing
    ├── processAudio()            # Whisper integration  
    └── processText()             # GPT integration
```

### Frontend Architecture

```
src/components/tabs/GanttAgent/
├── index.jsx                    # Main tab component
├── components/
│   ├── GanttCanvas.jsx         # Lijevi prikaz cijelog Gantt-a
│   ├── AgentPanel.jsx          # Desni panel s agentom
│   ├── ProcessStagesPanel.jsx  # Animirani prikaz obrade
│   ├── JsonHighlighter.jsx     # Context-aware JSON viewer
│   ├── MiniGanttActiveLine.jsx # Mini prikaz aktivne linije
│   └── VoiceFocusBanner.jsx    # Live transcript banner
├── hooks/
│   ├── useGanttAgent.js        # Main voice agent hook
│   ├── useGanttDraft.js        # Draft state management
│   └── useVoicePipeline.js     # Voice processing pipeline
└── services/
    ├── GanttAgentAPI.js        # Backend komunikacija
    └── GanttPlanningEngine.js  # Frontend planning logic
```

### Data Flow - Programski

```
1. Voice Input → naš /api/transcribe (Whisper)
2. Transcript → /api/agent/gantt-voice (GPT + context)
3. AgentOrchestrator → routing na pravi model 
4. Response → gantt_agent_response JSON
5. Frontend → useGanttDraft store update
6. UI → automatski re-render iz Zustand
7. Confirm → /api/llm/confirm → ProjectDataService
```

## Required Services Integration

### 1. AgentOrchestrator.js proširenja

```javascript
// Dodati metode za Gantt workflow
async processGanttVoice(audioBlob, draftContext) {
  // ASR
  const transcript = await this.processAudio({file: audioBlob});
  
  // Intent + Context
  const response = await this.processText({
    prompt: `${GANTT_SYSTEM_PROMPT}\n\nContext: ${JSON.stringify(draftContext)}\n\nUser: ${transcript}`,
    model: this.models.text
  });
  
  return this.parseGanttResponse(response);
}

parseGanttResponse(text) {
  // Parse JSON gantt_agent_response format
  // Validate ui_patches structure
  // Return standardized response
}
```

### 2. ProjectDataService.js proširenja

```javascript
// Gantt draft operacije
class ProjectDataService {
  
  async createGanttDraft(projectId, process = 'montaza') {
    const draft = {
      draftId: `draft_${Date.now()}`,
      projectId,
      process,
      dateRange: null,
      teams: 1,
      workHours: { start: "08:00", end: "16:00" },
      lines: new Map(),
      activeLineId: null,
      created: new Date().toISOString()
    };
    
    // Store u localStorage kao backup
    localStorage.setItem(`gantt_draft_${draft.draftId}`, JSON.stringify(draft));
    return draft;
  }
  
  async commitGanttDraft(draftId) {
    const draft = this.getDraft(draftId);
    if (!draft) throw new Error('Draft not found');
    
    // Validate all lines confirmed
    const unconfirmed = Array.from(draft.lines.values())
      .filter(line => !line.confirmed);
    
    if (unconfirmed.length > 0) {
      throw new Error(`${unconfirmed.length} lines not confirmed`);
    }
    
    // Commit to project
    const project = await this.getProject(draft.projectId);
    project.gantt = project.gantt || {};
    project.gantt[draft.process] = this.draftToGantt(draft);
    
    await this.saveProject(project);
    
    // Cleanup draft
    this.deleteDraft(draftId);
    
    return project.gantt[draft.process];
  }
}
```

### 3. CloudLLMService.js za HR agent

```javascript
// Hrvatski Gantt agent integracija
export class CloudLLMService {
  
  async processGanttCommand(input) {
    const prompt = this.buildGanttPrompt(input);
    
    const response = await this.genAI.generateContent({
      contents: [{
        role: "user", 
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1, // Low for consistency
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: GANTT_RESPONSE_SCHEMA
      }
    });
    
    return this.parseGanttResponse(response);
  }
  
  buildGanttPrompt(input) {
    return `${GANTT_SYSTEM_PROMPT}
    
Trenutno stanje:
${JSON.stringify(input.draft, null, 2)}

Korisničko pitanje: "${input.userInput}"

Vrati JSON odgovor prema gantt_agent_response specifikaciji.`;
  }
}
```

## System Prompt - Full Croatian Specification

Spremljen u `src/prompts/gantt-agent-system.md`:

```markdown
# System Prompt — Gantt Agent (Croatian, React/Vite)

Ti si Agent za Gantt (Montaža) u React/Vite sučelju. Radiš isključivo nad draft prikazom Ganttograma za jedan projekt i proces Montaža.

## Cilj
Generirati i iterativno ispravljati draft raspored montaže po pozicijama, uz per-linijsko potvrđivanje i tek nakon toga commit u backend.

## Jezik i komunikacija
- Komuniciraš na hrvatskom (HR)  
- Glasovne upute su HR, odgovori su HR
- Kratki i operativni odgovori
- Vrijeme: Europe/Zagreb, radni dani pon–pet 08:00–16:00

## JSON Response Format
Uvijek vrati JSON objekt tipa "gantt_agent_response" sa poljima:
- tts: kratki govorni odgovor
- reasoning_summary: sažetak plana
- next_prompt: pitanje za korisnika
- intent: tip operacije
- commit_mode: false (dok sve nije potvrđeno)
- ui_patches: array operacija za UI
- backend_ops: operacije za backend (samo kod commit)
- validation: status i issues

## Podržane intencije
- schedule_all, set_date_range, set_line_dates  
- shift_line, set_duration, set_teams
- confirm_line, reject_line, commit_draft
- cancel, help

[...full prompt continues...]
```

## Hook Implementation

### useGanttAgent.js - Main hook

```javascript
export function useGanttAgent() {
  const [draft, setDraft] = useState(null);
  const [listening, setListening] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [processStages, setProcessStages] = useState([]);
  
  const processVoiceCommand = async (audioBlob) => {
    try {
      // Stage 1: ASR
      updateStage('asr', 'active');
      const transcript = await GanttAgentAPI.transcribe(audioBlob);
      updateStage('asr', 'completed', { result: transcript });
      
      // Stage 2: Agent processing  
      updateStage('agent', 'active');
      const response = await GanttAgentAPI.processCommand(transcript, draft);
      updateStage('agent', 'completed', { result: 'JSON generated' });
      
      // Stage 3: Apply to UI
      updateStage('ui', 'active');
      applyAgentResponse(response);
      updateStage('ui', 'completed');
      
    } catch (error) {
      console.error('Voice processing error:', error);
    }
  };
  
  return {
    draft,
    listening,
    lastResponse,
    processStages,
    processVoiceCommand,
    // ... other methods
  };
}
```

## Performance & Optimization

### Context Management
- **Draft persistence** - localStorage backup svake promjene
- **Incremental context** - šalje samo delta promjene LLM-u  
- **Smart caching** - cache responses za česte operacije

### Voice Pipeline
- **Debounced input** - 500ms delay za voice commands
- **Background processing** - stages prikazuju progress
- **Error recovery** - retry logic za network issues

### Memory Management  
- **Cleanup drafts** - auto-delete starih draft-ova
- **Limit history** - max 50 voice interactions u session
- **Zustand persist** - backup u localStorage

## Development Commands

```bash
# Pokretanje full stack-a
npm run dev        # Frontend (port 5186)
npm run server     # Backend (port 3002) 
npm run file-writer # File service (port 3001)

# Ili sve odjednom
npm run dev-full   # Concurrently sve servise

# Testing
npm run test:gantt-agent
npm run lint
```

## Environment Setup

```env
# .env file
VITE_GOOGLE_AI_API_KEY=your_gemini_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_GANTT_AGENT_VOICE_ENABLED=true
VITE_GANTT_AGENT_DEBUG=true
```

## Component Features

### Voice Focus Mode
- Live transcript banner
- Animated processing stages (ASR → NLU → Agent → UI)
- Context-aware JSON highlighting

### Draft Management  
- Split view: Full Gantt (lijevo) + Agent Panel (desno)
- Mini Gantt strip za aktivnu liniju
- Line-by-line confirmation workflow

### Error Handling
- Graceful degradation ako nema voice
- Croatian error messages
- Retry mechanisms

## Testing & Mock Data

Uključeni sample responses za development:

```javascript
const SAMPLE_RESPONSES = {
  schedule_all: { /* generiraj draft */ },
  adjust_line: { /* pomakni liniju */ },
  confirm_and_next: { /* potvrdi i dalje */ },
  commit_all: { /* finalni commit */ }
};
```

## Security & Privacy

- **No file access** - agent ne čita dokumente
- **Sandboxed operations** - sve reverzibilno do commit-a  
- **Input validation** - sanitizacija voice input-a
- **User confirmation** - eksplicitno potvrđivanje prije commit-a

---

**Status:** 🚧 Ready for implementation

**Tech Stack:** React 19 + Vite + Zustand + Framer Motion + OpenAI APIs + naši backend servisi

**Next Steps:** 
1. Implementirati useGanttAgent hook
2. Dodati Gantt rute u server.js  
3. Proširiti AgentOrchestrator za Gantt workflow
4. Testirati s mock podacima