/**
 * Hotkey Management Hook
 *
 * Manages keyboard shortcuts for battle map tools and actions.
 * Supports customizable keybindings, conflict detection, and scope management.
 *
 * Features:
 * - Register hotkeys for tools and actions
 * - Global and local scopes
 * - Disabled in text input fields
 * - Conflict detection
 * - Customizable keybindings
 * - Modifier key support (Ctrl, Alt, Shift)
 *
 * @module hooks/use-hotkeys
 */

import { useEffect, useCallback, useRef } from 'react';
import logger from '@/lib/logger';

// ===========================
// Types
// ===========================

export interface HotkeyConfig {
  /** Keyboard key (e.g., 's', 'Escape', 'ArrowUp') */
  key: string;
  /** Require Ctrl/Cmd key */
  ctrl?: boolean;
  /** Require Alt/Option key */
  alt?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Callback when hotkey is triggered */
  callback: (event: KeyboardEvent) => void;
  /** Description of what this hotkey does */
  description?: string;
  /** Category for organization */
  category?: string;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
  /** Only active when condition is true */
  enabled?: boolean;
}

export interface HotkeyScope {
  /** Scope identifier (e.g., 'global', 'canvas', 'modal') */
  scope: string;
  /** Hotkeys in this scope */
  hotkeys: HotkeyConfig[];
  /** Whether this scope is active */
  active: boolean;
}

export interface UseHotkeysOptions {
  /** Scope identifier */
  scope?: string;
  /** Hotkey configurations */
  hotkeys: HotkeyConfig[];
  /** Whether hotkeys are enabled */
  enabled?: boolean;
  /** Allow hotkeys in text input fields */
  allowInInput?: boolean;
  /** Custom input field detector */
  isInputField?: (element: HTMLElement) => boolean;
}

export interface UseHotkeysReturn {
  /** Register a new hotkey */
  registerHotkey: (config: HotkeyConfig) => void;
  /** Unregister a hotkey */
  unregisterHotkey: (key: string) => void;
  /** Get all registered hotkeys */
  getHotkeys: () => HotkeyConfig[];
  /** Check if a key combination is registered */
  isRegistered: (key: string, modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean }) => boolean;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Check if element is a text input field
 */
function defaultIsInputField(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.contentEditable === 'true'
  );
}

/**
 * Generate a unique key for hotkey combination
 */
function getHotkeyKey(key: string, modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean }): string {
  const parts: string[] = [];
  if (modifiers?.ctrl) parts.push('ctrl');
  if (modifiers?.alt) parts.push('alt');
  if (modifiers?.shift) parts.push('shift');
  parts.push(key.toLowerCase());
  return parts.join('+');
}

/**
 * Check if event matches hotkey config
 */
function matchesHotkey(event: KeyboardEvent, config: HotkeyConfig): boolean {
  const keyMatches = event.key.toLowerCase() === config.key.toLowerCase();
  const ctrlMatches = !!config.ctrl === (event.ctrlKey || event.metaKey);
  const altMatches = !!config.alt === event.altKey;
  const shiftMatches = !!config.shift === event.shiftKey;

  return keyMatches && ctrlMatches && altMatches && shiftMatches;
}

// ===========================
// Hook Implementation
// ===========================

/**
 * Hook for managing keyboard shortcuts
 *
 * @example
 * ```tsx
 * const { registerHotkey } = useHotkeys({
 *   hotkeys: [
 *     {
 *       key: 's',
 *       description: 'Select tool',
 *       callback: () => setTool('select'),
 *     },
 *     {
 *       key: 'Escape',
 *       description: 'Cancel action',
 *       callback: () => cancelAction(),
 *     },
 *   ],
 * });
 * ```
 */
