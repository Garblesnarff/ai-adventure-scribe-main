# Database Migration Instructions

## Issue
The production Supabase database is missing columns required for the enhanced character creation features, causing save failures.

## Required Migration
The migration file `supabase/migrations/20250907_complete_character_columns.sql` contains all necessary database changes.

## Step-by-Step Instructions

### 1. Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Log in to your account
3. Select your project: `cnalyhtalikwsopogula`

### 2. Navigate to SQL Editor
1. In the left sidebar, click on "SQL Editor" 
2. Click "New query" to create a new SQL script

### 3. Copy and Execute Migration
1. Open the file: `supabase/migrations/20250907_complete_character_columns.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" to execute the migration

### 4. Verify Migration Success
After running the migration, verify the columns were added:

```sql
-- Run this query to check all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'characters'
ORDER BY column_name;
```

You should see these columns:
- `appearance` (text)
- `backstory_elements` (text) 
- `background` (text)
- `created_at` (timestamp with time zone)
- `image_url` (text)
- `personality_notes` (text)
- `personality_traits` (text)
- `updated_at` (timestamp with time zone)

### 5. Test Character Creation
1. Go back to your application
2. Try creating a character through the full process
3. The save should now work without errors

## What This Migration Does

### Adds Missing Columns
- **`image_url`**: Stores AI-generated character portrait URLs
- **`appearance`**: AI-generated physical descriptions
- **`personality_traits`**: AI-generated personality characteristics
- **`personality_notes`**: User-defined quirks and traits (like "tourettes")
- **`backstory_elements`**: AI-generated character backstories
- **`background`**: Character backgrounds/occupations

### Adds Performance Indexes
- Index on `user_id` for faster character queries
- Index on `name` for character searches  
- Index on `created_at` for chronological ordering

### Adds Security Policies
- Row Level Security (RLS) policies ensure users only see their own characters
- Supports both authenticated users and local development UUID

### Adds Automation
- Automatic `updated_at` timestamp trigger
- Proper column documentation/comments

## Safety Notes

- ✅ **Safe to run multiple times** - Uses `IF NOT EXISTS` clauses
- ✅ **Non-destructive** - Only adds columns, doesn't modify existing data
- ✅ **Backwards compatible** - Existing functionality remains unchanged
- ✅ **Includes rollback info** - See section below if needed

## Rollback Instructions (if needed)

If you need to undo this migration:

```sql
-- WARNING: This will delete data in these columns
ALTER TABLE characters DROP COLUMN IF EXISTS image_url;
ALTER TABLE characters DROP COLUMN IF EXISTS appearance;
ALTER TABLE characters DROP COLUMN IF EXISTS personality_traits;
ALTER TABLE characters DROP COLUMN IF EXISTS personality_notes;
ALTER TABLE characters DROP COLUMN IF EXISTS backstory_elements;

-- Drop indexes
DROP INDEX IF EXISTS idx_characters_user_id;
DROP INDEX IF EXISTS idx_characters_name;
DROP INDEX IF EXISTS idx_characters_created_at;

-- Drop trigger
DROP TRIGGER IF EXISTS update_characters_updated_at ON characters;
```

## Troubleshooting

### If migration fails:
1. Check the error message in Supabase SQL Editor
2. Ensure you have admin permissions on the database
3. Try running sections of the migration individually

### If character saving still fails:
1. Verify all columns exist using the verification query above
2. Check browser console for specific error messages
3. Ensure your application is using the latest code changes

## Post-Migration Testing

After applying the migration:

1. **Create a new character** with personality notes (like "tourettes")
2. **Generate AI description** - should incorporate personality notes
3. **Generate character portrait** - should work without errors  
4. **Save character** - should complete successfully
5. **View character list** - should display without database errors

## Support

If you encounter issues:
1. Check the browser console for specific error messages
2. Verify the migration ran successfully using the verification query
3. Ensure your code matches the latest version with the character creation fixes