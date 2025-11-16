/**
 * Toolbar Component
 *
 * Main toolbar for battle map tools.
 * Provides tool selection buttons with icons, tooltips, and keyboard shortcuts.
 *
 * Features:
 * - Tool buttons: Select, Pan, Measure, Draw, AoE, Wall, Fog
 * - Active tool highlighting
 * - Icons from lucide-react
 * - Keyboard shortcuts in tooltips
 * - Responsive layout (horizontal on desktop, vertical on mobile)
 * - Tool groups (Navigation, Drawing, GM Tools)
 * - GM-only tools visibility
 *
 * @module components/battle-map/Toolbar
 */

import React, { useCallback } from 'react';
import {
  MousePointer2,
  Hand,
  Ruler,
  Pen,
  Circle,
  Box,
  Eye,
  Grid3x3,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useBattleMapStore, type ToolType } from '@/stores/useBattleMapStore';
import { useHotkeys, BATTLE_MAP_HOTKEYS, createHotkeyFromPreset } from '@/hooks/use-hotkeys';

// ===========================
// Types
// ===========================

export interface ToolbarProps {
  /** Current scene ID */
  sceneId: string;
  /** Whether user is GM */
  isGM?: boolean;
  /** Orientation of toolbar */
  orientation?: 'horizontal' | 'vertical';
  /** Position of toolbar */
  position?: 'top' | 'left' | 'right' | 'bottom';
  /** Custom className */
  className?: string;
  /** Show help button */
  showHelp?: boolean;
  /** Callback when help is clicked */
  onHelpClick?: () => void;
  /** Callback when settings is clicked */
  onSettingsClick?: () => void;
}

interface ToolConfig {
  id: ToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  description: string;
  category: 'navigation' | 'drawing' | 'gm';
  gmOnly?: boolean;
}

// ===========================
// Tool Configurations
// ===========================

const TOOLS: ToolConfig[] = [
  // Navigation Tools
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    shortcut: 'S',
    description: 'Select and move tokens',
    category: 'navigation',
  },
  {
    id: 'pan',
    label: 'Pan',
    icon: Hand,
    shortcut: 'P',
    description: 'Pan the view',
    category: 'navigation',
  },
  {
    id: 'measure',
    label: 'Measure',
    icon: Ruler,
    shortcut: 'M',
    description: 'Measure distance',
    category: 'navigation',
  },

  // Drawing Tools
  {
    id: 'draw',
    label: 'Draw',
    icon: Pen,
    shortcut: 'D',
    description: 'Draw freehand',
    category: 'drawing',
  },
  {
    id: 'move',
    label: 'AoE',
    icon: Circle,
    shortcut: 'A',
    description: 'Area of Effect templates',
    category: 'drawing',
  },

  // GM Tools
  {
    id: 'wall',
    label: 'Wall',
    icon: Box,
    shortcut: 'W',
    description: 'Draw walls and doors',
    category: 'gm',
    gmOnly: true,
  },
  {
    id: 'fog-brush',
    label: 'Fog',
    icon: Eye,
    shortcut: 'F',
    description: 'Reveal/hide fog of war',
    category: 'gm',
    gmOnly: true,
  },
];

// ===========================
// Tool Button Component
// ===========================

interface ToolButtonProps {
  tool: ToolConfig;
  isActive: boolean;
  onClick: () => void;
  orientation: 'horizontal' | 'vertical';
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, isActive, onClick, orientation }) => {
  const Icon = tool.icon;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'default' : 'ghost'}
            size="icon"
            onClick={onClick}
            className={cn(
              'relative',
              isActive && 'bg-primary text-primary-foreground',
              !isActive && 'hover:bg-accent hover:text-accent-foreground'
            )}
            aria-label={tool.label}
            aria-pressed={isActive}
          >
            <Icon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={orientation === 'vertical' ? 'right' : 'bottom'}>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{tool.label}</span>
            <span className="text-xs text-muted-foreground">{tool.description}</span>
            <span className="text-xs font-mono bg-muted px-1 rounded self-start">
              {tool.shortcut}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ===========================
// Toolbar Component
// ===========================

