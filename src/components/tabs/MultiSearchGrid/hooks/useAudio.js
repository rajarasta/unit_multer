import { Howl } from 'howler';
import { useCallback, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

// Audio sprite configuration
const AUDIO_SPRITES = {
  click: [0, 300],          // Subtle click sound
  layout_change: [500, 800], // Swoosh for layout transitions
  fusion_success: [1500, 1000], // Success tone for unit fusion
  mode_switch: [2700, 400],   // Mode transition sound
  ai_thinking: [3200, 1500],  // AI processing ambient tone
  error: [4800, 600],        // Error feedback
  undo: [5500, 350],         // Undo action
  redo: [6000, 350],         // Redo action
  drag_start: [6500, 200],   // Drag initiation
  drag_end: [6800, 300],     // Drag completion
  notification: [7200, 500], // General notification
  ambient_loop: [8000, 3000] // Background ambient (looped)
};

export const useAudio = () => {
  const { audioEnabled } = useWorkspaceStore();
  const soundSpriteRef = useRef(null);
  const ambientSoundRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Initialize audio system
  useEffect(() => {
    if (!isInitializedRef.current) {
      initializeAudio();
      isInitializedRef.current = true;
    }

    return () => {
      // Cleanup on unmount
      if (soundSpriteRef.current) {
        soundSpriteRef.current.unload();
      }
      if (ambientSoundRef.current) {
        ambientSoundRef.current.unload();
      }
    };
  }, []);

  const initializeAudio = useCallback(() => {
    try {
      // Main UI sounds sprite
      soundSpriteRef.current = new Howl({
        src: ['/audio/ui_sounds.mp3', '/audio/ui_sounds.webm'], // Fallback formats
        sprite: AUDIO_SPRITES,
        volume: 0.6,
        preload: false, // Don't preload to avoid blocking
        onloaderror: (id, error) => {
          console.warn('Audio sprite loading failed:', error.message || error);
          // Graceful fallback - create silent mock immediately
          createSilentMock();
        },
        onload: () => {
          console.log('Audio system initialized successfully');
        }
      });

      // Ambient background for AI mode
      ambientSoundRef.current = new Howl({
        src: ['/audio/ambient_ai.mp3', '/audio/ambient_ai.webm'],
        loop: true,
        volume: 0.2,
        preload: false, // Load on demand
        onloaderror: (id, error) => {
          console.warn('Ambient audio loading failed:', error.message || error);
          // Create silent mock for ambient too
          ambientSoundRef.current = {
            play: () => null,
            stop: () => null,
            fade: () => null,
            volume: () => null
          };
        }
      });

    } catch (error) {
      console.warn('Audio initialization failed:', error);
      createSilentMock();
    }
  }, []);

  // Fallback for when audio files are not available
  const createSilentMock = useCallback(() => {
    const mockHowl = {
      play: () => null,
      stop: () => null,
      fade: () => null,
      volume: () => null
    };
    soundSpriteRef.current = mockHowl;
    ambientSoundRef.current = mockHowl;
  }, []);

  // Core audio playback function
  const playSound = useCallback((soundName, options = {}) => {
    if (!audioEnabled || !soundSpriteRef.current) return null;

    const {
      volume = 1.0,
      rate = 1.0,
      fade = false,
      delay = 0
    } = options;

    try {
      const soundId = soundSpriteRef.current.play(soundName);
      
      if (soundId) {
        soundSpriteRef.current.volume(volume, soundId);
        soundSpriteRef.current.rate(rate, soundId);
        
        if (fade) {
          soundSpriteRef.current.fade(0, volume, fade, soundId);
        }
        
        if (delay > 0) {
          setTimeout(() => {
            if (soundSpriteRef.current) {
              soundSpriteRef.current.play(soundName);
            }
          }, delay);
        }
      }
      
      return soundId;
    } catch (error) {
      console.warn('Sound playback failed:', soundName, error);
      return null;
    }
  }, [audioEnabled]);

  // Specialized audio functions for different UI interactions
  const audioFeedback = {
    // Basic interactions
    click: () => playSound('click', { volume: 0.4 }),
    
    // Layout operations
    layoutChange: () => playSound('layout_change', { volume: 0.7, fade: 200 }),
    
    // Unit operations
    modeSwitch: () => playSound('mode_switch', { volume: 0.5 }),
    fusionSuccess: () => playSound('fusion_success', { volume: 0.8, fade: 300 }),
    
    // Drag and drop
    dragStart: () => playSound('drag_start', { volume: 0.6 }),
    dragEnd: () => playSound('drag_end', { volume: 0.6, rate: 1.1 }),
    
    // History operations
    undo: () => playSound('undo', { volume: 0.5, rate: 0.9 }),
    redo: () => playSound('redo', { volume: 0.5, rate: 1.1 }),
    
    // AI interactions
    aiThinking: () => playSound('ai_thinking', { volume: 0.4, fade: 500 }),
    aiComplete: () => playSound('notification', { volume: 0.6 }),
    
    // Error states
    error: () => playSound('error', { volume: 0.7, rate: 0.8 }),
    
    // Notification
    notify: () => playSound('notification', { volume: 0.5 })
  };

  // Ambient audio control
  const ambientControl = {
    start: useCallback(() => {
      if (!audioEnabled || !ambientSoundRef.current) return;
      
      try {
        ambientSoundRef.current.play();
        ambientSoundRef.current.fade(0, 0.2, 2000);
      } catch (error) {
        console.warn('Ambient audio start failed:', error);
      }
    }, [audioEnabled]),

    stop: useCallback(() => {
      if (!ambientSoundRef.current) return;
      
      try {
        ambientSoundRef.current.fade(0.2, 0, 1000);
        setTimeout(() => {
          if (ambientSoundRef.current) {
            ambientSoundRef.current.stop();
          }
        }, 1000);
      } catch (error) {
        console.warn('Ambient audio stop failed:', error);
      }
    }, []),

    setVolume: useCallback((volume) => {
      if (ambientSoundRef.current) {
        ambientSoundRef.current.volume(Math.max(0, Math.min(1, volume)));
      }
    }, [])
  };

  // Advanced audio sequencing for complex interactions
  const playSequence = useCallback((sequence, interval = 150) => {
    if (!audioEnabled) return;

    sequence.forEach((soundName, index) => {
      setTimeout(() => {
        playSound(soundName, { volume: 0.5 });
      }, index * interval);
    });
  }, [audioEnabled, playSound]);

  // Contextual audio based on current state
  const playContextual = useCallback((context, intensity = 'normal') => {
    if (!audioEnabled) return;

    const intensityModifier = {
      subtle: { volume: 0.3, rate: 0.9 },
      normal: { volume: 0.6, rate: 1.0 },
      prominent: { volume: 0.9, rate: 1.1 }
    };

    const modifier = intensityModifier[intensity] || intensityModifier.normal;

    switch (context) {
      case 'ai_layout_change':
        playSequence(['ai_thinking', 'layout_change'], 200);
        break;
      case 'successful_fusion':
        playSequence(['fusion_success', 'notification'], 100);
        break;
      case 'error_recovery':
        playSequence(['error', 'click'], 300);
        break;
      default:
        playSound(context, modifier);
    }
  }, [audioEnabled, playSound, playSequence]);

  return {
    playSound,
    ...audioFeedback,
    ambient: ambientControl,
    playSequence,
    playContextual,
    isEnabled: audioEnabled
  };
};

// Custom hook for audio-synchronized animations
export const useAudioAnimation = () => {
  const audio = useAudio();
  
  const playWithAnimation = useCallback((soundName, animationCallback) => {
    if (audio.isEnabled) {
      const soundId = audio.playSound(soundName);
      if (animationCallback) {
        animationCallback();
      }
      return soundId;
    } else {
      // Still run animation even if audio is disabled
      if (animationCallback) {
        animationCallback();
      }
      return null;
    }
  }, [audio]);

  return {
    ...audio,
    playWithAnimation
  };
};

// Hook for AI-specific audio patterns
export const useAIAudio = () => {
  const audio = useAudio();
  
  const aiPatterns = {
    startThinking: () => {
      audio.aiThinking();
      audio.ambient.start();
    },
    
    completeTask: () => {
      audio.ambient.stop();
      audio.aiComplete();
    },
    
    layoutOptimization: () => {
      audio.playSequence(['ai_thinking', 'layout_change', 'notification'], 300);
    },
    
    error: () => {
      audio.ambient.stop();
      audio.error();
    }
  };

  return {
    ...audio,
    ai: aiPatterns
  };
};