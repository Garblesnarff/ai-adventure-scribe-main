# Character Background Image Setup Guide

## Database Setup Required

Before character background image generation will work, you need to add a database column.

### Step 1: Run SQL Migration

Go to your Supabase SQL Editor and run this command:

```sql
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background_image TEXT;
COMMENT ON COLUMN characters.background_image IS 'URL of AI-generated background image for character cards';
```

This will add the `background_image` column to the characters table.

### Step 2: Verify It Works

1. Create a new character
2. The character card should display with a generated background image
3. You should see a toast notification: "Character Background Generated"

### Troubleshooting

**Error "Failed to load resource: the server responded with a status of 400"**

This means the `background_image` column doesn't exist. Make sure you ran the SQL command above.

**Background images not generating**

Check that `VITE_OPENROUTER_API_KEY` is set in your environment variables.

**Characters not showing backgrounds**

Existing characters won't have backgrounds until you generate them manually or rerun creation.

## Implementation

The system now works exactly like campaign backgrounds:

- **Automatic Generation**: Background images are generated when characters are created
- **Unique Images**: Each character gets a custom background based on their description, race, and class
- **Text Overlay**: The character's name, race, and class are displayed prominently on the image
- **Fallback**: Default background image if generation fails
