import React, { useEffect, useState } from 'react';

export default function BackgroundLab() {
  const [source, setSource] = useState(() => {
    try { return localStorage.getItem('app.bg.source') || 'blobs'; } catch { return 'blobs'; }
  });
  const [anim, setAnim] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app.bg.animationsEnabled') || 'true'); } catch { return true; }
  });
  const [floating, setFloating] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app.bg.floating') || 'false'); } catch { return false; }
  });
  const [opacity, setOpacity] = useState(() => {
    try { return Number(localStorage.getItem('app.bg.opacity') || '0.14'); } catch { return 0.14; }
  });
  const [blur, setBlur] = useState(() => {
    try { return Number(localStorage.getItem('app.bg.blur') || '30'); } catch { return 30; }
  });
  const [preview, setPreview] = useState(() => {
    try { return localStorage.getItem('app.bg.current') || ''; } catch { return ''; }
  });

  useEffect(() => {
    localStorage.setItem('app.bg.source', source);
    window.dispatchEvent(new CustomEvent('bg:set-source', { detail: { source } }));
    if (source === 'screenshots' || source === 'fallback') window.dispatchEvent(new CustomEvent('bg:randomize'));
  }, [source]);

  useEffect(() => {
    localStorage.setItem('app.bg.animationsEnabled', JSON.stringify(anim));
    window.dispatchEvent(new CustomEvent('bg:set-animations', { detail: { enabled: anim } }));
  }, [anim]);

  useEffect(() => {
    localStorage.setItem('app.bg.floating', JSON.stringify(floating));
    window.dispatchEvent(new CustomEvent('bg:set-floating', { detail: { enabled: floating } }));
  }, [floating]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-bg-opacity', String(opacity));
    localStorage.setItem('app.bg.opacity', String(opacity));
  }, [opacity]);
  useEffect(() => {
    document.documentElement.style.setProperty('--app-bg-blur', `${blur}px`);
    localStorage.setItem('app.bg.blur', String(blur));
  }, [blur]);

  useEffect(() => {
    const t = setInterval(() => {
      try { const cur = localStorage.getItem('app.bg.current'); if (cur && cur !== preview) setPreview(cur); } catch {}
    }, 1000);
    return () => clearInterval(t);
  }, [preview]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Appearance</h1>
      <div className="panel p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Background source</div>
            <div className="text-subtle text-sm">Choose blobs, screenshots folder (random), or themed fallbacks.</div>
          </div>
          <select className="input-bg px-2 py-1 rounded-md" value={source} onChange={(e)=>setSource(e.target.value)}>
            <option value="blobs">Blobs (animated)</option>
            <option value="screenshots">Screenshots (random)</option>
            <option value="fallback">Fallback set</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Background animations</div>
            <div className="text-subtle text-sm">Disable if you want a static background.</div>
          </div>
          <input type="checkbox" checked={anim} onChange={(e) => setAnim(e.target.checked)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Floating images</div>
            <div className="text-subtle text-sm">Adds a few softly blurred tiles drifting in the background.</div>
          </div>
          <input type="checkbox" checked={floating} onChange={(e) => setFloating(e.target.checked)} />
        </div>
        <div>
          <label className="text-xs text-subtle">Image opacity: {opacity}</label>
          <input type="range" min="0" max="0.35" step="0.01" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-subtle">Glass blur (px): {blur}</label>
          <input type="range" min="10" max="60" step="1" value={blur} onChange={(e) => setBlur(Number(e.target.value))} />
        </div>
        <div className="flex gap-2">
          <button className="l-btn" onClick={() => window.dispatchEvent(new CustomEvent('bg:randomize'))}>Randomize now</button>
          <button className="l-btn l-btn--subtle" onClick={() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } }))}>Highlight test</button>
        </div>
        {preview && (
          <div className="mt-4">
            <div className="text-xs text-subtle mb-1">Current image preview</div>
            <div className="w-full h-32 rounded-lg border border-theme" style={{ backgroundImage:`url('${preview}')`, backgroundSize:'cover', backgroundPosition:'center' }} />
          </div>
        )}
      </div>
    </div>
  );
}
