#!/usr/bin/env node

/**
 * Adds the images column to dialogue_history table
 * Usage: node scripts/migrate-add-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  try {
    console.log('🔄 Adding images column to dialogue_history table...');
    
    // First, check if column already exists by selecting from it
    const { data: testData, error: testError } = await supabase
      .from('dialogue_history')
      .select('images')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Column images already exists!');
      return;
    }
    
    if (testError.message?.includes('column "images" does not exist')) {
      // Column doesn't exist, need to add it via raw SQL
      console.log('Column does not exist. Attempting to add via SQL...');
      
      // Try using the query builder to execute raw SQL if available
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: "ALTER TABLE dialogue_history ADD COLUMN images JSONB DEFAULT '[]'::jsonb; CREATE INDEX idx_dialogue_history_images ON dialogue_history USING GIN (images);"
      }).catch(() => ({ error: new Error('RPC not available') }));
      
      if (error && error.message === 'RPC not available') {
        console.log('\n⚠️  Cannot execute SQL directly. Please run this in your Supabase SQL Editor:');
        console.log('\n' + '='.repeat(80));
        console.log(`ALTER TABLE dialogue_history ADD COLUMN images JSONB DEFAULT '[]'::jsonb;`);
        console.log(`CREATE INDEX idx_dialogue_history_images ON dialogue_history USING GIN (images);`);
        console.log('='.repeat(80) + '\n');
        console.log('Steps:');
        console.log('1. Go to https://app.supabase.com/project/cnalyhtalikwsopogula/sql/new');
        console.log('2. Copy and paste the SQL above');
        console.log('3. Click "Run"');
        console.log('4. Run this script again to verify\n');
        return;
      }
      
      console.log('✅ Migration completed successfully!');
    } else {
      console.error('❌ Error:', testError);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
