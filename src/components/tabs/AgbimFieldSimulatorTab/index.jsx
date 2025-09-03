import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  MapPin, Mic, Square, Camera, Upload, FileAudio, Image as ImageIcon, File, Settings, Send,
  CheckCircle2, AlertCircle, Loader2, Trash2, Play, Pause, X, Wifi, WifiOff, ChevronDown, Key, Cpu,
  Video as VideoIcon
} from "lucide-react";
import CloudLLMService from "../../../services/CloudLLMService";
import { GOOGLE_MODELS, GOOGLE_MODEL_LABELS } from "../../../constants/aiModes";
import ProjectDataService from "../../../services/ProjectDataService";

const DEPTH = "shadow-lg";
const GLASS = "bg-white/80 backdrop-blur-xl";
const TRN = "transition-all duration-300 ease-out";

const fmtBytes = (n=0) => {
  const u = ["B","KB","MB","GB"]; let i = 0, x = n;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
};
const nowISO = () => new Date().toISOString();

const newAgbimDraft = (kind="interaction", scope={}) => ({
  id: `agbim_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
  kind, scope, status: "draft",
  createdAt: nowISO(), createdBy: "mobile",
  tags: [], links: { ifc: null, parents: [], children: [] },
  attachments: [], events: [], state: null
});
const newEvent = (type, by="mobile", data={}) => ({
  id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type, at: nowISO(), by, data
});

async function saveToBackendJSON({ result, attachments, location, context = {} }) {
  try {
    const projectService = new ProjectDataService();
    
    // Create new entry for backend JSON
    const newEntry = {
      id: `agbim-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'agbim_field_data',
      source: 'AGBIM Field Simulator',
      location: location ? { lat: location.lat, lng: location.lng } : null,
      context: {
        projectId: context.projectId || result?.entities?.projectId || null,
        positionId: context.positionId || result?.entities?.positionId || null,
        ...context
      },
      data: {
        transcript: result?.transcript || 
          (Array.isArray(result?.transcriptions) 
            ? result.transcriptions.map(t => t?.text).filter(Boolean).join(' ')
            : ''),
        actionItems: result?.actionItems || [],
        videoFindings: result?.videoFindings || [],
        imageAnalysis: result?.imageAnalysis || {},
        audioAnalysis: result?.audioAnalysis || {},
        entities: result?.entities || {},
        goriona: result?.goriona || "ladno",
        chatMessage: result?.chatMessage || 'Zapis s terena'
      },
      attachments: attachments?.map(file => ({
        name: file.name || 'file',
        type: file.type,
        size: file.size || 0,
        duration: file.duration || null
      })) || []
    };

    // Get current backend data
    const backendData = await projectService.loadAllProjects();
    
    // If no projectId specified, use first available project
    if (!newEntry.context.projectId && backendData.projects?.length > 0) {
      newEntry.context.projectId = backendData.projects[0].id;
      console.log(`🎯 No projectId specified, using first project: ${newEntry.context.projectId}`);
    }
    
    // Add AGBIM entry to the appropriate project
    if (newEntry.context.projectId && backendData.projects) {
      const project = backendData.projects.find(p => p.id === newEntry.context.projectId);
      if (project) {
        if (!project.agbimEntries) {
          project.agbimEntries = [];
        }
        project.agbimEntries.push(newEntry);
        
        // Also add to history
        if (!project.history) {
          project.history = [];
        }
        project.history.push({
          id: `h-${Date.now()}`,
          date: new Date().toISOString(),
          type: 'agbim',
          title: 'AGBIM terenska analiza',
          details: newEntry.data.chatMessage || 'Nova terenska analiza dodana'
        });
        
        console.log('✅ Spremljeno u backend JSON:', newEntry);
        await projectService.saveAllProjects(backendData);
        
        // Also add to chat in the same project
        try {
          await projectService.addAgbimResultToChat({
            context: newEntry.context,
            result: {
              transcript: newEntry.data.transcript,
              summary: newEntry.data.chatMessage,
              actionItems: newEntry.data.actionItems,
              risks: [],
              imageFindings: [],
              videoFindings: newEntry.data.videoFindings,
              entities: newEntry.data.entities,
              goriona: newEntry.data.goriona
            },
            attachments: attachments,
            jobId: newEntry.id
          });
          console.log('✅ Dodano u chat:', newEntry.context.projectId);
        } catch (chatError) {
          console.warn('⚠️ Chat integration failed:', chatError);
        }
        
        return true;
      }
    }
    
    console.warn('⚠️ Nije pronađen odgovarajući projekt za spremanje');
    return false;
  } catch (error) {
    console.error('❌ Greška kod spremanja u backend:', error);
    throw error;
  }
}

function postToFluentChat({ chatMessage, files, context }) {
  const sharedTimestamp = new Date();
  const commentId = `c-${Date.now()}`;
  const batchId = `b-${Date.now()}`;

  const mapped = (files || []).map((f, idx) => ({
    id: `${f.name || f.type}-${idx}-${Date.now()}`,
    name: f.name || (f.type?.startsWith("image/") ? "slika.jpg" : (f.type?.startsWith("video/") ? "video.mp4" : (f.type?.startsWith("audio/") ? "audio.webm" : "datoteka"))),
    size: fmtBytes(f.size || 0),
    type: f.type?.startsWith("image/") ? "image" : f.type?.startsWith("video/") ? "video" : "document"
  }));

  const comment = {
    id: commentId, type: "comment", author: "Vi", avatar: "VI",
    content: chatMessage || "Zapis s terena.",
    timestamp: sharedTimestamp, context: context || {}, linkedItemId: batchId
  };
  const batch = {
    id: batchId, type: "file_batch",
    batchType: mapped.every(m => m.type === "image") ? "image" : "document",
    files: mapped, timestamp: sharedTimestamp,
    uploadedBy: "Vi", author: "Vi", avatar: "VI",
    context: context || {}, linkedItemId: commentId
  };

  window.dispatchEvent(new CustomEvent("media-ai:post-to-chat", { detail: { comment, batch } }));
}

