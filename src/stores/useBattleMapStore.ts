/**
 * Zustand Battle Map Store
 *
 * Manages battle map state including layers, camera, and tool selection.
 * Uses localStorage persistence for user preferences.
 *
 * Features:
 * - Layer visibility and opacity control
 * - Camera position and zoom
 * - Tool selection (select, move, measure, draw)
 * - Active scene tracking
 * - Persistent storage of user preferences
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ===========================
// Types
// ===========================

export type LayerType = 'background' | 'grid' | 'tokens' | 'effects' | 'drawings' | 'ui';

export type ToolType = 'select' | 'move' | 'measure' | 'draw' | 'pan';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface LayerState {
  visible: boolean;
  opacity: number;
  locked: boolean;
}

// ===========================
// Store Interface
// ===========================

interface BattleMapState {
  // Scene
  activeSceneId: string | null;

  // Layers - maps layerId to layer state
  layerVisibility: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  layerLocked: Record<string, boolean>;

  // Camera
  camera: CameraState;

  // Tools
  selectedTool: ToolType;

  // Token Selection
  selectedTokenIds: string[];
  targetedTokenIds: string[];
  hoveredTokenId: string | null;
  draggedTokenId: string | null;

  // Actions - Scene
  setActiveSceneId: (sceneId: string | null) => void;

  // Actions - Layers
  toggleLayerVisibility: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerLock: (layerId: string, locked: boolean) => void;
  getLayerState: (layerId: string) => LayerState;

  // Actions - Camera
  setCamera: (camera: Partial<CameraState>) => void;
  resetCamera: () => void;

  // Actions - Tools
  setTool: (tool: ToolType) => void;

  // Actions - Token Selection
  selectToken: (tokenId: string, multiSelect?: boolean) => void;
  deselectToken: (tokenId: string) => void;
  toggleSelectToken: (tokenId: string) => void;
  clearSelection: () => void;
  targetToken: (tokenId: string, replace?: boolean) => void;
  clearTargets: () => void;
  setHoveredToken: (tokenId: string | null) => void;
  setDraggedToken: (tokenId: string | null) => void;

  // Actions - Reset
  resetLayers: () => void;
}

// ===========================
// Initial State
// ===========================

const initialCamera: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

const defaultLayerState: LayerState = {
  visible: true,
  opacity: 1,
  locked: false,
};

const initialState = {
  activeSceneId: null,
  layerVisibility: {},
  layerOpacity: {},
  layerLocked: {},
  camera: initialCamera,
  selectedTool: 'select' as ToolType,
  selectedTokenIds: [],
  targetedTokenIds: [],
  hoveredTokenId: null,
  draggedTokenId: null,
};

// ===========================
// Store Creation
// ===========================

export const useBattleMapStore = create<BattleMapState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ===========================
        // Scene Actions
        // ===========================

        setActiveSceneId: (sceneId) =>
          set({ activeSceneId: sceneId }, false, 'battleMap/setActiveSceneId'),

        // ===========================
        // Layer Actions
        // ===========================

        toggleLayerVisibility: (layerId) =>
          set(
            (state) => ({
              layerVisibility: {
                ...state.layerVisibility,
                [layerId]: !state.layerVisibility[layerId],
              },
            }),
            false,
            'battleMap/toggleLayerVisibility',
          ),

        setLayerVisibility: (layerId, visible) =>
          set(
            (state) => ({
              layerVisibility: {
                ...state.layerVisibility,
                [layerId]: visible,
              },
            }),
            false,
            'battleMap/setLayerVisibility',
          ),

        setLayerOpacity: (layerId, opacity) =>
          set(
            (state) => ({
              layerOpacity: {
                ...state.layerOpacity,
                [layerId]: Math.max(0, Math.min(1, opacity)),
              },
            }),
            false,
            'battleMap/setLayerOpacity',
          ),

        toggleLayerLock: (layerId) =>
          set(
            (state) => ({
              layerLocked: {
                ...state.layerLocked,
                [layerId]: !state.layerLocked[layerId],
              },
            }),
            false,
            'battleMap/toggleLayerLock',
          ),

        setLayerLock: (layerId, locked) =>
          set(
            (state) => ({
              layerLocked: {
                ...state.layerLocked,
                [layerId]: locked,
              },
            }),
            false,
            'battleMap/setLayerLock',
          ),

        getLayerState: (layerId) => {
          const state = get();
          return {
            visible: state.layerVisibility[layerId] ?? defaultLayerState.visible,
            opacity: state.layerOpacity[layerId] ?? defaultLayerState.opacity,
            locked: state.layerLocked[layerId] ?? defaultLayerState.locked,
          };
        },

        // ===========================
        // Camera Actions
        // ===========================

        setCamera: (camera) =>
          set(
            (state) => ({
              camera: {
                ...state.camera,
                ...camera,
              },
            }),
            false,
            'battleMap/setCamera',
          ),

        resetCamera: () => set({ camera: initialCamera }, false, 'battleMap/resetCamera'),

        // ===========================
        // Tool Actions
        // ===========================

        setTool: (tool) => set({ selectedTool: tool }, false, 'battleMap/setTool'),

        // ===========================
        // Token Selection Actions
        // ===========================

        selectToken: (tokenId, multiSelect = false) =>
          set(
            (state) => ({
              selectedTokenIds: multiSelect
                ? [...state.selectedTokenIds, tokenId]
                : [tokenId],
            }),
            false,
            'battleMap/selectToken',
          ),

        deselectToken: (tokenId) =>
          set(
            (state) => ({
              selectedTokenIds: state.selectedTokenIds.filter((id) => id !== tokenId),
            }),
            false,
            'battleMap/deselectToken',
          ),

        toggleSelectToken: (tokenId) =>
          set(
            (state) => ({
              selectedTokenIds: state.selectedTokenIds.includes(tokenId)
                ? state.selectedTokenIds.filter((id) => id !== tokenId)
                : [...state.selectedTokenIds, tokenId],
            }),
            false,
            'battleMap/toggleSelectToken',
          ),

        clearSelection: () =>
          set({ selectedTokenIds: [] }, false, 'battleMap/clearSelection'),

        targetToken: (tokenId, replace = false) =>
          set(
            (state) => ({
              targetedTokenIds: replace
                ? [tokenId]
                : state.targetedTokenIds.includes(tokenId)
                  ? state.targetedTokenIds
                  : [...state.targetedTokenIds, tokenId],
            }),
            false,
            'battleMap/targetToken',
          ),

        clearTargets: () =>
          set({ targetedTokenIds: [] }, false, 'battleMap/clearTargets'),

        setHoveredToken: (tokenId) =>
          set({ hoveredTokenId: tokenId }, false, 'battleMap/setHoveredToken'),

        setDraggedToken: (tokenId) =>
          set({ draggedTokenId: tokenId }, false, 'battleMap/setDraggedToken'),

        // ===========================
        // Reset Actions
        // ===========================

        resetLayers: () =>
          set(
            {
              layerVisibility: {},
              layerOpacity: {},
              layerLocked: {},
            },
            false,
            'battleMap/resetLayers',
          ),
      }),
      {
        name: 'battle-map-storage',
        // Only persist user preferences, not the active scene
        partialize: (state) => ({
          layerVisibility: state.layerVisibility,
          layerOpacity: state.layerOpacity,
          layerLocked: state.layerLocked,
          camera: state.camera,
          selectedTool: state.selectedTool,
        }),
      },
    ),
    { name: 'BattleMapStore' },
  ),
);

// ===========================
// Selector Hooks
// ===========================

/**
 * Hook to get the active scene ID
 */
