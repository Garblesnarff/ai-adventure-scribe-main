# Character Sharing Components

Components for sharing characters with other users and managing permissions.

## Components

### ShareCharacterDialog

Dialog for sharing a character with other users and managing permissions.

**Features:**
- User search/autocomplete
- Permission level selector (Viewer, Editor, Owner)
- Token control and sheet editing checkboxes
- Current permissions list
- Update/revoke permissions
- Real-time permission management

**Permission Levels:**
- **Viewer**: Can view character sheet only
- **Editor**: Can edit character sheet
- **Owner**: Full control, can share and delete

**Usage:**
```tsx
import { ShareCharacterDialog } from '@/components/character-sharing';

<ShareCharacterDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  characterId={character.id}
  characterName={character.name}
/>
```

### SharedCharactersList

Displays all characters that have been shared with the current user.

**Features:**
- Grid layout of shared character cards
- Owner information display
- Permission level badges
- Filter by permission level
- Remove self from shared character
- Navigate to character sheets

**Usage:**
```tsx
import { SharedCharactersList } from '@/components/character-sharing';

<SharedCharactersList />
```

## tRPC Integration

All components use the `characters` tRPC router:

- `characters.share` - Share character with user
- `characters.updatePermission` - Update user's permission
- `characters.revokePermission` - Revoke user's access
- `characters.listPermissions` - Get all permissions for a character
- `characters.listShared` - Get all characters shared with current user

## Permission Types

```typescript
enum PermissionLevel {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  OWNER = 'owner',
}
```

## Example Integration

```tsx
// In character sheet header
import { ShareCharacterDialog } from '@/components/character-sharing';
import { Share2 } from 'lucide-react';

function CharacterSheetHeader({ character }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <h1>{character.name}</h1>
      <Button onClick={() => setShareOpen(true)}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      <ShareCharacterDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        characterId={character.id}
        characterName={character.name}
      />
    </div>
  );
}
```

```tsx
// In dashboard or character list page
import { SharedCharactersList } from '@/components/character-sharing';

function CharactersPage() {
  return (
    <div>
      <Tabs>
        <TabsList>
          <TabsTrigger value="my-characters">My Characters</TabsTrigger>
          <TabsTrigger value="shared">Shared With Me</TabsTrigger>
        </TabsList>

        <TabsContent value="my-characters">
          <CharacterList />
        </TabsContent>

        <TabsContent value="shared">
          <SharedCharactersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```
