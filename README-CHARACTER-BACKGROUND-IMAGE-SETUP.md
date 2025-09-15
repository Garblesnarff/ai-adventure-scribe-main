# Character Background Image Setup Guide

## Database Setup Required

Before character background image generation will work, you need to add a database column.

### Step 1: Run SQL Migration

Go to your Supabase SQL Editor and run these commands:

```sql
-- Add background_image column for character background images
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background_image TEXT;
COMMENT ON COLUMN characters.background_image IS 'URL of AI-generated background image for character cards';

-- Add active_concentration column (required for spell concentration tracking)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_concentration TEXT;
COMMENT ON COLUMN characters.active_concentration IS 'Currently concentrated spell name';
```

This will add the `background_image` column to the characters table.

### Step 2: Test Character Creation

1. Create a new character through the character wizard
2. Character creation should complete immediately
3. You should see a toast notification: "Character Background Generated" after a few seconds
4. The character card should display with a generated background image
5. Hover over the character card to see its details in the popup

### Troubleshooting

**Error "Failed to load resource: the server responded with a status of 400" when saving character**

This means the `background_image` column doesn't exist. Make sure you ran the SQL command above in Supabase SQL Editor.

**Error "Character Background Generated" toast doesn't appear**

The background generation happens asynchronously. Check browser console for errors and ensure `VITE_OPENROUTER_API_KEY` is set in your `.env.local` file.

**Character cards don't show backgrounds**

- New characters will show backgrounds after creation
- Existing characters need manual background generation (TBD in future updates)
- The system falls back to default background if generation fails

**Images not loading on character cards**

Check that the background_image URLs are being saved in the Supabase characters table.

## Implementation

The system mirrors campaign background generation:

- **Automatic Generation**: Background images are generated when characters are created
- **Unique Images**: Each character gets a custom background based on their description, race, and class
- **Text Overlay**: The character's name, race, and class are displayed prominently on the image
- **Fallback**: Default background image if generation fails
- **Cost**: ~$0.03 per character background image

## Files Modified

- `src/types/character.ts` - Added background_image field
- `src/services/character-background-generator.ts` - New AI image generation service
- `src/hooks/use-character-save.ts` - Added async background generation after save
- `src/components/character-list/character-card.tsx` - Refactored to use hero background images
- `src/integrations/supabase/database.types.ts` - Updated types

## Technical Details

- Uses OpenRouter Gemini 2.5 Flash Image model for generation
- Prompts use your specified template: character description + fitting background + text overlay
- Images are 1:1 aspect ratio, stored permanently after generation
- Fallback descriptions created for characters without custom descriptions
