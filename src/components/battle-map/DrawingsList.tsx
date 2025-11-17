/**
 * DrawingsList Component
 *
 * Manages and displays all drawings on a scene.
 *
 * Features:
 * - List all drawings on scene
 * - Thumbnail preview
 * - Creator name
 * - Delete button (own drawings or GM)
 * - Toggle visibility per drawing
 * - Layer assignment
 * - Z-index reordering
 *
 * @module components/battle-map/DrawingsList
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Pen,
  Square,
  Circle,
  Minus,
  Type,
  Pentagon,
} from 'lucide-react';
import { trpc } from '@/infrastructure/api';
import type { SceneDrawing, DrawingType } from '@/types/drawing';
import logger from '@/lib/logger';
import { cn } from '@/lib/utils';

// ===========================
// Types
// ===========================

export interface DrawingsListProps {
  /** Scene ID to list drawings for */
  sceneId: string;
  /** Current user ID */
  userId?: string;
  /** Is current user a GM */
  isGM?: boolean;
  /** Callback when drawing is selected */
  onDrawingSelect?: (drawingId: string) => void;
  /** Callback when drawing is deleted */
  onDrawingDelete?: (drawingId: string) => void;
  /** Callback when drawing visibility changes */
  onDrawingVisibilityChange?: (drawingId: string, visible: boolean) => void;
  /** Currently selected drawing ID */
  selectedDrawingId?: string;
  /** Show in compact mode */
  compact?: boolean;
}

// ===========================
// Drawing Type Icons
// ===========================

const DRAWING_TYPE_ICONS: Record<DrawingType, React.ComponentType<{ className?: string }>> = {
  freehand: Pen,
  line: Minus,
  rectangle: Square,
  circle: Circle,
  polygon: Pentagon,
  text: Type,
};

// ===========================
// Component
// ===========================

