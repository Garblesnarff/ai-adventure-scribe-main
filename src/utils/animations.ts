/**
 * Animation Library for Infinite Realms
 *
 * Framer Motion presets following the Fantasy-Tech Fusion aesthetic.
 * Modern, smooth animations with subtle fantasy touches.
 *
 * Usage:
 * import { fadeInUp, cardEntrance, hoverScale } from '@/utils/animations';
 *
 * <motion.div variants={fadeInUp} initial="hidden" animate="visible">
 *   Content
 * </motion.div>
 */

import { Variants, Transition } from 'framer-motion';

/**
 * Easing Functions
 * Custom easing curves for different animation types
 */
export const easing = {
  // Smooth, natural feeling - use for most UI
  ease: [0.4, 0, 0.2, 1],
  // More dramatic entrance - use for hero elements
  easeOut: [0.0, 0.0, 0.2, 1],
  // Bouncy, playful - use for success states
  easeBack: [0.34, 1.56, 0.64, 1],
  // Sharp, snappy - use for quick interactions
  easeInOut: [0.65, 0, 0.35, 1],
};

/**
 * Standard Transition Durations
 */
export const duration = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
};

/**
 * Page Transitions
 * Use for route changes and major view transitions
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
};

export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
};

export const slideInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
};

/**
 * Card Entrance Animations
 * Use for card grids, lists with staggered reveals
 */
export const cardContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const cardItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
};

export const cardItemFast: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

/**
 * Hover Effects
 * Use for interactive elements (cards, buttons)
 */
export const hoverScale = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
  tap: {
    scale: 0.98,
  },
};

export const hoverLift = {
  rest: {
    y: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    y: -4,
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)',
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
  tap: {
    y: -2,
    scale: 0.98,
  },
};

export const hoverGlow = {
  rest: {
    boxShadow: '0 0 0 rgba(124, 58, 237, 0)',
  },
  hover: {
    boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
};

export const hoverGlowGold = {
  rest: {
    boxShadow: '0 0 0 rgba(245, 158, 11, 0)',
  },
  hover: {
    boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
};

/**
 * Modal/Dialog Animations
 * Use for modal open/close
 */
export const modalBackdrop: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

/**
 * Success Celebrations
 * Use for achievements, level ups, quest completions
 */
export const celebrate: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.slow,
      ease: easing.easeBack,
    },
  },
};

export const pulseSuccess: Variants = {
  initial: {
    scale: 1,
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      repeat: 2,
      ease: easing.ease,
    },
  },
};

export const sparkle: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: 0,
  },
  visible: {
    opacity: [0, 1, 0],
    scale: [0, 1, 0.5],
    rotate: [0, 180, 360],
    transition: {
      duration: 1,
      ease: easing.easeOut,
    },
  },
};

/**
 * Loading States
 * Use for loading indicators, skeletons
 */
export const pulse: Variants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const rotate: Variants = {
  rotate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const shimmer: Variants = {
  shimmer: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * List Animations
 * Use for staggered list items
 */
export const listContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItem: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

/**
 * Collapse/Expand Animations
 * Use for accordions, collapsible sections
 */
export const collapse: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
};

/**
 * Typing Indicator Animation
 * Use for chat typing indicators
 */
export const typingDot: Variants = {
  typing: {
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Progress Bar Animation
 * Use for HP bars, XP bars, loading progress
 */
export const progressBar = (value: number): Variants => ({
  hidden: {
    width: 0,
  },
  visible: {
    width: `${value}%`,
    transition: {
      duration: duration.slow,
      ease: easing.easeOut,
    },
  },
});

/**
 * Dice Roll Animation
 * Use for dice rolling effects
 */
export const diceRoll: Variants = {
  rolling: {
    rotate: [0, 360, 720, 1080],
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.8,
      ease: easing.easeOut,
    },
  },
  result: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.3,
      ease: easing.easeBack,
    },
  },
};

/**
 * Character Entrance Animation
 * Use for character cards, portraits appearing
 */
export const characterEntrance: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: easing.easeOut,
    },
  },
};

/**
 * Tooltip Animation
 * Use for tooltips, popovers
 */
export const tooltip: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

/**
 * Badge Notification Animation
 * Use for notification badges, status indicators
 */
export const badgePulse: Variants = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Tab Switch Animation
 * Use for tab content changes
 */
export const tabContent: Variants = {
  enter: {
    opacity: 0,
    x: 10,
  },
  center: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.normal,
      ease: easing.ease,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: duration.fast,
      ease: easing.ease,
    },
  },
};

/**
 * Spring Configurations
 * Use with motion's spring transition
 */
export const spring = {
  gentle: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
  } as Transition,
  stiff: {
    type: 'spring',
    stiffness: 500,
    damping: 40,
  } as Transition,
};

/**
 * Utility: Create staggered children animation
 */
export const createStagger = (staggerDelay = 0.1, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

/**
 * Utility: Create custom fade animation
 */
export const createFade = (
  direction: 'up' | 'down' | 'left' | 'right' | 'none' = 'none',
  distance = 20,
): Variants => {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const multiplier = direction === 'up' || direction === 'left' ? -1 : 1;
  const offset = direction === 'none' ? 0 : distance * multiplier;

  return {
    hidden: {
      opacity: 0,
      [axis]: offset,
    },
    visible: {
      opacity: 1,
      [axis]: 0,
      transition: {
        duration: duration.normal,
        ease: easing.ease,
      },
    },
  };
};

/**
 * Accessibility: Respect prefers-reduced-motion
 * Wrap animations with this utility to disable them for users who prefer reduced motion
 */
export const respectReducedMotion = (variants: Variants): Variants => {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Return simplified variants with no animation
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.01 } },
    };
  }

  return variants;
};

/**
 * Preset Combinations
 * Common animation patterns ready to use
 */
export const presets = {
  // Page load: staggered card grid
  cardGrid: {
    container: cardContainer,
    item: cardItem,
  },
  // Modal open/close
  modal: {
    backdrop: modalBackdrop,
    content: modalContent,
  },
  // List with stagger
  list: {
    container: listContainer,
    item: listItem,
  },
  // Hover interactions
  hover: {
    lift: hoverLift,
    scale: hoverScale,
    glow: hoverGlow,
  },
};

export default presets;
