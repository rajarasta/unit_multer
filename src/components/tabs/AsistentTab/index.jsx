import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Upload,
  Paperclip,
  Send,
  FileText,
  X,
  Tag,
  Check,
  ArrowRight,
  Clock,
  Lightbulb,
  Trash2,
  FolderOpen,
} from "lucide-react";

/**
 * TabAsistent – prozor u AI svijet tvog sustava
 *
 * • Dominantno srednji multiline input (tekst + voice + prilozi)
 * • Desno uski panel s DRAG&DROP uploadom + kratki opis + brzi tagovi
 * • Noćna obrada (simulirana): iz dumpa generira preporuke kamo smjestiti dokumente
 * • Ujutro pregled: potvrdi / odbij preporuku (sa zamjenskom lokacijom)
 *
 * Bez vanjskih ovisnosti osim tailwind + framer-motion + lucide-react.
 */

// Pomoćni tipovi
function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const PREDEF_TAGS = [
  "projekt",
  "pozicija",
  "reklamacija",
  "popravljeno",
  "fali",
  "nacrt",
  "foto",
];

// Demo liste za kaskadni odabir lokacije (zamijeni backend podacima kada spojiš)
const DEMO_PROJECTS = ["Projekt A", "Projekt B", "Projekt C"];
const DEMO_POSITIONS = ["PZ-01", "PZ-02", "PZ-03"];
const DEMO_PROCESSES = ["Nabava", "Projektiranje", "Proizvodnja", "Montaža", "Servis"];
const DEMO_PARTS = ["Krilo", "Staklo", "Okov", "Profil", "Brtva"];

function bytesPretty(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ————————————————————————————————————————————
// TagInput – čipovi + slobodni unos
function TagInput({ value, onChange, suggestions = PREDEF_TAGS, placeholder = "Dodaj tag..." }) {
  const [draft, setDraft] = useState("");
  const add = (t) => {
    const v = (t || draft).trim().toLowerCase();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  const remove = (t) => onChange(value.filter((x) => x !== t));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200">
            <Tag className="w-3 h-3" /> {t}
            <button onClick={() => remove(t)} className="ml-1 hover:text-red-600"><X className="w-3 h-3"/></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
        />
        <button onClick={() => add()} className="rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50">Dodaj</button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button key={s} onClick={() => add(s)} className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 hover:bg-slate-100">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————
// FileThumb — thumbnail preview za slike i PDF (fallback: ekstenzija)
function FileThumb({ file, size = 40, rounded = "rounded" }) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const isImg = (file.type || "").startsWith("image/");
  const isPdf = (file.type === "application/pdf") || /\.pdf$/i.test(file.name || "");
  const ext = (file.name || "").split(".").pop()?.toUpperCase() || "FILE";
  return (
    <div className={`${rounded} overflow-hidden border border-slate-200 bg-white flex items-center justify-center`} style={{ width: size, height: size }}>
      {isImg && url ? (
        <img src={url} alt="" className="w-full h-full object-cover"/>
      ) : isPdf && url ? (
        <PdfThumb file={file} width={size} height={size} />
      ) : (
        <div className="text-[10px] font-medium text-slate-600">{ext}</div>
      )}
    </div>
  );
}

// PDF.js loader + render prve stranice u canvas thumbnail
async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  if (window.pdfjsLib?.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  return window.pdfjsLib;
}

function PdfThumb({ file, width = 80, height = 80 }) {
  const canvasRef = React.useRef(null);
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!url) return;
      try {
        const pdfjs = await ensurePdfJs();
        const pdf = await pdfjs.getDocument({ url }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(width / viewport.width, height / viewport.height);
        const v = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext("2d");
        canvas.width = v.width; canvas.height = v.height;
        await page.render({ canvasContext: ctx, viewport: v }).promise;
      } catch (e) {
        // fallback: ništa, ostavi prazno
      }
    })();
    return () => { cancelled = true; };
  }, [url, width, height]);

  return (
    <canvas ref={canvasRef} style={{ width, height }} className="block"/>
  );
}

