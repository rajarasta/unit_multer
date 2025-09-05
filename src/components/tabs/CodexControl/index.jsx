import { useEffect, useMemo, useState } from 'react';
import { 
  Settings, BookOpen, FileText, Save, CheckCircle, RefreshCcw, Edit3,
  AlertCircle
} from 'lucide-react';
import { useCodexConfigStore } from '../../../store/useCodexConfigStore';

const SubTab = {
  POSTAVKE: 'postavke',
  UPUTE: 'upute',
  DOKUMENTI: 'dokumenti',
};

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      className="border rounded px-3 py-2 text-slate-800 bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const defaultDocs = [
  '/docs/okvir-dizajna-inteligentne-platforme.md',
  '/README.md',
  '/CLAUDE.md',
  '/LLM_SERVER_MANAGER_README.md',
  '/PDF_AGENT_README.md',
  '/PDF_SEARCH_ENGINE_README.md',
  '/CUDA_TROUBLESHOOTING.md',
  '/GPT5_RESPONSES_API_REFERENCE.md',
  '/docs/codex/CODEX_INSTRUKCIJE.md',
];

async function fetchText(path) {
  const res = await fetch(`${path}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Greška pri čitanju: ${path}`);
  return await res.text();
}

async function saveDoc(path, content) {
  const base = 'http://localhost:3001';
  const res = await fetch(`${base}/api/docs/save`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || 'Spremanje nije uspjelo');
  }
  return await res.json();
}

