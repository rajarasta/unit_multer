import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDefaultForTheme, getRandomFallbackUrl } from '../../theme/backgrounds';

const STORAGE_KEY = 'app.bgPreset';

function useThemeKey() {
  const [key, setKey] = useState(() => {
    try { return localStorage.getItem('app.theme') || 'light-contrast'; } catch { return 'light-contrast'; }
  });
  useEffect(() => {
    const onChange = (e) => setKey(e?.detail?.key || 'light-contrast');
    window.addEventListener('theme:changed', onChange);
    return () => window.removeEventListener('theme:changed', onChange);
  }, []);
  return key;
}

export default function AppBackground() {
  const themeKey = useThemeKey();
  const [preset, setPreset] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
  });
  const [animations, setAnimations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app.bg.animationsEnabled') || 'true'); } catch { return true; }
  });
  const [imageUrl, setImageUrl] = useState(null);
  const rafRef = useRef(null);
  const [hl, setHl] = useState({ show: false, x: 0.5, y: 0.5, radius: 420 });
  const [floating, setFloating] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app.bg.floating') || 'false'); } catch { return false; }
  });
  const [tiles, setTiles] = useState([]); // urls for floating tiles

  // Reset to theme default when theme changes (respect user chosen source)
  useEffect(() => {
    const def = getDefaultForTheme(themeKey);
    // New enum source takes precedence
    let source = 'blobs';
    try { source = localStorage.getItem('app.bg.source') || 'blobs'; } catch {}
    if (source === 'screenshots') setPreset({ key: 'screenshots', type: 'screenshots' });
    else if (source === 'fallback') setPreset({ key: 'fallback', type: 'fallback' });
    else setPreset(def);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(def)); } catch {}
  }, [themeKey]);

  // Helper to verify image exists before applying
  function preload(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // If preset requests screenshots, fetch random from API
  useEffect(() => {
    let active = true;
    async function loadRandom() {
      try {
        const res = await fetch('/api/bg/random');
        const data = await res.json();
        if (!active) return;
        if (data?.ok && data.url) {
          const ok = await preload(data.url);
          if (active && ok) setImageUrl(data.url); else setImageUrl(null);
        } else {
          const fallback = getRandomFallbackUrl(themeKey);
          const ok = await preload(fallback);
          if (active && ok) setImageUrl(fallback); else setImageUrl(null);
          // Disable screenshots source to avoid repeated failing calls
          try { localStorage.setItem('app.bg.source', 'blobs'); } catch {}
        }
      } catch {
        const fallback = getRandomFallbackUrl(themeKey);
        const ok = await preload(fallback);
        if (active && ok) setImageUrl(fallback); else setImageUrl(null);
        // Disable screenshots source to avoid repeated failing calls
        try { localStorage.setItem('app.bg.source', 'blobs'); } catch {}
      }
    }
    if (preset?.key === 'screenshots' || preset?.type === 'screenshots') {
      loadRandom();
    } else if (preset?.type === 'fallback') {
      (async () => { const url = getRandomFallbackUrl(themeKey); const ok = await preload(url); if (active && ok) setImageUrl(url); else setImageUrl(null); })();
    } else if (preset?.type === 'image') {
      (async () => { const ok = await preload(preset.image); if (active && ok) setImageUrl(preset.image); else setImageUrl(null); })();
    } else {
      setImageUrl(null);
    }
    return () => { active = false; };
  }, [preset, themeKey]);

  // Persist current image for preview consumers
  useEffect(() => {
    try { if (imageUrl) localStorage.setItem('app.bg.current', imageUrl); } catch {}
  }, [imageUrl]);

  // Mouse move subtle parallax
  useEffect(() => {
    if (!animations) return;
    const handler = (e) => {
      const { innerWidth: w, innerHeight: h } = window;
      const x = (e.clientX / w - 0.5) * 8; // -4..4
      const y = (e.clientY / h - 0.5) * 8;
      document.documentElement.style.setProperty('--blob-parallax-x', `${x.toFixed(2)}px`);
      document.documentElement.style.setProperty('--blob-parallax-y', `${y.toFixed(2)}px`);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [animations]);

  // Public API via events: randomize now, toggle animations, set source, highlight
  useEffect(() => {
    const onRandomize = () => setPreset({ key: 'screenshots', type: 'screenshots' });
    const onHighlight = (e) => {
      if (!animations) return;
      const d = e?.detail || {};
      let { x, y, radius } = d;
      radius = Number(radius) || 420;
      if (d.selector) {
        const el = document.querySelector(d.selector);
        if (el) {
          const r = el.getBoundingClientRect();
          x = r.left + r.width / 2;
          y = r.top + r.height / 2;
          radius = d.radius || Math.max(r.width, r.height) * 1.2;
        }
      }
      if (typeof x !== 'number' || typeof y !== 'number') { x = window.innerWidth / 2; y = window.innerHeight / 2; }
      document.documentElement.style.setProperty('--hl-x', `${x}px`);
      document.documentElement.style.setProperty('--hl-y', `${y}px`);
      document.documentElement.style.setProperty('--hl-r', `${radius}px`);
      setHl({ show: true, x, y, radius });
      const dur = Number(d.durationMs) || 1200;
      clearTimeout(rafRef.current);
      rafRef.current = setTimeout(() => setHl((h) => ({ ...h, show: false })), dur);
    };
    const onSetSource = (e) => {
      const source = (e?.detail?.source || 'blobs');
      try { localStorage.setItem('app.bg.source', source); } catch {}
      if (source === 'screenshots') setPreset({ key: 'screenshots', type: 'screenshots' });
      else if (source === 'fallback') setPreset({ key: 'fallback', type: 'fallback' });
      else setPreset(getDefaultForTheme(themeKey));
    };
    const onToggle = (e) => {
      const val = Boolean(e?.detail?.enabled);
      setAnimations(val);
      try { localStorage.setItem('app.bg.animationsEnabled', JSON.stringify(val)); } catch {}
    };
    const onFloating = (e) => {
      const val = Boolean(e?.detail?.enabled);
      setFloating(val);
      try { localStorage.setItem('app.bg.floating', JSON.stringify(val)); } catch {}
    };
    window.addEventListener('bg:randomize', onRandomize);
    window.addEventListener('bg:highlight', onHighlight);
    window.addEventListener('bg:set-source', onSetSource);
    window.addEventListener('bg:set-animations', onToggle);
    window.addEventListener('bg:set-floating', onFloating);
    return () => {
      window.removeEventListener('bg:randomize', onRandomize);
      window.removeEventListener('bg:highlight', onHighlight);
      window.removeEventListener('bg:set-source', onSetSource);
      window.removeEventListener('bg:set-animations', onToggle);
      window.removeEventListener('bg:set-floating', onFloating);
    };
  }, [themeKey, animations]);

  // Apply persisted CSS vars (even if tab not visited)
  useEffect(() => {
    try {
      const op = Number(localStorage.getItem('app.bg.opacity') || '0.14');
      const bl = Number(localStorage.getItem('app.bg.blur') || '30');
      document.documentElement.style.setProperty('--app-bg-opacity', String(op));
      document.documentElement.style.setProperty('--app-bg-blur', `${bl}px`);
    } catch {}
  }, []);

  const isImage = !!imageUrl;

  return (
    <div className="app-bg" aria-hidden>
      {/* Image layer with glassmorphism blur (optional) */}
      {isImage && (
        <div
          className="app-bg__image"
          style={{ backgroundImage: `url('${imageUrl}')` }}
        />
      )}
      {/* Animated blobs layer */}
      <div className={`app-bg__blobs ${animations ? '' : 'app-bg--noanim'}`}>
        <div id="blob1" className="blob blob1" />
        <div id="blob2" className="blob blob2" />
        <div id="blob3" className="blob blob3" />
        {floating && (
          <>
            <div className="app-bg__tile t1" style={{ backgroundImage: `url('${getRandomFallbackUrl(themeKey)}')` }} />
            <div className="app-bg__tile t2" style={{ backgroundImage: `url('${getRandomFallbackUrl(themeKey)}')` }} />
            <div className="app-bg__tile t3" style={{ backgroundImage: `url('${getRandomFallbackUrl(themeKey)}')` }} />
          </>
        )}
      </div>
      {/* Subtle gradient vignette for focus */}
      <div className="app-bg__vignette" />
      {/* Highlight lens */}
      <div className={`app-bg__highlight ${hl.show ? 'is-visible' : ''}`} />
    </div>
  );
}