function useObjectURL(file) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function RichPreview({ file }) {
  const url = useObjectURL(file);
  const isImg = (file?.type || "").startsWith("image/");
  const isPdf = (file?.type === "application/pdf") || /\.pdf$/i.test(file?.name || "");
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border border-slate-200 overflow-hidden" style={{ width: 120, height: 120 }}>
        {isImg && url ? (
          <img src={url} alt="preview" className="w-full h-full object-cover" />
        ) : isPdf && url ? (
          <PdfThumb file={file} width={120} height={120} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-6 h-6 opacity-60"/>
          </div>
        )}
      </div>
      <button onClick={() => { if (url) window.open(url, "_blank", "noopener,noreferrer"); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
        <FolderOpen className="w-4 h-4"/> Otvori
      </button>
    </div>
  );
}

// ————————————————————————————————————————————
// AssistantResultPopup - Popup za rezultat nakon slanja upita asistentu
function AssistantResultPopup({ open, onClose, onExpand }) {
  // Pomoćne stilizirane "slike" (SVG / CSS) — bez vanjskih asseta
  const Sketch = ({ w = 240, h = 140, seed = 0, label }) => {
    // generički "katalog"/"fotka"/"artikl" prikaz s gradijentom i crtama
    const g = [
      "linear-gradient(135deg,#d946ef,#22d3ee)",
      "linear-gradient(135deg,#8b5cf6,#22c55e)",
      "linear-gradient(135deg,#06b6d4,#f59e0b)",
      "linear-gradient(135deg,#ef4444,#f97316)",
    ][seed % 4];
    return (
      <div
        className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200"
        style={{ width: w, height: h, backgroundImage: g }}
      >
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 120 70" width="100%" height="100%">
            <rect x="5" y="8" width="110" height="54" rx="4" fill="#fff" opacity="0.4" />
            <line x1="10" y1="20" x2="110" y2="20" stroke="#fff" strokeWidth="2" opacity="0.7" />
            <line x1="10" y1="34" x2="110" y2="34" stroke="#fff" strokeWidth="2" opacity="0.7" />
            <line x1="10" y1="48" x2="110" y2="48" stroke="#fff" strokeWidth="2" opacity="0.7" />
          </svg>
        </div>
        {label && (
          <div className="absolute bottom-1 left-1 right-1 text-[11px] font-semibold text-white/95 drop-shadow-sm text-center">
            {label}
          </div>
        )}
      </div>
    );
  };

  const Chip = ({ children }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 border border-slate-200">
      {children}
    </span>
  );

  const CncIcon = ({ type = "slot" }) => {
    // stilizirani prikazi CNC obrada (rupa, prorez, upuštenje itd.)
    return (
      <div className="w-20 h-16 rounded-lg border border-slate-300 bg-white grid place-items-center">
        <svg viewBox="0 0 64 48" className="w-14 h-12">
          <rect x="4" y="4" width="56" height="40" rx="4" fill="#f8fafc" stroke="#94a3b8" />
          {type === "hole" && (
            <circle cx="32" cy="24" r="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          )}
          {type === "slot" && (
            <rect x="18" y="20" width="28" height="8" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          )}
          {type === "chamfer" && (
            <polygon points="4,4 60,4 60,32 40,44 4,44" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          )}
          {type === "milling" && (
            <path d="M10 30 H54 M24 14 V40 M40 14 V40" stroke="#64748b" strokeWidth="2" />
          )}
        </svg>
      </div>
    );
  };

  // demo podaci – izmišljeno
  const baseItem = {
    name: "Okov – Drška ALU 155",
    code: "AL-155-HND",
    short: "Ručka ALU, srebrna, univerzalna za sustave 55–75 mm.",
    tags: ["alu", "drška", "srebrna", "univerzalna"],
  };
  const alternatives = [
    { code: "AL-160-HND", name: "Ručka ALU 160", note: "duža osovina" },
    { code: "AL-155-INOX", name: "Ručka INOX 155", note: "inox, mat" },
    { code: "AL-155-BLK", name: "Ručka ALU 155 crna", note: "crni eloksal" },
    { code: "AL-140-HND", name: "Ručka ALU 140", note: "kompaktna" },
  ];
  const positions = [
    { proj: "Projekt A", pos: "PZ-01", qty: 12 },
    { proj: "Projekt A", pos: "PZ-07", qty: 4 },
    { proj: "Projekt B", pos: "P1-03", qty: 8 },
    { proj: "Projekt C", pos: "LO-12", qty: 2 },
  ];
  const positionPhotos = [
    { id: 1, label: "PZ-01 – interijer" },
    { id: 2, label: "PZ-01 – eksterijer" },
    { id: 3, label: "PZ-07 – detalj" },
    { id: 4, label: "P1-03 – hodnik" },
  ];
  const catalogPages = [
    "Str. 12 – Ručke ALU", "Str. 13 – Dimenzije", "Str. 18 – Primjene",
    "Str. 19 – Norme", "Str. 22 – Upute za montažu", "Str. 27 – Okovi kompatibilni",
  ];
  const cncOps = ["hole", "slot", "milling", "chamfer", "hole", "slot"];

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/70" onClick={onClose} />

          {/* Content */}
          <motion.div
            className="relative z-10 mx-auto mt-8 mb-6 w-[min(96vw,1400px)] h-[min(92vh,900px)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            initial={{ y: 20, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50/70">
              <div className="text-lg font-semibold">Asistent – prijedlozi i kontekst</div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-white"
              >
                Zatvori
              </button>
            </div>

            {/* BODY */}
            <div className="h-[calc(100%-96px)] overflow-y-auto p-5">
              {/* Gornja zona */}
              <div className="grid grid-cols-12 gap-5">
                {/* Lijevo: osnovni artikl */}
                <section className="col-span-12 lg:col-span-4">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <Sketch w={140} h={140} seed={0} label="Artikl – stilizirano" />
                      <div className="min-w-0">
                        <div className="font-semibold">{baseItem.name}</div>
                        <div className="text-xs text-slate-500">{baseItem.code}</div>
                        <p className="mt-2 text-sm text-slate-700">{baseItem.short}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {baseItem.tags.map((t) => (
                            <Chip key={t}>{t}</Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Sredina: zamjene */}
                <section className="col-span-12 lg:col-span-5">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="font-semibold mb-3">Potencijalne zamjene</div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {alternatives.map((a, i) => (
                        <div
                          key={a.code}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:shadow-sm"
                        >
                          <Sketch w={88} h={56} seed={i + 1} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{a.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{a.code}</div>
                            <div className="text-[12px] mt-0.5 text-slate-600">{a.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Desno: pozicije u projektima */}
                <section className="col-span-12 lg:col-span-3">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="font-semibold mb-3">Pozicije u projektima</div>
                    <div className="space-y-2">
                      {positions.map((p, i) => (
                        <div
                          key={`${p.proj}-${p.pos}-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 p-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-violet-500" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.proj}</div>
                            <div className="text-[11px] text-slate-500">Pozicija {p.pos}</div>
                          </div>
                          <div className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border">
                            {p.qty} kom
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* Donja zona */}
              <div className="grid grid-cols-12 gap-5 mt-5">
                {/* Dolje lijevo: "fotografije" pozicija */}
                <section className="col-span-12 lg:col-span-4">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="font-semibold mb-3">Fotografije pozicija</div>
                    <div className="grid grid-cols-2 gap-3">
                      {positionPhotos.map((ph, i) => (
                        <figure key={ph.id} className="rounded-lg border border-slate-200 p-2">
                          <Sketch w={120} h={80} seed={i} />
                          <figcaption className="text-[12px] mt-1 text-slate-600">{ph.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Dolje sredina: katalog stranice */}
                <section className="col-span-12 lg:col-span-5">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="font-semibold mb-3">Stranice iz kataloga</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {catalogPages.map((name, i) => (
                        <div key={name} className="rounded-lg border border-slate-200 p-2">
                          <Sketch w={100} h={70} seed={i + 2} />
                          <div className="text-[12px] mt-1 text-slate-600 truncate">{name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Dolje desno: CNC obrade */}
                <section className="col-span-12 lg:col-span-3">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="font-semibold mb-3">CNC obrade za artikl</div>
                    <div className="grid grid-cols-2 gap-3">
                      {cncOps.map((t, i) => (
                        <div key={`${t}-${i}`} className="text-center">
                          <CncIcon type={t} />
                          <div className="text-[12px] mt-1 text-slate-600 capitalize">
                            {t === "hole" ? "Rupa" : t === "slot" ? "Prorez" : t === "milling" ? "Glodanje" : "Fazeta"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* FOOTER – niska, široka tipka */}
            <div className="px-5 pb-5">
              <button
                onClick={onExpand}
                className="w-full h-10 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                Proširi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ————————————————————————————————————————————
// DropZone desno – drag&drop + lista odabranih datoteka + opis + tagovi + predaja u dump
function RightDumpPanel({ onSubmitBatch }) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]); // File[]
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState([]);

  const addFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    setFiles((prev) => [...prev, ...arr]);
  };

  const clear = () => { setFiles([]); setDesc(""); setTags([]); };

  const canSubmit = files.length > 0 && (desc.trim().length > 0 || tags.length > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Data dump</div>
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3"/> Obrada: 20:00h svaku večer
        </span>
      </div>

      <motion.label
        className={`flex-1 min-h-0 rounded-xl border-2 border-dashed ${dragOver ? "border-blue-400 bg-blue-50/40" : "border-slate-300"} p-4 text-center flex flex-col items-center justify-center cursor-pointer select-none`}
        htmlFor="dump-file-input"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      >
        <Upload className="w-8 h-8 mb-2 opacity-70" />
        <p className="text-sm font-medium">Povuci dokumente ovdje ili klikni</p>
        <p className="text-xs opacity-70">PDF, slike, tablice, sve što treba klasificirati</p>
        <input id="dump-file-input" type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </motion.label>

      <div className="mt-2 text-xs font-semibold text-red-600 text-center">
        U JEDNOJ TURI OD JEDNOG PROJEKTA. <span className="underline">BEZ MJEŠANJA PROJEKATA</span>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2 max-h-40 overflow-auto pr-1">
          {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="flex items-center gap-3 border border-slate-200 rounded-lg p-2 bg-white text-xs">
            <FileThumb file={f} size={36} rounded="rounded-md" />
            <div className="min-w-0">
              <div className="truncate" title={f.name}>{f.name}</div>
              <div className="text-[10px] opacity-60">{bytesPretty(f.size || 0)}</div>
            </div>
            <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="ml-auto p-1 rounded hover:bg-slate-100"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
        </div>
      )}

      {/* dno: opis + tagovi + gumbi */}
      <div className="mt-3 pt-3 border-t">
        <label className="text-xs opacity-70">Kratki opis</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="npr. Projekt A, pozicija PZ-01, reklamacija brtve ..."
          className="w-full mt-1 rounded-lg border border-slate-300 bg-white p-2 text-sm"
        />
        <div className="mt-3">
          <label className="text-xs opacity-70">Tagovi</label>
          <TagInput value={tags} onChange={setTags} />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            disabled={!canSubmit}
            onClick={() => { onSubmitBatch({ id: uid("batch"), files, desc: desc.trim(), tags, createdAt: new Date().toISOString() }); clear(); }}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm shadow-sm ${canSubmit ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500"}`}
            title={canSubmit ? "Predaj u dump" : "Dodaj barem jedan dokument i opis ili tag"}
          >
            <Send className="w-4 h-4"/> Predaj u dump
          </button>
          <button onClick={clear} className="rounded-lg px-3 py-2 text-sm border border-slate-300 hover:bg-slate-50">Očisti</button>
        </div>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————
// Simulacija noćne obrade → preporuke
function suggestDestination(fileName, tags = [], desc = "") {
  const txt = `${fileName} ${tags.join(" ")} ${desc}`.toLowerCase();
  const choices = [];
  if (/(reklam|kvar|nedostat)/.test(txt)) choices.push("Kvaliteta/Reklamacije");
  if (/(pozic|pz|p\-?\d+)/.test(txt)) choices.push("Projekt/Crteži/Po pozicijama");
  if (/(nacrt|dwg|dxf|pdf)/.test(txt)) choices.push("Projekt/Crteži");
  if (/(foto|slik|jpg|png)/.test(txt)) choices.push("Montaža/Fotodokumentacija");
  if (/(ponuda|narudžba|faktura|trošak)/.test(txt)) choices.push("Financije/Dokumenti");
  if (/(poprav|servis)/.test(txt)) choices.push("Servis/Popravci");
  if (!choices.length) choices.push("Opći spremnik/Za razvrstavanje");
  const suggestion = choices[0];
  const others = Array.from(new Set(choices.slice(1).concat(["Projekt/Dokumenti", "Nabava/Priloge", "Arhiva"]))).slice(0, 3);
  const confidence = Math.max(0.55, Math.min(0.95, 0.6 + (tags.includes("reklamacija") ? 0.15 : 0) + (/(pozic)/.test(txt) ? 0.05 : 0)));
  return { suggestion, options: others, confidence };
}

// ————————————————————————————————————————————
// Pregled jutarnjih preporuka (potvrdi / odbij)
function MorningReview({ items, onResolve, batchProjectMap, onProjectPicked }) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">Nema novih preporuka. 👍</div>
      )}
      {items.map((it) => (
        <div key={it.id} className="rounded-xl border border-slate-200 p-3 bg-white">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5"/>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-sm">{it.fileName}</div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">{(it.tags||[]).join(", ") || "bez tagova"}</span>
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{Math.round(it.confidence*100)}% povjerenje</span>
              </div>
              <div className="mt-2 text-sm">Predloženo mjesto: <span className="font-medium">{it.suggestion}</span></div>

              {/* Preview + Otvori */}
              {it.file && (
                <div className="mt-3">
                  <RichPreview file={it.file} />
                </div>
              )}

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onResolve(it.id, { action: "accept", destination: it.suggestion })}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white text-sm px-3 py-2 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4"/> Potvrdi
                </button>
                <RejectWithChain
                  it={it}
                  onResolve={onResolve}
                  defaultProject={batchProjectMap?.[it.batchId]}
                  onProjectPicked={(proj) => onProjectPicked(it.batchId, proj)}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RejectWithChain({ it, onResolve, defaultProject, onProjectPicked }) {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState(defaultProject || "");
  const [position, setPosition] = useState("");
  const [proc, setProc] = useState("");
  const [part, setPart] = useState("");

  useEffect(() => { setProject(defaultProject || ""); }, [defaultProject]);

  const pickOrCustom = (value, setter, label) => {
    if (value === "__custom__") {
      const v = prompt(`Upiši ${label}`);
      if (v) setter(v);
    } else setter(value);
  };

  const save = () => {
    const dest = [project, position, proc, part].filter(Boolean).join("/") || project;
    onResolve(it.id, { action: "reject", destination: dest });
    setOpen(false);
  };

  const canSave = (project || "").trim().length > 0; // projekt je obavezan

  return (
    <div className="flex-1">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Odbij i odredi gdje ide</button>
      ) : (
        <div className="w-full space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className="text-[11px] opacity-60">Projekt *</label>
              <select value={project} onChange={(e)=>{ const v=e.target.value; pickOrCustom(v, (val)=>{ setProject(val); onProjectPicked?.(val); }, "projekt"); }} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">– Odaberi –</option>
                {DEMO_PROJECTS.map((p)=> <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">➕ Drugo…</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] opacity-60">Pozicija</label>
              <select value={position} onChange={(e)=> pickOrCustom(e.target.value, setPosition, "poziciju")} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">– (opcionalno) –</option>
                {DEMO_POSITIONS.map((p)=> <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">➕ Drugo…</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] opacity-60">Proces</label>
              <select value={proc} onChange={(e)=> pickOrCustom(e.target.value, setProc, "proces")} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">– (opcionalno) –</option>
                {DEMO_PROCESSES.map((p)=> <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">➕ Drugo…</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] opacity-60">Komad</label>
              <select value={part} onChange={(e)=> pickOrCustom(e.target.value, setPart, "komad")} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">– (opcionalno) –</option>
                {DEMO_PARTS.map((p)=> <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">➕ Drugo…</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={!canSave} className={`rounded-lg px-3 py-2 text-sm ${canSave ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500"}`}>Spremi</button>
            <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm border border-slate-300 hover:bg-slate-50">Odustani</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————
// Glavni centralni input – čist, fokusiran, multiline + voice + prilozi
function CenterAssistant({ onSend }) {
  const [text, setText] = useState("");
  const [attached, setAttached] = useState([]); // File[]
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.interimResults = true;
    rec.lang = "hr-HR";
    rec.onresult = (e) => {
      let s = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        s += e.results[i][0].transcript;
      }
      setText((t) => (t.endsWith(" ") ? t + s : (t ? t + " " : "") + s));
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, []);

  const toggleVoice = () => {
    const rec = recRef.current;
    if (!rec) { alert("Govorno prepoznavanje nije dostupno u ovom pregledniku."); return; }
    if (listening) { try { rec.stop(); } catch {} setListening(false); }
    else { try { rec.start(); setListening(true); } catch {} }
  };

  const addFiles = (fl) => setAttached((a) => [...a, ...Array.from(fl || [])]);

  const canSend = text.trim().length > 0 || attached.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Pitaj asistenta… (Ctrl/Cmd+Enter za slanje)"
            className="w-full resize-none outline-none text-base leading-relaxed"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canSend) onSend({ text, files: attached }), setText(""), setAttached([]);
            }}
          />
          {attached.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attached.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 text-sm">
                  <FileThumb file={f} size={36} rounded="rounded-md"/>
                  <div className="min-w-0">
                    <div className="truncate" title={f.name}>{f.name}</div>
                    <div className="text-[11px] opacity-60">{bytesPretty(f.size || 0)}</div>
                  </div>
                  <button onClick={() => setAttached(attached.filter((_, idx) => idx !== i))} className="ml-auto p-1 rounded hover:bg-slate-100"><X className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t flex items-center gap-2">
          <button onClick={toggleVoice} className={`rounded-lg px-3 py-2 text-sm border ${listening ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 hover:bg-slate-50"}`}>
            {listening ? <><MicOff className="w-4 h-4 inline mr-2"/> Stop</> : <><Mic className="w-4 h-4 inline mr-2"/> Voice</>}
          </button>
          <label className="rounded-lg px-3 py-2 text-sm border border-slate-300 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-2">
            <Paperclip className="w-4 h-4"/> Dodaj dokumente
            <input type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
          <div className="ml-auto"/>
          <button
            disabled={!canSend}
            onClick={() => { onSend({ text, files: attached }); setText(""); setAttached([]); }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm ${canSend ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500"}`}
          >
            Pošalji <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————
// Glavni TabAsistent
export default function TabAsistent() {
  const [dump, setDump] = useState([]); // batch zapisi: {id, files[], desc, tags[], createdAt}
  const [recommendations, setRecommendations] = useState([]); // { id, fileName, tags, suggestion, options, confidence, file, batchId }
  const [showMorning, setShowMorning] = useState(false);
  const [batchProject, setBatchProject] = useState({});
  const [showResultPopup, setShowResultPopup] = useState(false);
  const setBatchProjectFor = (batchId, project) => setBatchProject((prev) => ({ ...prev, [batchId]: project }));

  // simuliraj noćnu obradu na klik (ili na vrijeme)
  const runOvernight = () => {
    const recs = [];
    dump.forEach((b) => {
      b.files.forEach((f) => {
        const s = suggestDestination(f.name, b.tags, b.desc);
        recs.push({ id: uid("rec"), fileName: f.name, tags: b.tags, ...s, batchId: b.id, file: f });
      });
    });
    setRecommendations(recs);
    setShowMorning(true);
  };

  const resolveRec = (recId, { action, destination }) => {
    setRecommendations((arr) => arr.filter((r) => r.id !== recId));
    // Ovdje bi backend učinio stvarni move i audit log
    console.log("Decision:", { recId, action, destination });
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 bg-[#f8fafc]">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 opacity-70"/>
          <h2 className="font-semibold text-lg">Tab asistent</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runOvernight} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">Testiraj preporuke sada</button>
          <button onClick={() => setShowMorning((v) => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">Jutarnje preporuke</button>
        </div>
      </div>

      {/* Layout: lijevo veliki input, desno dump */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Sredina – fokus na inputu */}
        <CenterAssistant onSend={(payload) => {
          console.log("Query to LLM:", payload);
          // Ovdje šalješ u svoj backend/LLM.
          // Prikaži popup s rezultatima
          setShowResultPopup(true);
        }} />

        {/* Desni dump panel */}
        <div className="h-full lg:sticky lg:top-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-[680px] flex flex-col">
            <RightDumpPanel onSubmitBatch={(batch) => setDump((d) => [batch, ...d])} />
          </div>

          {/* Log zadnjih predaja u dump */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold mb-3">Zadnje predaje</div>
            <div className="space-y-2 max-h-60 overflow-auto pr-1">
              {dump.length === 0 && <div className="text-sm text-slate-600">Još nema predaja.</div>}
              {dump.map((b) => (
                <div key={b.id} className="border border-slate-200 rounded-lg p-2">
                  <div className="text-xs opacity-70">{new Date(b.createdAt).toLocaleString()}</div>
                  <div className="text-sm font-medium truncate" title={b.desc || "(bez opisa)"}>{b.desc || "(bez opisa)"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(b.tags||[]).map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border">{t}</span>)}
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {b.files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs border border-slate-200 rounded p-1.5 bg-white">
                      <FileThumb file={f} size={28} rounded="rounded" />
                      <span className="truncate" title={f.name}>{f.name}</span>
                      <span className="ml-auto opacity-60">{bytesPretty(f.size || 0)}</span>
                    </div>
                  ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Jutarnje preporuke – drawer sekcija ispod */}
      <AnimatePresence>
        {showMorning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-7xl mx-auto mt-6"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-amber-500"/>
                <div className="font-semibold">Jutarnje preporuke (demo)</div>
              </div>
              <MorningReview items={recommendations} onResolve={resolveRec} batchProjectMap={batchProject} onProjectPicked={setBatchProjectFor} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant Result Popup */}
      <AssistantResultPopup 
        open={showResultPopup} 
        onClose={() => setShowResultPopup(false)}
        onExpand={() => {
          console.log("Expand clicked - implement full screen view");
          setShowResultPopup(false);
        }}
      />
    </div>
  );
}