// Pozovi npr. nakon učitavanja JSON-a iz /api ili lokalne datoteke
function postProjectRollupToChat(projects = []) {
  projects.slice(0, 2).forEach((p) => {
    const nba = (p.llmData?.nextBestActions || []).slice(0,3).map(a => `• ${a}`).join("\n");
    const dateRange = p.gantt ? `${p.gantt.start} → ${p.gantt.end}` : "";
    const kp = (p.positions || []).slice(0,3).map(pos => {
      const tp = (pos.processes || []).find(x => x.status === "U tijeku");
      const st = tp ? `${tp.name}: ${tp.progress || 0}%` : "—";
      return `- ${pos.id}: ${st}`;
    }).join("\n");

    const msg =
`📌 ${p.name} (${p.id})
Rok: ${dateRange}
Sljedeće: 
${nba || "• —"}
Stanje pozicija:
${kp || "- —"}`;

    postToFluentChat({ chatMessage: msg, files: [], context: { projectId: p.id } });
  });

  // opcionalno: odmah otvori chat
  window.dispatchEvent(new CustomEvent("media-ai:switch-to-chat", { detail: { projectId: projects[0]?.id || null }}));
}

const createVoiceImageVideoSchema = () => ({
  type: 1,
  properties: {
    transcript: { type: 3, description: "Transkript govora (hr-HR) s interpunkcijom." },
    summary: { type: 3 },
    actionItems: { type: 2, items: { type: 3 } },
    risks: { type: 2, items: { type: 3 } },
    imageFindings: {
      type: 2,
      items: { type: 1, properties: { caption: { type: 3 }, notes: { type: 3 }, ocr: { type: 3 } } }
    },
    // ⬇️ NOVO: video analiza
    videoFindings: {
      type: 2,
      description: "Sažeci po videu: scene, govor, OCR, događaji.",
      items: {
        type: 1,
        properties: {
          fileName: { type: 3 },
          durationSec: { type: 4 },
          audioDetected: { type: 4, description: "0/1" },
          sceneSummary: { type: 3 },
          speechTranscript: { type: 3 },
          ocrSnippets: { type: 2, items: { type: 3 } },
          events: {
            type: 2,
            items: { type: 1, properties: { tStart: { type: 4 }, tEnd: { type: 4 }, label: { type: 3 }, notes: { type: 3 } } }
          },
          issues: { type: 2, items: { type: 3 } }
        }
      }
    },
    /** ⬇️ NOVO: goriona idiom */
    goriona: {
      type: 3,
      description: "Stanje hitnosti (idiom): 'lagana vatra'|'krčka se'|'ladno'|'nestalo plina'|'nestalo struje'|'izgorilo'|'svaki čas će se zapalit'|'ako sad ne zaliješ zapalit će se'"
    },
    entities: {
      type: 1,
      properties: {
        projectId: { type: 3 }, positionId: { type: 3 },
        people: { type: 2, items: { type: 3 } },
        materials: { type: 2, items: { type: 3 } }, dates: { type: 2, items: { type: 3 } }
      }
    },
    chatMessage: { type: 3 },
    confidence: { type: 4 }
  },
  required: ["transcript","summary","actionItems","chatMessage","goriona"]
});

const PROMPT_MULTIMODAL_HR = `
Ti si pomoćnik na gradilištu za teren (mobitel/tablet).
1) Transkribiraj govor (hr-HR) s interpunkcijom.
2) Uključi kratke upute korisnika.
3) Za svaku sliku: caption + tehničke bilješke; OCR ako ga vidiš.
4) Ako postoji video: izradi sažetak scena, izdvoji događaje (timeline), OCR fragmente,
   transkribiraj govor iz videa i označi audioDetected=1 ako čuješ zvuk.
5) Izvuci akcije (imperativi), rizike, kontekst (projectId, positionId).
6) Postavi 'goriona' kao JEDNU vrijednost iz: "lagana vatra" | "krčka se" | "ladno" | "nestalo plina" | "nestalo struje" | "izgorilo" | "svaki čas će se zapalit" | "ako sad ne zaliješ zapalit će se".
   Ako nema signala hitnosti, koristi "ladno".
7) Vrati STROGO JSON prema shemi (bez markdowna).
7) 'chatMessage' < 500 znakova — spremno za chat.
`;

// ---------- MANDATORY / DEFAULTS ----------
const TEAM = {
  ivan:  { id: "u1", name: "Ivan S." },
  ana:   { id: "u2", name: "Ana K." },
  marko: { id: "u3", name: "Marko P." },
};
const PROCESS_TO_DEFAULT_ASSIGNEE = {
  "montraža": TEAM.marko,
  "tehnička priprema": TEAM.ana,
  "dizajn": TEAM.ana,
  "nabava": TEAM.ivan,
  "proizvodnja": TEAM.marko,
  "transport": TEAM.ivan,
  "ostalo": TEAM.ivan,
};

const REQUIRED_TASK_MIN = [
  "title", "assignedBy", "assignee", "startDate", "dueDate"
];

const ensureISODate = (d) => {
  try {
    if (!d) return new Date().toISOString().slice(0,10);
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return new Date().toISOString().slice(0,10);
    return dt.toISOString().slice(0,10);
  } catch { return new Date().toISOString().slice(0,10); }
};
const addDays = (dateStr, days=2) => {
  const d = new Date(dateStr+"T00:00:00");
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
};

