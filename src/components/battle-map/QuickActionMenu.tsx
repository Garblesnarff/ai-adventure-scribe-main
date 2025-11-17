/**
 * Quick Action Menu Component
 *
 * Radial menu for quick token actions.
 * Opens on right-click or hotkey (Q) and displays actions in a radial layout.
 *
 * Features:
 * - Right-click or hotkey (Q) to open
 * - Radial button layout (8 directions)
 * - Quick actions: Target, Move, Attack, Heal, Condition, Delete
 * - Close on selection or outside click
 * - Animated appearance
 * - Context-aware actions (hide unavailable actions)
 * - Visual feedback on hover
 *
 * @module components/battle-map/QuickActionMenu
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Target,
  Move,
  Sword,
  Heart,
  Skull,
  Trash2,
  Shield,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHotkeys, createHotkeyFromPreset, BATTLE_MAP_HOTKEYS } from '@/hooks/use-hotkeys';

// ===========================
// Types
// ===========================

export interface QuickAction {
  /** Action identifier */
  id: string;
  /** Action label */
  label: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Callback when action is triggered */
  onAction: () => void;
  /** Whether action is enabled */
  enabled?: boolean;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Description */
  description?: string;
  /** Visual variant */
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

export interface QuickActionMenuProps {
  /** Position where menu should appear */
  position: { x: number; y: number } | null;
  /** Available actions */
  actions: QuickAction[];
  /** Whether menu is open */
  isOpen: boolean;
  /** Callback when menu should close */
  onClose: () => void;
  /** Custom className */
  className?: string;
  /** Menu radius in pixels */
  radius?: number;
  /** Center button icon */
  centerIcon?: React.ComponentType<{ className?: string }>;
  /** Center button label */
  centerLabel?: string;
}

// ===========================
// Radial Position Calculator
// ===========================

/**
 * Calculate position for radial menu items
 */
function calculateRadialPosition(
  index: number,
  total: number,
  radius: number,
  offsetAngle: number = -90
): { x: number; y: number; angle: number } {
  const angleStep = 360 / total;
  const angle = offsetAngle + angleStep * index;
  const radian = (angle * Math.PI) / 180;

  return {
    x: Math.cos(radian) * radius,
    y: Math.sin(radian) * radius,
    angle,
  };
}

// ===========================
// Radial Action Button
// ===========================

interface RadialActionButtonProps {
  action: QuickAction;
  position: { x: number; y: number; angle: number };
  index: number;
  onTrigger: () => void;
}

const RadialActionButton: React.FC<RadialActionButtonProps> = ({
  action,
  position,
  index,
  onTrigger,
}) => {
  const Icon = action.icon;
  const [isHovered, setIsHovered] = useState(false);

  const variantColors = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-green-600 text-white hover:bg-green-700',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700',
  };

  const color = variantColors[action.variant || 'default'];

  return (
    <button
      onClick={onTrigger}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={action.enabled === false}
      className={cn(
        'absolute flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-200',
        'shadow-lg border-2 border-background',
        action.enabled === false && 'opacity-40 cursor-not-allowed',
        action.enabled !== false && color,
        isHovered && 'scale-110 z-10'
      )}
      style={{
        left: `calc(50% + ${position.x}px)`,
        top: `calc(50% + ${position.y}px)`,
        transform: 'translate(-50%, -50%)',
        animation: `radialAppear 0.3s ease-out ${index * 0.05}s both`,
      }}
      aria-label={action.label}
      title={action.description || action.label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium whitespace-nowrap">{action.label}</span>
      {action.shortcut && (
        <span className="text-[10px] font-mono opacity-75">{action.shortcut}</span>
      )}
    </button>
  );
};

// ===========================
// Quick Action Menu Component
// ===========================

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  position,
  actions,
  isOpen,
  onClose,
  className,
  radius = 120,
  centerIcon: CenterIcon,
  centerLabel,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [enabledActions, setEnabledActions] = useState<QuickAction[]>([]);

  // Filter enabled actions
  useEffect(() => {
    setEnabledActions(actions.filter((action) => action.enabled !== false));
  }, [actions]);

  // ===========================
  // Click Outside Handler
  // ===========================

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Delay to avoid closing immediately on open
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ===========================
  // Escape Key Handler
  // ===========================

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ===========================
  // Action Handler
  // ===========================

  const handleAction = useCallback(
    (action: QuickAction) => {
      action.onAction();
      onClose();
    },
    [onClose]
  );

  // ===========================
  // Render
  // ===========================

  if (!isOpen || !position) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
        style={{
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Menu Container */}
      <div
        ref={menuRef}
        className={cn(
          'fixed z-50',
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          width: radius * 2.5,
          height: radius * 2.5,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Center Button */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          style={{
            animation: 'radialCenter 0.3s ease-out',
          }}
        >
          <button
            onClick={onClose}
            className="flex flex-col items-center justify-center gap-1 p-4 rounded-full bg-background border-2 border-border shadow-xl hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            {CenterIcon ? (
              <CenterIcon className="h-6 w-6" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary" />
            )}
            {centerLabel && (
              <span className="text-xs font-medium">{centerLabel}</span>
            )}
          </button>
        </div>

        {/* Radial Action Buttons */}
        {enabledActions.map((action, index) => {
          const pos = calculateRadialPosition(index, enabledActions.length, radius);
          return (
            <RadialActionButton
              key={action.id}
              action={action}
              position={pos}
              index={index}
              onTrigger={() => handleAction(action)}
            />
          );
        })}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes radialAppear {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes radialCenter {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  );
};

// ===========================
// Hook for Quick Action Menu
// ===========================

export interface UseQuickActionMenuOptions {
  /** Available actions */
  actions: QuickAction[];
  /** Enable right-click to open */
  enableRightClick?: boolean;
  /** Enable hotkey to open (Q) */
  enableHotkey?: boolean;
  /** Custom hotkey */
  hotkeyConfig?: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean };
  /** Callback when menu opens */
  onOpen?: (position: { x: number; y: number }) => void;
  /** Callback when menu closes */
  onClose?: () => void;
}

