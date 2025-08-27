import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
Home, Library, Gamepad2, AppWindow, Search, Settings, Sparkles, 
  MoreHorizontal, ChevronDown, ChevronLeft, Bell, Check, CheckCheck, Plus, Minus, FileText,
  GitBranch, Clock, Download, Upload, Eye, Edit3, Trash2, Copy,
  Lock, Unlock, Users, FolderOpen, AlertCircle, Circle, Triangle, Shuffle, 
  ChevronRight, ArrowRight, ArrowUp, Loader, Truck, FileSpreadsheet,
  CheckCircle, XCircle, RefreshCw, Save, History, Package, Heart, Hexagon, Move,EyeOff,
  Calendar, Flag, Target, Zap, TrendingUp, Award, Star, MessageSquare, Image as ImageIcon, Phone,
  AlertTriangle, BarChart3, Layers, Grid3x3, Play, Pause, FastForward, Mail, ClipboardList, Building2,
  Rewind, Maximize2, Filter, Camera,ShoppingCart,QrCode, Share2, BadgeCheck, Bookmark,
  Building, MapPin, DoorOpen, Square, Maximize, Activity, X, ExternalLink // Also add X here
} from "lucide-react";


const ToggleSwitch = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`px-3 py-1 rounded-xl ring-1 ring-slate-200 ${value ? 'bg-slate-900 text-white' : 'bg-white'}`}
  >
    {value ? 'On' : 'Off'}
  </button>
);

