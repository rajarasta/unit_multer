// Browser-compatible AgentOrchestrator (nema fs/path)

class AgentOrchestrator {
  constructor() {
    this.activeStreams = new Map();
    this.taskQueue = [];
    this.models = {
      whisper: 'whisper-1',
      vision: 'gpt-4o-mini', 
      text: 'gpt-4o-mini',
      reasoning: 'o1-preview'
    };
  }

  // Routing funkcija - prepoznaje tip inputa i šalje na pravi model
  async routeLLMRequest(input) {
    console.log('🎯 Routing request:', { 
      hasFile: !!input.file, 
      mimetype: input.file?.mimetype,
      prompt: input.prompt?.substring(0, 50) + '...'
    });

    // Ako je audio → Whisper
    if (input.file && input.file.mimetype?.startsWith('audio')) {
      return await this.processAudio(input);
    }

    // Ako je slika → Vision model
    if (input.file && input.file.mimetype?.startsWith('image')) {
      return await this.processImage(input);
    }

    // Ako je tekst → GPT
    return await this.processText(input);
  }

  async processAudio(input) {
    const startTime = Date.now();
    
    try {
      // Simulacija Whisper API poziva (browser-compatible)
      console.log('🎤 Processing audio file:', input.file?.name || 'audio.webm');
      
      // Simulacija obrade audio filea
      await this.delay(1500 + Math.random() * 1000);
      
      const mockTranscript = this.generateMockTranscript();
      
      return {
        type: 'transcript',
        model: this.models.whisper,
        text: mockTranscript,
        processingTime: Date.now() - startTime,
        metadata: {
          duration: '12.3s',
          confidence: 0.94,
          language: 'hr'
        }
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Audio processing failed: ${error.message}`,
        processingTime: Date.now() - startTime
      };
    }
  }

  async processImage(input) {
    const startTime = Date.now();
    
    try {
      // Simulacija Vision API poziva
      await this.delay(2000 + Math.random() * 1500);
      
      const mockAnalysis = this.generateMockImageAnalysis(input.prompt);
      
      return {
        type: 'image_analysis',
        model: this.models.vision,
        analysis: mockAnalysis,
        processingTime: Date.now() - startTime,
        metadata: {
          imageSize: '1920x1080',
          objects_detected: 7,
          confidence: 0.89
        }
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Image processing failed: ${error.message}`,
        processingTime: Date.now() - startTime
      };
    }
  }

