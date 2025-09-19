// MOCK LLM SERVICE - Simulacija lokalnog jezičnog modela
// Za testiranje AI reasoning funkcionalnosti prije integracije s pravim LLM serverima

import { delay } from '../utils/helpers';

// MOCK: Simulacija različitih tipova reasoning steps-a
const mockReasoningSteps = {
  text: [
    { id: 1, content: "Analiziram strukturu teksta...", timestamp: 0, confidence: 0.1 },
    { id: 2, content: "Prepoznajem ključne pojmove i termine...", timestamp: 1000, confidence: 0.3 },
    { id: 3, content: "Kategoriziram informacije po tipovima...", timestamp: 2000, confidence: 0.5 },
    { id: 4, content: "Povezujem kontekstne reference...", timestamp: 3200, confidence: 0.7 },
    { id: 5, content: "Generiram sažetak i preporuke...", timestamp: 4500, confidence: 0.9 },
    { id: 6, content: "Finaliziram analizu teksta.", timestamp: 5800, confidence: 1.0 }
  ],

  image: [
    { id: 1, content: "Učitavam sliku u vizualni model...", timestamp: 0, confidence: 0.1 },
    { id: 2, content: "Analiziram objekte i strukture...", timestamp: 1500, confidence: 0.3 },
    { id: 3, content: "Prepoznajem aluminijske komponente...", timestamp: 3000, confidence: 0.5 },
    { id: 4, content: "Detektiram dimenzije i specifikacije...", timestamp: 4800, confidence: 0.7 },
    { id: 5, content: "Uspoređujem s katalogom proizvoda...", timestamp: 6200, confidence: 0.8 },
    { id: 6, content: "Generiram tehničke preporuke...", timestamp: 7500, confidence: 0.95 },
    { id: 7, content: "Završavam vizualnu analizu.", timestamp: 8800, confidence: 1.0 }
  ],

  pdf: [
    { id: 1, content: "Parsiranje PDF dokumenta...", timestamp: 0, confidence: 0.1 },
    { id: 2, content: "Ekstraktiram tekst i tablice...", timestamp: 2000, confidence: 0.3 },
    { id: 3, content: "Analiziram tehnička crtanja...", timestamp: 4000, confidence: 0.5 },
    { id: 4, content: "Povezujem specifikacije s katalogom...", timestamp: 6500, confidence: 0.7 },
    { id: 5, content: "Validiram tehničke podatke...", timestamp: 8000, confidence: 0.9 },
    { id: 6, content: "Kreiram strukturirani izvještaj.", timestamp: 9500, confidence: 1.0 }
  ],

  table: [
    { id: 1, content: "Učitavam tabelarne podatke...", timestamp: 0, confidence: 0.1 },
    { id: 2, content: "Analiziram strukture kolona...", timestamp: 800, confidence: 0.3 },
    { id: 3, content: "Validiram numeričke vrijednosti...", timestamp: 1800, confidence: 0.5 },
    { id: 4, content: "Detektiram anomalije u podacima...", timestamp: 2800, confidence: 0.7 },
    { id: 5, content: "Generiram statističke insights...", timestamp: 3500, confidence: 0.9 },
    { id: 6, content: "Završavam analizu podataka.", timestamp: 4200, confidence: 1.0 }
  ]
};

