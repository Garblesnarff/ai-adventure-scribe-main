# Character Folders Components

Components for organizing characters in a hierarchical folder structure.

## Components

### FolderTree

A tree view component for displaying and managing character folders.

**Features:**
- Nested folder hierarchy with expand/collapse
- Drag & drop characters between folders
- Folder color indicators
- Character count badges
- Context menu for folder actions (Rename, Delete, Change Color)

**Usage:**
```tsx
import { FolderTree } from '@/components/character-folders';

<FolderTree
  selectedFolderId={selectedFolder}
  onFolderSelect={(folderId) => setSelectedFolder(folderId)}
  onCreateFolder={() => setCreateDialogOpen(true)}
  onEditFolder={(folderId) => handleEdit(folderId)}
  onDeleteFolder={(folderId) => handleDelete(folderId)}
  onChangeColor={(folderId) => handleChangeColor(folderId)}
  onCharacterDrop={(characterId, folderId) => moveCharacter(characterId, folderId)}
/>
```

### CreateFolderDialog

Dialog for creating new folders.

**Features:**
- Folder name input
- Color picker (8 preset colors)
- Parent folder selector for nesting
- Form validation

**Usage:**
```tsx
import { CreateFolderDialog } from '@/components/character-folders';

<CreateFolderDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  parentFolderId={parentId}
/>
```

### EditFolderDialog

Dialog for editing existing folders.

**Features:**
- Rename folder
- Change folder color
- Preserves current values

**Usage:**
```tsx
import { EditFolderDialog } from '@/components/character-folders';

<EditFolderDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  folderId={selectedFolderId}
  currentName={folderName}
  currentColor={folderColor}
/>
```

### DeleteFolderDialog

Confirmation dialog for deleting folders.

**Features:**
- Warning about character relocation
- Cannot be undone notice

**Usage:**
```tsx
import { DeleteFolderDialog } from '@/components/character-folders';

<DeleteFolderDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  folderId={folderId}
  folderName={folderName}
/>
```

### MoveCharactersDialog

Dialog for moving multiple characters to a folder.

**Features:**
- Destination folder selector
- Batch move support
- Shows character count

**Usage:**
```tsx
import { MoveCharactersDialog } from '@/components/character-folders';

<MoveCharactersDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  characterIds={selectedCharacterIds}
/>
```

## tRPC Integration

All components use the `characterFolders` tRPC router:

- `characterFolders.list` - Get all folders
- `characterFolders.create` - Create new folder
- `characterFolders.update` - Update folder
- `characterFolders.delete` - Delete folder
- `characterFolders.moveCharacter` - Move character to folder

## Styling

Components use the electricCyan design system with custom color variants:
- Purple (infinite-purple)
- Gold (infinite-gold)
- Teal (infinite-teal)
- Plus 5 additional preset colors
