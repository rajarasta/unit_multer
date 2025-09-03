import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../../../store/useProjectStore";
import { useUserStore } from '../../../store/useUserStore';
import ProjectDataService from "../../../store/ProjectDataService.js";
import TaskHoverCardRedesign from "../hoverTab2.jsx";
import {
  Users, Layers, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  Grid3X3 as Grid3x3, Group, Columns3, AlertTriangle, Search,
} from "lucide-react";

/**
 * EmployogramTab.jsx
 * ------------------
 * Kompaktni matriks: redci = zaposlenici, stupci = zadaci (grupirani po Projekt → Proces → Pozicija)
 * - Hover preko ćelije otvara naš postojeći hover panel (hoverTab2.jsx)
 * - Minimal-click navigacija (dock kontrole + pretraga)
 * - Detekcija preopterećenja (konflikti u datumima za istu osobu)
 */

const ROW_H = 40;
const COL_W = 220; // širina stupca zadatka

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function toDate(d){ return d ? new Date(d) : null; }
function overlaps(aStart, aEnd, bStart, bEnd){
  if(!aStart || !aEnd || !bStart || !bEnd) return false;
  return toDate(aStart) <= toDate(bEnd) && toDate(bStart) <= toDate(aEnd);
}

function pillGradient(c1, c2){
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
}

// Normaliziraj task iz canonical v5 (ProjectDataService) u matricu stupaca
function normalizeTasks(project){
  const tasks = [];
  if(!project) return tasks;
  for(const position of (project.positions||[])){
    for(const proc of (position.processes||[])){
      const id = `${project.id}-${position.id}-${proc.name}`; // isti format kao u Planneru
      tasks.push({
        id,
        key: id,
        title: proc.name,
        positionId: position.id,
        positionTitle: position.title,
        projectId: project.id,
        projectName: project.name,
        processName: proc.name,
        ownerName: proc?.owner?.name || "",
        start: proc.plannedStart || proc.actualStart || null,
        end: proc.plannedEnd || proc.actualEnd || null,
        status: (proc.status||"Čeka").toLowerCase(),
        progress: proc.progress ?? 0,
        notes: proc.notes || "",
      });
    }
  }
  return tasks;
}

