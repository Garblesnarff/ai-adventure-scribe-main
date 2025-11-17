/**
 * Tool Options Panel Component
 *
 * Contextual options panel that displays settings for the active tool.
 * Provides tool-specific controls like stroke width, colors, template types, etc.
 *
 * Features:
 * - Contextual options based on active tool
 * - Stroke width slider for drawing tools
 * - Color pickers for drawing
 * - Template type selector for AoE tool
 * - Wall type selector for wall tool
 * - Fog brush size for fog tool
 * - Collapsible panel
 * - Auto-show when tool is selected
 * - Configurable position (top, side, floating)
 *
 * @module components/battle-map/ToolOptionsPanel
 */

import React, { useState, useEffect } from 'react';
import {
  Paintbrush,
  Circle,
  Square,
  Triangle,
  Minus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useBattleMapStore, type ToolType } from '@/stores/useBattleMapStore';
import { useDrawingTool } from '@/hooks/use-drawing-tool';

// ===========================
// Types
// ===========================

export interface ToolOptionsPanelProps {
  /** Current scene ID */
  sceneId: string;
  /** User ID */
  userId?: string;
  /** Position of the panel */
  position?: 'top' | 'left' | 'right' | 'floating';
  /** Custom className */
  className?: string;
  /** Auto-collapse when no tool is selected */
  autoCollapse?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Callback when options change */
  onOptionsChange?: (options: ToolOptions) => void;
}

export interface ToolOptions {
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  fillEnabled?: boolean;
  templateType?: 'cone' | 'cube' | 'sphere' | 'line' | 'cylinder';
  wallType?: 'solid' | 'door' | 'window' | 'terrain';
  fogBrushSize?: number;
  fogBrushMode?: 'reveal' | 'conceal';
  snapToGrid?: boolean;
}

// ===========================
// Color Picker Component
// ===========================

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, className }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Label className="text-sm flex-shrink-0">{label}</Label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded border cursor-pointer"
        />
        <span className="text-xs text-muted-foreground font-mono">{value}</span>
      </div>
    </div>
  );
};

// ===========================
// Tool Options Panel Component
// ===========================