const genId = (pfx="T") => `${pfx}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
const TEXT = (s="") => (s || "").toLowerCase();

// ---------- Heuristics ----------
const PROCESS_KEYWORDS = {
  "montraža": ["montaž", "demontaž", "ugrad", "šaraf", "ankeri", "vrata", "prozor", "fasad", "skidanje"],
  "tehnička priprema": ["mjera", "izmjera", "tehnič", "crt", "shema", "ø", "toleranc", "dokumentacij"],
  "dizajn": ["nacrt", "skica", "revizija", "model", "dwg", "revit", "bim", "projektir"],
  "nabava": ["ponuda", "narudžb", "isporuka", "dobavlja", "rok isporuke", "materijal"],
  "proizvodnja": ["rezanje", "stroj", "obrada", "staklo", "panel", "aluminij", "termolakir"],
  "transport": ["dizalica", "vozilo", "dostava", "istovar", "ruta"],
  "ostalo": ["qc", "ogrebotina", "čišćenje", "atest", "snimka"]
};

function inferGorion({ actionItems = [], risks = [], transcript = "", summary = "" }) {
  const t = TEXT([summary, transcript, ...actionItems, ...risks].join(" "));
  if (t.includes("hitno") || t.includes("kritič") || t.includes("opasno")) return "svaki čas će se zapalit";
  if (t.includes("kasni") || t.includes("rok") || t.includes("blok")) return "ako sad ne zaliješ zapalit će se";
  if (t.includes("provjeri") || t.includes("potvrdi")) return "krčka se";
  return "lagana vatra";
}

function inferProcessName({ transcript="", summary="", actionItems=[], videoFindings=[] }) {
  const blob = TEXT([summary, transcript, ...actionItems, JSON.stringify(videoFindings||[])].join(" "));
  let best = "ostalo", score = -1;
  for (const [proc, kws] of Object.entries(PROCESS_KEYWORDS)) {
    const s = kws.reduce((acc, kw) => acc + (blob.includes(kw) ? 1 : 0), 0);
    if (s > score) { score = s; best = proc; }
  }
  return best;
}

// pokušaj iz teksta izvući tip pozicije i kat
function parseTypeAndFloorFromText(blobText) {
  const t = TEXT(blobText);
  const type = t.includes("vrata") ? "vrata" : t.includes("prozor") ? "prozor" : "fasada";
  // kat: "1. kat", "kat 2", "prizemlje"
  let floor = null;
  const m1 = t.match(/(\d+)\s*\.?\s*kat/);
  const m2 = t.match(/kat\s*(\d+)/);
  if (m1) floor = Number(m1[1]);
  else if (m2) floor = Number(m2[1]);
  else if (t.includes("prizemlje") || t.includes("površinsko")) floor = 0;
  return { type, floor };
}

function pickPositionByText(project, result) {
  if (!project?.positions?.length) return null;
  const blob = [result?.summary, result?.transcript, ...(result?.actionItems||[])].filter(Boolean).join(" ");
  const { type, floor } = parseTypeAndFloorFromText(blob);
  // prvo probaj po tipu
  let candidates = project.positions.filter(p => TEXT(p.type).includes(type));
  if (!candidates.length) candidates = project.positions.slice();
  // ako znamo kat, probaj naći podudaran kat (pretpostavlja se p.floor ili p.level u podacima)
  if (Number.isFinite(floor)) {
    const byFloor = candidates.filter(p => (p.floor ?? p.level) === floor);
    if (byFloor.length) return byFloor[0];
  }
  return candidates[0] || null;
}

// ---------- BACKEND READ + PLACEMENT ----------
async function findBestPlacement(result, projectService) {
  const backend = await projectService.loadAllProjects();
  const projects = backend?.projects || [];
  const pid = result?.entities?.projectId;
  let project = pid ? projects.find(p => p.id === pid) : projects[0];
  if (!project && projects.length) project = projects[0];

  // position: entities.positionId → inače heuristika po tipu/kat
  let position = null;
  const posId = result?.entities?.positionId;
  if (posId && project?.positions) {
    position = project.positions.find(p => p.id === posId) || null;
  }
  if (!position) position = pickPositionByText(project, result);

  const processName = inferProcessName(result);

  return {
    projectId: project?.id || null,
    positionId: position?.id || null,
    processName,
    _project: project,
    _position: position
  };
}

// ---------- TASK BUILDERS ----------
function fillMandatory(task) {
  // title
  if (!task.title || !task.title.trim()) task.title = "Zadatak";
  // assignedBy
  if (!task.assignedBy) task.assignedBy = TEAM.ivan;
  // assignee
  if (!task.assignee) task.assignee = TEAM.ivan;
  // dates
  const start = ensureISODate(task.startDate);
  task.startDate = start;
  task.dueDate = ensureISODate(task.dueDate) || addDays(start, 2);
  // potvrda
  if (!task.confirm) task.confirm = { required: true, confirmed: true, confirmedBy: task.assignedBy.id, confirmedAt: new Date().toISOString() };
  return task;
}

function buildTaskFromAI({ placement, result, attachments=[], assignedBy, assignee, location, confirmNow=true }) {
  const transcript = result?.transcript
    || (Array.isArray(result?.transcriptions) ? result.transcriptions.map(t=>t?.text).filter(Boolean).join(" ") : "");
  const firstAction = (result?.actionItems?.[0] || "").toString();
  const titleRaw = firstAction || result?.summary || transcript || "Zadatak s terena";
  const title = titleRaw.length > 120 ? `${titleRaw.slice(0,117)}…` : titleRaw;

  const startDate = ensureISODate(new Date().toISOString().slice(0,10));
  const dueDate = ensureISODate(result?.entities?.dates?.[0]) || addDays(startDate, 2);
  const gorion = inferGorion(result);
  const priority = ["svaki čas će se zapalit","ako sad ne zaliješ zapalit će se"].includes(gorion) ? "critical"
                  : gorion === "krčka se" ? "high"
                  : gorion === "lagana vatra" ? "normal" : "low";

  const chosenAssignee =
    assignee
    || PROCESS_TO_DEFAULT_ASSIGNEE[placement.processName]
    || TEAM.ivan;

  const task = {
    id: genId("T"),
    title,
    description: [
      result?.summary || "",
      transcript ? `\nTranskript: ${transcript}` : ""
    ].join(" ").trim(),
    status: "open",
    substatus: "novo",
    priority,
    gorion,
    createdAt: new Date().toISOString(),
    assignedBy: assignedBy || TEAM.ivan,
    assignee: chosenAssignee,
    startDate,
    dueDate,
    confirm: { required: true, confirmed: !!confirmNow, confirmedBy: (assignedBy?.id || TEAM.ivan.id), confirmedAt: confirmNow ? new Date().toISOString() : null },
    links: {
      projectId: placement.projectId,
      positionIds: placement.positionId ? [placement.positionId] : [],
      processPath: [placement.processName],
      documentIds: [],
      imageIds: attachments.filter(f=>f.type?.startsWith("image/")).map((_,i)=>`IMG-${i}`),
      videoIds: attachments.filter(f=>f.type?.startsWith("video/")).map((_,i)=>`VID-${i}`)
    },
    aiFindings: {
      summary: result?.summary || "",
      transcript,
      actionItems: result?.actionItems || [],
      risks: result?.risks || [],
      videoFindings: result?.videoFindings || [],
      imageFindings: result?.imageFindings || [],
      chatMessage: result?.chatMessage || transcript || "Zadatak kreiran iz terenske analize."
    },
    visibleIn: ["chat", "tasks"],
    location: location?.lat ? { lat: location.lat, lng: location.lng, acc: location.acc || null } : null
  };

  return fillMandatory(task);
}

// višestruki zadaci iz više actionItems (svaki kao zaseban card)
function buildTasksFromAI({ placement, result, attachments=[], assignedBy, location, confirmNow=true }) {
  const items = Array.isArray(result?.actionItems) && result.actionItems.length
    ? result.actionItems
    : [result?.summary || result?.transcript || "Zadatak"];
  return items.map((act, idx) => {
    const t = buildTaskFromAI({
      placement,
      result: { ...result, actionItems: [act] },
      attachments,
      assignedBy,
      assignee: PROCESS_TO_DEFAULT_ASSIGNEE[placement.processName] || TEAM.ivan,
      location,
      confirmNow
    });
    // lagani suffix u title-u kad ih je više
    if (items.length > 1) t.title = `${t.title} (${idx+1}/${items.length})`;
    return t;
  });
}

// ---------- SAVE (bulk) ----------
async function saveTasksToBackend(tasks, projectService) {
  const backend = await projectService.loadAllProjects();
  backend.tasks = backend.tasks || [];
  for (const t of tasks) {
    // idempotentnost po id-u
    if (!backend.tasks.some(x => x.id === t.id)) backend.tasks.push(t);
    const proj = (backend.projects || []).find(p => p.id === t.links.projectId);
    if (proj) {
      proj.history = proj.history || [];
      proj.history.push({
        id: genId("H"),
        date: new Date().toISOString(),
        type: "task",
        title: `Kreiran zadatak: ${t.title}`,
        details: t.aiFindings?.chatMessage || t.description || ""
      });
    }
  }
  await projectService.saveAllProjects(backend);
  return backend;
}

// ---------- Chat helpers ----------
function chatForTasks(tasks) {
  const head = "🆕 Kreirani zadaci:";
  const lines = tasks.map(t => `• ${t.title} — ${t.links.projectId} / ${t.links.processPath[0]} (rok: ${t.dueDate}, ${t.gorion})`);
  return [head, ...lines].join("\n");
}

// minimalni "sanitizer" za ponekad ne-čisti JSON iz AI-a
function coerceAiResult(raw) {
  // ako je već objekt, vrati kako je
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") return {};

  // pobriši code fence
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(\w+)?/,'').replace(/```$/,'').trim();
  }
  try { return JSON.parse(t); } catch { return {}; }
}

