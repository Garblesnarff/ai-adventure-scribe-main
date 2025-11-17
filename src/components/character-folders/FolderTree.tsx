/**
 * FolderTree Component
 *
 * Displays a hierarchical folder tree for organizing characters
 * Features:
 * - Nested folder structure with expand/collapse
 * - Drag & drop characters between folders
 * - Drag to reorder folders
 * - Create new folder button
 * - Folder color indicators
 * - Character count badges
 * - Context menu for folder actions
 */

import React, { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreVertical,
  Edit,
  Trash2,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/infrastructure/api/trpc-hooks';
import { useToast } from '@/hooks/use-toast';

interface FolderNode {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  parentFolderId?: string | null;
  characterCount: number;
  children?: FolderNode[];
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  onCreateFolder?: () => void;
  onEditFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onChangeColor?: (folderId: string) => void;
  onCharacterDrop?: (characterId: string, folderId: string | null) => void;
}

interface FolderItemProps {
  folder: FolderNode;
  level: number;
  isSelected: boolean;
  onSelect: (folderId: string | null) => void;
  onEdit: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onChangeColor: (folderId: string) => void;
  onCharacterDrop?: (characterId: string, folderId: string | null) => void;
}

/**
 * Individual folder item with expand/collapse and context menu
 */
const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  level,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onChangeColor,
  onCharacterDrop,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasChildren = folder.children && folder.children.length > 0;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const characterId = e.dataTransfer.getData('characterId');
      if (characterId && onCharacterDrop) {
        onCharacterDrop(characterId, folder.id);
      }
    },
    [folder.id, onCharacterDrop]
  );

  return (
    <div className="select-none">
      <div
        className={cn(
          'group flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200',
          isSelected && 'bg-infinite-purple/10 border-l-2 border-infinite-purple',
          isDragOver && 'bg-infinite-gold/20 border-2 border-dashed border-infinite-gold',
          !isSelected && !isDragOver && 'hover:bg-accent'
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={() => onSelect(folder.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <button
            className="p-0 h-4 w-4 hover:bg-accent rounded"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        {/* Folder Icon with Color */}
        <div
          className="flex-shrink-0"
          style={{ color: folder.color || undefined }}
        >
          {isExpanded && hasChildren ? (
            <FolderOpen className="h-5 w-5" />
          ) : (
            <Folder className="h-5 w-5" />
          )}
        </div>

        {/* Folder Name */}
        <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>

        {/* Character Count Badge */}
        {folder.characterCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {folder.characterCount}
          </Badge>
        )}

        {/* Context Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(folder.id);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onChangeColor(folder.id);
              }}
            >
              <Palette className="mr-2 h-4 w-4" />
              Change Color
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(folder.id);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nested Children */}
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {folder.children!.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              isSelected={isSelected}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onChangeColor={onChangeColor}
              onCharacterDrop={onCharacterDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main FolderTree component
 */
export const FolderTree: React.FC<FolderTreeProps> = ({
  onFolderSelect,
  selectedFolderId,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onChangeColor,
  onCharacterDrop,
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();

  // Fetch folders
  const { data: folders, isLoading, error } = trpc.characterFolders.list.useQuery();

  // Build folder tree structure
  const buildTree = useCallback((folders: any[]): FolderNode[] => {
    if (!folders) return [];

    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // Create folder nodes
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        parentFolderId: folder.parentFolderId,
        characterCount: folder.characterCount || 0,
        children: [],
      });
    });

    // Build tree structure
    folderMap.forEach((folder) => {
      if (folder.parentFolderId) {
        const parent = folderMap.get(folder.parentFolderId);
        if (parent) {
          parent.children!.push(folder);
        }
      } else {
        rootFolders.push(folder);
      }
    });

    return rootFolders;
  }, []);

  const folderTree = buildTree(folders || []);

  const handleSelect = useCallback(
    (folderId: string | null) => {
      if (onFolderSelect) {
        onFolderSelect(folderId);
      }
    },
    [onFolderSelect]
  );

  const handleEdit = useCallback(
    (folderId: string) => {
      if (onEditFolder) {
        onEditFolder(folderId);
      }
    },
    [onEditFolder]
  );

  const handleDelete = useCallback(
    (folderId: string) => {
      if (onDeleteFolder) {
        onDeleteFolder(folderId);
      }
    },
    [onDeleteFolder]
  );

  const handleChangeColor = useCallback(
    (folderId: string) => {
      if (onChangeColor) {
        onChangeColor(folderId);
      }
    },
    [onChangeColor]
  );

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load folders. Please try again.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-4 px-3">
        <h3 className="text-sm font-semibold text-foreground">Folders</h3>
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateFolder}
            className="h-8 gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
        )}
      </div>

      {/* All Characters (Root) */}
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 mb-2',
          selectedFolderId === null && 'bg-infinite-purple/10 border-l-2 border-infinite-purple',
          selectedFolderId !== null && 'hover:bg-accent'
        )}
        onClick={() => handleSelect(null)}
      >
        <FolderOpen className="h-5 w-5 text-infinite-teal" />
        <span className="flex-1 text-sm font-medium">All Characters</span>
      </div>

      {/* Folder Tree */}
      {isLoading ? (
        <div className="space-y-2 px-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-accent/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : folderTree.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          No folders yet. Create one to organize your characters.
        </div>
      ) : (
        <div className="space-y-1">
          {folderTree.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              isSelected={selectedFolderId === folder.id}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onChangeColor={handleChangeColor}
              onCharacterDrop={onCharacterDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderTree;