export function DrawingsList({
  sceneId,
  userId,
  isGM = false,
  onDrawingSelect,
  onDrawingDelete,
  onDrawingVisibilityChange,
  selectedDrawingId,
  compact = false,
}: DrawingsListProps) {
  const [expandedDrawingId, setExpandedDrawingId] = useState<string | null>(null);

  // ===========================
  // Data Fetching
  // ===========================

  const {
    data: drawings,
    isLoading,
    refetch,
  } = trpc.drawings?.listByScene.useQuery(
    { sceneId },
    {
      enabled: !!sceneId,
      refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    }
  );

  const updateDrawingMutation = trpc.drawings?.update.useMutation();
  const deleteDrawingMutation = trpc.drawings?.delete.useMutation();

  // ===========================
  // Handlers
  // ===========================

  const handleToggleVisibility = useCallback(
    async (drawing: SceneDrawing) => {
      try {
        const newHidden = !drawing.hidden;

        await updateDrawingMutation.mutateAsync({
          drawingId: drawing.id,
          hidden: newHidden,
        });

        if (onDrawingVisibilityChange) {
          onDrawingVisibilityChange(drawing.id, !newHidden);
        }

        refetch();
        logger.debug('Drawing visibility toggled', { drawingId: drawing.id, hidden: newHidden });
      } catch (error) {
        logger.error('Failed to toggle drawing visibility', { error });
      }
    },
    [updateDrawingMutation, onDrawingVisibilityChange, refetch]
  );

  const handleToggleLock = useCallback(
    async (drawing: SceneDrawing) => {
      try {
        const newLocked = !drawing.locked;

        await updateDrawingMutation.mutateAsync({
          drawingId: drawing.id,
          locked: newLocked,
        });

        refetch();
        logger.debug('Drawing lock toggled', { drawingId: drawing.id, locked: newLocked });
      } catch (error) {
        logger.error('Failed to toggle drawing lock', { error });
      }
    },
    [updateDrawingMutation, refetch]
  );

  const handleDelete = useCallback(
    async (drawing: SceneDrawing) => {
      if (!confirm(`Delete ${drawing.drawingType} drawing?`)) return;

      try {
        await deleteDrawingMutation.mutateAsync({ drawingId: drawing.id });

        if (onDrawingDelete) {
          onDrawingDelete(drawing.id);
        }

        refetch();
        logger.info('Drawing deleted', { drawingId: drawing.id });
      } catch (error) {
        logger.error('Failed to delete drawing', { error });
      }
    },
    [deleteDrawingMutation, onDrawingDelete, refetch]
  );

  const handleMoveUp = useCallback(
    async (drawing: SceneDrawing) => {
      try {
        await updateDrawingMutation.mutateAsync({
          drawingId: drawing.id,
          zIndex: (drawing.zIndex || 0) + 1,
        });

        refetch();
        logger.debug('Drawing moved up', { drawingId: drawing.id });
      } catch (error) {
        logger.error('Failed to move drawing up', { error });
      }
    },
    [updateDrawingMutation, refetch]
  );

  const handleMoveDown = useCallback(
    async (drawing: SceneDrawing) => {
      try {
        await updateDrawingMutation.mutateAsync({
          drawingId: drawing.id,
          zIndex: Math.max(0, (drawing.zIndex || 0) - 1),
        });

        refetch();
        logger.debug('Drawing moved down', { drawingId: drawing.id });
      } catch (error) {
        logger.error('Failed to move drawing down', { error });
      }
    },
    [updateDrawingMutation, refetch]
  );

  // ===========================
  // Permissions
  // ===========================

  const canDelete = useCallback(
    (drawing: SceneDrawing): boolean => {
      return isGM || drawing.authorId === userId;
    },
    [isGM, userId]
  );

  const canEdit = useCallback(
    (drawing: SceneDrawing): boolean => {
      return !drawing.locked && (isGM || drawing.authorId === userId);
    },
    [isGM, userId]
  );

  // ===========================
  // Sorting
  // ===========================

  const sortedDrawings = useMemo(() => {
    if (!drawings) return [];
    return [...drawings].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  }, [drawings]);

  // ===========================
  // Render Drawing Item
  // ===========================

  const renderDrawingItem = (drawing: SceneDrawing) => {
    const Icon = DRAWING_TYPE_ICONS[drawing.drawingType];
    const isSelected = drawing.id === selectedDrawingId;
    const isExpanded = drawing.id === expandedDrawingId;

    return (
      <div
        key={drawing.id}
        className={cn(
          'border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer',
          isSelected && 'ring-2 ring-primary bg-accent/30'
        )}
        onClick={() => {
          if (onDrawingSelect) {
            onDrawingSelect(drawing.id);
          }
          setExpandedDrawingId(isExpanded ? null : drawing.id);
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium capitalize flex-1">
            {drawing.drawingType}
          </span>

          {/* Status badges */}
          <div className="flex gap-1">
            {drawing.hidden && (
              <Badge variant="outline" className="text-xs">
                Hidden
              </Badge>
            )}
            {drawing.locked && (
              <Badge variant="outline" className="text-xs">
                Locked
              </Badge>
            )}
            {drawing.gmOnly && (
              <Badge variant="outline" className="text-xs">
                GM
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {drawing.label && (
          <p className="text-xs text-muted-foreground mb-2">{drawing.label}</p>
        )}

        {/* Drawing preview info */}
        <div className="text-xs text-muted-foreground mb-2">
          {drawing.drawingType === 'text' && drawing.text && (
            <span>"{drawing.text.content.substring(0, 30)}..."</span>
          )}
          {drawing.drawingType === 'freehand' && drawing.points && (
            <span>{drawing.points.length} points</span>
          )}
          {drawing.drawingType === 'rectangle' && (
            <span>
              {Math.round(drawing.width || 0)} × {Math.round(drawing.height || 0)}
            </span>
          )}
          {drawing.drawingType === 'circle' && (
            <span>Radius: {Math.round(drawing.radius || 0)}</span>
          )}
          {drawing.drawingType === 'polygon' && drawing.points && (
            <span>{drawing.points.length} vertices</span>
          )}
        </div>

        {/* Actions (expanded) */}
        {isExpanded && (
          <div className="flex gap-1 mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            {/* Visibility toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleVisibility(drawing)}
              title={drawing.hidden ? 'Show' : 'Hide'}
            >
              {drawing.hidden ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>

            {/* Lock toggle (GM only) */}
            {isGM && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleLock(drawing)}
                title={drawing.locked ? 'Unlock' : 'Lock'}
              >
                {drawing.locked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
              </Button>
            )}

            {/* Z-index controls */}
            {canEdit(drawing) && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveUp(drawing)}
                  title="Move up"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveDown(drawing)}
                  title="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </>
            )}

            <div className="flex-1" />

            {/* Delete button */}
            {canDelete(drawing) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(drawing)}
                className="text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ===========================
  // Render
  // ===========================

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drawings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!drawings || drawings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drawings</CardTitle>
          <CardDescription>No drawings on this scene</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Drawings ({drawings.length})</h3>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {sortedDrawings.map(renderDrawingItem)}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawings</CardTitle>
        <CardDescription>
          {drawings.length} drawing{drawings.length !== 1 ? 's' : ''} on this scene
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {sortedDrawings.map(renderDrawingItem)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * DrawingsListCompact - Compact version for sidebars
 */
export function DrawingsListCompact(props: Omit<DrawingsListProps, 'compact'>) {
  return <DrawingsList {...props} compact={true} />;
}