export const ToolOptionsPanel: React.FC<ToolOptionsPanelProps> = ({
  sceneId,
  userId,
  position = 'top',
  className,
  autoCollapse = true,
  defaultCollapsed = false,
  onOptionsChange,
}) => {
  const selectedTool = useBattleMapStore((state) => state.selectedTool);
  const wallType = useBattleMapStore((state) => state.wallType);
  const setWallType = useBattleMapStore((state) => state.setWallType);
  const fogBrushSize = useBattleMapStore((state) => state.fogBrushSize);
  const setFogBrushSize = useBattleMapStore((state) => state.setFogBrushSize);
  const fogBrushMode = useBattleMapStore((state) => state.fogBrushMode);
  const setFogBrushMode = useBattleMapStore((state) => state.setFogBrushMode);
  const wallSnapToGrid = useBattleMapStore((state) => state.wallSnapToGrid);
  const toggleWallSnapToGrid = useBattleMapStore((state) => state.toggleWallSnapToGrid);

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [templateType, setTemplateType] = useState<'cone' | 'cube' | 'sphere' | 'line' | 'cylinder'>('cone');

  // Drawing tool state
  const drawingTool = useDrawingTool({
    sceneId,
    userId,
  });

  // Auto-collapse when no relevant tool is selected
  useEffect(() => {
    if (autoCollapse && selectedTool === 'select') {
      setIsCollapsed(true);
    } else if (selectedTool && selectedTool !== 'select') {
      setIsCollapsed(false);
    }
  }, [selectedTool, autoCollapse]);

  // Notify parent of option changes
  useEffect(() => {
    if (onOptionsChange) {
      onOptionsChange({
        strokeWidth: drawingTool.state.strokeWidth,
        strokeColor: drawingTool.state.strokeColor,
        fillColor: drawingTool.state.fillColor,
        fillOpacity: drawingTool.state.fillOpacity,
        fillEnabled: drawingTool.state.fillEnabled,
        templateType,
        wallType,
        fogBrushSize,
        fogBrushMode,
        snapToGrid: wallSnapToGrid,
      });
    }
  }, [
    drawingTool.state,
    templateType,
    wallType,
    fogBrushSize,
    fogBrushMode,
    wallSnapToGrid,
    onOptionsChange,
  ]);

  // ===========================
  // Render Tool-Specific Options
  // ===========================

  const renderDrawOptions = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm">Stroke Width</Label>
        <Slider
          value={[drawingTool.state.strokeWidth]}
          onValueChange={([value]) => drawingTool.setStrokeWidth(value)}
          min={1}
          max={20}
          step={1}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{drawingTool.state.strokeWidth}px</span>
      </div>

      <ColorPicker
        label="Stroke Color"
        value={drawingTool.state.strokeColor}
        onChange={drawingTool.setStrokeColor}
      />

      <div className="flex items-center gap-2">
        <Button
          variant={drawingTool.state.fillEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => drawingTool.setFillEnabled(!drawingTool.state.fillEnabled)}
        >
          {drawingTool.state.fillEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span className="ml-2">Fill</span>
        </Button>
      </div>

      {drawingTool.state.fillEnabled && (
        <>
          <ColorPicker
            label="Fill Color"
            value={drawingTool.state.fillColor}
            onChange={drawingTool.setFillColor}
          />

          <div className="space-y-2">
            <Label className="text-sm">Fill Opacity</Label>
            <Slider
              value={[drawingTool.state.fillOpacity * 100]}
              onValueChange={([value]) => drawingTool.setFillOpacity(value / 100)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">
              {Math.round(drawingTool.state.fillOpacity * 100)}%
            </span>
          </div>
        </>
      )}
    </div>
  );

  const renderAoEOptions = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm">Template Type</Label>
        <Select value={templateType} onValueChange={(value: any) => setTemplateType(value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cone">
              <div className="flex items-center gap-2">
                <Triangle className="h-4 w-4" />
                <span>Cone</span>
              </div>
            </SelectItem>
            <SelectItem value="cube">
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                <span>Cube</span>
              </div>
            </SelectItem>
            <SelectItem value="sphere">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                <span>Sphere</span>
              </div>
            </SelectItem>
            <SelectItem value="line">
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4" />
                <span>Line</span>
              </div>
            </SelectItem>
            <SelectItem value="cylinder">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                <span>Cylinder</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ColorPicker
        label="Template Color"
        value={drawingTool.state.fillColor}
        onChange={drawingTool.setFillColor}
      />

      <div className="space-y-2">
        <Label className="text-sm">Opacity</Label>
        <Slider
          value={[drawingTool.state.fillOpacity * 100]}
          onValueChange={([value]) => drawingTool.setFillOpacity(value / 100)}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">
          {Math.round(drawingTool.state.fillOpacity * 100)}%
        </span>
      </div>
    </div>
  );

  const renderWallOptions = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm">Wall Type</Label>
        <Select value={wallType} onValueChange={(value: any) => setWallType(value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid Wall</SelectItem>
            <SelectItem value="door">Door</SelectItem>
            <SelectItem value="window">Window</SelectItem>
            <SelectItem value="terrain">Terrain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={wallSnapToGrid ? 'default' : 'outline'}
          size="sm"
          onClick={toggleWallSnapToGrid}
        >
          {wallSnapToGrid ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          <span className="ml-2">Snap to Grid</span>
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Stroke Width</Label>
        <Slider
          value={[drawingTool.state.strokeWidth]}
          onValueChange={([value]) => drawingTool.setStrokeWidth(value)}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{drawingTool.state.strokeWidth}px</span>
      </div>
    </div>
  );

  const renderFogOptions = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm">Brush Mode</Label>
        <Select value={fogBrushMode} onValueChange={(value: any) => setFogBrushMode(value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reveal">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Reveal</span>
              </div>
            </SelectItem>
            <SelectItem value="conceal">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                <span>Conceal</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Brush Size</Label>
        <Slider
          value={[fogBrushSize]}
          onValueChange={([value]) => setFogBrushSize(value)}
          min={10}
          max={200}
          step={10}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{fogBrushSize}px</span>
      </div>
    </div>
  );

  const renderMeasureOptions = () => (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Click and drag to measure distance.
      </div>
      <ColorPicker
        label="Line Color"
        value={drawingTool.state.strokeColor}
        onChange={drawingTool.setStrokeColor}
      />
    </div>
  );

  const renderToolOptions = () => {
    switch (selectedTool) {
      case 'draw':
        return renderDrawOptions();
      case 'move': // AoE tool
        return renderAoEOptions();
      case 'wall':
        return renderWallOptions();
      case 'fog-brush':
        return renderFogOptions();
      case 'measure':
        return renderMeasureOptions();
      case 'pan':
      case 'select':
      default:
        return (
          <div className="text-sm text-muted-foreground text-center py-4">
            No options available for this tool
          </div>
        );
    }
  };

  // Don't render if no tool is selected and autoCollapse is true
  if (autoCollapse && !selectedTool) {
    return null;
  }

  // ===========================
  // Render
  // ===========================

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={setIsCollapsed}
      className={cn(
        'bg-background border rounded-lg shadow-md',
        position === 'top' && 'fixed top-4 left-1/2 -translate-x-1/2 z-40 w-80',
        position === 'left' && 'fixed left-20 top-4 z-40 w-80',
        position === 'right' && 'fixed right-4 top-4 z-40 w-80',
        position === 'floating' && 'absolute z-40 w-80',
        className
      )}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-between p-3 hover:bg-accent"
        >
          <div className="flex items-center gap-2">
            <Paintbrush className="h-4 w-4" />
            <span className="font-medium">Tool Options</span>
            {selectedTool && (
              <span className="text-xs text-muted-foreground capitalize">
                ({selectedTool})
              </span>
            )}
          </div>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Separator />
        <div className="p-4">{renderToolOptions()}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// ===========================
// Exports
// ===========================

export type { ToolOptionsPanelProps, ToolOptions };