export const useActiveSceneId = () => useBattleMapStore((state) => state.activeSceneId);

/**
 * Hook to get layer state for a specific layer
 */
export const useLayerState = (layerId: string) =>
  useBattleMapStore((state) => state.getLayerState(layerId));

/**
 * Hook to get camera state
 */
export const useCamera = () => useBattleMapStore((state) => state.camera);

/**
 * Hook to get selected tool
 */
export const useSelectedTool = () => useBattleMapStore((state) => state.selectedTool);

/**
 * Hook to get layer visibility for a specific layer
 */
export const useLayerVisibility = (layerId: string) =>
  useBattleMapStore((state) => state.layerVisibility[layerId] ?? true);

/**
 * Hook to get layer opacity for a specific layer
 */
export const useLayerOpacity = (layerId: string) =>
  useBattleMapStore((state) => state.layerOpacity[layerId] ?? 1);

/**
 * Hook to get layer lock state for a specific layer
 */
export const useLayerLocked = (layerId: string) =>
  useBattleMapStore((state) => state.layerLocked[layerId] ?? false);

/**
 * Hook to get selected token IDs
 */
export const useSelectedTokenIds = () => useBattleMapStore((state) => state.selectedTokenIds);

/**
 * Hook to get targeted token IDs
 */
export const useTargetedTokenIds = () => useBattleMapStore((state) => state.targetedTokenIds);

/**
 * Hook to get dragged token ID
 */
export const useDraggedTokenId = () => useBattleMapStore((state) => state.draggedTokenId);

/**
 * Hook to check if a specific token is selected
 */
export const useIsTokenSelected = (tokenId: string) =>
  useBattleMapStore((state) => state.selectedTokenIds.includes(tokenId));

/**
 * Hook to check if a specific token is targeted
 */
export const useIsTokenTargeted = (tokenId: string) =>
  useBattleMapStore((state) => state.targetedTokenIds.includes(tokenId));

/**
 * Hook to get hovered token ID
 */
export const useHoveredTokenId = () => useBattleMapStore((state) => state.hoveredTokenId);

/**
 * Hook to check if a specific token is hovered
 */
export const useIsTokenHovered = (tokenId: string) =>
  useBattleMapStore((state) => state.hoveredTokenId === tokenId);