// MOCK: Finalni rezultati po content tipovima
const mockFinalResults = {
  text: {
    summary: "Tekst sadrži specifikacije za aluminijske fasadne panele Schüco tipa AWS 75.SI+ s termo prekidom. Potrebne su dodatne informacije o dimenzijama.",
    keyInsights: [
      "Aluminijski profili - AWS serija",
      "Termo prekid - energetska efikasnost",
      "Zastakljenje - trostruko Low-E",
      "Boja - RAL 7016 (antracit siva)"
    ],
    recommendations: [
      "Provjeriti kompatibilnost s postojećim sustavom",
      "Izračunati termo mostove",
      "Definirati montažne detalje"
    ],
    confidence: 0.87
  },

  image: {
    summary: "Slika prikazuje aluminijski profil za fasadne panele s vidljivim termo prekidom i gasket sustavom. Profil odgovara Schüco AWS seriji.",
    detectedObjects: [
      { name: "Aluminijski profil", confidence: 0.95, bbox: [120, 45, 380, 290] },
      { name: "Termo prekid", confidence: 0.88, bbox: [200, 100, 220, 180] },
      { name: "Gasket sustav", confidence: 0.82, bbox: [180, 120, 340, 140] }
    ],
    technicalSpecs: {
      profileSeries: "AWS 75.SI+",
      thermalBreak: "24mm poliamid",
      glazingSystem: "trostruko",
      dimensions: "75mm dubina"
    },
    confidence: 0.91
  },

  pdf: {
    summary: "PDF dokument sadrži tehničke specifikacije za kompletni aluminijski fasadni sustav s detaljnim crtežima i montažnim uputama.",
    extractedData: {
      projectName: "Fasada Zgrada A - Faza 2",
      totalArea: "1,250 m²",
      profileCount: 145,
      glazingUnits: 89
    },
    technicalDrawings: [
      "Detalj spoja prozor-zid",
      "Vertikalni presjek",
      "Horizontalni presjek",
      "Uglovni spoj"
    ],
    confidence: 0.93
  }
};

// MOCK: Status types za kompleksan status management
export const STATUS_TYPES = {
  UPLOAD: {
    EMPTY: 'upload_empty',
    UPLOADING: 'upload_uploading',
    UPLOADED: 'upload_uploaded',
    ERROR: 'upload_error'
  },

  PROCESSING: {
    NOT_PROCESSED: 'proc_not_processed',
    REASONING: 'proc_reasoning',
    PROCESSED: 'proc_processed',
    CANCELLED: 'proc_cancelled',
    ERROR: 'proc_error'
  },

  QUEUE: {
    NOT_READY: 'queue_not_ready',
    READY: 'queue_ready',
    QUEUED: 'queue_queued',
    BIG_PROCESSING: 'queue_big_processing',
    BIG_COMPLETE: 'queue_big_complete',
    BIG_ERROR: 'queue_big_error'
  },

  CONNECTION: {
    DISCONNECTED: 'conn_disconnected',
    CONNECTED: 'conn_connected',
    READY_COMBINED: 'conn_ready_combined',
    COMBINED_PROCESSING: 'conn_combined_processing',
    COMBINED_COMPLETE: 'conn_combined_complete'
  }
};

// MOCK: LLM API Simulacija
class MockLLMService {
  constructor() {
    this.activeReasoning = new Map(); // Track active reasoning sessions
    this.processingQueue = [];
    this.currentBigProcessing = null;
  }

