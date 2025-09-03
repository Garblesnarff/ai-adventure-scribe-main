#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📁 Reading migration file...');
    const migrationPath = join(__dirname, '../supabase/migrations/20240903_enhance_memories_for_fiction.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Applying memory enhancement migration...');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0);
          
          if (directError) {
            console.log('⚠️  RPC not available, trying alternative approach...');
            
            // For ALTER TABLE statements, we can check if columns exist first
            if (statement.includes('ALTER TABLE memories ADD COLUMN')) {
              const columnMatch = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
              if (columnMatch) {
                const columnName = columnMatch[1];
                
                // Check if column exists
                const { data } = await supabase
                  .from('memories')
                  .select(columnName)
                  .limit(1);
                
                if (data) {
                  console.log(`✅ Column '${columnName}' already exists`);
                  continue;
                }
              }
            }
            
            console.warn(`⚠️  Could not execute: ${statement.substring(0, 100)}...`);
            console.warn('You may need to run this migration manually in the Supabase dashboard');
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('🎉 Migration completed!');
    console.log('\n📊 Checking memories table structure...');
    
    // Verify the migration worked
    const { data: sampleMemory } = await supabase
      .from('memories')
      .select('*')
      .limit(1);
    
    if (sampleMemory) {
      const fields = Object.keys(sampleMemory[0] || {});
      console.log('📋 Available fields:', fields.join(', '));
      
      const newFields = ['narrative_weight', 'emotional_tone', 'story_arc', 'prose_quality', 'chapter_marker'];
      const missingFields = newFields.filter(field => !fields.includes(field));
      
      if (missingFields.length === 0) {
        console.log('✅ All new fields are present!');
      } else {
        console.log('❌ Missing fields:', missingFields.join(', '));
        console.log('You may need to apply the migration manually in Supabase dashboard');
      }
    } else {
      console.log('ℹ️  No memories found in table (this is normal for a new installation)');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔧 Manual steps:');
    console.log('1. Go to Supabase dashboard > SQL Editor');
    console.log('2. Run the migration file: supabase/migrations/20240903_enhance_memories_for_fiction.sql');
    process.exit(1);
  }
}

applyMigration();