export function useHotkeys(options: UseHotkeysOptions): UseHotkeysReturn {
  const {
    scope = 'global',
    hotkeys: initialHotkeys,
    enabled = true,
    allowInInput = false,
    isInputField = defaultIsInputField,
  } = options;

  const hotkeysRef = useRef<HotkeyConfig[]>(initialHotkeys);
  const scopeRef = useRef(scope);

  // Update refs when options change
  useEffect(() => {
    hotkeysRef.current = initialHotkeys;
    scopeRef.current = scope;
  }, [initialHotkeys, scope]);

  // ===========================
  // Hotkey Registration
  // ===========================

  const registerHotkey = useCallback((config: HotkeyConfig) => {
    const hotkeyKey = getHotkeyKey(config.key, {
      ctrl: config.ctrl,
      alt: config.alt,
      shift: config.shift,
    });

    // Check for conflicts
    const existing = hotkeysRef.current.find((h) => {
      const existingKey = getHotkeyKey(h.key, {
        ctrl: h.ctrl,
        alt: h.alt,
        shift: h.shift,
      });
      return existingKey === hotkeyKey;
    });

    if (existing) {
      logger.warn(`Hotkey conflict detected: ${hotkeyKey}`, {
        existing: existing.description,
        new: config.description,
      });
      // Remove existing and add new
      hotkeysRef.current = hotkeysRef.current.filter((h) => h !== existing);
    }

    hotkeysRef.current = [...hotkeysRef.current, config];
    logger.debug(`Registered hotkey: ${hotkeyKey}`, { description: config.description });
  }, []);

  const unregisterHotkey = useCallback((key: string) => {
    hotkeysRef.current = hotkeysRef.current.filter((h) => h.key.toLowerCase() !== key.toLowerCase());
    logger.debug(`Unregistered hotkey: ${key}`);
  }, []);

  const getHotkeys = useCallback(() => {
    return [...hotkeysRef.current];
  }, []);

  const isRegistered = useCallback(
    (key: string, modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean }) => {
      const hotkeyKey = getHotkeyKey(key, modifiers);
      return hotkeysRef.current.some((h) => {
        const existingKey = getHotkeyKey(h.key, {
          ctrl: h.ctrl,
          alt: h.alt,
          shift: h.shift,
        });
        return existingKey === hotkeyKey;
      });
    },
    []
  );

  // ===========================
  // Event Handler
  // ===========================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if hotkeys are enabled
      if (!enabled) return;

      // Check if in input field
      const target = event.target as HTMLElement;
      if (!allowInInput && isInputField(target)) {
        return;
      }

      // Find matching hotkey
      const matchingHotkey = hotkeysRef.current.find((config) => {
        // Check if this hotkey is enabled
        if (config.enabled === false) return false;

        return matchesHotkey(event, config);
      });

      if (matchingHotkey) {
        // Prevent default and stop propagation if configured
        if (matchingHotkey.preventDefault !== false) {
          event.preventDefault();
        }
        if (matchingHotkey.stopPropagation) {
          event.stopPropagation();
        }

        // Execute callback
        try {
          matchingHotkey.callback(event);
          logger.debug(`Hotkey triggered: ${matchingHotkey.key}`, {
            description: matchingHotkey.description,
          });
        } catch (error) {
          logger.error('Error executing hotkey callback', { error, key: matchingHotkey.key });
        }
      }
    },
    [enabled, allowInInput, isInputField]
  );

  // ===========================
  // Setup Event Listener
  // ===========================

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // ===========================
  // Return
  // ===========================

  return {
    registerHotkey,
    unregisterHotkey,
    getHotkeys,
    isRegistered,
  };
}

// ===========================
// Preset Hotkey Configs
// ===========================

/**
 * Default battle map hotkeys
 */
export const BATTLE_MAP_HOTKEYS = {
  // Tools
  SELECT_TOOL: { key: 's', description: 'Select tool', category: 'Tools' },
  PAN_TOOL: { key: 'p', description: 'Pan tool', category: 'Tools' },
  MEASURE_TOOL: { key: 'm', description: 'Measure tool', category: 'Tools' },
  DRAW_TOOL: { key: 'd', description: 'Draw tool', category: 'Tools' },
  AOE_TOOL: { key: 'a', description: 'AoE tool', category: 'Tools' },
  WALL_TOOL: { key: 'w', description: 'Wall tool (GM only)', category: 'Tools' },
  FOG_TOOL: { key: 'f', description: 'Fog tool (GM only)', category: 'Tools' },

  // Actions
  CANCEL: { key: 'Escape', description: 'Cancel/Clear selection', category: 'Actions' },
  DELETE: { key: 'Delete', description: 'Delete selected', category: 'Actions' },
  UNDO: { key: 'z', ctrl: true, description: 'Undo', category: 'Actions' },
  REDO: { key: 'z', ctrl: true, shift: true, description: 'Redo', category: 'Actions' },
  QUICK_MENU: { key: 'q', description: 'Quick action menu', category: 'Actions' },
  HELP: { key: '?', description: 'Show hotkey guide', category: 'Actions' },

  // View
  ZOOM_IN: { key: '+', description: 'Zoom in', category: 'View' },
  ZOOM_OUT: { key: '-', description: 'Zoom out', category: 'View' },
  RESET_VIEW: { key: '0', description: 'Reset view', category: 'View' },
  CENTER_ON_SELECTION: { key: 'c', description: 'Center on selection', category: 'View' },

  // Layers
  TOGGLE_GRID: { key: 'g', description: 'Toggle grid', category: 'Layers' },
  TOGGLE_FOG: { key: 'f', alt: true, description: 'Toggle fog visibility', category: 'Layers' },
  TOGGLE_WALLS: { key: 'w', alt: true, description: 'Toggle walls visibility', category: 'Layers' },

  // Token Actions
  ROTATE_LEFT: { key: '[', description: 'Rotate token left', category: 'Tokens' },
  ROTATE_RIGHT: { key: ']', description: 'Rotate token right', category: 'Tokens' },
  ELEVATE_UP: { key: 'ArrowUp', alt: true, description: 'Elevate token up', category: 'Tokens' },
  ELEVATE_DOWN: { key: 'ArrowDown', alt: true, description: 'Elevate token down', category: 'Tokens' },
} as const;

/**
 * Create hotkey config from preset
 */
export function createHotkeyFromPreset(
  preset: typeof BATTLE_MAP_HOTKEYS[keyof typeof BATTLE_MAP_HOTKEYS],
  callback: (event: KeyboardEvent) => void,
  options?: Partial<HotkeyConfig>
): HotkeyConfig {
  return {
    ...preset,
    callback,
    ...options,
  };
}
