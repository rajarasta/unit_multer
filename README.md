# Aluminum Store UI - Upravljanje Aluminijskog Proizvodstva

Moderni dashboard za upravljanje aluminijskim pogonima i projektima sa interaktivnim komponentama, AI integracijama i naprednim planiranjem proizvodnje.

![React 19](https://img.shields.io/badge/React-19.1.1-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-7.1.2-646CFF?style=flat&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.14-38B2AC?style=flat&logo=tailwind-css)
![Zustand](https://img.shields.io/badge/Zustand-5.0.8-E3C200?style=flat)

## 🏗️ Pregled Projekta

Aluminum Store UI je sveobuhvatan sustav za upravljanje aluminijskim pogonima koji omogućava:

- **Upravljanje projektima**: Kompletan životni ciklus aluminijskih projekata
- **Floor plan upravljanje**: Interaktivni tlocrti sa drag & drop funkcionalnostima
- **Gannt planiranje**: Napredni projektni timelines sa real-time ažuriranjima
- **AI integracije**: Google Gemini, LM Studio, OpenWebUI podrška
- **Invoice processing**: Automatska obrada računa sa OCR tehnologijama
- **Chat sustav**: Komunikacija sa AGBIM field simulator podrškom

## 🚀 Brzi Start

### Preduvjeti

- **Node.js** ≥ 18.0.0 (preporučeno 20+)
- **npm** ili **yarn**
- **Moderne web pregljednika** (Chrome, Firefox, Edge)

### Instalacija

```bash
# Kloniraj repository
git clone <repository-url>
cd aluminum-store-ui

# Instaliraj dependencies
npm install

# Kopiraj environment varijable
cp .env.example .env

# Pokreni development server
npm run dev
```

### Environment Setup

Stvori `.env` datoteku u root direktoriju:

```env
# Google AI API Key (za invoice processing i AI funkcionalnosti)
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# LM Studio server (opcionalno)
VITE_LM_STUDIO_URL=http://10.39.35.136:1234

# OpenWebUI server (opcionalno)  
VITE_OPENWEBUI_URL=http://localhost:8080
```

## 📋 Dostupne Naredbe

```bash
# Development
npm run dev              # Pokreni development server (port 5186)
npm run build            # Build za produkciju
npm run preview          # Preview produkcijskih build-a
npm run lint             # Provjeri kod quality

# Backend Services
npm run file-writer      # Pokreni file persistence server (port 3001)
npm run dev-full         # Pokreni sve servise istovremeno
```

## 🏛️ Arhitektura Aplikacije

### Core Struktura

```
src/
├── App.jsx                 # Glavni application router
├── components/
│   ├── layout/
│   │   └── MainLayout.jsx  # Layout wrapper sa sidebar navigacijom
│   ├── tabs/               # Svi tab komponenti (lazy-loaded)
│   │   ├── InvoiceProcessing/
│   │   ├── FloorManagement/
│   │   ├── PlannerGantt/
│   │   ├── Chat/
│   │   ├── LLMServerManager/
│   │   └── ...
│   └── auth/               # Authentication komponenti
├── store/                  # Zustand state management
├── services/               # API i backend servisi
├── utils/                  # Utility functions
└── constants/              # Application konstante
```

### Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v3.4.14
- **State Management**: Zustand 5.0.8
- **Animations**: Framer Motion 12.23.12
- **Icons**: Lucide React 0.539.0
- **AI Integration**: 
  - `@google/genai` 1.16.0 (Google Gemini)
  - `@google/generative-ai` 0.24.1 (legacy)
- **Document Processing**: 
  - PDF.js 5.4.54
  - Tesseract.js 6.0.1 (OCR)
  - xlsx 0.18.5
- **XML Parsing**: fast-xml-parser 5.2.5

## 🎯 Glavni Moduli

### 1. Invoice Processing (`/invoice`, `/invoice2`, `/invoice-simple`)
Napredni sistem za obradu računa sa:
- **OCR prepoznavanje**: Automatska ekstrakcija podataka iz PDF/slika
- **Google Gemini AI**: Strukturiranje podataka na hrvatskom jeziku
- **Multi-format export**: Excel, JSON, CSV
- **Real-time editing**: Inline uređivanje extraktiranih podataka
- **3-stage JSON parsing**: Robust error recovery

**Komponenti**: `InvoiceProcessing`, `InvoiceProcessor2`, `InvoiceProcessorV2Simple`

### 2. Floor Management (`/floorplan`)
Interaktivno upravljanje tlocrtima:
- **Drag & Drop**: Postavljanje pozicija na tlocrt
- **Multi-floor support**: Upravljanje više razina
- **Installation tracking**: Montažni procesi (spremno → završeno)
- **Position linking**: Povezivanje pozicija sa projektnim podacima
- **Real-time updates**: Live pozicija ažuriranja

**Komponenti**: `FloorManagement`

### 3. Gantt Planning (`/gantt`, `/employogram`)
Napredno projektno planiranje:
- **Interactive Gantt charts**: Drag & drop task scheduling
- **Resource management**: Assignee tracking
- **3-level hierarchy**: Position → Piece → Subprocess
- **Real-time collaboration**: Multi-user updates
- **Progress tracking**: Completion percentages

**Komponenti**: `PlannerGantt`, `PlannerGanttV2`

### 4. AI Integration Hub
Četiri AI moda:
- **Vision Mode**: Slika analiza preko Google Gemini
- **Spatial Mode**: 3D prostorna analiza
- **OpenWebUI Mode**: RAG sistem integracija
- **Direct LLM**: LM Studio direct API

**Komponenti**: `AIInference`, `AIFileProcessor`, `LLMServerManager`

### 5. Chat & Communication (`/chat`)
Centralizirano komunikacijsko sučelje:
- **AGBIM integration**: Field simulator poruke
- **Multi-modal support**: Tekst, slike, audio
- **Goriona urgency system**: Hrvatski idiom urgency levels
- **Real-time updates**: Cross-tab event communication
- **Attachment management**: File upload/download

**Komponenti**: `Chat`, `AgbimFieldSimulatorTab`

### 6. User Management (`/users`)
Korisničko upravljanje:
- **Role-based access**: Admin, Manager, Worker roles
- **Authentication**: Secure login/logout
- **Profile management**: User settings i preferences
- **Activity tracking**: User action logs

**Komponenti**: `UserManagement`, `AuthPage`, `ProfileSettings`

## 🔧 Konfiguracija i Postavke

### Lazy Loading Pattern

Svi tab komponenti su lazy-loaded za optimizaciju performansi:

```javascript
const InvoiceProcessing = lazy(() => import('./components/tabs/InvoiceProcessing'));
const FloorManagement = lazy(() => import('./components/tabs/FloorManagement'));
// ... ostali komponenti
```

### Error Boundaries

Aplikacija koristi multi-level error handling:
- **Global ErrorBoundary**: App-level crash protection
- **Tab ErrorBoundary**: Tab-specific error isolation
- **Component-level**: Individualni error states

### State Management sa Zustand

Centralizirani store u `src/store/useProjectStore.js`:

```javascript
// Projekti, pozicije, tasks, floor management
const { project, updatePosition, addTask } = useProjectStore();

// 3-level hijerarhija podataka
// Level 1: Position-wide data
// Level 2: Piece-specific data  
// Level 3: Subprocess data (transport, ugradnja, stakljenje...)
```

### File Persistence

Backend integration putem `file-writer.cjs`:
- **Express server** na portu 3001
- **JSON storage**: `src/backend/agbim.json`, `all_projects_*.json`
- **Cross-tab sync**: Real-time data synchronization
- **Backup strategies**: localStorage cache fallback

## 🎨 UI/UX Patterns

### Responsive Design

Mobile-first Tailwind pristup:

```css
/* Base: mobile, sm: ≥640px, md: ≥768px, lg: ≥1024px, xl: ≥1280px */
.responsive-class {
  @apply text-sm p-2 sm:text-base sm:p-3 md:text-lg md:p-4;
}
```

### Animation System

Framer Motion integracija:

```javascript
// Hover cards sa smooth transitions
<motion.div
  initial={{ opacity: 0, width: 0 }}
  animate={{ opacity: 1, width: 320 }}
  exit={{ opacity: 0, width: 0 }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
/>
```

### Theme System

Konzistentni color palette:
- **Primary**: Plavi tonovi za glavne akcije
- **Success**: Zeleni za completed states
- **Warning**: Žuti/narančasti za attention states
- **Error**: Crveni za error states
- **Goriona levels**: 8-step urgency system (ladno → zapalit će se)

## 🔌 API Integracije

### Google Gemini AI

```javascript
// Novi SDK (@google/genai v1.16.0)
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: VITE_GOOGLE_AI_API_KEY });
const result = await ai.models.generateContent({
  model: 'gemini-1.5-pro',
  contents: parts,
  config: { generationConfig: { temperature: 0.1 } }
});
```

### LM Studio Integration

```javascript
// Direct API calls za local LLM models
const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: selectedModel,
    messages: messages,
    // 20+ konfiguracijski parametri
  })
});
```

### OpenWebUI RAG System

```javascript
// RAG document processing
const ragResponse = await fetch(`${OPENWEBUI_URL}/api/chat`, {
  method: 'POST',
  body: formData // Files + query
});
```

## 📊 Development Workflow

### Code Style

- **No comments policy**: Kod mora biti self-documenting
- **Functional components only**: Hooks-based pristup
- **PascalCase komponenti**: `InvoiceProcessor2`
- **camelCase utilities**: `parseLogikalXml`
- **Props drilling**: Eksplicitni data flow

### TypeScript → JavaScript Migration

**Kritično**: Ukloniti sav TypeScript syntax iz `.jsx` datoteka:

```javascript
// ❌ FATAL - uzrokuje build failure
const [tasks, setTasks] = useState<Task[]>([]);
interface Task { id: string; }

// ✅ CORRECT
const [tasks, setTasks] = useState([]);
// Comment: Task = { id, name, status }
```

### Error Detection Patterns

```bash
npm run dev
# Pattern A: "Missing semicolon" → Remove 'as const'
# Pattern B: "Unexpected token" → Remove interface/type
# Pattern C: "ReferenceError: Type is not defined" → Remove type annotations
```

## 🚨 Kritični Bugovi i Rješenja

### 1. localStorage Quota Crisis

**Problem**: `QuotaExceededError` kada localStorage premaši 5-10MB limit
**Rješenje**: Lightweight caching sa size monitoring

```javascript
const lightData = {
  version: data.version,
  projectCount: data.projects?.length || 0,
  recentChats: data.projects?.map(p => ({
    recentMessages: (p.chat || []).slice(-10) // Only last 10
  }))
};
```

### 2. Hover System Implementation

Multi-level hover sa preciznim UX controlom:

```javascript
const [hoveredTask, setHoveredTask] = useState(null);
const [hoverLevel, setHoverLevel] = useState(0); // 0=none, 1=small, 2=large
const hoverLeaveTimerRef = useRef(null);

// 200ms delay = psychologically perfect sweet spot
hoverLeaveTimerRef.current = setTimeout(() => {
  setHoveredTask(null);
}, 200);
```

### 3. Infinite useEffect Loops

```javascript
// ❌ DANGEROUS
useEffect(() => {
  setHoverLevel(hoverLevel + 1); // Triggers itself!
}, [hoverLevel]);

// ✅ CORRECT
useEffect(() => {
  if (condition && hoverLevel < 2) {
    setHoverLevel(2);
  }
}, [condition]); // Don't depend on state you're updating
```

## 📁 File Organization

```
src/
├── components/
│   ├── tabs/                    # Glavni moduli
│   │   ├── InvoiceProcessing/   # Invoice processing SA Google AI
│   │   ├── InvoiceProcessor2/   # Napredni processor
│   │   ├── FloorManagement/     # Tlocrt management
│   │   ├── PlannerGantt/        # Gantt charts
│   │   ├── Chat/                # Communication hub
│   │   ├── LLMServerManager/    # AI server management
│   │   ├── AgbimFieldSimulatorTab/ # Field data simulation
│   │   ├── UserManagement/      # User admin
│   │   ├── TaskHub/             # Task centralization
│   │   └── ...                  # Ostali moduli
│   ├── layout/
│   │   └── MainLayout.jsx       # Sidebar + content layout
│   └── auth/                    # Authentication
├── services/
│   ├── CloudLLMService.js       # Google Gemini integration
│   ├── ProjectDataService.js    # Project CRUD operations  
│   ├── AgbimDataService.js      # AGBIM field data management
│   ├── aiIntegrationService.js  # Multi-AI integration
│   └── ...
├── store/
│   ├── useProjectStore.js       # Glavni state store
│   └── useUserStore.js          # User authentication
├── constants/
│   ├── navigation.js            # Sidebar navigation items
│   └── aiModes.js               # AI integration modes
└── utils/
    ├── parseLogikalXml.js       # XML parsing utilities
    ├── agentHelpers.js          # AI helper functions
    └── ...
```

## 🧪 Testing i Quality

### Linting

```bash
npm run lint  # ESLint provjera
```

### Performanse

- **Lazy loading**: Svi tab komponenti
- **Code splitting**: Automatic Vite optimizacija  
- **Memory management**: Timer cleanup, reference management
- **Bundle analysis**: Vite builtin analyzer

### Browser Support

- **Chrome/Chromium**: 90+
- **Firefox**: 88+  
- **Safari**: 14+
- **Edge**: 90+

## 🔒 Sigurnost

- **API Key management**: Environment varijable only
- **No secrets in code**: Strict policy
- **CORS handling**: Secure cross-origin requests
- **Input sanitization**: XSS prevention
- **File upload limits**: Size i type restrictions

## 📈 Performance Metrics

- **Initial load**: <3s na moderate internet
- **Tab switching**: <500ms transition
- **Large file processing**: Chunk-based za >10MB
- **Memory usage**: <100MB typical usage
- **Bundle size**: ~2MB gzipped

## 🤝 Contributing

### Development Setup

1. Fork repository
2. Stvori feature branch: `git checkout -b feature/new-feature`
3. Commit promjene: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`  
5. Stvori Pull Request

### Coding Standards

- **No TypeScript** syntax u `.jsx` datotekama
- **No comments** unless explicitly needed
- **Functional components** only
- **Consistent naming**: PascalCase/camelCase
- **Error boundaries** za sve komponente
- **Proper cleanup** u useEffect

## 📝 Changelog

### v5.5.0 (Latest)
- ✅ AGBIM Chat display system (text left, attachments right)
- ✅ localStorage quota crisis resolution
- ✅ Google Gemini SDK migration (@google/genai v1.16.0)
- ✅ Goriona urgency system integration
- ✅ Real-time cross-tab communication
- ✅ Enhanced error boundary system

### v5.4.0
- ✅ LM Studio manual model selection
- ✅ Position tasks Gantt chart integration
- ✅ Memory optimization features
- ✅ Dynamic model selector

### v5.3.0  
- ✅ Task Hub centralization
- ✅ User management system
- ✅ Authentication flow
- ✅ AGBIM field simulator

## 📞 Support

Za pitanja, bugove ili feature requestove:
- **Issues**: Stvori GitHub issue
- **Documentation**: Provjeri `CLAUDE.md` za development guide
- **API**: Pogledaj service datoteke u `src/services/`

## 📄 License

This project is proprietary software. All rights reserved.

---

**Aluminum Store UI** - Moderan, skalabilan sustav za upravljanje aluminijskim pogonima sa cutting-edge tehnologijama i hrvatskim jezičnim podrškom.