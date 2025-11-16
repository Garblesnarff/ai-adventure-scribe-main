/**
 * Token Context Menu
 *
 * Right-click context menu for tokens on the battle map.
 * Provides quick access to common token operations with permissions-based visibility.
 *
 * Features:
 * - View character sheet
 * - Target/untarget token
 * - Move to different layer
 * - Edit token properties
 * - Remove token
 * - Conditional menu items based on permissions
 */

import * as React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import type { Token } from '@/types/token';
import type { LayerType } from '@/types/scene';
import {
  Eye,
  Target,
  Edit3,
  Trash2,
  User,
  Layers,
  Lock,
  Unlock,
  Copy,
  RotateCcw,
} from 'lucide-react';

export interface TokenContextMenuProps {
  token: Token;
  children: React.ReactNode;
  onViewCharacterSheet?: (token: Token) => void;
  onEditToken?: (token: Token) => void;
  onRemoveToken?: (token: Token) => void;
  onMoveToLayer?: (token: Token, layer: LayerType) => void;
  onDuplicateToken?: (token: Token) => void;
  onResetPosition?: (token: Token) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

/**
 * Context menu for token interactions
 */
export function TokenContextMenu({
  token,
  children,
  onViewCharacterSheet,
  onEditToken,
  onRemoveToken,
  onMoveToLayer,
  onDuplicateToken,
  onResetPosition,
  canEdit = true,
  canDelete = true,
}: TokenContextMenuProps) {
  const targetToken = useBattleMapStore((state) => state.targetToken);
  const clearTargets = useBattleMapStore((state) => state.clearTargets);
  const targetedTokenIds = useBattleMapStore((state) => state.targetedTokenIds);

  const isTargeted = targetedTokenIds.includes(token.id);

  const handleViewCharacterSheet = React.useCallback(() => {
    if (onViewCharacterSheet) {
      onViewCharacterSheet(token);
    }
  }, [token, onViewCharacterSheet]);

  const handleToggleTarget = React.useCallback(() => {
    if (isTargeted) {
      clearTargets();
    } else {
      targetToken(token.id);
    }
  }, [token.id, isTargeted, targetToken, clearTargets]);

  const handleEditToken = React.useCallback(() => {
    if (onEditToken) {
      onEditToken(token);
    }
  }, [token, onEditToken]);

  const handleRemoveToken = React.useCallback(() => {
    if (onRemoveToken) {
      onRemoveToken(token);
    }
  }, [token, onRemoveToken]);

  const handleMoveToLayer = React.useCallback(
    (layer: LayerType) => {
      if (onMoveToLayer) {
        onMoveToLayer(token, layer);
      }
    },
    [token, onMoveToLayer],
  );

  const handleDuplicateToken = React.useCallback(() => {
    if (onDuplicateToken) {
      onDuplicateToken(token);
    }
  }, [token, onDuplicateToken]);

  const handleResetPosition = React.useCallback(() => {
    if (onResetPosition) {
      onResetPosition(token);
    }
  }, [token, onResetPosition]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* View Character Sheet */}
        {token.characterId && onViewCharacterSheet && (
          <>
            <ContextMenuItem onClick={handleViewCharacterSheet}>
              <User className="mr-2 h-4 w-4" />
              View Character Sheet
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {/* Target Token */}
        <ContextMenuItem onClick={handleToggleTarget}>
          <Target className="mr-2 h-4 w-4" />
          {isTargeted ? 'Untarget' : 'Target'} Token
        </ContextMenuItem>

        {/* View/Hide Token */}
        <ContextMenuItem disabled={!canEdit}>
          <Eye className="mr-2 h-4 w-4" />
          {token.hidden ? 'Show' : 'Hide'} Token
        </ContextMenuItem>

        {/* Lock/Unlock Token */}
        <ContextMenuItem disabled={!canEdit}>
          {token.locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
          {token.locked ? 'Unlock' : 'Lock'} Token
        </ContextMenuItem>

        {/* Edit Operations */}
        {canEdit && (
          <>
            <ContextMenuSeparator />

            {/* Move to Layer */}
            {onMoveToLayer && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Layers className="mr-2 h-4 w-4" />
                  Move to Layer
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => handleMoveToLayer('tokens' as LayerType)}>
                    Tokens Layer
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleMoveToLayer('effects' as LayerType)}>
                    Effects Layer
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleMoveToLayer('background' as LayerType)}>
                    Background Layer
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}

            {/* Duplicate Token */}
            {onDuplicateToken && (
              <ContextMenuItem onClick={handleDuplicateToken}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Token
              </ContextMenuItem>
            )}

            {/* Reset Position */}
            {onResetPosition && (
              <ContextMenuItem onClick={handleResetPosition}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Position
              </ContextMenuItem>
            )}

            {/* Edit Token */}
            {onEditToken && (
              <ContextMenuItem onClick={handleEditToken}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Token
              </ContextMenuItem>
            )}
          </>
        )}

        {/* Delete */}
        {canDelete && onRemoveToken && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleRemoveToken} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Token
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