export default function EmployogramTab(){
  const { project } = useProjectStore();
  const { users } = useUserStore();
  const [service] = useState(() => new ProjectDataService());
  const [all, setAll] = useState(null); // {projects:[], activeProjectId}
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [search, setSearch] = useState("");
  const [groupMode, setGroupMode] = useState("project-process-position");
  const [hover, setHover] = useState(null); // {task, x, y}

  const scrollRef = useRef(null);

  // učitaj podatke
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Try to load from JSON file first
        let jsonData = null;
        try {
          const response = await fetch('/project_from_troskovnik_planning.json');
          if (response.ok) {
            jsonData = await response.json();
            console.log('Loaded real project data from JSON:', jsonData);
          }
        } catch (err) {
          console.log('Could not load JSON file, using service data');
        }

        if (jsonData && jsonData.projects && jsonData.projects.length > 0) {
          // Use the real JSON data
          setAll(jsonData);
          setActiveProjectId(jsonData.projects[0]?.id || null);
        } else {
          // Fallback to service data
          const data = await service.loadAllProjects();
          if(!mounted) return;
          if(!data || !Array.isArray(data.projects) || data.projects.length===0){
            // Fallback – inicijaliziraj iz Zustand projekta
            const init = {
              version: "5.0",
              exportDate: new Date().toISOString(),
              meta: { schemaName: "project.unified", schemaVersion: "5.0.0" },
              projects: [{
                id: project.id,
                name: project.name || "Trenutni projekt",
                positions: project.positions || [],
                materials: project.materials || [],
                tasks: project.tasks || [],
                documents: project.documents || [],
              }],
              activeProjectId: project.id,
            };
            await service.storage.importFull(init);
            setAll(init);
            setActiveProjectId(init.activeProjectId);
          } else {
            setAll(data);
            setActiveProjectId(data.activeProjectId || data.projects[0]?.id || null);
          }
        }
      } catch(e){
        console.error('Error loading project data:', e);
      }
    })();
    return () => { mounted=false; };
  }, [service, project]);

  const activeProject = useMemo(() => {
    if(!all) return null;
    return all.projects.find(p => p.id === (activeProjectId || all.activeProjectId)) || all.projects[0] || null;
  }, [all, activeProjectId]);

  // zaposlenici (redoslijed + boje)
  const employees = useMemo(() => {
    const list = (users||[]).map(u => ({
      id: u.id || u.email || u.name,
      name: u.name || u.email || "User",
      role: u.role || "",
      colorA: u.colorA || "#c7d2fe",
      colorB: u.colorB || "#93c5fd",
      capacityH: u.capacityH || 8,
    }));
    // barem jedan da UI ne bude prazan
    if(list.length===0){
      list.push({ id: "emp-1", name: "Bez imena", role: "", colorA: "#fde68a", colorB: "#fca5a5", capacityH: 8 });
    }
    return list;
  }, [users]);

  const columns = useMemo(() => {
    const tasks = normalizeTasks(activeProject);
    // pretraga
    const q = search.trim().toLowerCase();
    const filtered = q ? tasks.filter(t =>
      `${t.title} ${t.positionTitle} ${t.projectName} ${t.processName}`.toLowerCase().includes(q)
    ) : tasks;

    // grupiranje: Project → Process → Position
    const tree = [];
    const byProj = new Map();
    for(const t of filtered){
      if(!byProj.has(t.projectId)) byProj.set(t.projectId, { id: t.projectId, name: t.projectName, groups: new Map() });
      const proj = byProj.get(t.projectId);
      const keyProc = t.processName;
      if(!proj.groups.has(keyProc)) proj.groups.set(keyProc, { id: keyProc, name: keyProc, groups: new Map() });
      const proc = proj.groups.get(keyProc);
      const keyPos = t.positionId;
      if(!proc.groups.has(keyPos)) proc.groups.set(keyPos, { id: keyPos, name: t.positionTitle, tasks: [] });
      proc.groups.get(keyPos).tasks.push(t);
    }
    for(const proj of byProj.values()){
      const procs = [];
      for(const proc of proj.groups.values()){
        const poss = [];
        for(const pos of proc.groups.values()){
          poss.push(pos);
        }
        procs.push({ ...proc, positions: poss });
      }
      tree.push({ ...proj, processes: procs });
    }
    return { tasks, tree };
  }, [activeProject, search]);

  // indeksiranje dodjela (allocations) – fallback: vlasnik procesa = dodijeljeni
  const employeeByName = useMemo(() => {
    const map = new Map();
    for(const e of employees){ map.set(e.name, e); }
    return map;
  }, [employees]);

  const allocations = useMemo(() => {
    const map = new Map(); // key: `${task.id}::${emp.id}` → true
    for(const t of columns.tasks){
      const emp = t.ownerName && employeeByName.get(t.ownerName);
      if(emp){ map.set(`${t.id}::${emp.id}`, true); }
    }
    return map;
  }, [columns.tasks, employeeByName]);

  // detekcija konflikata po osobi (više preklapajućih zadataka)
  const conflictByEmp = useMemo(() => {
    const m = new Map();
    for(const e of employees){ m.set(e.id, 0); }
    const tasksByEmp = new Map();
    for(const t of columns.tasks){
      const emp = t.ownerName && employeeByName.get(t.ownerName);
      if(!emp) continue;
      if(!tasksByEmp.has(emp.id)) tasksByEmp.set(emp.id, []);
      tasksByEmp.get(emp.id).push(t);
    }
    for(const [empId, list] of tasksByEmp){
      let conflicts = 0;
      for(let i=0;i<list.length;i++){
        for(let j=i+1;j<list.length;j++){
          if(overlaps(list[i].start, list[i].end, list[j].start, list[j].end)) conflicts++;
        }
      }
      m.set(empId, conflicts);
    }
    return m;
  }, [columns.tasks, employees, employeeByName]);

  // helpers za hover kartu
  const [hoverTask, setHoverTask] = useState(null);
  const [hoverXY, setHoverXY] = useState({x:0,y:0});

  function openHover(e, task){
    const rect = scrollRef.current?.getBoundingClientRect();
    const x = (e?.clientX||0) - (rect?.left||0) + 16;
    const y = (e?.clientY||0) - (rect?.top||0) + 16;
    
    // Find the actual position data from the active project
    const position = activeProject?.positions?.find(pos => pos.id === task.positionId);
    
    setHoverTask({
      ...task,
      realPosition: position // Store the real position data
    });
    setHoverXY({x,y});
  }
  function closeHover(){ setHoverTask(null); }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <select
            value={activeProjectId || ""}
            onChange={(e)=>setActiveProjectId(e.target.value)}
            className="px-2 py-1 text-sm border rounded-lg"
          >
            {all?.projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Pretraži zadatke, pozicije, procese..."
            className="px-2 py-1 text-sm border rounded-lg w-64"
          />
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <Users className="w-4 h-4" />
          <span className="text-slate-600">Zaposlenika: {employees.length}</span>
          <CalendarDays className="w-4 h-4 ml-4" />
          <span className="text-slate-600">Zadataka: {columns.tasks.length}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* lijevi stupac: zaposlenici */}
        <div className="shrink-0 w-64 border-r bg-slate-50/60">
          <div className="h-10 border-b flex items-center px-3 text-xs text-slate-500">Zaposlenici</div>
          <div className="overflow-auto" style={{maxHeight: "calc(100% - 40px)"}}>
            {employees.map(emp => (
              <div key={emp.id} className="h-10 flex items-center px-3 border-b justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-6 rounded" style={{background: pillGradient(emp.colorA, emp.colorB)}} />
                  <div className="text-sm font-medium text-slate-700 truncate">{emp.name}</div>
                </div>
                {conflictByEmp.get(emp.id) > 0 && (
                  <div className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {conflictByEmp.get(emp.id)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* desna strana: stupci zadataka */}
        <div ref={scrollRef} className="flex-1 overflow-auto relative">
          {/* zaglavlje stupaca */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="min-w-max flex">
              {columns.tree.map(proj => (
                <div key={proj.id} className="border-r">
                  <div className="h-10 px-3 flex items-center text-sm font-semibold text-slate-800 bg-slate-50/60 border-b">
                    {proj.name}
                  </div>
                  <div className="flex">
                    {proj.processes.map(proc => (
                      <div key={proc.id} className="border-r">
                        <div className="h-10 px-3 flex items-center text-xs font-medium text-slate-700 bg-slate-50/40 border-b">
                          {proc.name}
                        </div>
                        <div className="flex">
                          {proc.positions.map(pos => (
                            <div key={pos.id} className="border-r" style={{width: COL_W}}>
                              <div className="h-10 px-2 flex items-center text-[11px] text-slate-600 bg-white border-b truncate" title={pos.name}>
                                {pos.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* tijelo matrice */}
          <div className="min-w-max">
            {employees.map(emp => (
              <div key={emp.id} className="flex">
                {columns.tree.map(proj => (
                  <React.Fragment key={proj.id}>
                    {proj.processes.map(proc => (
                      <React.Fragment key={proc.id}>
                        {proc.positions.map(pos => (
                          <div key={pos.id} className="border-r" style={{width: COL_W}}>
                            {/* ćelija: prikaz svih taskova iz ove (proj,proc,pos) grupe za ovog zaposlenika */}
                            <div className="h-10 border-b px-2 flex items-center gap-2">
                              {pos.tasks.filter(t => (t.ownerName && employeeByName.get(t.ownerName)?.id === emp.id)).map(t => (
                                <button
                                  key={t.id}
                                  onMouseEnter={(e)=>openHover(e, t)}
                                  onMouseLeave={closeHover}
                                  className="px-2 py-1 rounded text-[11px] text-slate-800 shadow-sm border hover:shadow transition"
                                  style={{ background: pillGradient(emp.colorA, emp.colorB) }}
                                  title={`${t.title} • ${t.positionTitle}`}
                                >
                                  {t.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>

          {/* hover karta */}
          {hoverTask && (
            <TaskHoverCardRedesign
              task={{
                id: hoverTask.id,
                naziv: hoverTask.title,
                pozicija: `${hoverTask.positionId} – ${hoverTask.positionTitle}`,
                proces: hoverTask.processName,
                start: hoverTask.start,
                end: hoverTask.end,
                plannedEnd: hoverTask.end,
                faza: "u_radu",
                hitnost: "normalno"
              }}
              hoverMeta={{
                position: {
                  id: hoverTask.positionId,
                  title: hoverTask.positionTitle,
                  processData: {
                    comments: hoverTask.realPosition?.comments?.map(c => ({
                      id: c.id,
                      text: c.text,
                      author: c.author?.name || "Unknown",
                      date: new Date(c.date).toISOString().split('T')[0]
                    })) || [],
                    documents: hoverTask.realPosition?.documents || [],
                    tasks: hoverTask.realPosition?.tasks?.map(t => ({
                      id: t.id,
                      title: t.title,
                      assignee: t.assignee?.name || "Unassigned",
                      due: t.due,
                      done: t.status === "completed"
                    })) || []
                  },
                  pieces: [{
                    id: 1,
                    pieceNumber: 1,
                    processData: {
                      comments: [],
                      documents: [],
                      tasks: []
                    },
                    // Create subprocess structure from real process data
                    montaza: hoverTask.realPosition?.processes?.reduce((acc, proc) => {
                      const processKey = proc.name.toLowerCase().replace(/\s+/g, '_');
                      acc[processKey] = {
                        status: proc.status === "Završeno",
                        comments: proc.subtasks?.map(st => ({
                          id: st.id,
                          text: st.title,
                          author: st.assignee?.name || "Unknown",
                          date: st.due
                        })) || [],
                        documents: [],
                        tasks: proc.subtasks?.map(st => ({
                          id: st.id,
                          title: st.title,
                          assignee: st.assignee?.name || "Unassigned",
                          due: st.due,
                          done: st.status === "completed"
                        })) || [],
                        timestamp: proc.actualEnd || null
                      };
                      return acc;
                    }, {
                      transport: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                      ugradnja: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                    }) || {
                      transport: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                      ugradnja: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                    }
                  }]
                }
              }}
              level={2}
              position={{ x: hoverXY.x, y: hoverXY.y }}
              onClose={closeHover}
              onExpand={()=>{}}
            />
          )}
        </div>
      </div>
    </div>
  );
}