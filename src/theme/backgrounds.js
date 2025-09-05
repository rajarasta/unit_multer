// Background presets and helpers

export const BackgroundPresets = {
  blobs: { key: 'blobs', type: 'blobs' },
  screenshots: { key: 'screenshots', type: 'screenshots' },
  floorplan: { key: 'floorplan', type: 'image', image: '/backgrounds/floorplan.jpg' },
  glass: { key: 'glass', type: 'image', image: '/backgrounds/glass-building.jpg' },
  cad: { key: 'cad', type: 'image', image: '/backgrounds/cad-wireframe.jpg' },
};

export const ThemeFallbacks = {
  'dark-fluent': [
    '/backgrounds/fallback-dark-1.svg',
    '/backgrounds/fallback-dark-2.svg',
    '/backgrounds/fallback-dark-3.svg',
  ],
  'light-contrast': [
    '/backgrounds/fallback-light-1.svg',
    '/backgrounds/fallback-light-2.svg',
    '/backgrounds/fallback-light-3.svg',
  ],
  'openai': [
    '/backgrounds/fallback-openai-1.svg',
    '/backgrounds/fallback-openai-2.svg',
    '/backgrounds/fallback-openai-3.svg',
  ],
};

export function getDefaultForTheme(themeKey) {
  // Map themes to default background preset
  switch (themeKey) {
    case 'light-contrast':
      return BackgroundPresets.blobs;
    case 'openai':
      return BackgroundPresets.blobs;
    case 'dark-fluent':
    default:
      return BackgroundPresets.blobs;
  }
}

export function getRandomFallbackUrl(themeKey) {
  const pool = ThemeFallbacks[themeKey] || ThemeFallbacks['dark-fluent'];
  const i = Math.floor(Math.random() * pool.length);
  return pool[i];
}

export default { BackgroundPresets, ThemeFallbacks, getDefaultForTheme, getRandomFallbackUrl };