function FieldApp({ deviceName, loc, setLoc, online, settings, updateSetting, autoSend=false }) {
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState("");

  const [jobs, setJobs] = useState([]);
  const audioRef = useRef(null);

  const readVideoDuration = (file) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => { resolve(v.duration || 0); URL.revokeObjectURL(url); };
      v.src = url;
    });

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLoc({ ...loc, error: "Geolokacija nije podržana" }); return;
    }
    
    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'denied') {
        setLoc({ ...loc, error: "Geolokacija blokirana. Omogućite u postavkama preglednika." });
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setLoc({ lat: latitude, lng: longitude, acc: accuracy, at: nowISO(), error: null });
        },
        (err) => {
          let errorMsg = "Ne može dohvatiti lokaciju";
          if (err.code === 1) errorMsg = "Geolokacija blokirana";
          else if (err.code === 2) errorMsg = "Pozicija nedostupna";
          else if (err.code === 3) errorMsg = "Timeout geolokacije";
          setLoc({ ...loc, error: errorMsg });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    }).catch(() => {
      // Fallback if permissions API not supported
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setLoc({ lat: latitude, lng: longitude, acc: accuracy, at: nowISO(), error: null });
        },
        (err) => setLoc({ ...loc, error: err.message || "Ne može dohvatiti lokaciju" }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    });
  }, [setLoc, loc]);

  useEffect(() => { if (!loc?.lat) fetchLocation(); }, []); // eslint-disable-line

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const name = `audio-${new Date().toISOString().replace(/[:.]/g,"-")}.webm`;
        setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob)); setAudioName(name);
      };
      rec.start(); setRecorder(rec); setRecording(true);
    } catch {
      alert("Mikrofon nedostupan ili odbijen pristup.");
    }
  };
  const stopRec = () => { try { recorder?.stop(); recorder?.stream?.getTracks().forEach(t=>t.stop()); } catch {} setRecording(false); };
  const clearAudio = () => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioBlob(null); setAudioUrl(""); setAudioName(""); };

  const onPickImages = (inputFiles) => {
    const list = Array.from(inputFiles || []).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...list]);
  };
  const onPickVideos = async (inputFiles) => {
    const list = Array.from(inputFiles || []).filter(f => f.type.startsWith("video/"));
    // dodaj duration u name (nije obavezno, ali korisno u UI)
    const withMeta = await Promise.all(list.map(async f => {
      const d = await readVideoDuration(f).catch(()=>0);
      f.__durationSec = Math.round(d);
      return f;
    }));
    setVideos(prev => [...prev, ...withMeta]);
  };
  const onPickFiles = (inputFiles) => {
    const list = Array.from(inputFiles || []);
    setFiles(prev => [...prev, ...list]);
  };
  const removeImage = (idx) => setImages(prev => prev.filter((_,i)=>i!==idx));
  const removeVideo = (idx) => setVideos(prev => prev.filter((_,i)=>i!==idx));
  const removeFile = (idx) => setFiles(prev => prev.filter((_,i)=>i!==idx));

  const gatherAttachments = () => {
    const arr = [];
    if (audioBlob) {
      try {
        const audioFile = new File([audioBlob], audioName || "audio.webm", { type: "audio/webm" });
        arr.push(audioFile);
      } catch (error) {
        // Fallback for environments where File constructor isn't available
        const audioFile = new Blob([audioBlob], { type: "audio/webm" });
        audioFile.name = audioName || "audio.webm";
        arr.push(audioFile);
      }
    }
    images.forEach(f => arr.push(f));
    videos.forEach(f => arr.push(f));        // ⬅️ novo
    files.forEach(f => arr.push(f));
    return arr;
  };

  const createJob = async () => {
    const attachments = gatherAttachments();
    if (attachments.length === 0 && !note.trim()) {
      alert("Dodaj barem zvuk/sliku ili upiši kratku bilješku."); return;
    }

    const agbim = newAgbimDraft("interaction", {
      projectId: null, positionId: null, lat: loc?.lat || null, lng: loc?.lng || null, acc: loc?.acc || null
    });
    agbim.attachments = attachments.map((f, i) => ({
      id: `att_${i}`, name: f.name, mime: f.type, size: f.size,
      kind: f.type.startsWith("image/") ? "image"
          : f.type.startsWith("video/") ? "video"
          : f.type.startsWith("audio/") ? "audio" : "file",
      durationSec: f.__durationSec || null
    }));
    agbim.events.push(newEvent("INGESTED", "mobile", { note }));

    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      status: "queued", progress: 0, step: "U redu za slanje",
      attachments, note, result: null, error: null, agbim
    };
    setJobs(prev => [job, ...prev]);

    runJob(job);
    setNote(""); setImages([]); setVideos([]); setFiles([]);
  };

  const runJob = async (job) => {
    const setJob = (patch) => setJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...patch } : j));

    setJob({ status: "processing", step: "Priprema", progress: 5 });

    const onProgress = (msg, pct) => setJob({ step: msg, progress: Math.max(5, Math.min(99, Math.round(pct))) });

    // Check if there are video files for special processing indicator
    const hasVideos = job.attachments.some(f => f.type?.startsWith("video/"));
    if (hasVideos) {
      onProgress("Priprema (ekstrakcija okvira)", 10);
    }

    try {
      const mergedPrompt = note.trim()
        ? `${PROMPT_MULTIMODAL_HR}\n---\nUpute korisnika:\n${note.trim()}`
        : PROMPT_MULTIMODAL_HR;

      const res = await CloudLLMService.analyzeDocumentGoogle({
        apiKey: settings.googleApiKey || null,
        model: settings.selectedModel,
        prompt: mergedPrompt,
        schema: createVoiceImageVideoSchema(),
        files: job.attachments,
        onProgress
      });

      const data = typeof res?.data === "string" ? coerceAiResult(res.data) : (res?.data || null);

      job.agbim.events.push(newEvent("INTERPRETED","ai",{ schemaId:"schema:site.note.v1", model:settings.selectedModel, output:data }));

      job.agbim.state = { version: 1, schemaId:"schema:site.note.v1", json: data, bakedAt: nowISO(), bakedBy: "mobile" };
      job.agbim.status = "baked";
      job.agbim.events.push(newEvent("BAKED","mobile",{ version:1 }));

      setJob({ status: "done", result: data, step: "Završeno", progress: 100 });

      if (autoSend) {
        const context = {
          projectId: data?.entities?.projectId || null,
          positionId: data?.entities?.positionId || null,
          lat: loc?.lat || null, lng: loc?.lng || null
        };
        postToFluentChat({ chatMessage: data?.chatMessage || "Zapis s terena", files: job.attachments, context });
      }
    } catch (e) {
      setJob({ status: "error", error: e?.message || "Greška u obradi", step: "Greška", progress: 100 });
    }
  };

  const onlineBadge = online ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
      <Wifi className="w-3 h-3" /> Online
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-orange-800 bg-orange-100 px-2 py-1 rounded">
      <WifiOff className="w-3 h-3" /> Offline
    </span>
  );

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col">
      <div className="px-3 py-2 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-gray-700">
            {loc?.error ? (
              <span className="text-red-600">{loc.error}</span>
            ) : loc?.lat ? (
              `${loc.lat.toFixed(5)}, ${loc.lng?.toFixed(5)} • ±${Math.round(loc.acc||0)}m`
            ) : (
              "Lokacija…"
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onlineBadge}
          <div className="relative group">
            <Settings className="w-4 h-4 text-gray-600" />
            <div className="absolute right-0 mt-2 hidden group-hover:block z-50">
              <div className="w-64 p-3 bg-white border rounded-lg">
                <div className="text-xs font-medium mb-1">Model</div>
                <select
                  value={settings.selectedModel}
                  onChange={(e)=>updateSetting("selectedModel", e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  {Object.entries(GOOGLE_MODEL_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="text-xs font-medium mt-2 mb-1">API ključ</div>
                <input
                  type="password"
                  value={settings.googleApiKey}
                  onChange={(e)=>updateSetting("googleApiKey", e.target.value)}
                  placeholder={import.meta.env.VITE_GOOGLE_AI_API_KEY ? "Koristi .env" : "Unesite ključ"}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-8">

        <section className={`${GLASS} ${DEPTH} border rounded-xl p-3`}>
          <div className="text-sm font-semibold mb-2">1) Zvuk</div>
          <div className="flex items-center gap-2">
            {!recording ? (
              <button onClick={startRec} className="px-3 py-2 rounded-md bg-rose-600 text-white flex items-center gap-1">
                <Mic className="w-4 h-4" /> Snimi
              </button>
            ) : (
              <button onClick={stopRec} className="px-3 py-2 rounded-md bg-gray-800 text-white flex items-center gap-1">
                <Square className="w-4 h-4" /> Stani
              </button>
            )}
            <button onClick={fetchLocation} className="px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-sm">Osvježi lokaciju</button>
          </div>

          {audioBlob && (
            <div className="mt-3 p-2 rounded-lg border bg-gray-50 flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <div className="text-xs font-medium">{audioName}</div>
                <div className="text-[11px] text-gray-500">{fmtBytes(audioBlob.size)}</div>
              </div>
              <audio ref={audioRef} src={audioUrl} controls className="h-7" />
              <button onClick={clearAudio} className="p-1 rounded border bg-white hover:bg-gray-50">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          )}
        </section>

        <section className={`${GLASS} ${DEPTH} border rounded-xl p-3`}>
          <div className="text-sm font-semibold mb-2">2) Kamera i datoteke</div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-3 py-2 rounded-md bg-blue-600 text-white cursor-pointer flex items-center gap-1">
              <Camera className="w-4 h-4" /> Slikaj
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>onPickImages(e.target.files)} />
            </label>
            <label className="px-3 py-2 rounded-md bg-white border cursor-pointer flex items-center gap-1">
              <Upload className="w-4 h-4" /> Galerija
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e)=>onPickImages(e.target.files)} />
            </label>
            <label className="px-3 py-2 rounded-md bg-indigo-600 text-white cursor-pointer flex items-center gap-1">
              <VideoIcon className="w-4 h-4" /> Snimi video
              <input type="file" accept="video/*" capture className="hidden" onChange={(e)=>onPickVideos(e.target.files)} />
            </label>
            <label className="px-3 py-2 rounded-md bg-white border cursor-pointer flex items-center gap-1">
              <Upload className="w-4 h-4" /> Video iz galerije
              <input type="file" accept="video/*" multiple className="hidden" onChange={(e)=>onPickVideos(e.target.files)} />
            </label>
            <label className="px-3 py-2 rounded-md bg-white border cursor-pointer flex items-center gap-1">
              <File className="w-4 h-4" /> Datoteka
              <input type="file" multiple className="hidden" onChange={(e)=>onPickFiles(e.target.files)} />
            </label>
          </div>

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((img, idx) => {
                const url = URL.createObjectURL(img);
                return (
                  <div key={idx} className="relative">
                    <img src={url} alt={img.name} className="w-full h-24 object-cover rounded border" onLoad={(e)=>URL.revokeObjectURL(e.currentTarget.src)} />
                    <button onClick={()=>removeImage(idx)} className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow">
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {videos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {videos.map((v, idx) => {
                const url = URL.createObjectURL(v);
                return (
                  <div key={idx} className="relative">
                    <video src={url} className="w-full h-28 object-cover rounded border" controls
                           onLoadedData={(e)=>URL.revokeObjectURL(e.currentTarget.currentSrc)} />
                    <div className="absolute bottom-1 left-1 right-8 text-[11px] bg-black/50 text-white px-1 rounded">
                      {v.name} {Number.isFinite(v.__durationSec) ? `• ${v.__durationSec}s` : ""}
                    </div>
                    <button onClick={()=>removeVideo(idx)} className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow">
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, idx)=>(
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-gray-600" />
                    <span className="truncate max-w-[200px]">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{fmtBytes(f.size)}</span>
                    <button onClick={()=>removeFile(idx)} className="p-1 rounded border bg-white hover:bg-gray-50">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${GLASS} ${DEPTH} border rounded-xl p-3`}>
          <div className="text-sm font-semibold mb-2">3) Kratka napomena (opcionalno)</div>
          <textarea
            value={note}
            onChange={(e)=>setNote(e.target.value)}
            rows={4}
            placeholder="Primjer: 'Oštećenje okvira na PZ-01, fotke priložene…'"
            className="w-full border rounded p-2 text-sm"
          />
        </section>

        <section className={`${GLASS} ${DEPTH} border rounded-xl p-3`}>
          <div className="flex items-center gap-2">
            <button
              onClick={createJob}
              className="px-4 py-2 rounded-md text-white bg-violet-600 hover:bg-violet-700 flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Pošalji na obradu
            </button>
            <span className="text-xs text-gray-600">U izradi AGBIM → AI → chat</span>
          </div>
        </section>

        <section className={`${GLASS} ${DEPTH} border rounded-xl p-3`}>
          <div className="text-sm font-semibold mb-2">Obrade</div>
          {jobs.length === 0 && <div className="text-xs text-gray-500">Još nema obrada.</div>}
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="p-2 rounded border bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">#{job.id.slice(-6)}</div>
                  <div className="text-xs">
                    {job.status === "queued" && <span className="text-gray-600">U redu</span>}
                    {job.status === "processing" && <span className="text-blue-700">Obrada…</span>}
                    {job.status === "done" && <span className="text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Gotovo</span>}
                    {job.status === "error" && <span className="text-red-700 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Greška</span>}
                  </div>
                </div>
                <div className="mt-2 h-2 w-full bg-gray-200 rounded">
                  <div className="h-2 rounded bg-violet-600" style={{ width: `${job.progress || (job.status==="done"?100:0)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-gray-600">{job.step}</div>
                {job.error && <div className="mt-1 text-[11px] text-red-700">{job.error}</div>}
                {job.status === "done" && job.result && (
                  <div className="mt-2 space-y-2">
                    {/* Transcript Display */}
                    {(() => {
                      const transcript = job.result?.transcript || 
                        (Array.isArray(job.result?.transcriptions) 
                          ? job.result.transcriptions.map(t => t?.text).filter(Boolean).join(' ')
                          : '');
                      
                      return transcript && (
                        <div className="text-xs bg-blue-50 p-2 rounded border">
                          <div className="font-medium text-blue-800 mb-1">🎤 Transkript:</div>
                          <div className="text-blue-700 text-[11px]">{transcript}</div>
                        </div>
                      );
                    })()}
                    
                    {/* Action Items Display */}
                    {job.result.actionItems?.length > 0 && (
                      <div className="text-xs bg-green-50 p-2 rounded border">
                        <div className="font-medium text-green-800 mb-1">✅ Akcije:</div>
                        {job.result.actionItems.slice(0, 3).map((action, idx) => (
                          <div key={idx} className="text-green-700 text-[11px]">• {action}</div>
                        ))}
                      </div>
                    )}
                    
                    {/* Video Findings Display */}
                    {job.result.videoFindings?.length > 0 && (
                      <div className="text-xs bg-purple-50 p-2 rounded border">
                        <div className="font-medium text-purple-800 mb-1">📹 Video analiza:</div>
                        {job.result.videoFindings.slice(0, 2).map((vf, idx) => (
                          <div key={idx} className="mb-2 last:mb-0">
                            <div className="text-purple-700 font-medium">{vf.fileName} ({vf.durationSec}s)</div>
                            {vf.sceneSummary && (
                              <div className="text-purple-600 text-[11px] mt-1">{vf.sceneSummary}</div>
                            )}
                            {vf.events?.slice(0, 3).map((evt, eidx) => (
                              <div key={eidx} className="text-purple-600 text-[11px]">
                                • {evt.tStart}s-{evt.tEnd}s: {evt.label}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                        onClick={async () => {
                          try {
                            const context = {
                              projectId: job.result?.entities?.projectId || null,
                              positionId: job.result?.entities?.positionId || null,
                              lat: loc?.lat || null, lng: loc?.lng || null
                            };
                            
                            await saveToBackendJSON({
                              result: job.result,
                              attachments: job.attachments,
                              location: loc,
                              context
                            });
                            
                            // Show success feedback
                            alert('✅ Podaci uspješno spremljeni u backend JSON!');
                          } catch (error) {
                            alert('❌ Greška kod spremanja: ' + (error.message || 'Neočekivana greška'));
                          }
                        }}
                      >
                        💾 Spremi u Backend
                      </button>
                      
                      <button
                        className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                        onClick={() => {
                          const context = {
                            projectId: job.result?.entities?.projectId || null,
                            positionId: job.result?.entities?.positionId || null,
                            lat: loc?.lat || null, lng: loc?.lng || null
                          };
                          const transcript = job.result?.transcript || 
                            (Array.isArray(job.result?.transcriptions) 
                              ? job.result.transcriptions.map(t => t?.text).filter(Boolean).join(' ')
                              : '');
                          
                          postToFluentChat({
                            chatMessage: job.result?.chatMessage || transcript || "Zapis s terena (multimedija).",
                            files: job.attachments,
                            context
                          });
                          // Prebaci na chat tab (slušaj ovo u roditeljskom layoutu)
                          window.dispatchEvent(new CustomEvent("media-ai:switch-to-chat", { detail: { projectId: context.projectId }}));
                        }}
                      >
                        💬 Pošalji u Chat i otvori
                      </button>
                      
                      <button
                        className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
                        onClick={async () => {
                          try {
                            // First save to backend
                            const context = {
                              projectId: job.result?.entities?.projectId || null,
                              positionId: job.result?.entities?.positionId || null,
                              lat: loc?.lat || null, lng: loc?.lng || null
                            };
                            
                            await saveToBackendJSON({
                              result: job.result,
                              attachments: job.attachments,
                              location: loc,
                              context
                            });
                            
                            // Then send to chat
                            const transcript = job.result?.transcript || 
                              (Array.isArray(job.result?.transcriptions) 
                                ? job.result.transcriptions.map(t => t?.text).filter(Boolean).join(' ')
                                : '');
                            
                            postToFluentChat({
                              chatMessage: job.result?.chatMessage || transcript || "Zapis s terena (multimedija).",
                              files: job.attachments,
                              context
                            });
                            
                            window.dispatchEvent(new CustomEvent("media-ai:switch-to-chat", { detail: { projectId: context.projectId }}));
                            
                            alert('✅ Podaci spremljeni u backend i poslani u chat!');
                          } catch (error) {
                            alert('❌ Greška: ' + (error.message || 'Neočekivana greška'));
                          }
                        }}
                      >
                        🔄 Spremi i Pošalji
                      </button>

                      <button
                        className="px-3 py-1.5 rounded bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition-colors"
                        onClick={async () => {
                          try {
                            console.log('🚀 Starting task creation from AGBIM result...');
                            const projectService = new ProjectDataService();
                            // 1) pronađi najbolje mjesto
                            const placement = await findBestPlacement(job.result, projectService);

                            // 2) sagradi task
                            const task = buildTaskFromAI({
                              placement,
                              result: job.result,
                              attachments: job.attachments || [],
                              assignedBy: window.__CURRENT_USER__ || { id:"u1", name:"Ivan S." },
                              assignee: null,
                              location: loc
                            });

                            // 3) spremi u backend
                            console.log('💾 Saving task to backend:', task);
                            await saveTasksToBackend([task], projectService);

                            // 4) objavi u CHAT + prebaci na chat
                            console.log('💬 Posting to chat...');
                            postToFluentChat({
                              chatMessage: `🆕 Zadatak: ${task.title}\nProjekt: ${task.links.projectId} • Proces: ${task.links.processPath[0]}\nRok: ${task.dueDate}\n—\n${task.aiFindings?.chatMessage || ""}`.trim(),
                              files: job.attachments,
                              context: { projectId: task.links.projectId, positionId: task.links.positionIds?.[0] || null }
                            });
                            console.log('🔄 Switching to chat tab...');
                            window.dispatchEvent(new CustomEvent("media-ai:switch-to-chat", { detail: { projectId: task.links.projectId }}));

                            // 5) pošalji event na "radnu ploču" (board) da se odmah prikaže u koloni procesa
                            console.log('📊 Sending task-created event...');
                            window.dispatchEvent(new CustomEvent("media-ai:task-created", { detail: { task, placement } }));

                            alert("✅ Zadatak kreiran, spremljen, poslan u chat i postavljen na radni board.");
                          } catch (err) {
                            console.error(err);
                            alert("❌ Greška pri kreiranju zadatka: " + (err?.message || "Nepoznata greška"));
                          }
                        }}
                      >
                        ✅ Potvrdi + kreiraj zadatak
                      </button>

                      <button
                        className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                        onClick={async () => {
                          try {
                            const projectService = new ProjectDataService();
                            // 1) placement iz backenda + AI
                            const placement = await findBestPlacement(job.result, projectService);
                            // 2) build višestrukih zadataka (1 per actionItem) uz *obavezna polja*
                            const tasks = buildTasksFromAI({
                              placement,
                              result: job.result,
                              attachments: job.attachments || [],
                              assignedBy: window.__CURRENT_USER__ || { id:"u1", name:"Ivan S." },
                              location: loc,
                              confirmNow: true   // ako želiš zahtjev potvrde bez auto-pode, stavi false
                            });
                            // 3) spremi sve u backend
                            await saveTasksToBackend(tasks, projectService);
                            // 4) objavi u chat (sažetak) + prebaci na chat
                            postToFluentChat({
                              chatMessage: chatForTasks(tasks),
                              files: [], // u chat ide samo sažetak zadataka; ako želiš, stavi job.attachments
                              context: { projectId: tasks[0]?.links?.projectId || null, positionId: tasks[0]?.links?.positionIds?.[0] || null }
                            });
                            window.dispatchEvent(new CustomEvent("media-ai:switch-to-chat", { detail: { projectId: tasks[0]?.links?.projectId }}));
                            // 5) event za board da se odmah pojave
                            tasks.forEach(t => window.dispatchEvent(new CustomEvent("media-ai:task-created", { detail: { task: t, placement } })));
                            alert(`✅ Kreirano ${tasks.length} zadatak(a), spremljeno i objavljeno u chat.`);
                          } catch (err) {
                            console.error(err);
                            alert("❌ Greška pri kreiranju zadataka: " + (err?.message || "Nepoznata greška"));
                          }
                        }}
                      >
                        ✅ Potvrdi + kreiraj zadatak(e)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="px-3 py-2 bg-white border-t text-[11px] text-gray-600 flex items-center justify-between">
        <span>{deviceName}</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function DeviceFrame({ label, w, h, children }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-medium mb-2">{label} <span className="text-xs text-gray-500">({w}×{h})</span></div>
      <div
        className="relative bg-black rounded-[36px] p-2"
        style={{ width: w + 16, height: h + 16 }}
      >
        <div className="bg-white rounded-[30px] overflow-hidden" style={{ width: w, height: h }}>
          {children}
        </div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-black/60 rounded-full" />
      </div>
    </div>
  );
}

export default function AgbimFieldSimulatorTab() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setOnline(navigator.onLine);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  const [locPhone, setLocPhone] = useState({});
  const [locTab, setLocTab] = useState({});

  const [settings, setSettings] = useState({
    googleApiKey: "",
    selectedModel: GOOGLE_MODELS.GEMINI_15_PRO
  });
  const updateSetting = (k,v)=>setSettings(prev=>({ ...prev, [k]: v }));

  return (
    <div className="h-screen w-full bg-gray-100 p-4 overflow-auto" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">AGBIM Field Simulator</h1>
          <p className="text-sm text-gray-600">Usporedni prikaz: iPhone Pro Max & Tablet • bez bočnih navigacija</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => postProjectRollupToChat(window.__ALL_PROJECTS__?.projects || [])}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white"
          >
            Osvježi chat projektnih sažetaka (2)
          </button>
          <span className={`px-2 py-1 text-xs rounded ${online ? "bg-emerald-100 text-emerald-700":"bg-orange-100 text-orange-800"}`}>
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 justify-items-center">
        <DeviceFrame label="iPhone 15 Pro Max" w={430} h={932}>
          <FieldApp
            deviceName="iPhone Pro Max"
            loc={locPhone} setLoc={setLocPhone}
            online={online}
            settings={settings}
            updateSetting={updateSetting}
          />
        </DeviceFrame>

        <DeviceFrame label="Tablet (11'')" w={834} h={1194}>
          <FieldApp
            deviceName="Tablet 11''"
            loc={locTab} setLoc={setLocTab}
            online={online}
            settings={settings}
            updateSetting={updateSetting}
          />
        </DeviceFrame>
      </div>
    </div>
  );
}
