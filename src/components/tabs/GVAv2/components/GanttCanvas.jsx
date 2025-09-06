import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Mic, Send } from 'lucide-react';

// Local date helpers (kept here to avoid cross-file coupling)
const fromYmd = (s) => new Date(`${s}T00:00:00Z`);
const diffDays = (a, b) => {
  if (!a || !b) return 0;
  const d1 = fromYmd(a), d2 = fromYmd(b);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};
const rangeDays = (from, to) => {
  if (!from || !to) return [];
  const out = [];
  let cur = fromYmd(from), end = fromYmd(to);
  while (cur <= end) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
  return out;
};

export default function GanttCanvas({ ganttJson, activeLineId, setActiveLineId, pendingActions }) {
  const [isListening, setIsListening] = useState(false);
  const [ganttVisible, setGanttVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');

  const { dateRange, lines } = useMemo(() => {
    if (!ganttJson?.pozicije) return { dateRange: {}, lines: [] };
    const jsonLines = ganttJson.pozicije.map(p => ({
      id: p.id,
      pozicija_id: p.id,
      label: p.naziv,
      start: p.montaza.datum_pocetka,
      end: p.montaza.datum_zavrsetka,
      duration_days: diffDays(p.montaza.datum_pocetka, p.montaza.datum_zavrsetka) + 1,
      osoba: p.montaza.osoba,
      opis: p.montaza.opis
    }));
    const all = jsonLines.flatMap(l => [l.start, l.end]).filter(Boolean).sort();
    if (!all.length) return { dateRange: {}, lines: jsonLines };
    return { dateRange: { from: all[0], to: all[all.length - 1] }, lines: jsonLines };
  }, [ganttJson]);

  const days = useMemo(() => rangeDays(dateRange.from, dateRange.to), [dateRange]);
  const totalDays = days.length || 1;

  // Voice recognition for "gantt" wake word
  useEffect(() => {
    if (!isListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'hr-HR';

    const onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
      }
      if (finalText) {
        const text = finalText.trim().toLowerCase();
        setTranscript(text);
        if (/\bgantt\b/.test(text) || /\bgant\b/.test(text)) {
          setGanttVisible(true);
          setIsListening(false);
          try { setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } })), 0); } catch {}
        }
      }
    };

    rec.onresult = onresult;
    rec.onerror = () => {};
    rec.start();

    return () => { try { rec.stop(); } catch {} };
  }, [isListening]);

  const startListening = () => {
    setIsListening(true);
    setTranscript('');
  };

  const handleTextSearch = () => {
    if (textInput.trim()) {
      const searchText = textInput.trim().toLowerCase();
      if (searchText.includes('gantt') || searchText.includes('gant')) {
        setGanttVisible(true);
        try { setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } })), 0); } catch {}
      }
      // TODO: implement search for gantt elements
      console.log('Searching for:', searchText);
    }
  };

  if (!ganttVisible) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-subtle p-8 w-full max-w-md">
          <div className="cursor-pointer mb-6" onClick={startListening}>
            <motion.div animate={isListening ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}>
              <Mic className="w-16 h-16 mx-auto mb-4 opacity-30" />
            </motion.div>
            <p className="text-lg mb-2">Gantt Dijagram</p>
            <p className="text-sm mb-4">{isListening ? 'Slušam... Recite "gantt"' : 'Kliknite za glasovnu aktivaciju'}</p>
            {transcript && (
              <div className="text-xs text-secondary bg-gray-100 rounded px-3 py-1 inline-block mb-4">{transcript}</div>
            )}
          </div>
          <div className="w-full">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter' && textInput.trim()) { handleTextSearch(); setTextInput(''); } }}
                placeholder="Upišite 'gantt' ili pretražite elemente..."
                className="flex-1 p-3 rounded-lg input-bg border border-theme text-sm text-primary placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={() => { handleTextSearch(); setTextInput(''); }}
                disabled={!textInput.trim()}
                className="px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lines.length) return <div className="panel flex-1 rounded-2xl flex items-center justify-center text-subtle">Učitavanje podataka...</div>;

  const barColors = [
    'from-indigo-500 to-purple-600',
    'from-sky-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600'
  ];

  return (
    <div className="panel flex-1 rounded-2xl overflow-hidden flex flex-col">
      <div className="p-6 border-b border-theme flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">{ganttJson.project.name}</h2>
          <p className="text-sm text-subtle mt-1">{ganttJson.project.description}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-secondary">
          <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4"/> {dateRange.from} – {dateRange.to}</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: `280px repeat(${totalDays}, 45px)` }}>
          <div className="text-sm font-semibold sticky top-0 left-0 z-30 panel px-6 py-3 border-b border-theme">Pozicija</div>
          {days.map((d) => {
            const dateObj = fromYmd(d);
            const dayNum = dateObj.getUTCDate();
            const dayName = dateObj.toLocaleDateString('hr-HR', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
            return (
              <div key={d} className="text-xs text-center py-3 sticky top-0 z-10 panel border-b border-l gantt-grid-line border-theme">
                <div className="font-bold text-sm text-primary">{dayNum}</div>
                <div className="text-subtle">{dayName}</div>
              </div>
            );
          })}

          {lines.map((ln, idx) => {
            const startIdx = Math.max(0, diffDays(dateRange.from, ln.start));
            const span = ln.duration_days;
            const isActive = ln.id === activeLineId;
            const barColor = barColors[idx % barColors.length];
            return (
              <React.Fragment key={ln.id}>
                <div
                  className={`px-6 py-2 text-sm sticky left-0 z-20 panel border-t border-theme flex flex-col justify-center h-12 cursor-pointer transition-shadow ${isActive ? 'ring-2 ring-inset ring-accent' : ''}`}
                  onClick={() => setActiveLineId(ln.id)}
                >
                  <div className="font-medium text-primary truncate" title={ln.label}>{ln.label}</div>
                  <div className="text-xs text-subtle mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 input-bg rounded-md text-xs">{ln.pozicija_id}</span>
                    <span>{ln.osoba}</span>
                  </div>
                </div>

                <div className="relative col-span-full grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 45px)`, gridColumnStart: 2 }}>
                  {days.map((d) => (<div key={`${ln.id}-${d}`} className="h-12 border-t border-l gantt-grid-line border-theme"/>))}

                  <motion.div
                    data-bar-id={ln.id}
                    className={`absolute top-1 h-10 rounded-lg shadow-xl bg-gradient-to-r ${barColor} flex items-center pl-3 pr-3 text-white cursor-pointer ${isActive ? 'gantt-bar-active' : ''}`}
                    style={{ gridColumnStart: startIdx + 1, gridColumnEnd: startIdx + 1 + span, width: `calc(${span * 45}px - 8px)`, left: '4px' }}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onMouseEnter={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const x = r.left + r.width / 2; const y = r.top + r.height / 2;
                      try { window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { x, y, radius: Math.max(r.width, r.height), durationMs: 900 } })); } catch {}
                      try { if (window.__gvaFocusAssignAlias) window.__gvaFocusAssignAlias(ln.id); } catch {}
                    }}
                    onClick={() => setActiveLineId(ln.id)}
                  >
                    {/* === Alias Badge Container === */}
                    {/* Content and visibility controlled by index.jsx via DOM manipulation. 'hidden' class is initial state. */}
                    <span className="alias-badge hidden mr-3 px-2 py-1 rounded bg-white/30 text-xs font-bold shadow-sm"></span>
                    
                    {/* Container for bar text */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                       <span className="text-xs font-medium truncate block leading-tight">{ln.label}</span>
                       <span className="text-xs opacity-80 leading-tight">{ln.duration_days} {ln.duration_days === 1 ? 'dan' : 'dana'}</span>
                    </div>
                  </motion.div>

                  {/* === Ghost Preview Logic === */}
                  {/* Show only actions that have defined ISO (move/shift/move_start) */}
                  {pendingActions && pendingActions.filter(a => a.lineId === ln.id && a.iso).map((a) => {
                    
                    const newStart = a.iso;
                    const newStartIdx = Math.max(0, diffDays(dateRange.from, newStart));
                    
                    // Calculate duration for preview (if changing, e.g., set_range)
                    let previewSpan = span;
                    if (a.type === 'set_range' && a.end) {
                        previewSpan = diffDays(a.start, a.end) + 1;
                    } else if (a.type === 'set_duration' && a.days) {
                        previewSpan = a.days;
                    }

                    const newEndIdx = newStartIdx + previewSpan;
                    
                    return (
                      <div
                        key={`ghost-${a.id}`}
                        className="absolute top-1 h-10 rounded-lg border-2 border-dashed border-amber-400/80 bg-amber-200/30 pointer-events-none"
                        style={{ gridColumnStart: newStartIdx + 1, gridColumnEnd: newEndIdx + 1, width: `calc(${previewSpan * 45}px - 8px)`, left: '4px' }}
                        title={`Preview: ${a.iso}`}
                      />
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

