import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Hexagon, Activity, Sparkles, Move, Shuffle, Play, Pause, Eye, EyeOff,
  Square, Circle, Triangle, Heart, Star, ArrowRight, ArrowUp, Target, Loader,
  Zap, RefreshCw, Copy, Check, Command, Palette, Code2, Settings, LayoutGrid
} from 'lucide-react';
import { cycleTheme } from '../../../theme/manager';

const categories = [
  { id: 'chains', label: 'Chain Animations', icon: Layers },
  { id: 'morph', label: 'Morphing & Shapes', icon: Hexagon },
  { id: 'physics', label: 'Physics & Motion', icon: Activity },
  { id: 'glow', label: 'Glow Effects', icon: Sparkles },
  { id: 'gesture', label: 'Gestures', icon: Move },
  { id: 'random', label: 'Random Generator', icon: Shuffle }
];

const presetTransforms = {
  dataEntry: {
    name: 'Data Entry', icon: '📥', color: '#6366f1',
    config: { scale: [0, 1.1, 1], opacity: [0, 1], y: [-20, 0], duration: 0.5 }
  },
  taskComplete: {
    name: 'Task Complete', icon: '✅', color: '#10b981',
    config: { scale: [1, 1.2, 1], rotate: [0, 15, -15, 0], duration: 0.5 }
  },
  errorBounce: {
    name: 'Error Bounce', icon: '❌', color: '#ef4444',
    config: { x: [0, -10, 10, -10, 10, 0], scale: [1, 1.05, 1], duration: 0.5 }
  },
  notification: {
    name: 'Notification', icon: '🔔', color: '#8b5cf6',
    config: { scale: [0.8, 1.2, 1], rotate: [0, -20, 20, -10, 10, 0], duration: 0.6 }
  },
  focusHighlight: {
    name: 'Focus Highlight', icon: '🎯', color: '#ea580c',
    config: { scale: [1, 1.15, 1], duration: 0.8 }
  },
  warningPulse: {
    name: 'Warning Pulse', icon: '⚠️', color: '#f97316',
    config: { scale: [1, 1.1, 1], opacity: [1, 0.6, 1], duration: 1.5 }
  }
};

const getGlowColor = () => {
  const colors = ['#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const generateRandomChain = () => ({
  scale: Array.from({ length: 7 }, () => Math.random() * 2),
  rotate: Array.from({ length: 7 }, () => Math.random() * 720 - 360),
  x: Array.from({ length: 7 }, () => Math.random() * 100 - 50),
  duration: 3 + Math.random() * 2
});

