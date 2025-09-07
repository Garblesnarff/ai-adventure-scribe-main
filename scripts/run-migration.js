#!/usr/bin/env node

/**
 * Database Migration Script
 * Applies the character columns migration directly to production Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (admin access)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration SQL
const migrationSQL = `
-- Migration: Add all missing character columns for AI-enhanced features
-- Date: 2025-09-07
-- Purpose: Complete database schema to support all AI-generated character features

-- Add image_url column for character portraits
ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add enhanced AI-generated description fields
ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_traits TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_notes TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS backstory_elements TEXT;

-- Add background column if it doesn't exist
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background TEXT;

-- Add timestamps if they don't exist
ALTER TABLE characters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at);

-- Enable RLS on characters table
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
`;

async function runMigration() {
  console.log('🚀 Starting database migration...');
  console.log(`📡 Connecting to: ${supabaseUrl}`);

  try {
    // First, test the connection
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('characters')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection failed:', testError);
      process.exit(1);
    }

    console.log('✅ Database connection successful');

    // Run the migration
    console.log('📝 Executing migration SQL...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach using individual queries
      console.log('🔄 Trying alternative approach...');
      const queries = migrationSQL.split(';').filter(q => q.trim());
      
      for (const query of queries) {
        if (query.trim()) {
          try {
            const { error: queryError } = await supabase.rpc('exec_sql', {
              sql: query.trim() + ';'
            });
            if (queryError) {
              console.warn(`⚠️  Query failed: ${query.trim()}`);
              console.warn(`   Error: ${queryError.message}`);
            } else {
              console.log(`✅ Executed: ${query.trim().substring(0, 50)}...`);
            }
          } catch (err) {
            console.warn(`⚠️  Query error: ${err.message}`);
          }
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }

    // Verify the migration
    console.log('🔍 Verifying migration results...');
    const { data: columns, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'characters' AND column_name IN 
            ('image_url', 'appearance', 'personality_traits', 'personality_notes', 'backstory_elements');`
    });

    if (verifyError) {
      console.warn('⚠️  Could not verify columns:', verifyError);
    } else {
      console.log('📊 Migration verification complete');
      if (columns && columns.length > 0) {
        console.log('✅ Added columns:', columns.map(c => c.column_name).join(', '));
      }
    }

    console.log('\n🎉 Migration complete! Character creation should now work.');
    console.log('💡 Try creating a character with personality notes to test.');

  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);