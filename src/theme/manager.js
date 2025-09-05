// Simple theme manager for applying one of the three preset themes
// Persists the current theme in localStorage under key 'app.theme'

export const ThemePresets = [
  { key: 'dark-fluent', className: 'theme-dark-fluent', label: 'Fluent Dark' },
  { key: 'light-contrast', className: 'theme-light-contrast', label: 'Contrast Light' },
  { key: 'openai', className: 'theme-openai', label: 'OpenAI' },
];

const STORAGE_KEY = 'app.theme';

export function applyThemeByClass(className) {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const html = document.documentElement;
  ThemePresets.forEach(t => {
    body.classList.remove(t.className);
    html.classList.remove(t.className);
  });
  body.classList.add(className);
  html.classList.add(className);
}

export function applyTheme(keyOrIndex) {
  const preset = typeof keyOrIndex === 'number'
    ? ThemePresets[(keyOrIndex + ThemePresets.length) % ThemePresets.length]
    : ThemePresets.find(t => t.key === keyOrIndex) || ThemePresets[0];

  applyThemeByClass(preset.className);
  try { localStorage.setItem(STORAGE_KEY, preset.key); } catch { /* ignore */ }
  try {
    const evt = new CustomEvent('theme:changed', { detail: { key: preset.key, className: preset.className } });
    window.dispatchEvent(evt);
  } catch { /* ignore */ }
  return preset;
}

export function initTheme(defaultKey = 'light-contrast') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return applyTheme(saved);
  } catch { /* ignore */ }
  return applyTheme(defaultKey);
}

export function cycleTheme() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const idx = ThemePresets.findIndex(t => t.key === current);
    return applyTheme((idx + 1) % ThemePresets.length);
  } catch {
    return applyTheme(0);
  }
}

export default { ThemePresets, applyTheme, initTheme, cycleTheme };
