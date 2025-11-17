/**
 * TextAnnotation Component
 *
 * Handles text label placement and editing on the battle map.
 *
 * Features:
 * - Click to place text
 * - Text input dialog
 * - Font size picker (small/medium/large)
 * - Color picker
 * - Background toggle
 * - Drag to reposition
 * - Edit on double-click
 *
 * @module components/battle-map/TextAnnotation
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Point2D } from '@/types/scene';
import type { TextConfig, StrokeConfig } from '@/types/drawing';
import logger from '@/lib/logger';

// ===========================
// Types
// ===========================

export interface TextAnnotationProps {
  /** Text configuration */
  textConfig: Partial<TextConfig>;
  /** Callback when text placement starts */
  onStart?: (point: Point2D) => void;
  /** Callback when text is placed */
  onComplete?: (data: TextAnnotationData) => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Enable text placement */
  enabled?: boolean;
  /** Grid size for snapping (optional) */
  gridSize?: number;
  /** Enable grid snapping */
  snapToGrid?: boolean;
}

export interface TextAnnotationData {
  x: number;
  y: number;
  text: TextConfig;
}

// ===========================
// Font Size Mapping
// ===========================

const FONT_SIZES = {
  small: 16,
  medium: 24,
  large: 36,
};

// ===========================
// Utility Functions
// ===========================

/**
 * Snap a point to grid
 */
function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Get mouse/touch position relative to SVG element
 */
