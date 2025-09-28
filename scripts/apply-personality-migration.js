/**
 * Apply database migration to add background and alignment columns to personality tables
 * This script uses the Supabase Admin client to execute the migration SQL
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'server/.env' });

async function applyMigration() {
  console.log('🚀 Applying personality background/alignment column migration...');

  // Create Supabase admin client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Please ensure they are set in your .env.local file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250928_add_personality_background_alignment.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...');
    console.log(migrationSQL);

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try alternative approach using direct SQL query for verification
      console.log('⚠️  exec_sql RPC not available, checking if columns already exist...');

      const { error: testError } = await supabase
        .from('personality_traits')
        .select('background')
        .limit(1);

      if (testError && testError.message.includes("does not exist")) {
        console.error('❌ Column does not exist and cannot be added via client.');
        console.error('Please run this SQL manually in your Supabase SQL Editor:');
        console.error('');
        console.error(migrationSQL);
        console.error('');
        console.error('You can access the SQL Editor at: https://supabase.com/dashboard/project/cnalyhtalikwsopogula/sql');
        process.exit(1);
      } else {
        console.log('✅ Columns already exist or migration already applied!');
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify the columns exist
    console.log('🔍 Verifying columns exist...');

    // Test personality_traits background column
    const { data: testTraits, error: traitsError } = await supabase
      .from('personality_traits')
      .select('background')
      .limit(1);

    if (traitsError && traitsError.message.includes('background')) {
      console.error('❌ personality_traits.background column verification failed:', traitsError.message);
      process.exit(1);
    }

    // Test personality_ideals alignment column
    const { data: testIdeals, error: idealsError } = await supabase
      .from('personality_ideals')
      .select('alignment')
      .limit(1);

    if (idealsError && idealsError.message.includes('alignment')) {
      console.error('❌ personality_ideals.alignment column verification failed:', idealsError.message);
      process.exit(1);
    }

    console.log('✅ Column verification successful!');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Personality tables now support background and alignment filtering.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Please try running this SQL manually in your Supabase SQL Editor:');
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250928_add_personality_background_alignment.sql');
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      console.error(sql);
    } catch (readError) {
      console.error('Could not read migration file:', readError);
    }
    console.error('');
    console.error('You can access the SQL Editor at: https://supabase.com/dashboard/project/cnalyhtalikwsopogula/sql');
    process.exit(1);
  }
}

// Run the migration
applyMigration();