export default function CodexControlTab() {
  const cfg = useCodexConfigStore();
  const [active, setActive] = useState(SubTab.POSTAVKE);
  const [toast, setToast] = useState(null);

  // Documents
  const [docList, setDocList] = useState(defaultDocs);
  const [selectedDoc, setSelectedDoc] = useState(defaultDocs[0]);
  const [docContent, setDocContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Load selected doc content
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDoc(true);
      setLoadError(null);
      try {
        const text = await fetchText(selectedDoc);
        if (!cancelled) setDocContent(text);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    }
    if (active === SubTab.DOKUMENTI && selectedDoc) load();
    return () => { cancelled = true; };
  }, [active, selectedDoc]);

  // Instructions body (rendered in UPUTE subtab)
  const instructions = useMemo(() => `Inicijalizacija i Ponašanje Kodeksa
- Kontekst: chat + datoteke u radnom folderu (Repo). Nema trajne memorije.
- Alati: shell (naredbe), apply_patch (izmjene datoteka), update_plan (plan/TODO).
- Politike: filesystem full-access, network enabled, approvals: never.
- Ponašanje: sažet output, kratke najave prije naredbi, plan za višekoračne zadatke.
- Sigurnost: bez destruktivnih radnji bez eksplicitne upute.

Što Čitam Prvo
- Dokument vodilja: AGENTS.md (ako postoji) ili dogovor u chatu.
- Arhitektura/proizvod: docs/, design/, adr/ (npr. docs/okvir-dizajna-inteligentne-platforme.md).
- Osnove repo‑a: README.md, CONTRIBUTING.md, CHANGELOG.md.
- Build/test: package.json skripte, docker-compose.yml, .env.example, CI config.
- API specifikacije: openapi*/swagger*, Postman kolekcije, generirani tipovi.

Procjena Stanja API‑ja
- Spec/kontrakti: openapi.* za mapiranje endpointa.
- Rute/kontroleri: routes/*, controllers/*, urls.py, anotacije (@Get/@RestController).
- Testovi: proći postojeće API testove; po dogovoru pokrenuti smoke subset.
- Skripte: npm run dev/start/test/lint.
- Brza verifikacija: health endpoint i 1–2 ključna poziva (curl/fetch) uz dogovor.

Modovi Rada (odabir po potrebi)
- Lean: bez skeniranja koda; rad po uputi i ciljanim datotekama.
- Standard: ključni dokumenti + skripte, bez pokretanja sustava.
- Deep: mape ruta, testovi i ovisnosti; plan + rani rizici.
- API‑focused: specifikacija + rute + testovi; mali smoke set.

Session Flags (podešavanje)
- discovery: none|min|standard|deep
- docs_priority: popis putanja ili kategorija (npr. “instrukcijski dokumenti”)
- run_tests: auto|on-request|never
- plan: on|off (vidljiv TODO/plan)
- changes: read-only|allowed
- verbosity: low|normal|high
- stack_hint: kratak opis stacka (npr. “Node/Express”) ili “none”

Zadani Profil (prema ovoj konfiguraciji)
- discovery: deep
- docs_priority: instrukcijski dokumenti
- run_tests: on-request
- plan: on
- changes: allowed
- verbosity: high
- stack_hint: none

Kickoff Primjer
- Mode: deep
- docs_priority: docs/okvir-dizajna-inteligentne-platforme.md, README.md
- run_tests: on-request
- changes: allowed
- plan: on
- stack_hint: none

Dnevni Start (preporučeni tok)
1) Pokreni aplikaciju (Dev). 2) Otvori Codex Control tab. 3) Postavi/confirm postavke i Spremi. 4) Otvori VS Code i pokreni Codex. 5) Kreni s razvojem (API/feature) prema Uputama.
`, []);

  const onSaveConfig = () => {
    // config is auto-persisted by zustand persist middleware
    setToast({ type: 'success', msg: 'Postavke su spremljene i primijenjene.' });
    setTimeout(() => setToast(null), 2500);
  };

  const onSaveDoc = async () => {
    try {
      setSavingDoc(true);
      await saveDoc(selectedDoc, docContent);
      setToast({ type: 'success', msg: 'Dokument spremljen.' });
    } catch (e) {
      setToast({ type: 'error', msg: e.message || 'Greška pri spremanju.' });
    } finally {
      setSavingDoc(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const Snapshot = () => {
    const snap = cfg.snapshot();
    return (
      <pre className="bg-slate-50 rounded border p-3 text-xs text-slate-700 overflow-auto">{JSON.stringify(snap, null, 2)}</pre>
    );
  };

  return (
    <div className="p-4">
      {/* Subtabs */}
      <div className="flex gap-2 mb-4">
        <button
          className={`inline-flex items-center gap-2 px-3 py-2 rounded border ${active === SubTab.POSTAVKE ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'}`}
          onClick={() => setActive(SubTab.POSTAVKE)}
        >
          <Settings className="w-4 h-4" /> Postavke
        </button>
        <button
          className={`inline-flex items-center gap-2 px-3 py-2 rounded border ${active === SubTab.UPUTE ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'}`}
          onClick={() => setActive(SubTab.UPUTE)}
        >
          <BookOpen className="w-4 h-4" /> Upute
        </button>
        <button
          className={`inline-flex items-center gap-2 px-3 py-2 rounded border ${active === SubTab.DOKUMENTI ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'}`}
          onClick={() => setActive(SubTab.DOKUMENTI)}
        >
          <FileText className="w-4 h-4" /> Dokumenti
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Content */}
      {active === SubTab.POSTAVKE && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <SectionHeader icon={Settings} title="Podešavanje suradnje" subtitle="Konfiguriraj kako će se Codex ponašati u ovoj sesiji" />
            <Labeled label="discovery">
              <Select
                value={cfg.discovery}
                onChange={(v) => cfg.setConfig({ discovery: v })}
                options={[
                  { value: 'none', label: 'none' },
                  { value: 'min', label: 'min' },
                  { value: 'standard', label: 'standard' },
                  { value: 'deep', label: 'deep' },
                ]}
              />
            </Labeled>
            <Labeled label="docs_priority">
              <input className="border rounded px-3 py-2" value={cfg.docs_priority} onChange={(e) => cfg.setConfig({ docs_priority: e.target.value })} />
            </Labeled>
            <Labeled label="run_tests">
              <Select
                value={cfg.run_tests}
                onChange={(v) => cfg.setConfig({ run_tests: v })}
                options={[
                  { value: 'auto', label: 'auto' },
                  { value: 'on-request', label: 'on-request' },
                  { value: 'never', label: 'never' },
                ]}
              />
            </Labeled>
            <Labeled label="plan">
              <Select
                value={cfg.plan}
                onChange={(v) => cfg.setConfig({ plan: v })}
                options={[{ value: 'on', label: 'on' }, { value: 'off', label: 'off' }]}
              />
            </Labeled>
            <Labeled label="changes">
              <Select
                value={cfg.changes}
                onChange={(v) => cfg.setConfig({ changes: v })}
                options={[{ value: 'allowed', label: 'allowed' }, { value: 'read-only', label: 'read-only' }]}
              />
            </Labeled>
            <Labeled label="verbosity">
              <Select
                value={cfg.verbosity}
                onChange={(v) => cfg.setConfig({ verbosity: v })}
                options={[{ value: 'low', label: 'low' }, { value: 'normal', label: 'normal' }, { value: 'high', label: 'high' }]}
              />
            </Labeled>
            <Labeled label="stack_hint">
              <input className="border rounded px-3 py-2" value={cfg.stack_hint} onChange={(e) => cfg.setConfig({ stack_hint: e.target.value })} placeholder="npr. Node/Express ili none" />
            </Labeled>
            <div className="flex gap-2">
              <button onClick={onSaveConfig} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 text-white">
                <Save className="w-4 h-4" /> Potvrdi i spremi
              </button>
              <button onClick={cfg.resetDefaults} className="inline-flex items-center gap-2 px-4 py-2 rounded border">
                <RefreshCcw className="w-4 h-4" /> Reset na zadane
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader icon={BookOpen} title="Trenutni profil" subtitle="Pregled aktivnih postavki (možeš kopirati kao kickoff)" />
            <Snapshot />
          </div>
        </div>
      )}

      {active === SubTab.UPUTE && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionHeader icon={BookOpen} title="Upute za rad s Codexom" subtitle="Detaljne smjernice i zadane postavke" />
            <pre className="bg-white border rounded p-4 text-sm leading-5 whitespace-pre-wrap text-slate-800">{instructions}</pre>
          </div>
          <div className="space-y-2">
            <SectionHeader icon={Settings} title="Aktivni sažetak" subtitle="Brzi pregled trenutnih flagova" />
            <Snapshot />
          </div>
        </div>
      )}

      {active === SubTab.DOKUMENTI && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <SectionHeader icon={FileText} title="Instrukcijski dokumenti" subtitle="Brzi pristup bez file pickera" />
            <div className="flex flex-wrap gap-2">
              {docList.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedDoc(p)}
                  className={`text-left text-xs px-3 py-2 rounded border ${selectedDoc === p ? 'bg-indigo-50 border-indigo-300' : 'bg-white'}`}
                  title={p}
                >
                  {p.replace(/^\/+/, '')}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <SectionHeader icon={Edit3} title="Pregled/Uređivanje" subtitle={selectedDoc} />
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 flex items-center gap-2">
                  <input type="checkbox" checked={isEditing} onChange={(e) => setIsEditing(e.target.checked)} />
                  Uredi
                </label>
                <button
                  disabled={!isEditing || savingDoc}
                  onClick={onSaveDoc}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded ${isEditing ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                >
                  <Save className="w-4 h-4" /> Spremi
                </button>
              </div>
            </div>
            {loadingDoc ? (
              <div className="text-sm text-slate-500">Učitavanje...</div>
            ) : loadError ? (
              <div className="text-sm text-rose-600">{loadError}</div>
            ) : isEditing ? (
              <textarea
                className="w-full min-h-[400px] border rounded p-3 font-mono text-sm"
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
              />
            ) : (
              <pre className="bg-white border rounded p-3 text-xs leading-5 whitespace-pre-wrap text-slate-800 min-h-[400px] overflow-auto">{docContent}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

