/**
 * Layers Panel Component
 *
 * Provides a UI panel for controlling battle map layers.
 * Allows users to toggle visibility, lock layers, and adjust opacity.
 *
 * Features:
 * - Eye icon to toggle layer visibility
 * - Lock icon to lock/unlock layers
 * - Opacity slider for each layer
 * - Responsive design (collapsible on mobile)
 * - Syncs with backend via tRPC mutations
 * - Uses Shadcn UI components (Sheet, Slider, Switch)
 */

import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Layers } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import { LAYER_CONFIGS, type LayerConfig } from './LayerManager';
import { trpc } from '@/lib/trpc';

// ===========================
// Types
// ===========================

export interface LayersPanelProps {
  sceneId: string;
  /**
   * Side of the screen where the panel should appear
   */
  side?: 'left' | 'right' | 'top' | 'bottom';
  /**
   * Show panel by default (controlled mode)
   */
  open?: boolean;
  /**
   * Callback when panel open state changes
   */
  onOpenChange?: (open: boolean) => void;
}

// ===========================
// Layer Control Item Component
// ===========================

interface LayerControlItemProps {
  layer: LayerConfig;
  sceneId: string;
  layerId: string;
}

const LayerControlItem: React.FC<LayerControlItemProps> = ({ layer, sceneId, layerId }) => {
  const getLayerState = useBattleMapStore((state) => state.getLayerState);
  const toggleLayerVisibility = useBattleMapStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useBattleMapStore((state) => state.toggleLayerLock);
  const setLayerOpacity = useBattleMapStore((state) => state.setLayerOpacity);

  const layerState = getLayerState(layer.id);
  const utils = trpc.useUtils();

  // tRPC mutation for updating layer on backend
  const updateLayer = trpc.scenes.updateLayer.useMutation({
    onSuccess: () => {
      // Invalidate scene query to refresh data
      utils.scenes.getById.invalidate({ sceneId });
    },
    onError: (error) => {
      toast.error(`Failed to update layer: ${error.message}`);
    },
  });

  const handleVisibilityToggle = () => {
    const newVisibility = !layerState.visible;
    toggleLayerVisibility(layer.id);

    // Update backend
    updateLayer.mutate({
      sceneId,
      layerId,
      updates: {
        isVisible: newVisibility,
      },
    });
  };

  const handleLockToggle = () => {
    const newLocked = !layerState.locked;
    toggleLayerLock(layer.id);

    // Update backend
    updateLayer.mutate({
      sceneId,
      layerId,
      updates: {
        locked: newLocked,
      },
    });
  };

  const handleOpacityChange = (values: number[]) => {
    const newOpacity = values[0] ?? 1;
    setLayerOpacity(layer.id, newOpacity);
  };

  const handleOpacityCommit = (values: number[]) => {
    const newOpacity = values[0] ?? 1;

    // Update backend when user releases slider
    updateLayer.mutate({
      sceneId,
      layerId,
      updates: {
        opacity: newOpacity.toFixed(2),
      },
    });
  };

  return (
    <div className="space-y-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* Layer Name and Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-sm shrink-0"
            style={{
              backgroundColor: `hsla(${layer.zIndex * 60}, 70%, 50%, 0.7)`,
            }}
          />
          <span className="font-medium text-sm truncate">{layer.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Visibility Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleVisibilityToggle}
            title={layerState.visible ? 'Hide layer' : 'Show layer'}
          >
            {layerState.visible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* Lock Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleLockToggle}
            title={layerState.locked ? 'Unlock layer' : 'Lock layer'}
          >
            {layerState.locked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Opacity Slider */}
      {layerState.visible && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Opacity</span>
            <span>{Math.round(layerState.opacity * 100)}%</span>
          </div>
          <Slider
            value={[layerState.opacity]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={handleOpacityChange}
            onValueCommit={handleOpacityCommit}
            className="w-full"
            disabled={!layerState.visible}
          />
        </div>
      )}
    </div>
  );
};

// ===========================
// Main LayersPanel Component
// ===========================

export const LayersPanel: React.FC<LayersPanelProps> = ({
  sceneId,
  side = 'right',
  open,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Use controlled or uncontrolled mode
  const actualOpen = open !== undefined ? open : isOpen;
  const actualOnOpenChange = onOpenChange !== undefined ? onOpenChange : setIsOpen;

  // Fetch scene data to get layer IDs
  const { data: sceneData } = trpc.scenes.getById.useQuery(
    { sceneId },
    {
      enabled: !!sceneId,
    },
  );

  // Create a map of layer type to layer ID
  const layerIdMap = React.useMemo(() => {
    if (!sceneData?.layers) return {};

    const map: Record<string, string> = {};
    sceneData.layers.forEach((layer: any) => {
      if (layer.layerType) {
        map[layer.layerType] = layer.id;
      }
    });
    return map;
  }, [sceneData]);

  return (
    <Sheet open={actualOpen} onOpenChange={actualOnOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          title="Open layers panel"
        >
          <Layers className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side={side} className="w-[350px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Layer Controls</SheetTitle>
          <SheetDescription>
            Manage layer visibility, lock status, and opacity for the battle map.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Instructions */}
          <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
            <p className="mb-2 font-medium text-foreground">Layer Controls:</p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2">
                <Eye className="h-3 w-3" />
                <span>Toggle layer visibility</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-3 w-3" />
                <span>Lock layer to prevent interactions</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 bg-muted rounded-sm" />
                <span>Adjust opacity with slider</span>
              </li>
            </ul>
          </div>

          <Separator />

          {/* Layer List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Layers
            </h3>

            {LAYER_CONFIGS.map((layer) => {
              const layerId = layerIdMap[layer.type];

              // Skip if layer doesn't exist in the scene yet
              if (!layerId) {
                return (
                  <div
                    key={layer.id}
                    className="p-3 rounded-lg bg-muted/20 text-muted-foreground text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{
                          backgroundColor: `hsla(${layer.zIndex * 60}, 70%, 50%, 0.3)`,
                        }}
                      />
                      <span>{layer.name}</span>
                      <span className="text-xs">(Not initialized)</span>
                    </div>
                  </div>
                );
              }

              return (
                <LayerControlItem
                  key={layer.id}
                  layer={layer}
                  sceneId={sceneId}
                  layerId={layerId}
                />
              );
            })}
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  LAYER_CONFIGS.forEach((layer) => {
                    useBattleMapStore.getState().setLayerVisibility(layer.id, true);
                  });
                  toast.success('All layers shown');
                }}
              >
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  LAYER_CONFIGS.forEach((layer) => {
                    useBattleMapStore.getState().setLayerVisibility(layer.id, false);
                  });
                  toast.success('All layers hidden');
                }}
              >
                Hide All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  useBattleMapStore.getState().resetLayers();
                  toast.success('Layers reset to defaults');
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LayersPanel;
