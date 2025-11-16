/**
 * CharacterFolderDialog Component
 *
 * Provides dialogs for folder management:
 * - Create folder with name, color, and icon
 * - Rename folder
 * - Delete confirmation
 * - Move characters between folders
 * - Parent folder selector for nesting
 */

import React, { useState, useEffect } from 'react';
import { Folder, Palette, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTRPC, useTRPCUtils } from '@/infrastructure/api/trpc-hooks';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string | null;
}

interface EditFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  currentName?: string;
  currentColor?: string;
}

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName?: string;
}

interface MoveCharactersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterIds: string[];
}

// Color presets for folders
const FOLDER_COLORS = [
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Gold', value: '#F59E0B' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
];

/**
 * Create Folder Dialog
 */
export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onOpenChange,
  parentFolderId,
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const utils = useTRPCUtils();

  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0].value);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    parentFolderId || null
  );

  const { data: folders } = trpc.characterFolders.list.useQuery();
  const createMutation = trpc.characterFolders.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Folder Created',
        description: `Folder "${name}" has been created successfully.`,
      });
      utils.characterFolders.list.invalidate();
      onOpenChange(false);
      setName('');
      setColor(FOLDER_COLORS[0].value);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create folder. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a folder name.',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      color,
      parentFolderId: selectedParentId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a folder to organize your characters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !createMutation.isPending) {
                  handleCreate();
                }
              }}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Folder Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  className={`h-10 rounded-md border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-foreground scale-110'
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  onClick={() => setColor(colorOption.value)}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Parent Folder Selector */}
          <div className="space-y-2">
            <Label>Parent Folder (Optional)</Label>
            <Select
              value={selectedParentId || 'none'}
              onValueChange={(value) => setSelectedParentId(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent (root level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (root level)</SelectItem>
                {folders?.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Edit Folder Dialog
 */
export const EditFolderDialog: React.FC<EditFolderDialogProps> = ({
  open,
  onOpenChange,
  folderId,
  currentName = '',
  currentColor = FOLDER_COLORS[0].value,
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const utils = useTRPCUtils();

  const [name, setName] = useState(currentName);
  const [color, setColor] = useState(currentColor);

  useEffect(() => {
    setName(currentName);
    setColor(currentColor);
  }, [currentName, currentColor, open]);

  const updateMutation = trpc.characterFolders.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Folder Updated',
        description: 'Folder has been updated successfully.',
      });
      utils.characterFolders.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update folder. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleUpdate = () => {
    if (!folderId) return;

    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a folder name.',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({
      folderId,
      updates: {
        name: name.trim(),
        color,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
          <DialogDescription>Update folder name and color.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-folder-name">Folder Name</Label>
            <Input
              id="edit-folder-name"
              placeholder="Enter folder name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !updateMutation.isPending) {
                  handleUpdate();
                }
              }}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Folder Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  className={`h-10 rounded-md border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-foreground scale-110'
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  onClick={() => setColor(colorOption.value)}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Updating...' : 'Update Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Delete Folder Dialog
 */
export const DeleteFolderDialog: React.FC<DeleteFolderDialogProps> = ({
  open,
  onOpenChange,
  folderId,
  folderName = 'this folder',
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const utils = useTRPCUtils();

  const deleteMutation = trpc.characterFolders.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Folder Deleted',
        description: `Folder "${folderName}" has been deleted. Characters were moved to the parent folder.`,
      });
      utils.characterFolders.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete folder. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = () => {
    if (!folderId) return;

    deleteMutation.mutate({ folderId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{folderName}"? Characters in this folder will be
            moved to the parent folder. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Folder'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Move Characters Dialog
 */
export const MoveCharactersDialog: React.FC<MoveCharactersDialogProps> = ({
  open,
  onOpenChange,
  characterIds,
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const utils = useTRPCUtils();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const { data: folders } = trpc.characterFolders.list.useQuery();
  const moveMutation = trpc.characterFolders.moveCharacter.useMutation({
    onSuccess: () => {
      toast({
        title: 'Characters Moved',
        description: 'Characters have been moved successfully.',
      });
      utils.characterFolders.list.invalidate();
      utils.characters.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to move characters. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleMove = async () => {
    // Move all selected characters to the folder
    for (const characterId of characterIds) {
      await moveMutation.mutateAsync({
        characterId,
        folderId: selectedFolderId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Characters</DialogTitle>
          <DialogDescription>
            Select a destination folder for {characterIds.length} character
            {characterIds.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Destination Folder</Label>
            <Select
              value={selectedFolderId || 'none'}
              onValueChange={(value) => setSelectedFolderId(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a folder..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder (root level)</SelectItem>
                {folders?.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={moveMutation.isPending}>
            {moveMutation.isPending ? 'Moving...' : 'Move Characters'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default {
  CreateFolderDialog,
  EditFolderDialog,
  DeleteFolderDialog,
  MoveCharactersDialog,
};
