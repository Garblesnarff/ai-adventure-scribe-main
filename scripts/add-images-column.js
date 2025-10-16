#!/usr/bin/env node

/**
 * Script to add the images column to dialogue_history table
 * Run with: node scripts/add-images-column.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addImagesColumn() {
  try {
    console.log('Adding images column to dialogue_history table...');
    
    const { data, error } = await supabase.rpc('add_images_column_if_not_exists');
    
    if (error) {
      // If RPC doesn't exist, try direct SQL
      console.log('RPC not found, attempting direct SQL execution...');
      
      const { data: rawData, error: rawError } = await supabase
        .from('dialogue_history')
        .select('*')
        .limit(1);
      
      if (rawError && rawError.message && rawError.message.includes('images')) {
        console.log('Column does not exist. Please use Supabase dashboard SQL editor to run:');
        console.log(`ALTER TABLE dialogue_history ADD COLUMN images JSONB DEFAULT '[]'::jsonb;`);
        console.log(`CREATE INDEX idx_dialogue_history_images ON dialogue_history USING GIN (images);`);
      } else {
        console.log('Error checking schema:', rawError);
      }
    } else {
      console.log('Migration completed:', data);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addImagesColumn();
