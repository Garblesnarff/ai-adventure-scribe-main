/**
 * Mobile Controls Component
 *
 * Touch-optimized controls for mobile devices.
 * Bottom-docked toolbar with swipeable tools and gesture hints.
 *
 * Features:
 * - Bottom-docked toolbar
 * - Swipe to reveal more tools
 * - Large touch-friendly buttons (min 44x44px)
 * - Simplified tool set
 * - Gesture hints overlay
 * - Touch gestures: pinch to zoom, two-finger pan
 * - Quick action button
 * - Collapsible for full-screen view
 *
 * @module components/battle-map/MobileControls
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Hand,
  Ruler,
  Pen,
  Circle,
  Eye,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useBattleMapStore, type ToolType } from '@/stores/useBattleMapStore';

// ===========================
// Types
// ===========================

export interface MobileControlsProps {
  /** Current scene ID */
  sceneId: string;
  /** Whether user is GM */
  isGM?: boolean;
  /** Custom className */
  className?: string;
  /** Show gesture hints */
  showGestureHints?: boolean;
  /** Callback when tool is selected */
  onToolSelect?: (tool: ToolType) => void;
  /** Callback when zoom changes */
  onZoom?: (delta: number) => void;
  /** Callback when help is requested */
  onHelpClick?: () => void;
}

interface MobileTool {
  id: ToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gmOnly?: boolean;
}

// ===========================
// Mobile Tool Configurations
// ===========================

const MOBILE_TOOLS: MobileTool[] = [
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
  },
  {
    id: 'pan',
    label: 'Pan',
    icon: Hand,
  },
  {
    id: 'measure',
    label: 'Measure',
    icon: Ruler,
  },
  {
    id: 'draw',
    label: 'Draw',
    icon: Pen,
  },
  {
    id: 'move',
    label: 'AoE',
    icon: Circle,
  },
  {
    id: 'fog-brush',
    label: 'Fog',
    icon: Eye,
    gmOnly: true,
  },
];

// ===========================
// Gesture Hints Component
// ===========================

interface GestureHintsProps {
  onDismiss: () => void;
}

const GestureHints: React.FC<GestureHintsProps> = ({ onDismiss }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Touch Gestures</h3>
          <Button variant="ghost" size="icon" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Hand className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Pan</p>
              <p className="text-sm text-muted-foreground">
                Two fingers drag to move the view
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Zoom</p>
              <p className="text-sm text-muted-foreground">
                Pinch to zoom in/out
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <MousePointer2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Select</p>
              <p className="text-sm text-muted-foreground">
                Tap to select tokens
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Circle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Long Press</p>
              <p className="text-sm text-muted-foreground">
                Long press for quick actions menu
              </p>
            </div>
          </div>
        </div>

        <Button onClick={onDismiss} className="w-full">
          Got it!
        </Button>
      </div>
    </div>
  );
};

// ===========================
// Tool Button Component
// ===========================

interface ToolButtonProps {
  tool: MobileTool;
  isActive: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, isActive, onClick }) => {
  const Icon = tool.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] min-h-[60px] rounded-lg transition-all',
        'active:scale-95 touch-manipulation',
        isActive
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-background hover:bg-accent border'
      )}
      aria-label={tool.label}
      aria-pressed={isActive}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium whitespace-nowrap">{tool.label}</span>
    </button>
  );
};

// ===========================
// Mobile Controls Component
// ===========================

