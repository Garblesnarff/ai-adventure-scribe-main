/**
 * Hotkey Guide Component
 *
 * Help overlay that displays all available keyboard shortcuts.
 * Press '?' to show/hide. Organized by category and searchable.
 *
 * Features:
 * - Press '?' to show/hide
 * - All keyboard shortcuts listed
 * - Organized by category (Tools, Actions, View, Layers, Tokens)
 * - Searchable shortcuts
 * - GM-only shortcuts visibility
 * - Responsive layout
 * - Keyboard navigation
 *
 * @module components/battle-map/HotkeyGuide
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useHotkeys } from '@/hooks/use-hotkeys';

// ===========================
// Types
// ===========================

export interface HotkeyGuideProps {
  /** Whether user is GM */
  isGM?: boolean;
  /** Custom className */
  className?: string;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

interface ShortcutInfo {
  /** Shortcut keys */
  keys: string[];
  /** Action description */
  description: string;
  /** Category */
  category: string;
  /** GM only */
  gmOnly?: boolean;
  /** Additional notes */
  notes?: string;
}

// ===========================
// Keyboard Shortcuts Data
// ===========================

const SHORTCUTS: ShortcutInfo[] = [
  // Tools
  {
    keys: ['S'],
    description: 'Select tool',
    category: 'Tools',
  },
  {
    keys: ['P'],
    description: 'Pan tool',
    category: 'Tools',
  },
  {
    keys: ['M'],
    description: 'Measure tool',
    category: 'Tools',
  },
  {
    keys: ['D'],
    description: 'Draw tool',
    category: 'Tools',
  },
  {
    keys: ['A'],
    description: 'AoE tool',
    category: 'Tools',
  },
  {
    keys: ['W'],
    description: 'Wall tool',
    category: 'Tools',
    gmOnly: true,
  },
  {
    keys: ['F'],
    description: 'Fog tool',
    category: 'Tools',
    gmOnly: true,
  },

  // Actions
  {
    keys: ['Esc'],
    description: 'Cancel/Clear selection',
    category: 'Actions',
  },
  {
    keys: ['Del'],
    description: 'Delete selected',
    category: 'Actions',
  },
  {
    keys: ['Ctrl', 'Z'],
    description: 'Undo',
    category: 'Actions',
  },
  {
    keys: ['Ctrl', 'Shift', 'Z'],
    description: 'Redo',
    category: 'Actions',
    notes: 'Also Ctrl+Y',
  },
  {
    keys: ['Q'],
    description: 'Quick action menu',
    category: 'Actions',
  },
  {
    keys: ['?'],
    description: 'Show/hide hotkey guide',
    category: 'Actions',
  },

  // View
  {
    keys: ['+'],
    description: 'Zoom in',
    category: 'View',
  },
  {
    keys: ['-'],
    description: 'Zoom out',
    category: 'View',
  },
  {
    keys: ['0'],
    description: 'Reset view',
    category: 'View',
  },
  {
    keys: ['C'],
    description: 'Center on selection',
    category: 'View',
  },
  {
    keys: ['Space', 'Drag'],
    description: 'Pan view (hold space)',
    category: 'View',
  },

  // Layers
  {
    keys: ['G'],
    description: 'Toggle grid',
    category: 'Layers',
  },
  {
    keys: ['Alt', 'F'],
    description: 'Toggle fog visibility',
    category: 'Layers',
    gmOnly: true,
  },
  {
    keys: ['Alt', 'W'],
    description: 'Toggle walls visibility',
    category: 'Layers',
    gmOnly: true,
  },
  {
    keys: ['Alt', 'T'],
    description: 'Toggle tokens visibility',
    category: 'Layers',
  },

  // Tokens
  {
    keys: ['['],
    description: 'Rotate token left',
    category: 'Tokens',
  },
  {
    keys: [']'],
    description: 'Rotate token right',
    category: 'Tokens',
  },
  {
    keys: ['Alt', '↑'],
    description: 'Elevate token up',
    category: 'Tokens',
  },
  {
    keys: ['Alt', '↓'],
    description: 'Elevate token down',
    category: 'Tokens',
  },
  {
    keys: ['Shift', 'Click'],
    description: 'Multi-select tokens',
    category: 'Tokens',
  },
  {
    keys: ['Ctrl', 'A'],
    description: 'Select all tokens',
    category: 'Tokens',
  },

  // Drawing
  {
    keys: ['Shift', 'Drag'],
    description: 'Constrain line angle',
    category: 'Drawing',
  },
  {
    keys: ['Ctrl', 'Drag'],
    description: 'Draw from center',
    category: 'Drawing',
  },
  {
    keys: ['Enter'],
    description: 'Finish drawing',
    category: 'Drawing',
  },
  {
    keys: ['Backspace'],
    description: 'Remove last point',
    category: 'Drawing',
  },

  // Measurement
  {
    keys: ['Shift', 'M'],
    description: 'Cone measurement',
    category: 'Measurement',
  },
  {
    keys: ['Ctrl', 'M'],
    description: 'Radius measurement',
    category: 'Measurement',
  },
];

