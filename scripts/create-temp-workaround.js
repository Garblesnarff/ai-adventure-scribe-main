#!/usr/bin/env node

/**
 * Temporary Workaround Script
 * Removes new fields from character saving until database is manually updated
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

console.log('🔧 Creating temporary workaround for character saving...');

// Backup the original file
const characterTypePath = path.join(projectRoot, 'src/types/character.ts');
const backupPath = path.join(projectRoot, 'src/types/character.ts.backup');

try {
  // Create backup
  const originalContent = fs.readFileSync(characterTypePath, 'utf8');
  fs.writeFileSync(backupPath, originalContent);
  console.log('✅ Created backup: character.ts.backup');

  // Create temporary version that removes new fields from storage transform
  const tempContent = originalContent.replace(
    /image_url: character\.image_url,\s*appearance: character\.appearance,\s*personality_traits: character\.personality_traits,\s*personality_notes: character\.personality_notes,\s*backstory_elements: character\.backstory_elements,/g,
    '// Temporarily disabled new fields until database migration:\n    // image_url: character.image_url,\n    // appearance: character.appearance,\n    // personality_traits: character.personality_traits,\n    // personality_notes: character.personality_notes,\n    // backstory_elements: character.backstory_elements,'
  );

  fs.writeFileSync(characterTypePath, tempContent);
  console.log('✅ Applied temporary workaround');

  // Also update the character list query
  const characterListPath = path.join(projectRoot, 'src/components/character-list/character-list.tsx');
  if (fs.existsSync(characterListPath)) {
    const listContent = fs.readFileSync(characterListPath, 'utf8');
    const listBackupPath = characterListPath + '.backup';
    fs.writeFileSync(listBackupPath, listContent);
    
    const tempListContent = listContent.replace(
      /'id, name, description, race, class, level, image_url, appearance, personality_traits, backstory_elements, background'/g,
      "'id, name, description, race, class, level'"
    );
    
    fs.writeFileSync(characterListPath, tempListContent);
    console.log('✅ Updated character list query');
  }

  console.log('\n🎯 TEMPORARY WORKAROUND APPLIED');
  console.log('📋 What this does:');
  console.log('  • Removes new fields from character saving');
  console.log('  • Basic character creation will now work');
  console.log('  • AI features disabled until database is updated');
  console.log('\n⚠️  TO RESTORE FULL FUNCTIONALITY:');
  console.log('  1. Run the SQL migration in Supabase dashboard');
  console.log('  2. Run: node scripts/restore-from-backup.js');
  console.log('\n💡 Try creating a character now - it should save successfully!');

} catch (error) {
  console.error('❌ Failed to apply workaround:', error);
  process.exit(1);
}