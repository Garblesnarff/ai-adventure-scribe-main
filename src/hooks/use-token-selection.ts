/**
 * Token Selection Hook
 *
 * Manages token selection state and keyboard shortcuts for the battle map.
 * Supports single selection, multi-select with Ctrl/Cmd, and keyboard shortcuts.
 *
 * Features:
 * - Click to select token
 * - Ctrl/Cmd+Click for multi-select
 * - ESC to clear selection
 * - Background click to clear selection
 * - Get selected tokens from store
 */

import { useCallback, useEffect } from 'react';
import { useBattleMapStore, useSelectedTokenIds } from '@/stores/useBattleMapStore';

export interface UseTokenSelectionOptions {
  onSelectionChange?: (selectedIds: string[]) => void;
  enableKeyboardShortcuts?: boolean;
}

export interface UseTokenSelectionReturn {
  selectedTokenIds: string[];
  selectToken: (tokenId: string, multiSelect?: boolean) => void;
  deselectToken: (tokenId: string) => void;
  toggleSelectToken: (tokenId: string) => void;
  clearSelection: () => void;
  isSelected: (tokenId: string) => boolean;
  handleTokenClick: (tokenId: string, event: { ctrlKey?: boolean; metaKey?: boolean }) => void;
  handleBackgroundClick: () => void;
}

/**
 * Hook for managing token selection on the battle map
 */
export function useTokenSelection(
  options: UseTokenSelectionOptions = {},
): UseTokenSelectionReturn {
  const { onSelectionChange, enableKeyboardShortcuts = true } = options;

  // Get state from store
  const selectedTokenIds = useSelectedTokenIds();
  const selectToken = useBattleMapStore((state) => state.selectToken);
  const deselectToken = useBattleMapStore((state) => state.deselectToken);
  const toggleSelectToken = useBattleMapStore((state) => state.toggleSelectToken);
  const clearSelection = useBattleMapStore((state) => state.clearSelection);

  // Check if a token is selected
  const isSelected = useCallback(
    (tokenId: string) => selectedTokenIds.includes(tokenId),
    [selectedTokenIds],
  );

  // Handle token click with modifier key support
  const handleTokenClick = useCallback(
    (tokenId: string, event: { ctrlKey?: boolean; metaKey?: boolean }) => {
      const isMultiSelect = event.ctrlKey || event.metaKey;

      if (isMultiSelect) {
        // Toggle selection when holding Ctrl/Cmd
        toggleSelectToken(tokenId);
      } else {
        // Single select
        selectToken(tokenId, false);
      }
    },
    [selectToken, toggleSelectToken],
  );

  // Handle background click to clear selection
  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC to clear selection
      if (event.key === 'Escape' && selectedTokenIds.length > 0) {
        clearSelection();
        event.preventDefault();
      }

      // Ctrl/Cmd+A to select all (could be implemented later)
      // if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      //   // selectAllTokens();
      //   event.preventDefault();
      // }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardShortcuts, selectedTokenIds.length, clearSelection]);

  // Notify on selection change
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedTokenIds);
    }
  }, [selectedTokenIds, onSelectionChange]);

  return {
    selectedTokenIds,
    selectToken,
    deselectToken,
    toggleSelectToken,
    clearSelection,
    isSelected,
    handleTokenClick,
    handleBackgroundClick,
  };
}