const AnimationElement = ({ type = 'square', animation, settings, color }) => {
  const { enableGlow, glowIntensity, animationSpeed, isPlaying } = settings;
  const glowColor = useMemo(() => color || getGlowColor(), [color]);

  const shapes = { square: Square, circle: Circle, triangle: Triangle, heart: Heart, star: Star, hexagon: Hexagon };
  const ShapeComponent = shapes[type] || Square;

  const { duration, transition, ...animateProps } = animation;
  const baseTransition = { duration: (duration || 1) / animationSpeed, ease: 'easeInOut', repeat: isPlaying ? Infinity : 0 };
  const finalTransition = { ...baseTransition, ...transition };

  return (
    <motion.div
      className="w-20 h-20 relative flex items-center justify-center"
      style={{ color: glowColor, filter: enableGlow ? `drop-shadow(0 0 ${glowIntensity / 3}px ${glowColor})` : 'none' }}
      animate={animateProps}
      transition={finalTransition}
    >
      {enableGlow && (
        <motion.div
          className="absolute w-[150%] h-[150%] rounded-full -z-10"
          style={{ background: `radial-gradient(circle, ${glowColor}30 0%, transparent 60%)` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      <ShapeComponent className="w-full h-full" fill={glowColor} />
    </motion.div>
  );
};

const ChainsPreview = ({ settings, setSnippetConfig }) => {
  const [selectedPreset, setSelectedPreset] = useState(Object.keys(presetTransforms)[0]);
  const preset = presetTransforms[selectedPreset];
  useEffect(() => { setSnippetConfig(preset.config); }, [selectedPreset]);
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-primary">Preset Transform Patterns</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(presetTransforms).map(([key, p]) => (
          <button key={key} onClick={() => setSelectedPreset(key)}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-4 text-left input-bg ${selectedPreset === key ? 'shadow-xl ring-2 ring-offset-2' : 'shadow-md'}`}
            style={{ borderColor: p.color }}>
            <span className="text-2xl">{p.icon}</span>
            <span className="font-medium text-primary">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="panel p-6 rounded-xl border-theme">
        <p className="text-md font-semibold mb-6 text-subtle">Live Preview: {preset.name}</p>
        <div className="flex justify-center items-center min-h-[150px]">
          <AnimationElement key={selectedPreset} type="square" animation={preset.config} settings={settings} color={preset.color} />
        </div>
      </div>
    </div>
  );
};

const MorphPreview = ({ settings, setSnippetConfig }) => {
  const { isPlaying, animationSpeed } = settings;
  const shapes = ['square', 'circle', 'triangle', 'heart', 'star', 'hexagon'];
  useEffect(() => { setSnippetConfig({ rotate: 360, scale: [1, 1.3, 1], duration: 5, transition: { rotate: { duration: 5, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' } } }); }, []);
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-primary">Shape Morphing & Rotation</h3>
      <div className="panel p-10 rounded-xl flex justify-around items-center flex-wrap gap-8 border-theme">
        {shapes.map((shape) => (
          <motion.div key={shape} animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ rotate: { duration: 5 / animationSpeed, repeat: Infinity, ease: 'linear' } }}>
            <AnimationElement type={shape} animation={{ scale: isPlaying ? [1, 1.3, 1] : 1, duration: 3 }} settings={settings} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const PhysicsPreview = ({ settings, setSnippetConfig }) => {
  const { isPlaying, animationSpeed, enableGlow, glowIntensity } = settings;
  const bounceEase = [0.6, 0.05, 0.4, 0.95];
  useEffect(() => { setSnippetConfig({ y: [20, 320, 20], duration: 2, transition: { ease: bounceEase } }); }, []);
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-primary">Physics-Based Animations</h3>
      <div className="panel h-[400px] relative rounded-xl overflow-hidden border-theme">
        <motion.div className="absolute left-[20%] w-16 h-16 bg-indigo-500 rounded-full"
          style={{ boxShadow: enableGlow ? `0 0 ${glowIntensity / 2}px #6366f1` : '0 4px 8px rgba(0,0,0,0.2)' }}
          animate={{ y: isPlaying ? [20, 320, 20] : 20 }} transition={{ y: { duration: 2 / animationSpeed, repeat: Infinity, ease: bounceEase } }} />

        <motion.div className="absolute right-[20%] top-0 w-0.5 h-48 bg-gray-500" style={{ transformOrigin: 'top center' }}
          animate={{ rotate: isPlaying ? [30, -30, 30] : 0 }} transition={{ duration: 2.5 / animationSpeed, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="absolute bottom-[-30px] left-[-30px] w-16 h-16 bg-purple-500 rounded-full"
            style={{ boxShadow: enableGlow ? `0 0 ${glowIntensity / 2}px #8b5cf6` : '0 4px 8px rgba(0,0,0,0.2)' }} />
        </motion.div>
      </div>
    </div>
  );
};

const GlowPreview = ({ settings, setSnippetConfig }) => {
  const { isPlaying, animationSpeed, glowIntensity } = settings;
  useEffect(() => { setSnippetConfig({ boxShadow: [`0 0 ${glowIntensity}px #color`, `0 0 ${glowIntensity * 2}px #color`, `0 0 ${glowIntensity}px #color`], duration: 1.5 }); }, [glowIntensity]);
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-primary">Advanced Glow Effects</h3>
      <div className="panel p-10 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-12 border-theme">
        <div className="text-center">
          <p className="text-sm mb-4 text-subtle">Pulse</p>
          <motion.div className="w-20 h-20 mx-auto bg-red-500 rounded-xl"
            animate={{ boxShadow: isPlaying ? [`0 0 ${glowIntensity}px #ef4444`, `0 0 ${glowIntensity * 2}px #ef4444`, `0 0 ${glowIntensity}px #ef4444`] : `0 0 ${glowIntensity}px #ef4444` }}
            transition={{ duration: 1.5 / animationSpeed, repeat: Infinity }} />
        </div>
        <div className="text-center">
          <p className="text-sm mb-4 text-subtle">Rainbow Cycle</p>
          <motion.div className="w-20 h-20 mx-auto bg-indigo-500 rounded-full"
            animate={{ boxShadow: isPlaying ? [
              `0 0 ${glowIntensity * 1.5}px #ef4444`, `0 0 ${glowIntensity * 1.5}px #f59e0b`,
              `0 0 ${glowIntensity * 1.5}px #10b981`, `0 0 ${glowIntensity * 1.5}px #06b6d4`,
              `0 0 ${glowIntensity * 1.5}px #8b5cf6`, `0 0 ${glowIntensity * 1.5}px #ef4444`
            ] : `0 0 ${glowIntensity * 1.5}px #6366f1` }} transition={{ duration: 5 / animationSpeed, repeat: Infinity }} />
        </div>
        <div className="text-center">
          <p className="text-sm mb-4 text-subtle">Breathe</p>
          <motion.div className="w-20 h-20 mx-auto bg-emerald-500 rounded-full"
            animate={{ scale: isPlaying ? [1, 1.1, 1] : 1, boxShadow: isPlaying ? [`0 0 ${glowIntensity * 0.5}px #10b981`, `0 0 ${glowIntensity * 1.8}px #10b981`, `0 0 ${glowIntensity * 0.5}px #10b981`] : `0 0 ${glowIntensity}px #10b981` }}
            transition={{ duration: 3 / animationSpeed, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="text-center">
          <p className="text-sm mb-4 text-subtle">Electric</p>
          <motion.div className="w-20 h-20 mx-auto bg-amber-400 rounded-lg"
            animate={{ boxShadow: isPlaying ? [
              `0 0 ${glowIntensity}px #fbbf24, 0 0 ${glowIntensity * 2}px #fbbf24`,
              `0 0 ${glowIntensity * 0.5}px #fbbf24, 0 0 ${glowIntensity}px #fbbf24`,
              `0 0 ${glowIntensity * 1.5}px #fbbf24, 0 0 ${glowIntensity * 3}px #fbbf24`,
              `0 0 ${glowIntensity * 0.2}px #fbbf24, 0 0 ${glowIntensity * 0.5}px #fbbf24`,
              `0 0 ${glowIntensity}px #fbbf24, 0 0 ${glowIntensity * 2}px #fbbf24`
            ] : `0 0 ${glowIntensity}px #fbbf24` }} transition={{ duration: 0.3 / animationSpeed, repeat: Infinity }} />
        </div>
      </div>
    </div>
  );
};

const GesturePreview = ({ settings, setSnippetConfig }) => {
  const { isPlaying, animationSpeed } = settings;
  useEffect(() => { setSnippetConfig({ x: [0, 200, 0], opacity: [1, 0, 1], duration: 2, transition: { repeatDelay: 0.5 } }); }, []);
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-primary">Gesture Animations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel p-6 rounded-xl overflow-hidden border-theme">
          <p className="text-sm mb-4 font-medium text-subtle">Swipe Right (Dismiss)</p>
          <motion.div className="w-full h-16 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-medium"
            animate={{ x: isPlaying ? [0, 200, 0] : 0, opacity: isPlaying ? [1, 0, 1] : 1 }} transition={{ duration: 2 / animationSpeed, repeat: Infinity, repeatDelay: 0.5 }}>
            <ArrowRight size={24} />
          </motion.div>
        </div>
        <div className="panel p-6 rounded-xl overflow-hidden border-theme">
          <p className="text-sm mb-4 font-medium text-subtle">Swipe Up (Action)</p>
          <motion.div className="w-full h-16 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-medium"
            animate={{ y: isPlaying ? [0, -40, 0] : 0, scale: isPlaying ? [1, 0.9, 1] : 1 }} transition={{ duration: 1.5 / animationSpeed, repeat: Infinity, repeatDelay: 0.5 }}>
            <ArrowUp size={24} />
          </motion.div>
        </div>
        <div className="panel p-6 rounded-xl border-theme">
          <p className="text-sm mb-4 font-medium text-subtle">Tap Effect (Ripple)</p>
          <motion.div className="w-16 h-16 mx-auto bg-purple-500 rounded-full flex items-center justify-center text-white relative" animate={{ scale: isPlaying ? [1, 0.9, 1] : 1 }} transition={{ duration: 0.3 / animationSpeed, repeat: Infinity, repeatDelay: 1.5 }}>
            <Target size={24} />
            {isPlaying && (
              <motion.div className="absolute w-full h-full border-2 border-purple-500 rounded-full" animate={{ scale: [1, 2.5], opacity: [1, 0] }} transition={{ duration: 1 / animationSpeed, repeat: Infinity, delay: 0.3, repeatDelay: 1.2 }} />
            )}
          </motion.div>
        </div>
        <div className="panel p-6 rounded-xl border-theme">
          <p className="text-sm mb-4 font-medium text-subtle">Long Press (Processing)</p>
          <div className="w-16 h-16 mx-auto bg-amber-500 rounded-xl flex items-center justify-center text-white">
            <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 2 / animationSpeed, repeat: Infinity, ease: 'linear' }}>
              <Loader size={24} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RandomPreview = ({ settings, setSnippetConfig }) => {
  const { isPlaying, animationSpeed, enableGlow, glowIntensity } = settings;
  const [randomSeed, setRandomSeed] = useState(Date.now());
  const animation = useMemo(() => generateRandomChain(), [randomSeed]);
  useEffect(() => { setSnippetConfig(animation); }, [animation]);
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-primary">Random Chain Generator</h3>
      <div className="panel p-10 rounded-xl flex flex-col items-center border-theme">
        <motion.div key={randomSeed} className="w-24 h-24 bg-indigo-500 rounded-xl flex items-center justify-center text-white text-3xl font-bold"
          style={{ boxShadow: enableGlow ? `0 0 ${glowIntensity}px #6366f1` : '0 4px 6px rgba(0,0,0,0.1)' }}
          animate={animation} transition={{ duration: animation.duration / animationSpeed, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}>
          <Zap />
        </motion.div>
        <button onClick={() => setRandomSeed(Date.now())} className="mt-8 px-6 py-2 bg-accent text-white rounded-lg font-medium flex items-center gap-2 transition duration-200 hover:opacity-90">
          <RefreshCw size={16} />
          Generate New Chain
        </button>
      </div>
    </div>
  );
};

function formatObjectPretty(obj) {
  return JSON.stringify(obj, (key, value) => (Array.isArray(value) ? `[${value.join(', ')}]` : value), 2)
    .replace(/"(\[.*?\])"/g, '$1').replace(/"([^"\n]+)":/g, '$1:');
}

function formatCodeSnippet(config, settings) {
  if (!config) return '// Select an animation to view the code.';
  const { duration, transition, ...animateProps } = config;
  const effectiveDuration = (duration || 1) / settings.animationSpeed;
  const transitionObj = { duration: Number(effectiveDuration.toFixed(2)), repeat: 'Infinity', ease: 'easeInOut', ...(transition || {}) };
  const glowIntensity = settings.glowIntensity;
  const glowStyle = settings.enableGlow ? `style={{ filter: 'drop-shadow(0 0 ${(glowIntensity / 3).toFixed(1)}px #yourColor)' }}` : '';
  return `\n<motion.div\n  ${glowStyle}\n  animate=${formatObjectPretty(animateProps)}\n  transition=${formatObjectPretty(transitionObj).replace(/"Infinity"/g, 'Infinity')}\n/>`;
}

function Sidebar({ activeCategory, setActiveCategory }) {
  return (
    <nav className="panel sidebar-panel w-64 p-5 flex flex-col h-full rounded-2xl">
      <div className="flex items-center gap-3 mb-8 px-3">
        <Command className="text-accent w-6 h-6" />
        <h1 className="text-xl font-bold text-primary">Showcase</h1>
      </div>
      <div className="space-y-2 flex-grow">
        {categories.map((cat) => {
          const Icon = cat.icon; const isActive = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`nav-link flex items-center gap-3 p-3 rounded-lg w-full text-left font-medium ${isActive ? 'active-nav-link' : 'text-secondary'}`}>
              <Icon size={20} />
              {cat.label}
            </button>
          );
        })}
      </div>
      <div className="pt-4 border-t border-theme">
        <button onClick={() => cycleTheme()} className="nav-link flex items-center gap-3 p-3 rounded-lg w-full text-left font-medium text-subtle">
          <Palette size={20} />
          Promijeni stil
        </button>
      </div>
    </nav>
  );
}

function ControlPanel({ settings, setSettings, snippetConfig }) {
  const { isPlaying, animationSpeed, glowIntensity, enableGlow } = settings;
  const togglePlay = () => setSettings((s) => ({ ...s, isPlaying: !s.isPlaying }));
  const toggleGlow = () => setSettings((s) => ({ ...s, enableGlow: !s.enableGlow }));
  const setSpeed = (e) => setSettings((s) => ({ ...s, animationSpeed: parseFloat(e.target.value) }));
  const setIntensity = (e) => setSettings((s) => ({ ...s, glowIntensity: parseInt(e.target.value) }));
  const [isCopied, setIsCopied] = useState(false);
  const formattedCode = useMemo(() => formatCodeSnippet(snippetConfig, settings), [snippetConfig, settings]);
  const copyToClipboard = () => { navigator.clipboard.writeText(formattedCode).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }); };
  return (
    <div className="panel w-96 p-5 flex flex-col h-full rounded-2xl">
      <h2 className="text-lg font-semibold mb-5 text-primary flex items-center gap-2"><Settings size={20} />Controls & Parameters</h2>
      <div className="space-y-6 mb-8">
        <div className="flex gap-4">
          <button onClick={togglePlay} className={`flex-1 p-3 rounded-lg flex items-center justify-center gap-2 font-medium transition duration-200 ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={toggleGlow} className={`p-3 rounded-lg flex items-center justify-center gap-2 font-medium transition duration-200 input-bg ${enableGlow ? 'text-amber-400' : 'text-subtle'}`}>
            {enableGlow ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block text-subtle">Animation Speed: {animationSpeed.toFixed(1)}x</label>
          <input type="range" min="0.1" max="3" step="0.1" value={animationSpeed} onChange={setSpeed} />
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block text-subtle">Glow Intensity: {glowIntensity}</label>
          <input type="range" min="0" max="100" value={glowIntensity} onChange={setIntensity} disabled={!enableGlow} />
        </div>
      </div>
      <h2 className="text-lg font-semibold mb-4 text-primary flex items-center gap-2"><Code2 size={20} />Code Snippet (Framer Motion)</h2>
      <div className="flex-grow relative input-bg rounded-lg overflow-hidden">
        <textarea className="w-full h-full p-4 text-xs resize-none bg-transparent focus:outline-none text-secondary" value={formattedCode} readOnly />
        <button onClick={copyToClipboard} className="absolute top-3 right-3 p-2 rounded-md bg-accent text-white transition duration-200 hover:opacity-90">
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

function Canvas({ activeCategory, settings, setSnippetConfig }) {
  const previews = { chains: ChainsPreview, morph: MorphPreview, physics: PhysicsPreview, glow: GlowPreview, gesture: GesturePreview, random: RandomPreview };
  const PreviewComponent = previews[activeCategory] || (() => <div className="text-subtle">Select a category</div>);
  return (
    <main className="flex-1 flex flex-col">
      <div className="panel flex-1 rounded-2xl p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeCategory} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <PreviewComponent settings={settings} setSnippetConfig={setSnippetConfig} />
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function AnimationPlaygroundV2() {
  const [activeCategory, setActiveCategory] = useState('chains');
  const [settings, setSettings] = useState({ isPlaying: true, animationSpeed: 1, glowIntensity: 50, enableGlow: true });
  const [snippetConfig, setSnippetConfig] = useState(null);
  const themeNames = [
    { className: 'theme-dark-fluent', label: 'Fluent Dark' },
    { className: 'theme-light-contrast', label: 'Contrast Light' },
    { className: 'theme-openai', label: 'OpenAI Style' }
  ];
  const [currentThemeIdx, setCurrentThemeIdx] = useState(0);
  const nextTheme = () => { setCurrentThemeIdx((v) => (v + 1) % themeNames.length); cycleTheme(); };
  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  return (
    <div className="p-6 h-full flex flex-col">
      <header className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-4">
          <LayoutGrid className="w-6 h-6 text-subtle" />
          <h2 className="text-2xl font-bold text-primary">{activeCategoryData.label}</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={nextTheme} className="panel p-2 rounded-full nav-link text-subtle" title="Toggle Theme">
            <Palette size={20} />
          </button>
        </div>
      </header>
      <div className="flex gap-6 flex-1 overflow-hidden min-h-[540px]">
        <Sidebar activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
        <Canvas activeCategory={activeCategory} settings={settings} setSnippetConfig={setSnippetConfig} />
        <ControlPanel settings={settings} setSettings={setSettings} snippetConfig={snippetConfig} />
      </div>
    </div>
  );
}