export interface UseQuickActionMenuReturn {
  /** Whether menu is open */
  isOpen: boolean;
  /** Menu position */
  position: { x: number; y: number } | null;
  /** Open menu at position */
  openMenu: (position: { x: number; y: number }) => void;
  /** Close menu */
  closeMenu: () => void;
  /** Context menu event handler */
  onContextMenu: (event: React.MouseEvent) => void;
}

/**
 * Hook for managing quick action menu state
 */
export function useQuickActionMenu(
  options: UseQuickActionMenuOptions
): UseQuickActionMenuReturn {
  const {
    actions,
    enableRightClick = true,
    enableHotkey = true,
    hotkeyConfig,
    onOpen,
    onClose,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const openMenu = useCallback(
    (pos: { x: number; y: number }) => {
      setPosition(pos);
      setIsOpen(true);
      onOpen?.(pos);
    },
    [onOpen]
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
    onClose?.();
  }, [onClose]);

  // Hotkey to open menu at mouse position
  useHotkeys({
    hotkeys: enableHotkey
      ? [
          {
            ...(hotkeyConfig || BATTLE_MAP_HOTKEYS.QUICK_MENU),
            callback: () => {
              if (!isOpen) {
                openMenu(lastMousePosRef.current);
              } else {
                closeMenu();
              }
            },
          },
        ]
      : [],
    enabled: enableHotkey,
  });

  // Context menu handler
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (!enableRightClick) return;

      event.preventDefault();
      event.stopPropagation();

      if (isOpen) {
        closeMenu();
      } else {
        openMenu({ x: event.clientX, y: event.clientY });
      }
    },
    [enableRightClick, isOpen, openMenu, closeMenu]
  );

  return {
    isOpen,
    position,
    openMenu,
    closeMenu,
    onContextMenu,
  };
}

// ===========================
// Preset Actions
// ===========================

/**
 * Default quick actions for tokens
 */
export function getDefaultQuickActions(tokenId: string, isGM: boolean = false): QuickAction[] {
  return [
    {
      id: 'target',
      label: 'Target',
      icon: Target,
      shortcut: 'T',
      description: 'Target this token',
      onAction: () => {
        console.log('Target token:', tokenId);
      },
    },
    {
      id: 'move',
      label: 'Move',
      icon: Move,
      shortcut: 'M',
      description: 'Move this token',
      onAction: () => {
        console.log('Move token:', tokenId);
      },
    },
    {
      id: 'attack',
      label: 'Attack',
      icon: Sword,
      shortcut: 'A',
      description: 'Attack with this token',
      variant: 'danger',
      onAction: () => {
        console.log('Attack with token:', tokenId);
      },
    },
    {
      id: 'heal',
      label: 'Heal',
      icon: Heart,
      shortcut: 'H',
      description: 'Heal this token',
      variant: 'success',
      onAction: () => {
        console.log('Heal token:', tokenId);
      },
    },
    {
      id: 'condition',
      label: 'Condition',
      icon: Shield,
      shortcut: 'C',
      description: 'Apply condition',
      variant: 'warning',
      onAction: () => {
        console.log('Apply condition to token:', tokenId);
      },
    },
    {
      id: 'visibility',
      label: 'Hide',
      icon: Eye,
      shortcut: 'V',
      description: 'Toggle visibility',
      enabled: isGM,
      onAction: () => {
        console.log('Toggle visibility for token:', tokenId);
      },
    },
    {
      id: 'damage',
      label: 'Damage',
      icon: Skull,
      shortcut: 'D',
      description: 'Apply damage',
      variant: 'danger',
      onAction: () => {
        console.log('Apply damage to token:', tokenId);
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      shortcut: 'Del',
      description: 'Delete this token',
      variant: 'danger',
      enabled: isGM,
      onAction: () => {
        console.log('Delete token:', tokenId);
      },
    },
  ];
}

// ===========================
// Exports
// ===========================

export type { QuickActionMenuProps, QuickAction, UseQuickActionMenuOptions, UseQuickActionMenuReturn };
