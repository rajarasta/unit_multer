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
    '/backgrounds/fallback-dark-1.jpg',
    '/backgrounds/fallback-dark-2.jpg',
    '/backgrounds/fallback-dark-3.jpg',
  ],
  'light-contrast': [
    '/backgrounds/fallback-light-1.jpg',
    '/backgrounds/fallback-light-2.jpg',
    '/backgrounds/fallback-light-3.jpg',
  ],
  'openai': [
    '/backgrounds/fallback-openai-1.jpg',
    '/backgrounds/fallback-openai-2.jpg',
    '/backgrounds/fallback-openai-3.jpg',
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