  // MOCK: Pokretanje reasoning procesa
  async startReasoning(unitId, contentType, content, onProgressUpdate) {
    const reasoningId = `reasoning_${unitId}_${Date.now()}`;
    const steps = mockReasoningSteps[contentType] || mockReasoningSteps.text;

    this.activeReasoning.set(reasoningId, {
      unitId,
      contentType,
      content,
      steps,
      currentStep: 0,
      status: 'active',
      startTime: Date.now()
    });

    try {
      // Simulacija streaming reasoning steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Check if reasoning was cancelled
        const session = this.activeReasoning.get(reasoningId);
        if (!session || session.status === 'cancelled') {
          throw new Error('Reasoning cancelled');
        }

        // Update progress
        session.currentStep = i;
        this.activeReasoning.set(reasoningId, session);

        // Call progress callback
        if (onProgressUpdate) {
          onProgressUpdate({
            reasoningId,
            step: i + 1,
            totalSteps: steps.length,
            content: step.content,
            confidence: step.confidence,
            timestamp: Date.now()
          });
        }

        // Simulacija delay-a između koraka
        await delay(step.timestamp - (i > 0 ? steps[i-1].timestamp : 0));
      }

      // Finalni rezultat
      const finalResult = mockFinalResults[contentType] || mockFinalResults.text;
      const session = this.activeReasoning.get(reasoningId);
      session.status = 'completed';
      session.result = finalResult;
      this.activeReasoning.set(reasoningId, session);

      if (onProgressUpdate) {
        onProgressUpdate({
          reasoningId,
          status: 'completed',
          result: finalResult,
          timestamp: Date.now()
        });
      }

      return {
        reasoningId,
        status: 'completed',
        result: finalResult
      };

    } catch (error) {
      const session = this.activeReasoning.get(reasoningId);
      if (session) {
        session.status = 'error';
        session.error = error.message;
        this.activeReasoning.set(reasoningId, session);
      }

      if (onProgressUpdate) {
        onProgressUpdate({
          reasoningId,
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }

      throw error;
    }
  }

  // MOCK: Prekidanje reasoning procesa
  cancelReasoning(reasoningId) {
    const session = this.activeReasoning.get(reasoningId);
    if (session) {
      session.status = 'cancelled';
      this.activeReasoning.set(reasoningId, session);
      return true;
    }
    return false;
  }

  // MOCK: Dohvaćanje statusa reasoning procesa
  getReasoningStatus(reasoningId) {
    return this.activeReasoning.get(reasoningId) || null;
  }

  // MOCK: Kombinirana obrada povezanih unitova
  async startCombinedProcessing(unitIds, combinedContent, onProgressUpdate) {
    const processingId = `combined_${unitIds.join('_')}_${Date.now()}`;

    // Simulacija složenije obrade
    const combinedSteps = [
      { id: 1, content: "Spajam sadržaje iz povezanih unitova...", timestamp: 0 },
      { id: 2, content: "Analiziram korelacije između sadržaja...", timestamp: 2000 },
      { id: 3, content: "Generiram cross-reference mapping...", timestamp: 4500 },
      { id: 4, content: "Kreiram unified data model...", timestamp: 6800 },
      { id: 5, content: "Validiram konzistentnost podataka...", timestamp: 9000 },
      { id: 6, content: "Generiram kombiniranu analizu...", timestamp: 11500 },
      { id: 7, content: "Finaliziram integrirani izvještaj.", timestamp: 13800 }
    ];

    for (let i = 0; i < combinedSteps.length; i++) {
      const step = combinedSteps[i];

      if (onProgressUpdate) {
        onProgressUpdate({
          processingId,
          step: i + 1,
          totalSteps: combinedSteps.length,
          content: step.content,
          timestamp: Date.now(),
          unitIds
        });
      }

      await delay(step.timestamp - (i > 0 ? combinedSteps[i-1].timestamp : 0));
    }

    const combinedResult = {
      summary: `Kombinirana analiza ${unitIds.length} povezanih unitova pokazuje koherentnu strukturu podataka s visokom kompatibilnošću.`,
      crossReferences: unitIds.map(id => ({
        unitId: id,
        relevance: 0.85 + Math.random() * 0.15,
        connections: unitIds.filter(otherId => otherId !== id)
      })),
      integratedInsights: [
        "Svi unitovi referenciraju isti projekt",
        "Konzistentne tehničke specifikacije",
        "Kompatibilni materijali i sustavi",
        "Optimizacija moguća kroz standardizaciju"
      ],
      recommendations: [
        "Proceduraj s unified ordering sistemom",
        "Implementiraj batch processing",
        "Optimiziraj logističke rute"
      ],
      confidence: 0.92
    };

    if (onProgressUpdate) {
      onProgressUpdate({
        processingId,
        status: 'completed',
        result: combinedResult,
        timestamp: Date.now(),
        unitIds
      });
    }

    return {
      processingId,
      status: 'completed',
      result: combinedResult,
      unitIds
    };
  }

  // MOCK: Queue management za veliku obradu
  addToBigProcessingQueue(unitIds, priority = 'normal') {
    const queueItem = {
      id: `queue_${Date.now()}`,
      unitIds,
      priority,
      status: 'queued',
      addedAt: Date.now(),
      estimatedDuration: unitIds.length * 15000 + Math.random() * 10000 // Simulacija
    };

    this.processingQueue.push(queueItem);
    this.processingQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return queueItem.id;
  }

  // MOCK: Pokretanje sljedeće velike obrade iz queue-a
  async processNextInQueue(onProgressUpdate) {
    if (this.currentBigProcessing || this.processingQueue.length === 0) {
      return null;
    }

    const queueItem = this.processingQueue.shift();
    this.currentBigProcessing = queueItem;
    queueItem.status = 'processing';
    queueItem.startedAt = Date.now();

    try {
      // Simulacija velike obrade
      const bigProcessingSteps = [
        "Inicijalizacija big processing engine...",
        "Učitavanje svih povezanih resursa...",
        "Pokretanje distribuirane analize...",
        "Paralelno procesiranje podataka...",
        "Agregacija rezultata...",
        "Optimizacija outputa...",
        "Generiranje finalnog izvještaja...",
        "Validation i quality check...",
        "Finalizacija i eksport..."
      ];

      for (let i = 0; i < bigProcessingSteps.length; i++) {
        if (onProgressUpdate) {
          onProgressUpdate({
            queueId: queueItem.id,
            unitIds: queueItem.unitIds,
            step: i + 1,
            totalSteps: bigProcessingSteps.length,
            content: bigProcessingSteps[i],
            progress: (i + 1) / bigProcessingSteps.length,
            timestamp: Date.now()
          });
        }

        await delay(2000 + Math.random() * 1000); // Variable delay
      }

      queueItem.status = 'completed';
      queueItem.completedAt = Date.now();
      queueItem.result = {
        summary: `Big processing completed za ${queueItem.unitIds.length} unitova`,
        processedUnits: queueItem.unitIds.length,
        duration: queueItem.completedAt - queueItem.startedAt,
        optimization: "Postignuta optimizacija od 23% u processing vremenu",
        exportFormat: "Unified JSON + PDF izvještaj"
      };

      this.currentBigProcessing = null;

      if (onProgressUpdate) {
        onProgressUpdate({
          queueId: queueItem.id,
          status: 'completed',
          result: queueItem.result,
          timestamp: Date.now()
        });
      }

      return queueItem;

    } catch (error) {
      queueItem.status = 'error';
      queueItem.error = error.message;
      this.currentBigProcessing = null;

      if (onProgressUpdate) {
        onProgressUpdate({
          queueId: queueItem.id,
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }

      throw error;
    }
  }

  // MOCK: Dohvaćanje queue statusa
  getQueueStatus() {
    return {
      queue: [...this.processingQueue],
      currentProcessing: this.currentBigProcessing,
      queueLength: this.processingQueue.length
    };
  }

  // MOCK: Simulacija tool calls i batch operacija
  async simulateToolCalls(toolName, parameters) {
    const tools = {
      'get_inventory_status': async (itemId) => {
        await delay(500);
        return {
          itemId,
          status: 'available',
          quantity: Math.floor(Math.random() * 100) + 1,
          location: 'Warehouse_A',
          reserved: Math.floor(Math.random() * 10)
        };
      },

      'calculate_pricing': async (specifications) => {
        await delay(800);
        return {
          basePrice: Math.floor(Math.random() * 5000) + 1000,
          volume_discount: 0.05,
          totalPrice: Math.floor(Math.random() * 4500) + 950,
          currency: 'EUR',
          validUntil: Date.now() + (30 * 24 * 60 * 60 * 1000)
        };
      },

      'check_compatibility': async (itemA, itemB) => {
        await delay(1200);
        return {
          compatible: Math.random() > 0.3,
          compatibility_score: Math.random(),
          notes: 'Kompatibilnost provjerena protiv kataloga',
          alternatives: ['ALT_001', 'ALT_002']
        };
      }
    };

    const tool = tools[toolName];
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await tool(parameters);
  }
}

// Export singleton instance
export const mockLLMService = new MockLLMService();


export default mockLLMService;