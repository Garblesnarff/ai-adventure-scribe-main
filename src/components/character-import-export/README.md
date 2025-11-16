# Character Import/Export Components

Components for importing and exporting character data as JSON files.

## Components

### ImportDialog

Dialog for importing characters from JSON files.

**Features:**
- File picker with drag-and-drop support
- JSON validation
- Character data preview
- Rename on import option
- Shows ability scores, race, class, level
- Export date display
- Error handling with helpful messages

**Supported Format:**
```json
{
  "version": "1.0",
  "character": {
    "name": "Character Name",
    "description": "Description",
    "race": "Race",
    "class": "Class",
    "level": 5,
    "alignment": "Neutral Good"
  },
  "stats": {
    "strength": 16,
    "dexterity": 14,
    "constitution": 15,
    "intelligence": 10,
    "wisdom": 12,
    "charisma": 8
  },
  "exportedAt": "2025-01-15T10:30:00.000Z"
}
```

**Usage:**
```tsx
import { ImportDialog } from '@/components/character-import-export';

<ImportDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onImportSuccess={(characterId) => {
    navigate(`/character/${characterId}`);
  }}
/>
```

### ExportButton

Button with dropdown for exporting characters in different formats.

**Features:**
- Export as JSON (implemented)
- Export as PDF (coming soon)
- Automatic filename generation: `CharacterName_YYYY-MM-DD.json`
- Loading state
- Success toast notifications
- Error handling

**Usage:**
```tsx
import { ExportButton } from '@/components/character-import-export';

<ExportButton
  characterId={character.id}
  characterName={character.name}
  variant="outline"
  size="default"
  showLabel={true}
/>
```

### SimpleExportButton

Simple button for JSON export without dropdown (for compact UIs).

**Usage:**
```tsx
import { SimpleExportButton } from '@/components/character-import-export';

<SimpleExportButton
  characterId={character.id}
  characterName={character.name}
  variant="ghost"
  size="sm"
/>
```

## tRPC Integration

All components use the `characters` tRPC router:

- `characters.export` - Export character data as JSON
- `characters.import` - Import character from JSON data

## Example Integration

```tsx
// In character sheet header
import { ExportButton } from '@/components/character-import-export';

function CharacterSheetHeader({ character }) {
  return (
    <div className="flex items-center gap-2">
      <h1>{character.name}</h1>

      <ExportButton
        characterId={character.id}
        characterName={character.name}
      />
    </div>
  );
}
```

```tsx
// In character list with import button
import { ImportDialog } from '@/components/character-import-export';
import { Upload } from 'lucide-react';

function CharacterList() {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2>My Characters</h2>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import Character
        </Button>
      </div>

      <CharacterGrid />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportSuccess={(id) => {
          console.log('Imported character:', id);
        }}
      />
    </div>
  );
}
```

## File Format Notes

- Files must be valid JSON
- The `character.name` field is required
- All other fields are optional but recommended
- Version field helps with future compatibility
- Stats are validated on the backend
- Large files (>1MB) may take longer to process