// ===========================
// Shortcut Item Component
// ===========================

interface ShortcutItemProps {
  shortcut: ShortcutInfo;
  searchQuery?: string;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ shortcut, searchQuery }) => {
  const { keys, description, notes, gmOnly } = shortcut;

  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-accent rounded-md transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{highlightText(description)}</span>
          {gmOnly && (
            <Badge variant="outline" className="text-xs">
              GM
            </Badge>
          )}
        </div>
        {notes && (
          <span className="text-xs text-muted-foreground">{notes}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-xs text-muted-foreground mx-1">+</span>}
            <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded shadow-sm">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ===========================
// Category Section Component
// ===========================

interface CategorySectionProps {
  category: string;
  shortcuts: ShortcutInfo[];
  searchQuery?: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  shortcuts,
  searchQuery,
}) => {
  if (shortcuts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {category}
      </h3>
      <div className="space-y-1">
        {shortcuts.map((shortcut, index) => (
          <ShortcutItem key={index} shortcut={shortcut} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  );
};

// ===========================
// Hotkey Guide Component
// ===========================

export const HotkeyGuide: React.FC<HotkeyGuideProps> = ({
  isGM = false,
  className,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState('');

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (open: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
  };

  // Hotkey to toggle guide
  useHotkeys({
    hotkeys: [
      {
        key: '?',
        description: 'Toggle hotkey guide',
        callback: () => handleOpenChange(!isOpen),
      },
    ],
    enabled: true,
  });

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    let shortcuts = SHORTCUTS;

    // Filter GM-only shortcuts
    if (!isGM) {
      shortcuts = shortcuts.filter((s) => !s.gmOnly);
    }

    // Filter by search query
    if (searchQuery) {
      shortcuts = shortcuts.filter(
        (s) =>
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return shortcuts;
  }, [isGM, searchQuery]);

  // Group by category
  const categorizedShortcuts = useMemo(() => {
    const categories = new Map<string, ShortcutInfo[]>();

    filteredShortcuts.forEach((shortcut) => {
      const category = shortcut.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(shortcut);
    });

    return categories;
  }, [filteredShortcuts]);

  // Category order
  const categoryOrder = ['Tools', 'Actions', 'View', 'Layers', 'Tokens', 'Drawing', 'Measurement'];

  // ===========================
  // Render
  // ===========================

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('max-w-2xl max-h-[80vh] flex flex-col', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            All available keyboard shortcuts for the battle map
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {categoryOrder.map((category) => {
            const shortcuts = categorizedShortcuts.get(category) || [];
            return (
              <CategorySection
                key={category}
                category={category}
                shortcuts={shortcuts}
                searchQuery={searchQuery}
              />
            );
          })}

          {/* No Results */}
          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No shortcuts found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Keyboard className="h-3 w-3" />
            <span>Press ? to toggle this guide</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{filteredShortcuts.length} shortcuts</span>
            {isGM && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <Badge variant="outline" className="text-xs">
                  GM Mode
                </Badge>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===========================
// Hotkey Badge Component
// ===========================

export interface HotkeyBadgeProps {
  /** Keyboard keys */
  keys: string[];
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Display keyboard shortcut in a badge
 */
export const HotkeyBadge: React.FC<HotkeyBadgeProps> = ({
  keys,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1.5 text-sm',
  };

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-xs text-muted-foreground mx-0.5">+</span>}
          <kbd
            className={cn(
              'font-mono bg-muted border border-border rounded shadow-sm',
              sizeClasses[size]
            )}
          >
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  );
};

// ===========================
// Exports
// ===========================

export type { HotkeyGuideProps, HotkeyBadgeProps, ShortcutInfo };
