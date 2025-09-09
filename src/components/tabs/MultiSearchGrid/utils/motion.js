import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

// Motion Design System - Standardized Easing Functions
export const Easing = {
  standard: "power3.out",
  expressive: "expo.out", 
  gentle: "power2.inOut",
  bounce: "back.out(1.7)",
  elastic: "elastic.out(1, 0.3)"
};

// Duration constants for consistent timing
export const Duration = {
  quick: 0.3,
  standard: 0.6,
  expressive: 0.8,
  dramatic: 1.2
};

// Orchestration functions for AI Show experience

/**
 * Animate element entrance with sophisticated motion
 */
export const animateEnter = (element, options = {}) => {
  const {
    delay = 0,
    duration = Duration.standard,
    ease = Easing.expressive,
    scale = 0.95,
    y = 20
  } = options;

  return gsap.fromTo(element, 
    { 
      opacity: 0, 
      scale,
      y,
      filter: "blur(10px)"
    },
    { 
      opacity: 1, 
      scale: 1,
      y: 0,
      filter: "blur(0px)",
      duration, 
      ease,
      delay
    }
  );
};

/**
 * Animate element exit with smooth transition
 */
export const animateExit = (element, options = {}) => {
  const {
    duration = Duration.quick,
    ease = Easing.standard,
    scale = 0.9
  } = options;

  return gsap.to(element, {
    opacity: 0,
    scale,
    filter: "blur(5px)",
    duration,
    ease
  });
};

/**
 * Staggered entrance animation for multiple elements
 */
export const animateStaggerIn = (elements, options = {}) => {
  const {
    stagger = 0.1,
    duration = Duration.standard,
    ease = Easing.expressive
  } = options;

  return gsap.fromTo(elements,
    {
      opacity: 0,
      y: 30,
      scale: 0.9
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      ease,
      stagger
    }
  );
};

/**
 * FLIP Animation System - Core of the AI Show experience
 * Provides seamless transitions when AI reorganizes layouts
 */
export const applyLayoutWithFlip = async (updateFunction, options = {}) => {
  const {
    duration = Duration.expressive,
    ease = Easing.gentle,
    stagger = 0.05,
    scale = true,
    fade = true,
    blur = true
  } = options;

  try {
    // 1. FIRST: Capture initial state of all tracked elements
    const state = Flip.getState("[data-grid-item], [data-flip-id]", {
      props: "opacity,filter" // Track these properties too
    });

    // 2. LAST: Apply the update (React re-renders)
    await updateFunction();

    // Small delay to ensure DOM has updated
    await new Promise(resolve => setTimeout(resolve, 0));

    // 3. INVERT & PLAY: Animate the transformation
    const flipAnimation = Flip.from(state, {
      duration,
      ease,
      stagger,
      absolute: true, // Essential for grid repositioning
      
      // Advanced effects for elements entering/leaving
      onEnter: (elements) => {
        const enterTween = gsap.fromTo(elements, 
          {
            opacity: 0,
            scale: 0.8,
            filter: blur ? "blur(10px)" : "blur(0px)"
          },
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: duration * 0.8,
            ease: Easing.bounce
          }
        );
        return enterTween;
      },
      
      onLeave: (elements) => {
        return gsap.to(elements, {
          opacity: 0,
          scale: 0.8,
          filter: blur ? "blur(5px)" : "blur(0px)",
          duration: duration * 0.6,
          ease: Easing.standard
        });
      },

      // Custom properties animation during flip
      onUpdate: function() {
        // Add custom behaviors during animation if needed
      },
      
      onComplete: () => {
        // Cleanup and final state adjustments
        gsap.set("[data-grid-item]", { clearProps: "all" });
      }
    });

    return flipAnimation;
  } catch (error) {
    console.error("FLIP animation error:", error);
    // Fallback: just run the update without animation
    updateFunction();
  }
};

/**
 * AI Layout Transition - Specialized FLIP for AI-generated layouts
 */
