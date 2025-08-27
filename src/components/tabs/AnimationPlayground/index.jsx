import theme from '@al/theme';
const { colors, fontStack } = theme;
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

export default function MobileAnimationTab  ()  {
  const [activeCategory, setActiveCategory] = useState('chains');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState(null);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [glowIntensity, setGlowIntensity] = useState(50);
  const [enableGlow, setEnableGlow] = useState(true);
  const [randomSeed, setRandomSeed] = useState(0);
  const containerRef = useRef(null);

  // Animation categories
  const categories = [
    { id: 'chains', label: 'Chain Animations', icon: Layers },
    { id: 'morph', label: 'Morphing', icon: Hexagon },
    { id: 'physics', label: 'Physics', icon: Activity },
    { id: 'glow', label: 'Glow Effects', icon: Sparkles },
    { id: 'gesture', label: 'Gestures', icon: Move },
    { id: 'random', label: 'Random', icon: Shuffle }
  ];

  // Preset Transform Patterns - 15 standard operations
  const presetTransforms = {
    // Entry Animations
    dataEntry: {
      name: 'ðŸ“ Data Entry',
      icon: 'ðŸ“',
      color: '#6366f1',
      sequence: [
        { scale: [0, 1.1, 1], opacity: [0, 1], duration: 0.4 },
        { y: [-20, 0], duration: 0.4 }
      ]
    },
    
    // Success/Complete Animations
    taskComplete: {
      name: 'âœ… Task Complete',
      icon: 'âœ…',
      color: '#10b981',
      sequence: [
        { scale: [1, 1.2, 1], duration: 0.3 },
        { rotate: [0, 15, -15, 0], duration: 0.4 },
        { y: [0, -10, 0], duration: 0.3 }
      ]
    },
    
    // Error Animations
    errorBounce: {
      name: 'âŒ Error Bounce',
      icon: 'âŒ',
      color: '#ef4444',
      sequence: [
        { x: [0, -10, 10, -10, 10, 0], duration: 0.5 },
        { scale: [1, 1.05, 1], duration: 0.5 }
      ]
    },
    
    // Loading States
    loadingTransform: {
      name: 'âš¡ Loading Transform',
      icon: 'âš¡',
      color: '#f59e0b',
      sequence: [
        { rotate: [0, 360], duration: 1 },
        { scale: [1, 0.8, 1], duration: 1 },
        { opacity: [1, 0.5, 1], duration: 1 }
      ]
    },
    
    // Notification
    notification: {
      name: 'ðŸ”” Notification',
      icon: 'ðŸ””',
      color: '#8b5cf6',
      sequence: [
        { scale: [0.8, 1.2, 1], duration: 0.4 },
        { rotate: [0, -20, 20, -20, 20, 0], duration: 0.6 }
      ]
    },
    
    // Delete/Remove
    deleteItem: {
      name: 'ðŸ—‘ï¸ Delete Item',
      icon: 'ðŸ—‘ï¸',
      color: '#dc2626',
      sequence: [
        { scale: [1, 1.1, 0], duration: 0.4 },
        { opacity: [1, 0], duration: 0.4 },
        { rotate: [0, 180], duration: 0.4 }
      ]
    },
    
    // Save Animation
    saveProgress: {
      name: 'ðŸ’¾ Save Progress',
      icon: 'ðŸ’¾',
      color: '#059669',
      sequence: [
        { y: [0, -5, 0], duration: 0.3 },
        { scale: [1, 0.95, 1.05, 1], duration: 0.4 }
      ]
    },
    
    // Refresh/Update
    refreshData: {
      name: 'ðŸ”„ Refresh Data',
      icon: 'ðŸ”„',
      color: '#0891b2',
      sequence: [
        { rotate: [0, 360, 720], duration: 1 },
        { scale: [1, 0.9, 1], duration: 0.5 }
      ]
    },
    
    // Expand/Collapse
    expandCollapse: {
      name: 'ðŸ“‚ Expand/Collapse',
      icon: 'ðŸ“‚',
      color: '#7c3aed',
      sequence: [
        { scaleY: [1, 0, 1], duration: 0.4 },
        { opacity: [1, 0.3, 1], duration: 0.4 }
      ]
    },
    
    // Highlight/Focus
    focusHighlight: {
      name: 'ðŸŽ¯ Focus Highlight',
      icon: 'ðŸŽ¯',
      color: '#ea580c',
      sequence: [
        { scale: [1, 1.15, 1], duration: 0.5 },
        { opacity: [0.7, 1, 0.7], duration: 1 }
      ]
    },
    
    // Send/Submit
    sendMessage: {
      name: 'ðŸ“¤ Send Message',
      icon: 'ðŸ“¤',
      color: '#2563eb',
      sequence: [
        { x: [0, 20, 100], opacity: [1, 0.8, 0], duration: 0.5 },
        { scale: [1, 0.9, 0.8], duration: 0.5 }
      ]
    },
    
    // Receive/Incoming
    receiveData: {
      name: 'ðŸ“¥ Receive Data',
      icon: 'ðŸ“¥',
      color: '#16a34a',
      sequence: [
        { x: [-100, 0], opacity: [0, 1], duration: 0.5 },
        { scale: [0.8, 1.1, 1], duration: 0.3 }
      ]
    },
    
    // Processing/Working
    processing: {
      name: 'âš™ï¸ Processing',
      icon: 'âš™ï¸',
      color: '#6b7280',
      sequence: [
        { rotate: [0, 180, 360], duration: 2 },
        { scale: [1, 1.1, 1, 1.1, 1], duration: 2 }
      ]
    },
    
    // Warning/Alert
    warningPulse: {
      name: 'âš ï¸ Warning Pulse',
      icon: 'âš ï¸',
      color: '#f97316',
      sequence: [
        { scale: [1, 1.2, 1, 1.2, 1], duration: 1 },
        { opacity: [1, 0.6, 1, 0.6, 1], duration: 1 }
      ]
    },
    
    // Success Checkmark
    successCheck: {
      name: 'âœ¨ Success Check',
      icon: 'âœ¨',
      color: '#14b8a6',
      sequence: [
        { scale: [0, 1.3, 1], duration: 0.4 },
        { rotate: [0, -10, 10, 0], duration: 0.3 },
        { y: [0, -15, 0], duration: 0.4 }
      ]
    }
  };

  // Keep the original animation chains for the chains category
  const animationChains = {
    bounceExpand: {
      name: 'Bounce & Expand',
      sequence: [
        { scale: [1, 1.2, 0.9, 1.3, 0.95, 1.4, 1], duration: 2 },
        { rotate: [0, 10, -10, 15, -15, 20, 0], duration: 2 },
        { x: [0, 0, 0, 0, 0, 0, 300], duration: 0.5 }
      ]
    },
    pulseCollapse: {
      name: 'Pulse & Collapse',
      sequence: [
        { scale: [1, 1.5, 1.4, 1.3, 1.2, 1.1, 1, 0.5, 0], duration: 3 },
        { opacity: [1, 0.8, 0.9, 0.7, 0.8, 0.6, 0.7, 0.3, 0], duration: 3 }
      ]
    },
    spiralOut: {
      name: 'Spiral Out',
      sequence: [
        { rotate: [0, 360, 720, 1080], duration: 2 },
        { scale: [1, 0.8, 0.6, 0], duration: 2 },
        { x: [0, 50, 100, 200], y: [0, -50, -100, -200], duration: 2 }
      ]
    },
    elasticToggle: {
      name: 'Elastic Toggle',
      sequence: [
        { scaleX: [1, 1.5, 0.5, 1.2, 0.8, 1], duration: 1.5 },
        { scaleY: [1, 0.5, 1.5, 0.8, 1.2, 1], duration: 1.5 },
        { rotate: [0, 180, 360], duration: 1 }
      ]
    },
    chaosMode: {
      name: 'Chaos Mode',
      sequence: [
        { scale: [1, 2, 0.5, 3, 0.2, 1.5, 0], duration: 3 },
        { rotate: [0, 180, -270, 450, -90, 360, 720], duration: 3 },
        { x: [0, -100, 200, -150, 100, -50, 300], duration: 3 }
      ]
    }
  };

  // Generate random animation chain
  const generateRandomChain = () => {
    const randomScale = Array.from({ length: 7 }, () => Math.random() * 2);
    const randomRotate = Array.from({ length: 7 }, () => Math.random() * 360 - 180);
    const randomX = Array.from({ length: 7 }, () => Math.random() * 200 - 100);
    
    return {
      scale: randomScale,
      rotate: randomRotate,
      x: randomX,
      duration: 2 + Math.random() * 2
    };
  };

  // Glow colors based on intensity
  const getGlowColor = () => {
    const colors = ['#ff4444', '#ff8800', '#4444ff', '#a855f7', '#06b6d4', '#10b981'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Animation element component
  const AnimationElement = ({ type, animation, index }) => {
    const [glowColor] = useState(getGlowColor());
    
    const shapes = {
      square: <Square className="w-full h-full" />,
      circle: <Circle className="w-full h-full" />,
      triangle: <Triangle className="w-full h-full" />,
      heart: <Heart className="w-full h-full" />,
      star: <Star className="w-full h-full" />,
      hexagon: <Hexagon className="w-full h-full" />
    };

    return (
      <motion.div
        style={{
          width: '80px',
          height: '80px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6366f1',
          filter: enableGlow ? `drop-shadow(0 0 ${glowIntensity}px ${glowColor})` : 'none'
        }}
        animate={animation}
        transition={{
          duration: animation.duration / animationSpeed,
          ease: "easeInOut",
          repeat: isPlaying ? Infinity : 0
        }}
      >
        {/* Glow background effect */}
        {enableGlow && (
          <motion.div
            style={{
              position: 'absolute',
              width: '120%',
              height: '120%',
              background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
              borderRadius: '50%',
              zIndex: -1
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity
            }}
          />
        )}
        {shapes[type] || shapes.square}
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          Animation Playground
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Test and experiment with advanced animation chains and effects
        </p>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '8px',
        padding: '0 20px',
        marginBottom: '20px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: activeCategory === cat.id ? '#6366f1' : 'white',
                color: activeCategory === cat.id ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Controls Panel */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        margin: '0 20px 20px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Speed Control */}
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Animation Speed: {animationSpeed}x
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#e5e7eb',
                outline: 'none'
              }}
            />
          </div>

          {/* Glow Intensity */}
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Glow Intensity: {glowIntensity}px
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={glowIntensity}
              onChange={(e) => setGlowIntensity(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#e5e7eb',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              flex: 1,
              minWidth: '100px',
              padding: '10px',
              backgroundColor: isPlaying ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={() => setRandomSeed(Date.now())}
            style={{
              flex: 1,
              minWidth: '100px',
              padding: '10px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <Shuffle size={16} />
            Randomize
          </button>

          <button
            onClick={() => setEnableGlow(!enableGlow)}
            style={{
              flex: 1,
              minWidth: '100px',
              padding: '10px',
              backgroundColor: enableGlow ? '#f59e0b' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {enableGlow ? <Eye size={16} /> : <EyeOff size={16} />}
            Glow {enableGlow ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Animation Display Area */}
      <div style={{
        backgroundColor: 'white',
        margin: '0 20px 20px',
        borderRadius: '12px',
        padding: '20px',
        minHeight: '300px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {activeCategory === 'chains' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Preset Transform Patterns
            </h3>
            
            {/* Preset Configurations Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '32px'
            }}>
              {Object.entries(presetTransforms).map(([key, preset]) => (
                <motion.button
                  key={key}
                  onClick={() => setSelectedAnimation(key)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedAnimation === key ? preset.color : 'white',
                    color: selectedAnimation === key ? 'white' : '#374151',
                    border: `2px solid ${preset.color}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{preset.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{preset.name.replace(preset.icon, '').trim()}</span>
                </motion.button>
              ))}
            </div>

            {/* Preview Area for Selected Preset */}
            {selectedAnimation && presetTransforms[selectedAnimation] && (
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                  Preview: {presetTransforms[selectedAnimation].name}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '120px'
                }}>
                  <AnimationElement
                    type="square"
                    animation={presetTransforms[selectedAnimation].sequence[0]}
                    index={0}
                  />
                </div>
              </div>
            )}

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', marginTop: '32px' }}>
              Advanced Chain Animations
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '20px'
            }}>
              {Object.entries(animationChains).map(([key, chain]) => (
                <div
                  key={key}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
                    {chain.name}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    minHeight: '100px',
                    alignItems: 'center'
                  }}>
                    <AnimationElement
                      type="square"
                      animation={chain.sequence[0]}
                      index={0}
                    />
                  </div>
                  <button
                    onClick={() => setSelectedAnimation(key)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      backgroundColor: selectedAnimation === key ? '#6366f1' : '#e5e7eb',
                      color: selectedAnimation === key ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'morph' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Shape Morphing
            </h3>
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              padding: '40px 20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              {['square', 'circle', 'triangle', 'heart', 'star', 'hexagon'].map((shape, index) => (
                <motion.div
                  key={shape}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    rotate: isPlaying ? 360 : 0
                  }}
                  transition={{
                    delay: index * 0.1,
                    duration: 1,
                    rotate: {
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }
                  }}
                >
                  <AnimationElement
                    type={shape}
                    animation={{
                      scale: isPlaying ? [1, 1.2, 1] : 1,
                      duration: 2
                    }}
                    index={index}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'physics' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Physics-Based Animations
            </h3>
            <div style={{
              height: '300px',
              position: 'relative',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {/* Bouncing Ball */}
              <motion.div
                style={{
                  position: 'absolute',
                  left: '20%',
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#6366f1',
                  borderRadius: '50%',
                  boxShadow: enableGlow ? `0 0 ${glowIntensity}px #6366f1` : '0 2px 4px rgba(0,0,0,0.2)'
                }}
                animate={{
                  y: isPlaying ? [0, 200, 0] : 0
                }}
                transition={{
                  y: {
                    duration: 1.5 / animationSpeed,
                    repeat: Infinity,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }
                }}
              />

              {/* Pendulum */}
              <motion.div
                style={{
                  position: 'absolute',
                  right: '20%',
                  top: '0',
                  width: '2px',
                  height: '150px',
                  backgroundColor: '#374151',
                  transformOrigin: 'top center'
                }}
                animate={{
                  rotate: isPlaying ? [45, -45, 45] : 0
                }}
                transition={{
                  duration: 2 / animationSpeed,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-29px',
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#8b5cf6',
                  borderRadius: '50%',
                  boxShadow: enableGlow ? `0 0 ${glowIntensity}px #8b5cf6` : '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </motion.div>

              {/* Wave */}
              <svg
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '100%',
                  height: '100px'
                }}
              >
                <motion.path
                  d={`M0,50 Q${100},${isPlaying ? 20 : 50} 200,50 T400,50`}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3"
                  animate={{
                    d: isPlaying ? [
                      "M0,50 Q100,20 200,50 T400,50",
                      "M0,50 Q100,80 200,50 T400,50",
                      "M0,50 Q100,20 200,50 T400,50"
                    ] : "M0,50 Q100,50 200,50 T400,50"
                  }}
                  transition={{
                    duration: 2 / animationSpeed,
                    repeat: Infinity
                  }}
                />
              </svg>
            </div>
          </div>
        )}

        {activeCategory === 'glow' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Advanced Glow Effects
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '30px',
              padding: '20px'
            }}>
              {/* Pulsing Glow */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', marginBottom: '8px' }}>Pulse</p>
                <motion.div
                  style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto',
                    backgroundColor: '#ef4444',
                    borderRadius: '12px',
                    boxShadow: `0 0 ${glowIntensity}px #ef4444`
                  }}
                  animate={{
                    boxShadow: isPlaying ? [
                      `0 0 ${glowIntensity}px #ef4444`,
                      `0 0 ${glowIntensity * 2}px #ef4444`,
                      `0 0 ${glowIntensity}px #ef4444`
                    ] : `0 0 ${glowIntensity}px #ef4444`
                  }}
                  transition={{
                    duration: 1.5 / animationSpeed,
                    repeat: Infinity
                  }}
                />
              </div>

              {/* Rainbow Glow */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', marginBottom: '8px' }}>Rainbow</p>
                <motion.div
                  style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto',
                    backgroundColor: '#6366f1',
                    borderRadius: '50%'
                  }}
                  animate={{
                    boxShadow: isPlaying ? [
                      `0 0 ${glowIntensity}px #ef4444`,
                      `0 0 ${glowIntensity}px #f59e0b`,
                      `0 0 ${glowIntensity}px #10b981`,
                      `0 0 ${glowIntensity}px #06b6d4`,
                      `0 0 ${glowIntensity}px #8b5cf6`,
                      `0 0 ${glowIntensity}px #ef4444`
                    ] : `0 0 ${glowIntensity}px #6366f1`
                  }}
                  transition={{
                    duration: 3 / animationSpeed,
                    repeat: Infinity
                  }}
                />
              </div>

              {/* Breathing Glow */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', marginBottom: '8px' }}>Breathe</p>
                <motion.div
                  style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto',
                    backgroundColor: '#10b981',
                    borderRadius: '50%'
                  }}
                  animate={{
                    scale: isPlaying ? [1, 1.1, 1] : 1,
                    boxShadow: isPlaying ? [
                      `0 0 ${glowIntensity * 0.5}px #10b981`,
                      `0 0 ${glowIntensity * 1.5}px #10b981`,
                      `0 0 ${glowIntensity * 0.5}px #10b981`
                    ] : `0 0 ${glowIntensity}px #10b981`
                  }}
                  transition={{
                    duration: 2 / animationSpeed,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>

              {/* Electric Glow */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', marginBottom: '8px' }}>Electric</p>
                <motion.div
                  style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto',
                    backgroundColor: '#fbbf24',
                    borderRadius: '8px'
                  }}
                  animate={{
                    boxShadow: isPlaying ? [
                      `0 0 ${glowIntensity}px #fbbf24, 0 0 ${glowIntensity * 2}px #fbbf24`,
                      `0 0 ${glowIntensity * 0.5}px #fbbf24, 0 0 ${glowIntensity}px #fbbf24`,
                      `0 0 ${glowIntensity * 1.5}px #fbbf24, 0 0 ${glowIntensity * 3}px #fbbf24`,
                      `0 0 ${glowIntensity}px #fbbf24, 0 0 ${glowIntensity * 2}px #fbbf24`
                    ] : `0 0 ${glowIntensity}px #fbbf24`
                  }}
                  transition={{
                    duration: 0.5 / animationSpeed,
                    repeat: Infinity
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'gesture' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Gesture Animations
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {/* Swipe Right */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <p style={{ fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
                  Swipe Right
                </p>
                <motion.div
                  style={{
                    width: '100%',
                    height: '60px',
                    backgroundColor: '#6366f1',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  animate={{
                    x: isPlaying ? [0, 100, 0] : 0,
                    opacity: isPlaying ? [1, 0.5, 1] : 1
                  }}
                  transition={{
                    duration: 1.5 / animationSpeed,
                    repeat: Infinity
                  }}
                >
                  <ArrowRight size={20} />
                </motion.div>
              </div>

              {/* Swipe Up */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <p style={{ fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
                  Swipe Up
                </p>
                <motion.div
                  style={{
                    width: '100%',
                    height: '60px',
                    backgroundColor: '#10b981',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  animate={{
                    y: isPlaying ? [0, -30, 0] : 0,
                    scale: isPlaying ? [1, 0.95, 1] : 1
                  }}
                  transition={{
                    duration: 1 / animationSpeed,
                    repeat: Infinity
                  }}
                >
                  <ArrowUp size={20} />
                </motion.div>
              </div>

              {/* Tap */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                <p style={{ fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
                  Tap Effect
                </p>
                <motion.div
                  style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto',
                    backgroundColor: '#8b5cf6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    position: 'relative'
                  }}
                  animate={{
                    scale: isPlaying ? [1, 0.9, 1.1, 1] : 1
                  }}
                  transition={{
                    duration: 0.5 / animationSpeed,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  <Target size={24} />
                  {isPlaying && (
                    <motion.div
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        border: '2px solid #8b5cf6',
                        borderRadius: '50%'
                      }}
                      animate={{
                        scale: [1, 2],
                        opacity: [1, 0]
                      }}
                      transition={{
                        duration: 1 / animationSpeed,
                        repeat: Infinity
                      }}
                    />
                  )}
                </motion.div>
              </div>

              {/* Long Press */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                <p style={{ fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
                  Long Press
                </p>
                <motion.div
                  style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto',
                    backgroundColor: '#f59e0b',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <Loader
                    size={24}
                    style={{
                      animation: isPlaying ? 'spin 2s linear infinite' : 'none'
                    }}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'random' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Random Chain Generator
            </h3>
            <div style={{
              padding: '40px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <motion.div
                key={randomSeed}
                style={{
                  width: '100px',
                  height: '100px',
                  backgroundColor: '#6366f1',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  boxShadow: enableGlow ? `0 0 ${glowIntensity}px #6366f1` : '0 2px 4px rgba(0,0,0,0.2)'
                }}
                animate={generateRandomChain()}
                transition={{
                  duration: 3 / animationSpeed,
                  repeat: isPlaying ? Infinity : 0
                }}
              >
                <Zap />
              </motion.div>
              
              <button
                onClick={() => setRandomSeed(Date.now())}
                style={{
                  marginTop: '24px',
                  padding: '10px 24px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={16} />
                Generate New Chain
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={{
        backgroundColor: 'white',
        margin: '0 20px 20px',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          Animation Properties
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          fontSize: '12px'
        }}>
          <div>
            <span style={{ color: '#6b7280' }}>Category:</span>
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>
              {categories.find(c => c.id === activeCategory)?.label}
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Speed:</span>
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>
              {animationSpeed}x
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Glow:</span>
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>
              {enableGlow ? `${glowIntensity}px` : 'Off'}
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Status:</span>
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};


