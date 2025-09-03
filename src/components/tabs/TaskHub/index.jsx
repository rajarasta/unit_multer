import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Plus, Filter, Search, Send, CheckCircle2, AlertCircle, Clock, CalendarDays, User,
  ChevronDown, ChevronUp, Settings, Key, Cpu, Link2, MessageSquare, FileText, Image as ImageIcon,
  Video as VideoIcon, Trash2, Edit3, Save, X, CheckSquare, Square, FolderKanban
} from "lucide-react";
import CloudLLMService from "../../../services/CloudLLMService";
import ProjectDataService from "../../../services/ProjectDataService";
import { GOOGLE_MODELS, GOOGLE_MODEL_LABELS } from "../../../constants/aiModes";
import { GORIONA, GORIONA_META, normalizeGoriona, getGorionaPriority, formatGorionaForDisplay } from "../../../utils/goriona";

const GLASS = "bg-white/80 backdrop-blur-xl";
const DEPTH = "shadow-lg";
const TRN = "transition-all duration-300 ease-out";

const uid = (p="t") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const todayISO = () => new Date().toISOString().slice(0,10);
const inRange = (d, min, max) => {
  if (!d) return true;
  const x = d.slice(0,10);
  if (min && x < min) return false;
  if (max && x > max) return false;
  return true;
};
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadLS = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };

const newTask = (patch={}) => ({
  id: uid("task"),
  title: "",
  description: "",
  assignedBy: "",
  assignedTo: "",
  startDate: todayISO(),
  dueDate: todayISO(),
  priority: "normal",
  status: "open",
  confirmRequired: true,
  confirmed: false,
  confirmedAt: null,
  confirmedBy: null,
  goriona: null,
  links: {
    projectId: null,
    positionIds: [],
    processIds: [],
    subprocessIds: [],
    taskIds: [],
    subtaskIds: []
  },
  attachments: {
    docs: [],
    images: [],
    videos: []
  },
  meta: {},
  ...patch
});

function exposeTaskHubAPI(api) {
  window.TaskHubAPI = {
    add: (taskLike) => api.addFromAnywhere(taskLike),
    openCreate: (prefill) => api.openCreate(prefill),
    aiPropose: (args) => api.aiPropose(args),
  };
}

const createAITaskSchema = () => ({
  type: 1,
  properties: {
    tasks: {
      type: 2,
      items: {
        type: 1,
        properties: {
          title: { type: 3, description: "Kratak naziv zadatka (imperativ)." },
          description: { type: 3, description: "Dodatne upute, detalji, kriteriji prihvata." },
          assignedTo: { type: 3, description: "Kome ide (ime ili uloga), ako je spomenuto." },
          startDate: { type: 3, description: "YYYY-MM-DD ako je spomenuto, inače današnji." },
          dueDate: { type: 3, description: "YYYY-MM-DD ako je spomenuto ili procijenjeno." },
          priority: { type: 3, description: "low|normal|high|critical" },
          confirmRequired: { type: 5, description: "true/false" },
          goriona: { type: 3, description: "idiom hitnosti; vidi opis u dokumentaciji" },
          links: {
            type: 1,
            properties: {
              projectId: { type: 3 },
              positionIds: { type: 2, items: { type: 3 } },
              processIds: { type: 2, items: { type: 3 } },
              subprocessIds: { type: 2, items: { type: 3 } }
            }
          }
        },
        required: ["title"]
      }
    },
    chatMessage: { type: 3, description: "Jedna poruka za chat koja sažima predložene zadatke (<500 zn)." }
  },
  required: ["tasks"]
});

const PROMPT_AI_TASKS_HR = `
Ti si koordinator na gradilištu. Na temelju opisa i konteksta predloži konkretne zadatke.
Svaki zadatak neka bude:
- naslov (imperativ), jasno operativan
- (ako se može) procijeni dueDate, postavi startDate = danas
- odredi priority (low/normal/high/critical)
- ako ima mjesta za greške, confirmRequired = true
- ako su spomenuti projekt/pozicija/procesi, upiši u links.*

Ako se može, postavi goriona na jednu od vrijednosti:
"lagana vatra" | "krčka se" | "ladno" | "nestalo plina" | "nestalo struje" | "izgorilo" | "svaki čas će se zapalit" | "ako sad ne zaliješ zapalit će se".
Ako je 'goriona' kritična, postavi priority=critical.

Vrati STROGO JSON prema zadanoj shemi. BEZ markdowna i bez dodatnog teksta.
`;