const SegmentedControl = ({ options, value, onChange }) => (
  <div className="inline-flex bg-slate-50 rounded-xl p-1 ring-1 ring-slate-200">
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-3 py-1 rounded-lg text-sm ${value === opt ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default function ReportsPanel() {
  // ----- Invoices sample data -----
  const [range, setRange] = useState("Last 30 days");
  const [invoices, setInvoices] = useState([
    { date: "2025-08-01", supplier: "ACME d.o.o.", currency: "EUR", net: 1000, vat: 250, total: 1250 },
    { date: "2025-08-05", supplier: "Nebula Labs", currency: "EUR", net: 420, vat: 105, total: 525 },
    { date: "2025-08-10", supplier: "ZenTasks LLC", currency: "EUR", net: 860, vat: 215, total: 1075 },
  ]);

  const sums = invoices.reduce(
    (a, r) => ({ net: a.net + r.net, vat: a.vat + r.vat, total: a.total + r.total }),
    { net: 0, vat: 0, total: 0 }
  );

  // ----- Positions snapshot -----
  const [filterStatus, setFilterStatus] = useState("all");
  const [positions, setPositions] = useState([
    {
      id: '1',
      positionNumber: 'POS-2025-001',
      title: 'Main Assembly Unit',
      category: 'Mechanical',
      status: 'active',
      createdDate: '2025-01-15',
      expanded: false,
      subdrawings: [
        {
          id: 'sd1',
          name: 'Housing Assembly.dwg',
          type: 'CAD Drawing',
          currentVersion: 'v3.2',
          locked: false,
          lastModified: '2025-08-10',
          size: '4.2 MB',
          versions: [
            { version: 'v3.2', date: '2025-08-10', author: 'John Smith', changes: 'Updated tolerances', status: 'approved' },
            { version: 'v3.1', date: '2025-08-05', author: 'Jane Doe', changes: 'Added fastener details', status: 'approved' },
            { version: 'v3.0', date: '2025-07-28', author: 'Mike Johnson', changes: 'Major revision', status: 'approved' }
          ]
        },
        {
          id: 'sd2',
          name: 'Electrical Schematic.pdf',
          type: 'Schematic',
          currentVersion: 'v2.1',
          locked: true,
          lastModified: '2025-08-08',
          size: '1.8 MB',
          versions: [
            { version: 'v2.1', date: '2025-08-08', author: 'Sarah Wilson', changes: 'Wire gauge updates', status: 'pending' },
            { version: 'v2.0', date: '2025-07-20', author: 'Tom Brown', changes: 'Circuit redesign', status: 'approved' }
          ]
        }
      ]
    },
    {
      id: '2',
      positionNumber: 'POS-2025-002',
      title: 'Control Panel Interface',
      category: 'Electronics',
      status: 'active',
      createdDate: '2025-02-01',
      expanded: false,
      subdrawings: [
        {
          id: 'sd3',
          name: 'PCB Layout.brd',
          type: 'PCB Design',
          currentVersion: 'v1.5',
          locked: false,
          lastModified: '2025-08-12',
          size: '2.3 MB',
          versions: [
            { version: 'v1.5', date: '2025-08-12', author: 'Alex Chen', changes: 'Routing optimization', status: 'approved' },
            { version: 'v1.4', date: '2025-08-01', author: 'Lisa Park', changes: 'Component placement', status: 'approved' }
          ]
        }
      ]
    },
    {
      id: '3',
      positionNumber: 'POS-2025-003',
      title: 'Hydraulic System',
      category: 'Fluid Power',
      status: 'draft',
      createdDate: '2025-03-10',
      expanded: false,
      subdrawings: [
        {
          id: 'sd4',
          name: 'Hydraulic Circuit.dwg',
          type: 'CAD Drawing',
          currentVersion: 'v0.9',
          locked: false,
          lastModified: '2025-08-14',
          size: '3.1 MB',
          versions: [
            { version: 'v0.9', date: '2025-08-14', author: 'Robert Lee', changes: 'Initial draft', status: 'pending' }
          ]
        }
      ]
    }
  ]);
  const [selectedSubdrawing, setSelectedSubdrawing] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const toggleExpanded = (posId) => {
    setPositions(prev => prev.map(pos =>
      pos.id === posId ? { ...pos, expanded: !pos.expanded } : pos
    ));
  };

  const toggleLock = (posId, subId) => {
    setPositions(prev => prev.map(pos =>
      pos.id === posId
        ? {
            ...pos,
            subdrawings: pos.subdrawings.map(sub =>
              sub.id === subId ? { ...sub, locked: !sub.locked } : sub
            )
          }
        : pos
    ));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    
    return colors[status] || 'bg-slate-100 text-slate-600 ring-slate-200';
    };

  const filteredPositions = positions.filter(pos =>
    filterStatus === 'all' || pos.status === filterStatus
  );

  // ----- Report Settings (same as Settings tab) -----
  const [liveTiles, setLiveTiles] = useState(true);
  const [channel, setChannel] = useState("Beta");
  const [date, setDate] = useState("");
  const [scale, setScale] = useState(100);
  const [language, setLanguage] = useState("English");
  const [pageSize, setPageSize] = useState(20);
  const [accent, setAccent] = useState("#2563eb");
  const [hotkey, setHotkey] = useState("Ctrl+I");
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (!capturing) return;
      e.preventDefault();
      const key = e.key || "";
      const parts = [e.ctrlKey ? "Ctrl" : null, e.altKey ? "Alt" : null, e.shiftKey ? "Shift" : null, key.length === 1 ? key.toUpperCase() : key].filter(Boolean);
      setHotkey(parts.join("+"));
      setCapturing(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [capturing]);

  useEffect(() => {
    if (progress <= 0 || progress >= 100) return;
    const t = setTimeout(() => setProgress((p) => Math.min(100, p + 6)), 120);
    return () => clearTimeout(t);
  }, [progress]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Reports
          </h1>
          <p className="mt-1 text-sm opacity-80">KPIs, invoice rollups, positions & version control snapshot, and report-level settings.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-sm"
          >
            {["Last 7 days", "Last 30 days", "Quarter to date", "Year to date"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button className="px-3 py-2 rounded-xl bg-slate-100 ring-1 ring-slate-200 text-sm flex items-center gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
          <div className="text-xs opacity-70">Invoices</div>
          <div className="text-2xl font-semibold">{invoices.length}</div>
        </div>
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
          <div className="text-xs opacity-70">Net</div>
          <div className="text-2xl font-semibold">{sums.net.toFixed(2)} EUR</div>
        </div>
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
          <div className="text-xs opacity-70">VAT</div>
          <div className="text-2xl font-semibold text-amber-600">{sums.vat.toFixed(2)} EUR</div>
        </div>
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
          <div className="text-xs opacity-70">Total</div>
          <div className="text-2xl font-semibold">{sums.total.toFixed(2)} EUR</div>
        </div>
      </div>

      {/* Main content */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 cols */}
        <div className="xl:col-span-2 space-y-6">
          {/* Invoice summary */}
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Invoice Summary</h3>
              <div className="text-xs px-2 py-1 rounded-lg bg-slate-100 ring-1 ring-slate-200">{range}</div>
            </div>
            <div className="grid grid-cols-6 text-xs font-medium opacity-70 px-3">
              <div>Date</div><div className="col-span-2">Supplier</div><div className="text-right">Net</div><div className="text-right">VAT</div><div className="text-right">Total</div>
            </div>
            <div className="mt-2 space-y-2">
              {invoices.map((r, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 text-sm rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2">
                  <div>{r.date}</div>
                  <div className="col-span-2 truncate">{r.supplier}</div>
                  <div className="text-right">{r.net.toFixed(2)} {r.currency}</div>
                  <div className="text-right">{r.vat.toFixed(2)} {r.currency}</div>
                  <div className="text-right font-medium">{r.total.toFixed(2)} {r.currency}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-6 gap-2 px-3 py-2 text-sm">
              <div className="col-span-3 text-right font-medium">Totals:</div>
              <div className="text-right font-medium">{sums.net.toFixed(2)} EUR</div>
              <div className="text-right font-medium">{sums.vat.toFixed(2)} EUR</div>
              <div className="text-right font-semibold">{sums.total.toFixed(2)} EUR</div>
            </div>
          </div>

          {/* Positions snapshot */}
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Positions & Drawings (Snapshot)</h3>
                <p className="text-sm opacity-70">Quick manage from within Reports</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="opacity-70">Filter:</span>
                {['all', 'active', 'draft', 'archived'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-lg text-sm capitalize transition-colors ${
                      filterStatus === status 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-100 ring-1 ring-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredPositions.map(position => (
                <motion.div key={position.id} layout className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
                  {/* Header */}
                  <div className="p-3 bg-white cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpanded(position.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <motion.div
                          animate={{ rotate: position.expanded ? 90 : 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                          <ChevronRight className="h-5 w-5 mt-0.5 text-slate-400" />
                        </motion.div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{position.positionNumber}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${getStatusBadge(position.status)}`}>{position.status}</span>
                          </div>
                          <p className="text-sm text-slate-600">{position.title}</p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" />{position.category}</span>
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{position.subdrawings.length} drawings</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{position.createdDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subdrawings */}
                  <AnimatePresence>
                    {position.expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-slate-200 bg-white"
                      >
                        <div className="p-3 space-y-2">
                          {position.subdrawings.map(subdrawing => (
                            <motion.div
                              key={subdrawing.id}
                              whileHover={{ scale: 1.01 }}
                              className="rounded-xl ring-1 ring-slate-200 bg-slate-50 p-3 cursor-pointer"
                              onClick={() => { setSelectedSubdrawing(subdrawing); setShowVersionHistory(true); }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-white ring-1 ring-slate-200">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">{subdrawing.name}</p>
                                      {subdrawing.locked && <Lock className="h-3 w-3 text-amber-600" />}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                      <span>{subdrawing.type}</span><span>â€¢</span>
                                      <span>{subdrawing.currentVersion}</span><span>â€¢</span>
                                      <span>{subdrawing.size}</span><span>â€¢</span>
                                      <span>{subdrawing.lastModified}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    className="p-1.5 rounded-lg hover:bg-white transition-colors"
                                    onClick={(e) => { e.stopPropagation(); toggleLock(position.id, subdrawing.id); }}
                                  >
                                    {subdrawing.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                  </button>
                                  <button className="p-1.5 rounded-lg hover:bg-white transition-colors"><Download className="h-4 w-4" /></button>
                                  <button className="p-1.5 rounded-lg hover:bg-white transition-colors"><Eye className="h-4 w-4" /></button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Snapshot stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs opacity-70">Total Positions</div>
                <div className="font-medium">{positions.length}</div>
              </div>
              <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs opacity-70">Drawings</div>
                <div className="font-medium">{positions.reduce((a, p) => a + p.subdrawings.length, 0)}</div>
              </div>
              <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs opacity-70">Locked</div>
                <div className="font-medium text-amber-600">{positions.reduce((a, p) => a + p.subdrawings.filter(s => s.locked).length, 0)}</div>
              </div>
              <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs opacity-70">Pending</div>
                <div className="font-medium text-amber-600">
                  {positions.reduce((acc, pos) => acc + pos.subdrawings.reduce((subAcc, sub) => subAcc + sub.versions.filter(v => v.status === 'pending').length, 0), 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Version history panel */}
          {showVersionHistory && selectedSubdrawing && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl ring-1 ring-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Version History
                </h3>
                <button onClick={() => setShowVersionHistory(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-4 p-3 rounded-xl bg-slate-50 ring-1 ring-slate-200">
                <p className="font-medium text-sm">{selectedSubdrawing.name}</p>
                <p className="text-xs text-slate-600 mt-1">Current: {selectedSubdrawing.currentVersion}</p>
              </div>
              <div className="space-y-3">
                {selectedSubdrawing.versions.map((v, idx) => (
                  <div key={v.version} className={`relative pl-6 pb-3 ${idx < selectedSubdrawing.versions.length - 1 ? 'border-l-2 border-slate-200 ml-2' : ''}`}>
                    <div className="absolute -left-[7px] top-0 w-4 h-4 rounded-full bg-white ring-2 ring-slate-300" />
                    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{v.version}</span>
                            {getStatusIcon(v.status)}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{v.changes}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{v.author}</span>
                            <span>{v.date}</span>
                          </div>
                        </div>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100"><RefreshCw className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm flex items-center justify-center gap-2"><Save className="h-4 w-4" /> New Version</button>
                <button className="px-3 py-2 rounded-xl ring-1 ring-slate-200 text-sm flex items-center justify-center gap-2"><History className="h-4 w-4" /> Compare</button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right col: Report-level Settings */}
        <div className="space-y-4">
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
            <h3 className="font-semibold mb-3">Report Settings</h3>

            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="font-medium text-sm">Live tiles</div>
                  <div className="text-xs opacity-70">Show live previews on tiles</div>
                </div>
                <ToggleSwitch value={liveTiles} onChange={setLiveTiles} />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Update channel</div>
                <SegmentedControl options={["Stable","Beta","Dev"]} value={channel} onChange={setChannel} />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Default VAT start date</div>
                <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 focus:ring-2 focus:ring-slate-300"/>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">UI scale</div>
                  <div className="text-xs opacity-70">{scale}%</div>
                </div>
                <input type="range" min={75} max={150} value={scale} onChange={(e)=>setScale(parseInt(e.target.value))} className="w-full"/>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Language</div>
                <select value={language} onChange={(e)=>setLanguage(e.target.value)} className="w-full rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2">
                  {['English','Deutsch','Hrvatski','EspaÃ±ol','FranÃ§ais'].map((l)=> <option key={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Accent color</div>
                <div className="flex items-center gap-3">
                  <input type="color" value={accent} onChange={(e)=>setAccent(e.target.value)} className="h-10 w-14 rounded"/>
                  <div className="text-xs opacity-70">{accent}</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Items per page</div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-slate-100 ring-1 ring-slate-200" onClick={()=>setPageSize((n)=>Math.max(5,n-5))}><Minus className="h-4 w-4"/></button>
                  <input type="number" value={pageSize} onChange={(e)=>setPageSize(parseInt(e.target.value)||0)} className="w-20 text-center rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2"/>
                  <button className="p-2 rounded-lg bg-slate-100 ring-1 ring-slate-200" onClick={()=>setPageSize((n)=>n+5)}><Plus className="h-4 w-4"/></button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Smart Ingest hotkey</div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-sm">{hotkey}</div>
                  <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-100" onClick={()=>setCapturing(true)}>{capturing ? "Press any key..." : "Assign"}</button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl ring-1 ring-slate-200 bg-white p-4">
                <div>
                  <div className="font-medium text-sm">Background sync</div>
                  <div className="text-xs opacity-70">{progress >= 100 ? "Completed" : progress > 0 ? `${progress}%` : "Idle"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full grid place-items-center" style={{ background: `conic-gradient(${accent} ${progress*3.6}deg, #e5e7eb 0deg)` }}>
                    <div className="h-8 w-8 rounded-full bg-white"/>
                  </div>
                  {progress === 0 ? (
                    <button className="px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={()=>setProgress(6)}>Start</button>
                  ) : progress < 100 ? (
                    <button className="px-3 py-2 rounded-xl bg-slate-100 ring-1 ring-slate-200" onClick={()=>setProgress(0)}>Cancel</button>
                  ) : (
                    <button className="px-3 py-2 rounded-xl bg-slate-100 ring-1 ring-slate-200" onClick={()=>setProgress(0)}>Reset</button>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Notifications</div>
                <button
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white flex items-center gap-2"
                  onClick={()=>{setShowToast(true); setTimeout(()=>setShowToast(false), 2500);}}
                >
                  <Bell className="h-4 w-4"/> Send test toast
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showToast && (
              <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="fixed bottom-6 right-6 z-[60]">
                <div className="rounded-xl bg-slate-900 text-white shadow-lg px-4 py-3">Settings saved successfully</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent activity */}
          <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-4">
            <h3 className="font-semibold mb-3">Audit / Recent Activity</h3>
            <div className="space-y-2 text-sm">
              {[
                { t: "CSV export", d: "Prepared invoice summary", ago: "2m ago", icon: History, color: "text-slate-600" },
                { t: "Version approved", d: "Housing Assembly.dwg", ago: "2h ago", icon: CheckCircle, color: "text-green-600" },
                { t: "File locked", d: "Electrical Schematic.pdf", ago: "4h ago", icon: Lock, color: "text-amber-600" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2">
                  <a.icon className={`h-4 w-4 mt-0.5 ${a.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.t}</div>
                    <div className="opacity-70">{a.d} â€¢ {a.ago}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}