  async processText(input) {
    const startTime = Date.now();
    
    try {
      // Odabir modela ovisno o kompleksnosti
      const model = input.prompt.length > 500 || input.prompt.includes('razmisl') 
        ? this.models.reasoning 
        : this.models.text;
        
      // Simulacija API poziva
      await this.delay(1000 + Math.random() * 2000);
      
      const mockResponse = this.generateMockTextResponse(input.prompt, model);
      
      return {
        type: 'text_completion',
        model: model,
        response: mockResponse,
        processingTime: Date.now() - startTime,
        metadata: {
          tokens_used: Math.floor(Math.random() * 1000) + 100,
          reasoning_steps: model === this.models.reasoning ? Math.floor(Math.random() * 5) + 3 : null
        }
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Text processing failed: ${error.message}`,
        processingTime: Date.now() - startTime
      };
    }
  }

  // Paralelno izvršavanje više zahtjeva
  async processMultipleRequests(tasks) {
    console.log('🚀 Processing multiple requests:', tasks.length);
    
    // Promise.allSettled omogućuje da neki zahtjevi ne uspiju, a ostali nastave
    const results = await Promise.allSettled(
      tasks.map((task, index) => 
        this.routeLLMRequest({
          ...task,
          taskId: index,
          timestamp: Date.now()
        })
      )
    );

    return results.map((result, index) => ({
      taskId: index,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
      timestamp: Date.now()
    }));
  }

  // SSE Streaming - šalje rezultate čim stignu
  async streamMultipleRequests(tasks, onResult, onComplete) {
    console.log('📡 Starting SSE stream for', tasks.length, 'tasks');
    
    const streamId = `stream_${Date.now()}`;
    this.activeStreams.set(streamId, { active: true, startTime: Date.now() });

    // Pokreni sve zadatke paralelno
    const promises = tasks.map(async (task, index) => {
      try {
        const result = await this.routeLLMRequest({
          ...task,
          taskId: index,
          streamId: streamId
        });
        
        // Pošalji rezultat čim stigne
        if (this.activeStreams.get(streamId)?.active) {
          onResult({
            event: 'result',
            taskId: index,
            data: result,
            timestamp: Date.now(),
            remainingTasks: tasks.length - index - 1
          });
        }
        
        return { taskId: index, status: 'completed', data: result };
      } catch (error) {
        // Pošalji grešku odmah
        if (this.activeStreams.get(streamId)?.active) {
          onResult({
            event: 'error', 
            taskId: index,
            error: error.message,
            timestamp: Date.now()
          });
        }
        
        return { taskId: index, status: 'failed', error: error.message };
      }
    });

    // Čekaj da se sve završi
    const results = await Promise.allSettled(promises);
    
    // Zatvori stream
    this.activeStreams.delete(streamId);
    
    if (onComplete) {
      onComplete({
        streamId: streamId,
        totalTasks: tasks.length,
        completed: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        duration: Date.now() - this.activeStreams.get(streamId)?.startTime
      });
    }
  }

  // Helper metode za generiranje mock podataka
  generateMockTranscript() {
    const transcripts = [
      "Pozdrav, trebam da analizirate ovaj dokument i izvucite ključne informacije o projektu.",
      "Molim vas da provjerite sve stavke u troškovniku i potvrdite da li su cijene u skladu s tržištem.",
      "Ovaj tlocrt pokazuje novi objekt koji gradimo, trebam vašu procjenu o potrebnim materijalima.",
      "Hitno trebam analizu ponude za aluminijske profile, rok je sutra ujutro.",
      "Možete li mi objasniti kako funkcionira ovaj novi sustav za upravljanje skladištem?"
    ];
    return transcripts[Math.floor(Math.random() * transcripts.length)];
  }

  generateMockImageAnalysis(prompt) {
    return {
      description: "Slika prikazuje tehnički crtež aluminijskog profila s preciznim mjernim podacima",
      detected_objects: [
        { name: "aluminum_profile", confidence: 0.95, bbox: [120, 80, 300, 220] },
        { name: "dimensions", confidence: 0.88, bbox: [50, 250, 150, 280] },
        { name: "technical_drawing", confidence: 0.92, bbox: [0, 0, 400, 300] }
      ],
      extracted_text: "Profile ALP-2024-X, Dimenzije: 50x30x2mm, Material: Al6060-T5",
      recommendations: [
        "Profil je standardnih dimenzija i dostupan je u skladištu",
        "Preporučuje se provjera debljine zida (2mm) za strukturnu primjenu",
        "Potrebno je 12 komada za kompletnu konstrukciju"
      ]
    };
  }

  generateMockTextResponse(prompt, model) {
    if (model === this.models.reasoning) {
      return {
        thinking: "Analiziram korisnikov zahtjev i identificiram ključne komponente...",
        reasoning_steps: [
          "1. Prepoznajem da se radi o projektu s aluminijskim profilima",
          "2. Identificiram potrebu za kalkulaciju troškova i vremena",
          "3. Razmatram dostupnost materijala i logističke aspekte"
        ],
        conclusion: "Preporučujem korištenje profila serije 6060-T5 s dodatnom provjeron strukturnih karakteristika."
      };
    } else {
      return {
        response: "Na temelju vašeg upita, mogu preporučiti sljedeće korake za vaš projekt...",
        suggestions: [
          "Provjeriti dostupnost materijala u skladištu",
          "Izraditi detaljan troškovnik",
          "Planirati vremenski okvir izvršenja"
        ],
        confidence: 0.87
      };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Upravljanje streaming sesijama
  stopStream(streamId) {
    if (this.activeStreams.has(streamId)) {
      this.activeStreams.get(streamId).active = false;
      this.activeStreams.delete(streamId);
      console.log('🛑 Stream stopped:', streamId);
    }
  }

  getActiveStreams() {
    return Array.from(this.activeStreams.keys());
  }

  getStats() {
    return {
      activeStreams: this.activeStreams.size,
      modelsAvailable: Object.keys(this.models),
      queuedTasks: this.taskQueue.length
    };
  }

  /* ========== GANTT VOICE AGENT INTEGRATION ========== */

  // Glavna metoda za Gantt Voice Agent workflow
  async processGanttVoiceCommand(input) {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Processing Gantt Voice Command:', {
        hasAudio: !!input.audioBlob,
        hasTranscript: !!input.transcript,
        hasDraftContext: !!input.draftContext,
        projectId: input.projectId
      });

      let transcript = input.transcript;
      
      // Step 1: Audio transcription ako je potrebno
      if (input.audioBlob && !transcript) {
        console.log('🎤 Step 1: Audio transcription...');
        transcript = await this.transcribeGanttAudio(input.audioBlob);
      }

      if (!transcript) {
        throw new Error('Nema dostupnog transcript-a ili audio datoteke');
      }

      // Step 2: Intent recognition (brzo prepoznavanje)
      console.log('🧠 Step 2: Intent recognition...');
      const intent = await this.recognizeGanttIntent(transcript);
      
      // Step 3: Full agent processing
      console.log('🤖 Step 3: Agent processing...');
      const agentResponse = await this.callGanttAgent({
        transcript,
        draftContext: input.draftContext,
        projectId: input.projectId,
        detectedIntent: intent
      });

      return {
        type: 'gantt_voice_result',
        transcript,
        intent,
        agent_response: agentResponse,
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Gantt Voice Command error:', error);
      return {
        type: 'error',
        error: `Gantt Voice processing failed: ${error.message}`,
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Whisper transcription preko backend-a
  async transcribeGanttAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'gantt-voice.webm');

      const response = await fetch('http://localhost:3001/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Audio transcribed:', result.text?.substring(0, 50) + '...');
      
      return result.text || result.fallback_text;
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw new Error('Audio transcription failed: ' + error.message);
    }
  }

  // Brzo prepoznavanje intent-a
  async recognizeGanttIntent(text) {
    try {
      const response = await fetch('http://localhost:3002/api/llm/gantt-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Intent API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('🎯 Intent recognized:', result.intent, `(${result.confidence})`);
      
      return result;
    } catch (error) {
      console.warn('⚠️ Intent recognition failed, using fallback:', error);
      // Fallback intent detection
      return this.fallbackIntentDetection(text);
    }
  }

  // Fallback intent detection (client-side)
  fallbackIntentDetection(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('rasporedi') || lowerText.includes('generiraj') || lowerText.includes('napravi gantt')) {
      return { intent: 'schedule_all', confidence: 0.8, entities: {} };
    }
    if (lowerText.includes('potvrdi') || lowerText.includes('u redu') || lowerText.includes('slažem se')) {
      return { intent: 'confirm', confidence: 0.7, entities: {} };
    }
    if (lowerText.includes('pomakni') || lowerText.includes('počni od')) {
      return { intent: 'set_dates', confidence: 0.6, entities: {} };
    }
    if (lowerText.includes('odustani') || lowerText.includes('prekini')) {
      return { intent: 'cancel', confidence: 0.9, entities: {} };
    }
    
    return { intent: 'unknown', confidence: 0.3, entities: {} };
  }

  // Poziv glavnog Gantt Agent-a
  async callGanttAgent(input) {
    try {
      const payload = {
        transcript: input.transcript,
        draftContext: input.draftContext ? JSON.stringify(input.draftContext) : null,
        projectId: input.projectId
      };

      const response = await fetch('http://localhost:3002/api/agent/gantt-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gantt Agent API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('🤖 Agent response received:', {
        intent: result.agent_response?.intent,
        patches: result.agent_response?.ui_patches?.length || 0,
        commitMode: result.agent_response?.commit_mode
      });
      
      return result.agent_response;
    } catch (error) {
      console.error('❌ Gantt Agent call error:', error);
      throw new Error('Gantt Agent processing failed: ' + error.message);
    }
  }

  // Draft operacije preko backend-a
  async processDraftOperation(operation, draftData, prompt = null) {
    try {
      console.log(`📋 Draft operation: ${operation}`);
      
      const payload = {
        operation,
        draftData,
        prompt
      };

      const response = await fetch('http://localhost:3001/api/gantt/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Draft API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Draft ${operation} completed:`, {
        type: result.type,
        draftId: result.draft?.draftId
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Draft ${operation} error:`, error);
      throw new Error(`Draft operation failed: ${error.message}`);
    }
  }

  // Confirm workflow preko backend-a
  async processConfirmOperation(draftData, confirmationType, userMessage = null) {
    try {
      console.log(`✅ Confirm operation: ${confirmationType}`);
      
      const payload = {
        draftData,
        confirmationType,
        userMessage
      };

      const response = await fetch('http://localhost:3001/api/gantt/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Confirm API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Confirm ${confirmationType} completed:`, {
        status: result.status,
        commitReady: result.commit_ready
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Confirm ${confirmationType} error:`, error);
      throw new Error(`Confirm operation failed: ${error.message}`);
    }
  }

  // Commit finalizacija preko backend-a
  async processCommitOperation(draftData, projectId, process = 'montaza') {
    try {
      console.log(`💾 Commit operation for project: ${projectId}`);
      
      const payload = {
        draftData,
        projectId,
        process
      };

      const response = await fetch('http://localhost:3001/api/gantt/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Commit API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Commit completed:`, {
        success: result.success,
        draftId: result.committed_draft_id
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Commit error:`, error);
      throw new Error(`Commit operation failed: ${error.message}`);
    }
  }
}

export default AgentOrchestrator;