export const Toolbar: React.FC<ToolbarProps> = ({
  sceneId,
  isGM = false,
  orientation = 'vertical',
  position = 'left',
  className,
  showHelp = true,
  onHelpClick,
  onSettingsClick,
}) => {
  const selectedTool = useBattleMapStore((state) => state.selectedTool);
  const setTool = useBattleMapStore((state) => state.setTool);

  // ===========================
  // Tool Selection Handler
  // ===========================

  const handleToolSelect = useCallback(
    (tool: ToolType) => {
      setTool(tool);
    },
    [setTool]
  );

  // ===========================
  // Hotkeys Setup
  // ===========================

  useHotkeys({
    hotkeys: [
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.SELECT_TOOL, () => handleToolSelect('select')),
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.PAN_TOOL, () => handleToolSelect('pan')),
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.MEASURE_TOOL, () => handleToolSelect('measure')),
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.DRAW_TOOL, () => handleToolSelect('draw')),
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.AOE_TOOL, () => handleToolSelect('move')),
      ...(isGM
        ? [
            createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.WALL_TOOL, () => handleToolSelect('wall')),
            createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.FOG_TOOL, () => handleToolSelect('fog-brush')),
          ]
        : []),
      ...(onHelpClick
        ? [createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.HELP, () => onHelpClick())]
        : []),
    ],
    enabled: true,
  });

  // ===========================
  // Filter Tools
  // ===========================

  const visibleTools = TOOLS.filter((tool) => {
    if (tool.gmOnly && !isGM) return false;
    return true;
  });

  // Group tools by category
  const navigationTools = visibleTools.filter((t) => t.category === 'navigation');
  const drawingTools = visibleTools.filter((t) => t.category === 'drawing');
  const gmTools = visibleTools.filter((t) => t.category === 'gm');

  // ===========================
  // Render
  // ===========================

  return (
    <div
      className={cn(
        'flex gap-2 p-2 bg-background border rounded-lg shadow-md',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        // Position-based styling
        position === 'left' && 'fixed left-4 top-1/2 -translate-y-1/2 z-50',
        position === 'right' && 'fixed right-4 top-1/2 -translate-y-1/2 z-50',
        position === 'top' && 'fixed top-4 left-1/2 -translate-x-1/2 z-50',
        position === 'bottom' && 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        className
      )}
      role="toolbar"
      aria-label="Battle map tools"
    >
      {/* Navigation Tools */}
      <div
        className={cn(
          'flex gap-1',
          orientation === 'vertical' ? 'flex-col' : 'flex-row'
        )}
      >
        {navigationTools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={selectedTool === tool.id}
            onClick={() => handleToolSelect(tool.id)}
            orientation={orientation}
          />
        ))}
      </div>

      {drawingTools.length > 0 && (
        <>
          <Separator
            orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
            className="my-1"
          />

          {/* Drawing Tools */}
          <div
            className={cn(
              'flex gap-1',
              orientation === 'vertical' ? 'flex-col' : 'flex-row'
            )}
          >
            {drawingTools.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                isActive={selectedTool === tool.id}
                onClick={() => handleToolSelect(tool.id)}
                orientation={orientation}
              />
            ))}
          </div>
        </>
      )}

      {gmTools.length > 0 && (
        <>
          <Separator
            orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
            className="my-1"
          />

          {/* GM Tools */}
          <div
            className={cn(
              'flex gap-1',
              orientation === 'vertical' ? 'flex-col' : 'flex-row'
            )}
          >
            {gmTools.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                isActive={selectedTool === tool.id}
                onClick={() => handleToolSelect(tool.id)}
                orientation={orientation}
              />
            ))}
          </div>
        </>
      )}

      {/* Help and Settings */}
      {(showHelp || onSettingsClick) && (
        <>
          <Separator
            orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
            className="my-1"
          />

          <div
            className={cn(
              'flex gap-1',
              orientation === 'vertical' ? 'flex-col' : 'flex-row'
            )}
          >
            {showHelp && onHelpClick && (
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onHelpClick}
                      aria-label="Help"
                    >
                      <HelpCircle className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={orientation === 'vertical' ? 'right' : 'bottom'}>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Keyboard Shortcuts</span>
                      <span className="text-xs font-mono bg-muted px-1 rounded self-start">
                        ?
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onSettingsClick && (
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onSettingsClick}
                      aria-label="Settings"
                    >
                      <Grid3x3 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={orientation === 'vertical' ? 'right' : 'bottom'}>
                    <span className="font-medium">Settings</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ===========================
// Responsive Toolbar Wrapper
// ===========================

export interface ResponsiveToolbarProps extends Omit<ToolbarProps, 'orientation' | 'position'> {
  /** Breakpoint for mobile (in pixels) */
  mobileBreakpoint?: number;
}

/**
 * Responsive toolbar that adjusts orientation based on screen size
 */
export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  mobileBreakpoint = 768,
  ...props
}) => {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  return (
    <Toolbar
      {...props}
      orientation={isMobile ? 'horizontal' : 'vertical'}
      position={isMobile ? 'bottom' : 'left'}
    />
  );
};

// ===========================
// Exports
// ===========================

export type { ToolbarProps, ResponsiveToolbarProps };