export const animateAILayoutTransition = async (updateFunction, layoutDescription = "AI Layout") => {
  // Enhanced version with additional visual feedback
  const notification = createLayoutNotification(layoutDescription);
  
  try {
    const flipAnimation = await applyLayoutWithFlip(updateFunction, {
      duration: Duration.dramatic,
      ease: Easing.gentle,
      stagger: 0.08,
      scale: true,
      fade: true,
      blur: true
    });

    // Add AI-specific visual flourishes
    gsap.to(".ai-show-indicator", {
      scale: 1.1,
      opacity: 0.8,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: Easing.elastic
    });

    return flipAnimation;
  } finally {
    // Remove notification after animation
    setTimeout(() => notification.remove(), 3000);
  }
};

/**
 * Fusion Animation - When units combine
 */
export const animateFusion = (sourceElement, targetElement, onComplete) => {
  const timeline = gsap.timeline({
    onComplete
  });

  // Stage 1: Attract source to target
  timeline.to(sourceElement, {
    x: () => {
      const sourceRect = sourceElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      return targetRect.left - sourceRect.left;
    },
    y: () => {
      const sourceRect = sourceElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      return targetRect.top - sourceRect.top;
    },
    scale: 0.8,
    duration: Duration.standard,
    ease: Easing.expressive
  });

  // Stage 2: Fusion effect
  timeline.to([sourceElement, targetElement], {
    scale: 1.1,
    filter: "brightness(1.2) saturate(1.3)",
    duration: 0.3,
    ease: Easing.bounce,
    stagger: 0.1
  });

  // Stage 3: Settle into new state
  timeline.to([sourceElement, targetElement], {
    scale: 1,
    filter: "brightness(1) saturate(1)",
    duration: 0.4,
    ease: Easing.elastic
  });

  return timeline;
};

/**
 * Morphing Animation - Visual transformation between modes
 */
export const animateModeMorph = (element, fromMode, toMode) => {
  const timeline = gsap.timeline();

  // Phase 1: Dissolve current state
  timeline.to(element, {
    scale: 0.95,
    opacity: 0.7,
    filter: "blur(3px)",
    duration: 0.3,
    ease: Easing.standard
  });

  // Phase 2: Transform content (React re-render happens here)
  timeline.call(() => {
    // Trigger mode change in React
  });

  // Phase 3: Emerge with new state
  timeline.to(element, {
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    duration: 0.5,
    ease: Easing.expressive
  });

  return timeline;
};

/**
 * Audio-synchronized animation for feedback
 */
export const animateWithAudio = (elements, audioTrigger, options = {}) => {
  const {
    duration = Duration.standard,
    ease = Easing.bounce
  } = options;

  // Trigger audio
  audioTrigger();

  // Synchronized visual feedback
  return gsap.to(elements, {
    scale: 1.05,
    duration: duration * 0.3,
    ease,
    yoyo: true,
    repeat: 1
  });
};

/**
 * Utility: Create temporary layout notification
 */
const createLayoutNotification = (text) => {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div class="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 ai-layout-notification">
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        <span class="text-sm font-medium">${text}</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Entrance animation
  gsap.fromTo(notification, 
    { opacity: 0, x: 100 },
    { opacity: 1, x: 0, duration: 0.4, ease: Easing.expressive }
  );

  return notification;
};

/**
 * Advanced hover animations for units
 */
export const createHoverAnimation = (element) => {
  const hoverTween = gsap.to(element, {
    scale: 1.02,
    y: -2,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    duration: 0.3,
    ease: Easing.gentle,
    paused: true
  });

  element.addEventListener('mouseenter', () => hoverTween.play());
  element.addEventListener('mouseleave', () => hoverTween.reverse());
  
  return hoverTween;
};

/**
 * Performance optimization: Batch animations
 */
export const batchAnimations = (animationFunctions) => {
  const batch = gsap.timeline();
  animationFunctions.forEach(fn => batch.add(fn));
  return batch;
};