function getRelativePosition(
  event: React.MouseEvent | React.TouchEvent,
  svgElement: SVGSVGElement
): Point2D {
  const rect = svgElement.getBoundingClientRect();

  let clientX: number;
  let clientY: number;

  if ('touches' in event) {
    const touch = event.touches[0] || event.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

// ===========================
// Component
// ===========================

export function TextAnnotation({
  textConfig,
  onStart,
  onComplete,
  onCancel,
  width,
  height,
  enabled = true,
  gridSize = 0,
  snapToGrid: shouldSnapToGrid = false,
}: TextAnnotationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [clickPoint, setClickPoint] = useState<Point2D | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [textColor, setTextColor] = useState(textConfig.color || '#000000');
  const [hasBackground, setHasBackground] = useState(true);

  // ===========================
  // Click Handler
  // ===========================

  const handleClick = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!enabled || !svgRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const point = getRelativePosition(event, svgRef.current);
      const finalPoint =
        shouldSnapToGrid && gridSize > 0 ? snapToGrid(point, gridSize) : point;

      setClickPoint(finalPoint);
      setShowDialog(true);

      if (onStart) {
        onStart(finalPoint);
      }

      logger.debug('Text annotation placement started', { point: finalPoint });
    },
    [enabled, onStart, shouldSnapToGrid, gridSize]
  );

  // ===========================
  // Dialog Handlers
  // ===========================

  const handleSave = useCallback(() => {
    if (!clickPoint || !textContent.trim()) return;

    const textData: TextAnnotationData = {
      x: clickPoint.x,
      y: clickPoint.y,
      text: {
        content: textContent,
        fontFamily: textConfig.fontFamily || 'Arial',
        fontSize: FONT_SIZES[fontSize],
        fontWeight: textConfig.fontWeight || 'normal',
        fontStyle: textConfig.fontStyle || 'normal',
        textAlign: textConfig.textAlign || 'left',
        color: textColor,
        alpha: textConfig.alpha || 1.0,
        ...(hasBackground && {
          shadow: {
            color: '#000000',
            blur: 4,
            offsetX: 0,
            offsetY: 0,
          },
        }),
      },
    };

    if (onComplete) {
      onComplete(textData);
    }

    // Reset state
    setShowDialog(false);
    setClickPoint(null);
    setTextContent('');
    setFontSize('medium');

    logger.debug('Text annotation completed', { text: textContent, point: clickPoint });
  }, [clickPoint, textContent, fontSize, textColor, hasBackground, textConfig, onComplete]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setClickPoint(null);
    setTextContent('');
    setFontSize('medium');

    if (onCancel) {
      onCancel();
    }

    logger.debug('Text annotation cancelled');
  }, [onCancel]);

  // ===========================
  // Keyboard Handlers
  // ===========================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDialog) {
        event.preventDefault();
        handleCancel();
      }

      if (event.key === 'Enter' && showDialog && textContent.trim()) {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDialog, textContent, handleCancel, handleSave]);

  // ===========================
  // Render
  // ===========================

  if (!enabled) return null;

  return (
    <>
      {/* Click area */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-auto cursor-text"
        onClick={handleClick}
        style={{ touchAction: 'none' }}
      >
        {/* Preview marker at click point */}
        {clickPoint && (
          <circle
            cx={clickPoint.x}
            cy={clickPoint.y}
            r={4}
            fill={textColor}
            fillOpacity={0.5}
            stroke={textColor}
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Text input dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Text Annotation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Text input */}
            <div className="space-y-2">
              <Label htmlFor="text-content">Text</Label>
              <Input
                id="text-content"
                placeholder="Enter text..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                autoFocus
              />
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size</Label>
              <div className="flex gap-2">
                <Button
                  variant={fontSize === 'small' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize('small')}
                >
                  Small
                </Button>
                <Button
                  variant={fontSize === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize('medium')}
                >
                  Medium
                </Button>
                <Button
                  variant={fontSize === 'large' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize('large')}
                >
                  Large
                </Button>
              </div>
            </div>

            {/* Text color */}
            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="text-color"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-20 rounded border cursor-pointer"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Background toggle */}
            <div className="flex items-center gap-2">
              <input
                id="has-background"
                type="checkbox"
                checked={hasBackground}
                onChange={(e) => setHasBackground(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
              />
              <Label htmlFor="has-background" className="cursor-pointer">
                Add shadow/background
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!textContent.trim()}>
              Add Text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * TextAnnotationPreview - Display a text annotation
 */
export interface TextAnnotationPreviewProps {
  x: number;
  y: number;
  text: TextConfig;
  className?: string;
  onDoubleClick?: () => void;
}

export function TextAnnotationPreview({
  x,
  y,
  text,
  className,
  onDoubleClick,
}: TextAnnotationPreviewProps) {
  const textRef = useRef<SVGTextElement>(null);
  const [bbox, setBbox] = useState<DOMRect | null>(null);

  // Get bounding box for background
  useEffect(() => {
    if (textRef.current) {
      setBbox(textRef.current.getBBox());
    }
  }, [text.content, text.fontSize]);

  const padding = 4;

  return (
    <g className={className} onDoubleClick={onDoubleClick}>
      {/* Background shadow */}
      {text.shadow && bbox && (
        <rect
          x={bbox.x - padding}
          y={bbox.y - padding}
          width={bbox.width + padding * 2}
          height={bbox.height + padding * 2}
          fill={text.shadow.color}
          fillOpacity={0.7}
          rx={4}
        />
      )}

      {/* Text */}
      <text
        ref={textRef}
        x={x}
        y={y}
        fill={text.color}
        fillOpacity={text.alpha}
        fontFamily={text.fontFamily}
        fontSize={text.fontSize}
        fontWeight={text.fontWeight}
        fontStyle={text.fontStyle}
        textAnchor={text.textAlign === 'center' ? 'middle' : text.textAlign === 'right' ? 'end' : 'start'}
        dominantBaseline="hanging"
        className="select-none"
        style={{ pointerEvents: 'all', cursor: 'pointer' }}
      >
        {text.content}
      </text>

      {/* Text stroke/outline */}
      {text.stroke && (
        <text
          x={x}
          y={y}
          fill="none"
          stroke={text.stroke.color}
          strokeWidth={text.stroke.width}
          strokeOpacity={text.stroke.alpha}
          fontFamily={text.fontFamily}
          fontSize={text.fontSize}
          fontWeight={text.fontWeight}
          fontStyle={text.fontStyle}
          textAnchor={text.textAlign === 'center' ? 'middle' : text.textAlign === 'right' ? 'end' : 'start'}
          dominantBaseline="hanging"
          className="select-none pointer-events-none"
        >
          {text.content}
        </text>
      )}
    </g>
  );
}
