/**
 * Z-Index Constants
 *
 * Centralized z-index values to prevent layering conflicts.
 * Higher values appear on top of lower values.
 *
 * Hierarchy (from lowest to highest):
 * 1. BASE (0) - Default content layer
 * 2. BACKGROUND_LAYER (1) - Background images in cards
 * 3. OVERLAY_EFFECT (5) - Visual overlay effects (gradients, hover effects)
 * 4. DROPDOWN/SIDEBAR (10) - Interactive UI elements
 * 5. CARD_HOVER (20) - Hover popups and effects
 * 6. STICKY (30) - Fixed navigation and headers
 * 7. FLOATING_PANEL (40) - Action panels and right panels
 * 8. MODAL_BACKDROP (50) - Modal background overlays
 * 9. MODAL (60) - Dialog and sheet content
 * 10. POPOVER (70) - Context menus and popovers
 * 11. TOOLTIP (80) - Tooltips and hints
 * 12. TOAST (90) - Toast notifications
 * 13. LOADING_OVERLAY (100) - Full-screen loading states
 *
 * Usage:
 * ```tsx
 * import { Z_INDEX } from '@/constants/z-index';
 *
 * // For Tailwind classes
 * <div className={`fixed z-[${Z_INDEX.MODAL}]`}>Modal Content</div>
 *
 * // For inline styles
 * <div style={{ zIndex: Z_INDEX.TOOLTIP }}>Tooltip</div>
 * ```
 *
 * Note: CSS files cannot import TypeScript constants.
 * For CSS files, reference this file and use the numeric values directly.
 */
export const Z_INDEX = {
  // Base layer - default content
  BASE: 0,

  // Background images and effects within cards
  BACKGROUND_LAYER: 1,

  // Visual overlay effects (gradients, hover backgrounds)
  OVERLAY_EFFECT: 5,

  // Dropdown menus and selects
  DROPDOWN: 10,

  // Sidebar components (same layer as dropdowns since they don't overlap)
  SIDEBAR: 10,

  // Card hover effects and popups
  CARD_HOVER: 20,

  // Sticky elements like headers
  STICKY: 30,

  // Floating action buttons and panels
  FLOATING_PANEL: 40,

  // Right panel (alias for FLOATING_PANEL for semantic clarity)
  RIGHT_PANEL: 40,

  // Modal backdrops/overlays
  MODAL_BACKDROP: 50,

  // Modal content (dialogs, sheets, alerts)
  MODAL: 60,

  // Popovers and context menus
  POPOVER: 70,

  // Tooltips
  TOOLTIP: 80,

  // Toast notifications
  TOAST: 90,

  // Loading overlays - should cover most UI
  LOADING_OVERLAY: 100,
} as const;

export type ZIndexLayer = (typeof Z_INDEX)[keyof typeof Z_INDEX];