export const MobileControls: React.FC<MobileControlsProps> = ({
  sceneId,
  isGM = false,
  className,
  showGestureHints: showGestureHintsProp = false,
  onToolSelect,
  onZoom,
  onHelpClick,
}) => {
  const selectedTool = useBattleMapStore((state) => state.selectedTool);
  const setTool = useBattleMapStore((state) => state.setTool);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showGestureHints, setShowGestureHints] = useState(showGestureHintsProp);
  const [toolsScrollPosition, setToolsScrollPosition] = useState(0);
  const toolsContainerRef = useRef<HTMLDivElement>(null);

  // First-time user hint
  useEffect(() => {
    const hasSeenHints = localStorage.getItem('mobile-controls-hints-seen');
    if (!hasSeenHints) {
      setShowGestureHints(true);
    }
  }, []);

  const handleDismissHints = useCallback(() => {
    setShowGestureHints(false);
    localStorage.setItem('mobile-controls-hints-seen', 'true');
  }, []);

  // ===========================
  // Tool Selection
  // ===========================

  const handleToolSelect = useCallback(
    (tool: ToolType) => {
      setTool(tool);
      onToolSelect?.(tool);
    },
    [setTool, onToolSelect]
  );

  // ===========================
  // Zoom Controls
  // ===========================

  const handleZoomIn = useCallback(() => {
    onZoom?.(0.1);
  }, [onZoom]);

  const handleZoomOut = useCallback(() => {
    onZoom?.(-0.1);
  }, [onZoom]);

  // ===========================
  // Tools Scrolling
  // ===========================

  const scrollTools = useCallback((direction: 'left' | 'right') => {
    if (!toolsContainerRef.current) return;

    const container = toolsContainerRef.current;
    const scrollAmount = 200;

    if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }
  }, []);

  useEffect(() => {
    const container = toolsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setToolsScrollPosition(container.scrollLeft);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter tools
  const visibleTools = MOBILE_TOOLS.filter((tool) => {
    if (tool.gmOnly && !isGM) return false;
    return true;
  });

  const showLeftScroll = toolsScrollPosition > 0;
  const showRightScroll = toolsContainerRef.current
    ? toolsScrollPosition < toolsContainerRef.current.scrollWidth - toolsContainerRef.current.clientWidth
    : false;

  // ===========================
  // Render
  // ===========================

  return (
    <>
      {/* Gesture Hints Overlay */}
      {showGestureHints && <GestureHints onDismiss={handleDismissHints} />}

      {/* Mobile Toolbar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-lg transition-transform',
          isCollapsed && 'translate-y-full',
          className
        )}
      >
        {/* Collapse/Expand Button */}
        <div className="absolute -top-10 right-4">
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-full shadow-lg"
          >
            {isCollapsed ? <Maximize2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        </div>

        {/* Tools Container */}
        <div className="relative">
          {/* Left Scroll Button */}
          {showLeftScroll && (
            <button
              onClick={() => scrollTools('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm border rounded-r-lg p-2 shadow-md"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Tools Scroll Container */}
          <div
            ref={toolsContainerRef}
            className="flex gap-2 p-3 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {visibleTools.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                isActive={selectedTool === tool.id}
                onClick={() => handleToolSelect(tool.id)}
              />
            ))}
          </div>

          {/* Right Scroll Button */}
          {showRightScroll && (
            <button
              onClick={() => scrollTools('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm border rounded-l-lg p-2 shadow-md"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        <Separator />

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between p-3 gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              className="min-w-[44px] min-h-[44px]"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              className="min-w-[44px] min-h-[44px]"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>

          {/* Current Tool Indicator */}
          <div className="flex-1 flex items-center justify-center">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {MOBILE_TOOLS.find((t) => t.id === selectedTool)?.label || 'Select'}
            </Badge>
          </div>

          {/* Help and Menu */}
          <div className="flex items-center gap-1">
            {onHelpClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={onHelpClick}
                className="min-w-[44px] min-h-[44px]"
                aria-label="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="min-w-[44px] min-h-[44px]"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[50vh]">
                <SheetHeader>
                  <SheetTitle>Battle Map Menu</SheetTitle>
                  <SheetDescription>
                    Additional options and settings
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setShowGestureHints(true)}
                  >
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Show Gesture Hints
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setIsCollapsed(true)}
                  >
                    <Maximize2 className="h-5 w-5 mr-2" />
                    Full Screen Mode
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Collapsed Toolbar Indicator */}
      {isCollapsed && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="rounded-full shadow-lg min-w-[56px] min-h-[56px]"
            aria-label="Show controls"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

// ===========================
// Mobile Detection Hook
// ===========================

export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

// ===========================
// Touch Gesture Hook
// ===========================

export interface TouchGestureHandlers {
  onPinchZoom?: (scale: number, center: { x: number; y: number }) => void;
  onTwoFingerPan?: (delta: { x: number; y: number }) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
}

export function useTouchGestures(handlers: TouchGestureHandlers) {
  const touchesRef = useRef<Touch[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number>(0);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      touchesRef.current = Array.from(event.touches);

      // Long press detection (single touch)
      if (event.touches.length === 1 && handlers.onLongPress) {
        const touch = event.touches[0];
        longPressTimerRef.current = setTimeout(() => {
          handlers.onLongPress!({ x: touch.clientX, y: touch.clientY });
        }, 500);
      }

      // Pinch zoom initialization (two touches)
      if (event.touches.length === 2) {
        const [touch1, touch2] = Array.from(event.touches);
        initialDistanceRef.current = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
      }
    },
    [handlers]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      // Clear long press timer on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const currentTouches = Array.from(event.touches);

      // Pinch zoom (two touches)
      if (currentTouches.length === 2 && touchesRef.current.length === 2 && handlers.onPinchZoom) {
        const [touch1, touch2] = currentTouches;
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = currentDistance / initialDistanceRef.current;
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        handlers.onPinchZoom(scale, { x: centerX, y: centerY });
        initialDistanceRef.current = currentDistance;
      }

      // Two-finger pan
      if (currentTouches.length === 2 && touchesRef.current.length === 2 && handlers.onTwoFingerPan) {
        const [prevTouch1, prevTouch2] = touchesRef.current;
        const [currTouch1, currTouch2] = currentTouches;

        const prevCenterX = (prevTouch1.clientX + prevTouch2.clientX) / 2;
        const prevCenterY = (prevTouch1.clientY + prevTouch2.clientY) / 2;
        const currCenterX = (currTouch1.clientX + currTouch2.clientX) / 2;
        const currCenterY = (currTouch1.clientY + currTouch2.clientY) / 2;

        handlers.onTwoFingerPan({
          x: currCenterX - prevCenterX,
          y: currCenterY - prevCenterY,
        });
      }

      touchesRef.current = currentTouches;
    },
    [handlers]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchesRef.current = [];
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

// ===========================
// Exports
// ===========================

export type { MobileControlsProps, TouchGestureHandlers };
