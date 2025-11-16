/**
 * DrawingTool Component
 *
 * Main drawing tool interface for the battle map.
 * Provides toolbar with drawing mode selection and settings.
 *
 * Features:
 * - Tool modes: freehand, line, circle, rectangle, polygon, text
 * - Stroke color and width picker
 * - Fill color and opacity
 * - Layer selection (drawings layer by default)
 * - Undo/redo support
 * - Delete selected drawing
 *
 * @module components/battle-map/DrawingTool
 */

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Pen,
  Square,
  Circle,
  Minus,
  Type,
  Pentagon,
  Trash2,
  Undo,
  Redo,
  Palette,
  PaintBucket,
} from 'lucide-react';
import { FreehandDrawing } from './FreehandDrawing';
import { ShapeDrawing, type ShapeData } from './ShapeDrawing';
import { TextAnnotation, type TextAnnotationData } from './TextAnnotation';
import { useDrawingTool } from '@/hooks/use-drawing-tool';
import { DrawingType, FillType } from '@/types/drawing';
import type { Point2D } from '@/types/scene';
import logger from '@/lib/logger';
import { cn } from '@/lib/utils';

// ===========================
// Types
// ===========================

export interface DrawingToolProps {
  /** Scene ID */
  sceneId: string;
  /** User ID */
  userId?: string;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Grid size */
  gridSize?: number;
  /** Enable grid snapping */
  snapToGrid?: boolean;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Toolbar position */
  toolbarPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Callback when drawing is created */
  onDrawingCreated?: (drawing: any) => void;
  /** Callback when drawing is deleted */
  onDrawingDeleted?: (drawingId: string) => void;
}

// ===========================
// Tool Configuration
// ===========================

const DRAWING_TOOLS = [
  { type: DrawingType.FREEHAND, icon: Pen, label: 'Freehand', shortcut: 'F' },
  { type: DrawingType.LINE, icon: Minus, label: 'Line', shortcut: 'L' },
  { type: DrawingType.RECTANGLE, icon: Square, label: 'Rectangle', shortcut: 'R' },
  { type: DrawingType.CIRCLE, icon: Circle, label: 'Circle', shortcut: 'C' },
  { type: DrawingType.POLYGON, icon: Pentagon, label: 'Polygon', shortcut: 'P' },
  { type: DrawingType.TEXT, icon: Type, label: 'Text', shortcut: 'T' },
];

// ===========================
// Component
// ===========================

