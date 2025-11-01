/**
 * Z-Index Constants
 *
 * Centralized z-index values to prevent layering conflicts.
 * Higher values appear on top of lower values.
 *
 * Usage:
 * ```tsx
 * import { Z_INDEX } from '@/constants/z-index';
 *
 * <div className={`fixed z-[${Z_INDEX.MODAL}]`}>Modal Content</div>
 * ```
 */
export const Z_INDEX = {
  // Base layer - default content
  BASE: 0,

  // Dropdown menus and selects
  DROPDOWN: 10,

  // Card hover effects and tooltips (low priority)
  CARD_HOVER: 20,

  // Sticky elements like headers
  STICKY: 30,

  // Floating action buttons and panels
  FLOATING_PANEL: 40,

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

export type ZIndexLayer = typeof Z_INDEX[keyof typeof Z_INDEX];