function TaskModal({ open, onClose, initial, onSave, projects=[] }) {
  const [model, setModel] = useState(() => initial || newTask());
  useEffect(()=>{ if(open){ setModel(initial || newTask()); } }, [open, initial]);

  const projOptions = projects.map(p => ({ id: p.id, name: p.name }));

  const valid = model.title && model.assignedBy && model.assignedTo && model.startDate && model.dueDate;

  const set = (k,v)=>setModel(prev=>({ ...prev, [k]: v }));
  const setLink = (k,v)=>setModel(prev=>({ ...prev, links: { ...prev.links, [k]: v }}));

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`${GLASS} ${DEPTH} w-full max-w-2xl rounded-xl border p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold">{initial ? "Uredi zadatak" : "Novi zadatak"}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium">Zadatak *</label>
            <input value={model.title} onChange={e=>set("title", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="npr. Demontirati vrata na PZ-01" />
          </div>

          <div>
            <label className="text-xs font-medium">Zadao *</label>
            <input value={model.assignedBy} onChange={e=>set("assignedBy", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="Ime ili uloga" />
          </div>
          <div>
            <label className="text-xs font-medium">Kome *</label>
            <input value={model.assignedTo} onChange={e=>set("assignedTo", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="Ime, tim ili uloga" />
          </div>

          <div>
            <label className="text-xs font-medium">Početak *</label>
            <input type="date" value={model.startDate} onChange={e=>set("startDate", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Rok *</label>
            <input type="date" value={model.dueDate} onChange={e=>set("dueDate", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium">Prioritet</label>
            <select value={model.priority} onChange={e=>set("priority", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Goriona</label>
            <select value={model.goriona || ""} onChange={e=>set("goriona", e.target.value || null)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">—</option>
              {Object.values(GORIONA).map(v => (
                <option key={v} value={v}>{GORIONA_META[v]?.emoji} {v}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex items-center">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={model.confirmRequired} onChange={e=>set("confirmRequired", e.target.checked)} />
              Obavezna potvrda
            </label>
          </div>

          <div className="col-span-2">
            <label className="text-xs font-medium">Opis</label>
            <textarea value={model.description} onChange={e=>set("description", e.target.value)}
              rows={3} className="w-full border rounded px-3 py-2 text-sm" placeholder="Detalji, kriteriji prihvata, napomena..." />
          </div>

          <div>
            <label className="text-xs font-medium">Projekt</label>
            <select value={model.links.projectId || ""} onChange={e=>setLink("projectId", e.target.value || null)}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">—</option>
              {projOptions.map(p=> <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Pozicije (CSV)</label>
            <input value={model.links.positionIds.join(",")} onChange={e=>setLink("positionIds", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="npr. PZ-01,PZ-02" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">* obavezna polja</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded border bg-white hover:bg-gray-50 text-sm">Odustani</button>
            <button disabled={!valid} onClick={()=>onSave(model)}
              className={`px-3 py-2 rounded text-white text-sm ${valid ? "bg-blue-600 hover:bg-blue-700":"bg-gray-400 cursor-not-allowed"}`}>
              <Save className="w-4 h-4 inline mr-1" /> Spremi
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}

export default function TaskHubTab() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const projectDataService = useMemo(() => new ProjectDataService(), []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("");
  const [assignee, setAssignee] = useState("");
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [gorFilter, setGorFilter] = useState("");
  const [sort, setSort] = useState("due_asc");

  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ai, setAI] = useState({
    googleApiKey: "",
    selectedModel: GOOGLE_MODELS.GEMINI_15_PRO
  });
  const updateAI = (k,v)=>setAI(prev=>({ ...prev, [k]: v }));

  const projects = useMemo(()=> (window.__ALL_PROJECTS__?.projects || []), []);
  const projectMap = useMemo(()=> Object.fromEntries(projects.map(p=>[p.id, p])), [projects]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const agbimTasks = await projectDataService.getAllTasks();
      const convertedTasks = agbimTasks.map(t => projectDataService.convertAgbimTaskToTaskHub(t));
      setTasks(convertedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectDataService]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(()=> {
    exposeTaskHubAPI({
      addFromAnywhere: (taskLike) => addTask(newTask(taskLike)),
      openCreate: (prefill) => { setEditItem(newTask(prefill || {})); setOpenModal(true); },
      aiPropose: (args) => aiProposeTasks(args)
    });
  }, []);

  const addTask = async (t) => {
    try {
      const g = normalizeGoriona(t.goriona);
      const autoPrio = g ? (getGorionaPriority(g) || t.priority) : t.priority;
      const taskData = projectDataService.convertTaskHubToAgbim({ ...t, goriona: g || null, priority: autoPrio });
      
      const newTask = await projectDataService.addTask(taskData);
      const convertedTask = projectDataService.convertAgbimTaskToTaskHub(newTask);
      
      setTasks(prev => [convertedTask, ...prev]);

      try {
        const gorionaDisplay = formatGorionaForDisplay(convertedTask.goriona);
        const gorionaText = gorionaDisplay ? `\n• goriona: ${gorionaDisplay.emoji} ${gorionaDisplay.text}` : "";
        
        const msg = `🧩 *Zadatak* — ${convertedTask.title}
• Za: ${convertedTask.assignedTo} | Od: ${convertedTask.assignedBy}
• ${convertedTask.startDate} → ${convertedTask.dueDate}
${convertedTask.links?.projectId ? `• Projekt: ${convertedTask.links.projectId}` : ""}${gorionaText}`;
        
        window.dispatchEvent(new CustomEvent("media-ai:post-to-chat", {
          detail: {
            comment: {
              id: uid("c"), type: "comment", author: "Sustav", avatar: "AG",
              content: msg, timestamp: new Date(), context: { projectId: convertedTask.links?.projectId || null },
              linkedItemId: null
            },
            batch: null
          }
        }));
      } catch {/* noop */}
      
      return convertedTask;
    } catch (error) {
      console.error('Failed to add task:', error);
      alert('Greška pri dodavanju zadatka: ' + error.message);
    }
  };
  
  const updateTask = async (id, patch) => {
    try {
      await projectDataService.updateTask(id, patch);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Greška pri ažuriranju zadatka: ' + error.message);
    }
  };
  
  const removeTask = async (id) => {
    try {
      await projectDataService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Greška pri brisanju zadatka: ' + error.message);
    }
  };

  const toggleConfirm = (t) => {
    if (!t.confirmRequired) return;
    const newVal = !t.confirmed;
    updateTask(t.id, { confirmed: newVal, confirmedAt: newVal ? new Date().toISOString() : null, confirmedBy: newVal ? "assignee" : null });
  };
  const toggleDone = (t) => updateTask(t.id, { status: t.status === "done" ? "open" : "done" });

  const filtered = useMemo(() => {
    let arr = tasks.slice();

    if (q) {
      const ql = q.toLowerCase();
      arr = arr.filter(t =>
        t.title.toLowerCase().includes(ql) ||
        (t.description||"").toLowerCase().includes(ql) ||
        (t.assignedTo||"").toLowerCase().includes(ql) ||
        (t.assignedBy||"").toLowerCase().includes(ql) ||
        (t.links?.projectId||"").toLowerCase().includes(ql)
      );
    }
    if (status !== "all") {
      if (status === "confirm_needed") {
        arr = arr.filter(t => t.confirmRequired && !t.confirmed);
      } else {
        arr = arr.filter(t => t.status === status);
      }
    }
    if (project) arr = arr.filter(t => t.links?.projectId === project);
    if (assignee) arr = arr.filter(t => t.assignedTo.toLowerCase().includes(assignee.toLowerCase()));
    if (minDate || maxDate) arr = arr.filter(t => inRange(t.dueDate, minDate, maxDate));
    if (gorFilter) arr = arr.filter(t => (t.goriona||"") === gorFilter);

    arr.sort((a,b) => {
      if (sort === "due_asc") return (a.dueDate||"") < (b.dueDate||"") ? -1 : 1;
      if (sort === "due_desc") return (a.dueDate||"") > (b.dueDate||"") ? -1 : 1;
      if (sort === "prio") {
        const P = { critical:3, high:2, normal:1, low:0 };
        return (P[b.priority]||0) - (P[a.priority]||0);
      }
      if (sort === "goriona") {
        const aLevel = GORIONA_META[normalizeGoriona(a.goriona)]?.level || 0;
        const bLevel = GORIONA_META[normalizeGoriona(b.goriona)]?.level || 0;
        return bLevel - aLevel;
      }
      return 0;
    });

    return arr;
  }, [tasks, q, status, project, assignee, minDate, maxDate, gorFilter, sort]);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiFiles, setAiFiles] = useState([]);
  const [aiDrafts, setAiDrafts] = useState([]);

  const aiProposeTasks = async ({ text, files, context } = {}) => {
    const finalText = (text ?? aiText ?? "").trim();
    const finalFiles = files ?? aiFiles;

    if (!finalText && (!finalFiles || finalFiles.length === 0)) {
      alert("Dodaj opis ili datoteku za AI prijedloge."); return;
    }
    setAiBusy(true);
    try {
      const mergedPrompt = finalText
        ? `${PROMPT_AI_TASKS_HR}\n---\nKorisnički opis:\n${finalText}`
        : PROMPT_AI_TASKS_HR;

      const res = await CloudLLMService.analyzeDocumentGoogle({
        apiKey: ai.googleApiKey || null,
        model: ai.selectedModel,
        prompt: mergedPrompt,
        schema: createAITaskSchema(),
        files: finalFiles || [],
        onProgress: ()=>{}
      });

      const data = res?.data || { tasks: [] };
      const drafts = (data.tasks || []).map(t => {
        const g = normalizeGoriona(t.goriona);
        const pr = g ? getGorionaPriority(g) : t.priority;
        return newTask({
          ...t,
          goriona: g || null,
          priority: pr || t.priority || "normal",
          assignedBy: t.assignedBy || "AI",
          startDate: t.startDate || todayISO(),
          dueDate: t.dueDate || todayISO(),
        });
      });
      setAiDrafts(drafts);

      if (data.chatMessage) {
        window.dispatchEvent(new CustomEvent("media-ai:post-to-chat", {
          detail: {
            comment: {
              id: uid("c"), type: "comment", author: "AI", avatar: "AI",
              content: data.chatMessage.slice(0, 500),
              timestamp: new Date(), context: { projectId: context?.projectId || null }, linkedItemId: null
            },
            batch: null
          }
        }));
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "AI prijedlog nije uspio.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100/70" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <div className={`${GLASS} ${DEPTH} border-b p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-violet-600" />
          <h1 className="text-xl font-semibold">Task Hub</h1>
          <span className="text-sm text-gray-600">Wrapper za sve interakcije</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2"
                  onClick={()=>{ setEditItem(newTask()); setOpenModal(true); }}>
            <Plus className="w-4 h-4" /> Novi zadatak
          </button>

          <div className="relative">
            <button onClick={()=>setSettingsOpen(v=>!v)} className="px-3 py-2 rounded border bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[220px]">
              <Settings className="w-4 h-4" />
              <span className="truncate">{GOOGLE_MODEL_LABELS[ai.selectedModel] || ai.selectedModel}</span>
              <ChevronDown className={`w-4 h-4 ${TRN} ${settingsOpen ? "rotate-180":""}`} />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white border rounded-xl p-4 z-50">
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1 flex items-center gap-2"><Cpu className="w-4 h-4" /> Model</div>
                  <select value={ai.selectedModel} onChange={e=>updateAI("selectedModel", e.target.value)}
                          className="w-full border rounded px-3 py-2 text-sm">
                    {Object.entries(GOOGLE_MODEL_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1 flex items-center gap-2"><Key className="w-4 h-4" /> API ključ</div>
                  <input type="password" value={ai.googleApiKey} onChange={e=>updateAI("googleApiKey", e.target.value)}
                         placeholder={import.meta.env.VITE_GOOGLE_AI_API_KEY ? "Koristi .env ključ" : "Unesite API ključ"}
                         className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-b bg-white">
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3">
            <label className="text-xs font-medium">Traži</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e=>setQ(e.target.value)}
                     className="w-full border rounded pl-9 pr-3 py-2 text-sm" placeholder="naslov, opis, osoba, projekt…" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium">Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="all">Svi</option>
              <option value="open">Otvoreni</option>
              <option value="in_progress">U tijeku</option>
              <option value="done">Završeni</option>
              <option value="confirm_needed">Čeka potvrdu</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium">Goriona</label>
            <select value={gorFilter} onChange={e=>setGorFilter(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Sve</option>
              {Object.values(GORIONA).map(v => (
                <option key={v} value={v}>{GORIONA_META[v]?.emoji} {v}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium">Projekt</label>
            <select value={project} onChange={e=>setProject(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">—</option>
              {projects.map(p=> <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium">Assignee</label>
            <input value={assignee} onChange={e=>setAssignee(e.target.value)}
                   className="w-full border rounded px-3 py-2 text-sm" placeholder="Ivan" />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium">Od</label>
            <input type="date" value={minDate} onChange={e=>setMinDate(e.target.value)} className="w-full border rounded px-2 py-2 text-sm" />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium">Do</label>
            <input type="date" value={maxDate} onChange={e=>setMaxDate(e.target.value)} className="w-full border rounded px-2 py-2 text-sm" />
          </div>
          <div className="col-span-12 flex gap-2">
            <label className="text-xs font-medium mt-2">Sort:</label>
            <div className="flex gap-2">
              <button onClick={()=>setSort("due_asc")} className={`px-2 py-1 rounded text-xs border ${sort==="due_asc"?"bg-gray-800 text-white":"bg-white"}`}>Rok ↑</button>
              <button onClick={()=>setSort("due_desc")} className={`px-2 py-1 rounded text-xs border ${sort==="due_desc"?"bg-gray-800 text-white":"bg-white"}`}>Rok ↓</button>
              <button onClick={()=>setSort("prio")} className={`px-2 py-1 rounded text-xs border ${sort==="prio"?"bg-gray-800 text-white":"bg-white"}`}>Prioritet</button>
              <button onClick={()=>setSort("goriona")} className={`px-2 py-1 rounded text-xs border ${sort==="goriona"?"bg-gray-800 text-white":"bg-white"}`}>Goriona</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b bg-white">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8">
            <label className="text-xs font-medium">AI: Opis situacije</label>
            <textarea value={aiText} onChange={e=>setAiText(e.target.value)} rows={3}
                      className="w-full border rounded px-3 py-2 text-sm" placeholder="Npr. Demontirati vrata, provjeriti šarke, prebojati prag…" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium">Prilozi (opc.)</label>
            <input type="file" multiple onChange={e=>setAiFiles(Array.from(e.target.files||[]))}
                   className="w-full border rounded px-2 py-2 text-sm" />
          </div>
          <div className="col-span-2 flex items-end">
            <button onClick={()=>aiProposeTasks({})} disabled={aiBusy}
                    className={`w-full px-3 py-2 rounded text-white ${aiBusy?"bg-gray-400":"bg-violet-600 hover:bg-violet-700"}`}>
              {aiBusy ? "AI predlaže…" : "AI predloži"}
            </button>
          </div>
        </div>

        {aiDrafts.length > 0 && (
          <div className="mt-3 p-3 border rounded-lg bg-violet-50">
            <div className="text-sm font-medium mb-2">AI prijedlozi ({aiDrafts.length})</div>
            <div className="grid grid-cols-2 gap-2">
              {aiDrafts.map(d => {
                const gorionaDisplay = formatGorionaForDisplay(d.goriona);
                return (
                  <div key={d.id} className="p-2 border rounded bg-white">
                    <div className="font-medium text-sm">{d.title}</div>
                    <div className="text-xs text-gray-600">{d.description}</div>
                    <div className="text-xs mt-1">Za: {d.assignedTo || "—"} • Rok: {d.dueDate}</div>
                    {gorionaDisplay && (
                      <div className="text-xs mt-1">
                        <span className={`inline-flex items-center gap-1 px-1 py-0.5 rounded ${gorionaDisplay.color}`}>
                          {gorionaDisplay.emoji} {gorionaDisplay.text}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button className="px-2 py-1 rounded bg-emerald-600 text-white text-xs"
                              onClick={async ()=>await addTask(d)}>Dodaj</button>
                      <button className="px-2 py-1 rounded border bg-white text-xs"
                              onClick={()=>setAiDrafts(prev=>prev.filter(x=>x.id!==d.id))}>Ukloni</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2">
              <button className="px-3 py-1.5 rounded bg-emerald-700 text-white text-xs"
                      onClick={async ()=>{ 
                        for(const draft of aiDrafts) {
                          await addTask(draft);
                        }
                        setAiDrafts([]);
                      }}>
                Dodaj sve
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse">
              <div className="text-lg text-slate-600">Učitava zadatke...</div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-500">Nema zadataka za prikaz.</div>
        ) : null}

        <div className="grid grid-cols-1 gap-3">
          {filtered.map(t => {
            const proj = t.links?.projectId ? projectMap[t.links.projectId] : null;
            const overdue = t.status !== "done" && t.dueDate && t.dueDate < todayISO();
            const gorionaDisplay = formatGorionaForDisplay(t.goriona);
            return (
              <div key={t.id} className={`${GLASS} ${DEPTH} border rounded-xl p-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={()=>toggleDone(t)} className="p-1 rounded border bg-white hover:bg-gray-50">
                        {t.status==="done" ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-gray-500" />}
                      </button>
                      <div className="font-semibold">{t.title}</div>
                      {t.priority !== "normal" && (
                        <span className={`px-2 py-0.5 rounded text-xs ${t.priority==="critical"?"bg-red-600 text-white": t.priority==="high"?"bg-orange-500 text-white":"bg-gray-200 text-gray-800"}`}>
                          {t.priority}
                        </span>
                      )}
                      {gorionaDisplay && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${gorionaDisplay.color}`}>
                          {gorionaDisplay.emoji} {gorionaDisplay.text}
                        </span>
                      )}
                      {t.confirmRequired && !t.confirmed && (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">Čeka potvrdu</span>
                      )}
                    </div>
                    {t.description && <div className="text-sm text-gray-700 mt-1">{t.description}</div>}
                    <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {t.assignedBy} → <strong>{t.assignedTo}</strong></span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {t.startDate} → <strong className={overdue?"text-red-600":""}>{t.dueDate}</strong></span>
                      {t.links?.projectId && <span className="inline-flex items-center gap-1"><Link2 className="w-3 h-3" /> {t.links.projectId}</span>}
                      {t.links?.positionIds?.length > 0 && <span className="inline-flex items-center gap-1"><Link2 className="w-3 h-3" /> #{t.links.positionIds.join(", ")}</span>}
                    </div>

                    {(t.attachments?.docs?.length || t.attachments?.images?.length || t.attachments?.videos?.length) ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {t.attachments.images.map(a => <span key={a.id} className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs inline-flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {a.name}</span>)}
                        {t.attachments.videos.map(a => <span key={a.id} className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs inline-flex items-center gap-1"><VideoIcon className="w-3 h-3" /> {a.name}</span>)}
                        {t.attachments.docs.map(a => <span key={a.id} className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs inline-flex items-center gap-1"><FileText className="w-3 h-3" /> {a.name}</span>)}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {t.confirmRequired && (
                      <button onClick={()=>toggleConfirm(t)}
                              className={`px-3 py-1.5 rounded text-xs ${t.confirmed?"bg-emerald-600 text-white":"bg-white border"}`}>
                        {t.confirmed ? <>Potvrđeno <CheckCircle2 className="w-3 h-3 inline" /></> : "Potvrdi"}
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={()=>{ setEditItem(t); setOpenModal(true); }}
                              className="px-2 py-1.5 rounded border bg-white hover:bg-gray-50 text-xs flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Uredi
                      </button>
                      <button onClick={()=>removeTask(t.id)}
                              className="px-2 py-1.5 rounded border bg-white hover:bg-gray-50 text-xs text-red-600 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Obriši
                      </button>
                    </div>
                    <button
                      className="px-2 py-1.5 rounded bg-blue-600 text-white text-xs flex items-center gap-1"
                      onClick={()=>{
                        const gorionaText = gorionaDisplay ? `\n• goriona: ${gorionaDisplay.emoji} ${gorionaDisplay.text}` : "";
                        const msg = `🧩 *Zadatak* — ${t.title}
• Za: ${t.assignedTo} | Od: ${t.assignedBy}
• ${t.startDate} → ${t.dueDate}
${t.links?.projectId ? `• Projekt: ${t.links.projectId}` : ""}${gorionaText}`;
                        window.dispatchEvent(new CustomEvent("media-ai:post-to-chat", {
                          detail: {
                            comment: { id: uid("c"), type: "comment", author: "Sustav", avatar: "AG", content: msg, timestamp: new Date(), context: { projectId: t.links?.projectId || null }, linkedItemId: null },
                            batch: null
                          }
                        }));
                        window.dispatchEvent(new CustomEvent("media-ai:switch-to-chat", { detail: { projectId: t.links?.projectId || null }}));
                      }}
                    >
                      <MessageSquare className="w-3 h-3" /> U chat
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskModal
        open={openModal}
        onClose={()=>{ setOpenModal(false); setEditItem(null); }}
        initial={editItem}
        projects={projects}
        onSave={async (model)=>{
          try {
            if (editItem && tasks.find(t=>t.id===editItem.id)) {
              await updateTask(editItem.id, model);
            } else {
              await addTask(model);
            }
            setOpenModal(false); 
            setEditItem(null);
          } catch (error) {
            console.error('Save failed:', error);
          }
        }}
      />
    </div>
  );
}