export function DrawingTool({
  sceneId,
  userId,
  width,
  height,
  gridSize = 50,
  snapToGrid = false,
  showToolbar = true,
  toolbarPosition = 'left',
  onDrawingCreated,
  onDrawingDeleted,
}: DrawingToolProps) {
  const drawingTool = useDrawingTool({
    sceneId,
    userId,
    onDrawingCreated,
    onDrawingDeleted,
  });

  const {
    state,
    setActiveTool,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    setStrokeColor,
    setStrokeWidth,
    setFillColor,
    setFillOpacity,
    setFillEnabled,
    setFontSize,
    setTextColor,
    undo,
    redo,
    canUndo,
    canRedo,
  } = drawingTool;

  // ===========================
  // Tool Selection
  // ===========================

  const handleToolSelect = useCallback(
    (tool: DrawingType) => {
      if (state.activeTool === tool) {
        setActiveTool(null); // Deselect if clicking the same tool
      } else {
        setActiveTool(tool);
      }
      logger.debug('Drawing tool selected', { tool });
    },
    [state.activeTool, setActiveTool]
  );

  // ===========================
  // Drawing Handlers
  // ===========================

  const handleFreehandComplete = useCallback(
    (points: Point2D[]) => {
      updateDrawing({ points });
      finishDrawing();
    },
    [updateDrawing, finishDrawing]
  );

  const handleShapeComplete = useCallback(
    (data: ShapeData) => {
      updateDrawing({
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        radius: data.radius,
        points: data.points,
      });
      finishDrawing();
    },
    [updateDrawing, finishDrawing]
  );

  const handleTextComplete = useCallback(
    (data: TextAnnotationData) => {
      updateDrawing({
        x: data.x,
        y: data.y,
        text: data.text,
      });
      finishDrawing();
    },
    [updateDrawing, finishDrawing]
  );

  // ===========================
  // Keyboard Shortcuts
  // ===========================

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tool shortcuts
      const toolShortcut = DRAWING_TOOLS.find(
        (tool) => tool.shortcut.toLowerCase() === event.key.toLowerCase()
      );
      if (toolShortcut) {
        event.preventDefault();
        handleToolSelect(toolShortcut.type);
      }

      // Undo/Redo handled by hook
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToolSelect]);

  // ===========================
  // Render Toolbar
  // ===========================

  const renderToolbar = () => {
    if (!showToolbar) return null;

    const isVertical = toolbarPosition === 'left' || toolbarPosition === 'right';

    return (
      <div
        className={cn(
          'bg-background/95 backdrop-blur-sm border shadow-lg rounded-lg p-2',
          isVertical ? 'flex flex-col gap-2' : 'flex flex-row gap-2 items-center flex-wrap'
        )}
      >
        {/* Drawing tools */}
        <div className={cn('flex gap-1', isVertical ? 'flex-col' : 'flex-row')}>
          {DRAWING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Button
                key={tool.type}
                variant={state.activeTool === tool.type ? 'default' : 'outline'}
                size="icon"
                onClick={() => handleToolSelect(tool.type)}
                title={`${tool.label} (${tool.shortcut})`}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>

        <Separator orientation={isVertical ? 'horizontal' : 'vertical'} />

        {/* Stroke color */}
        <div className={cn('flex gap-2 items-center', isVertical ? 'flex-row' : 'flex-col sm:flex-row')}>
          <Label htmlFor="stroke-color" className="text-xs whitespace-nowrap">
            <Palette className="h-3 w-3 inline mr-1" />
            Stroke
          </Label>
          <input
            id="stroke-color"
            type="color"
            value={state.strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="h-8 w-12 rounded border cursor-pointer"
          />
        </div>

        {/* Stroke width */}
        <div className={cn('flex gap-2 items-center min-w-[120px]', isVertical ? 'flex-col' : 'flex-row')}>
          <Label htmlFor="stroke-width" className="text-xs whitespace-nowrap">
            Width: {state.strokeWidth}px
          </Label>
          <Slider
            id="stroke-width"
            min={1}
            max={20}
            step={1}
            value={[state.strokeWidth]}
            onValueChange={([value]) => setStrokeWidth(value)}
            className="flex-1"
          />
        </div>

        <Separator orientation={isVertical ? 'horizontal' : 'vertical'} />

        {/* Fill toggle */}
        <div className="flex items-center gap-2">
          <input
            id="fill-enabled"
            type="checkbox"
            checked={state.fillEnabled}
            onChange={(e) => setFillEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
          />
          <Label htmlFor="fill-enabled" className="text-xs cursor-pointer">
            Fill
          </Label>
        </div>

        {/* Fill color (when enabled) */}
        {state.fillEnabled && (
          <>
            <div className={cn('flex gap-2 items-center', isVertical ? 'flex-row' : 'flex-col sm:flex-row')}>
              <Label htmlFor="fill-color" className="text-xs whitespace-nowrap">
                <PaintBucket className="h-3 w-3 inline mr-1" />
                Fill
              </Label>
              <input
                id="fill-color"
                type="color"
                value={state.fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="h-8 w-12 rounded border cursor-pointer"
              />
            </div>

            {/* Fill opacity */}
            <div className={cn('flex gap-2 items-center min-w-[120px]', isVertical ? 'flex-col' : 'flex-row')}>
              <Label htmlFor="fill-opacity" className="text-xs whitespace-nowrap">
                Opacity: {Math.round(state.fillOpacity * 100)}%
              </Label>
              <Slider
                id="fill-opacity"
                min={0}
                max={1}
                step={0.1}
                value={[state.fillOpacity]}
                onValueChange={([value]) => setFillOpacity(value)}
                className="flex-1"
              />
            </div>
          </>
        )}

        <Separator orientation={isVertical ? 'horizontal' : 'vertical'} />

        {/* Undo/Redo */}
        <div className={cn('flex gap-1', isVertical ? 'flex-col' : 'flex-row')}>
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Clear all button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            // TODO: Implement clear all
            logger.warn('Clear all not yet implemented');
          }}
          title="Clear All"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // ===========================
  // Render Active Tool
  // ===========================

  const renderActiveTool = () => {
    const stroke = {
      width: state.strokeWidth,
      color: state.strokeColor,
      alpha: 1.0,
      style: 'solid' as const,
    };

    const fill = {
      type: state.fillEnabled ? FillType.SOLID : FillType.NONE,
      color: state.fillColor,
      alpha: state.fillOpacity,
    };

    switch (state.activeTool) {
      case DrawingType.FREEHAND:
        return (
          <FreehandDrawing
            stroke={stroke}
            onStart={startDrawing}
            onComplete={handleFreehandComplete}
            onCancel={cancelDrawing}
            width={width}
            height={height}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
          />
        );

      case DrawingType.LINE:
        return (
          <ShapeDrawing
            shapeType="line"
            stroke={stroke}
            fill={fill}
            onStart={startDrawing}
            onComplete={handleShapeComplete}
            onCancel={cancelDrawing}
            width={width}
            height={height}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
          />
        );

      case DrawingType.RECTANGLE:
        return (
          <ShapeDrawing
            shapeType="rectangle"
            stroke={stroke}
            fill={fill}
            onStart={startDrawing}
            onComplete={handleShapeComplete}
            onCancel={cancelDrawing}
            width={width}
            height={height}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
          />
        );

      case DrawingType.CIRCLE:
        return (
          <ShapeDrawing
            shapeType="circle"
            stroke={stroke}
            fill={fill}
            onStart={startDrawing}
            onComplete={handleShapeComplete}
            onCancel={cancelDrawing}
            width={width}
            height={height}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
          />
        );

      case DrawingType.POLYGON:
        return (
          <ShapeDrawing
            shapeType="polygon"
            stroke={stroke}
            fill={fill}
            onStart={startDrawing}
            onComplete={handleShapeComplete}
            onCancel={cancelDrawing}
            width={width}
            height={height}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
          />
        );

      case DrawingType.TEXT:
        return (
          <TextAnnotation
            textConfig={{
              content: '',
              fontFamily: 'Arial',
              fontSize: 24,
              color: state.textColor || state.strokeColor,
              alpha: 1.0,
              textAlign: 'left',
            }}
            onStart={startDrawing}
            onComplete={handleTextComplete}
            onCancel={cancelDrawing}
            width={width}
            height={height}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
          />
        );

      default:
        return null;
    }
  };

  // ===========================
  // Render
  // ===========================

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      {showToolbar && (
        <div
          className={cn(
            'absolute z-10',
            toolbarPosition === 'top' && 'top-4 left-1/2 -translate-x-1/2',
            toolbarPosition === 'bottom' && 'bottom-4 left-1/2 -translate-x-1/2',
            toolbarPosition === 'left' && 'left-4 top-1/2 -translate-y-1/2',
            toolbarPosition === 'right' && 'right-4 top-1/2 -translate-y-1/2'
          )}
        >
          {renderToolbar()}
        </div>
      )}

      {/* Active drawing tool */}
      {renderActiveTool()}

      {/* Instructions overlay */}
      {state.activeTool && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border shadow-lg text-xs text-muted-foreground pointer-events-none">
          {state.activeTool === DrawingType.POLYGON && 'Click to add points, double-click to finish'}
          {state.activeTool === DrawingType.TEXT && 'Click to place text'}
          {(state.activeTool === DrawingType.FREEHAND) && 'Click and drag to draw'}
          {(state.activeTool === DrawingType.LINE ||
            state.activeTool === DrawingType.RECTANGLE ||
            state.activeTool === DrawingType.CIRCLE) &&
            'Click and drag to draw • Hold Shift to constrain'}
          <span className="ml-2 text-primary">Press ESC to cancel</span>
        </div>
      )}
    </div>
  );
}
