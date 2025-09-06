/**
 * Apply database migration to add background_image column to campaigns table
 * This script uses the Supabase Admin client to execute the migration SQL
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function applyMigration() {
  console.log('🚀 Applying background_image column migration...');

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
    // Migration SQL
    const migrationSQL = `
      -- Migration to add background_image field to campaigns table
      -- This enables AI-generated campaign card backgrounds

      -- Add the background_image column to campaigns table
      ALTER TABLE campaigns 
      ADD COLUMN IF NOT EXISTS background_image TEXT;

      -- Add comment for documentation
      COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';
    `;

    console.log('📝 Executing migration SQL...');
    console.log(migrationSQL);

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try alternative approach using direct SQL query
      console.log('⚠️  exec_sql RPC not available, trying direct query...');
      
      const { error: directError } = await supabase
        .from('campaigns')
        .select('background_image')
        .limit(1);

      if (directError && directError.message.includes("does not exist")) {
        console.error('❌ Column does not exist and cannot be added via client.');
        console.error('Please run this SQL manually in your Supabase SQL Editor:');
        console.error('');
        console.error('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS background_image TEXT;');
        console.error("COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';");
        console.error('');
        console.error('You can access the SQL Editor at: https://supabase.com/dashboard/project/cnalyhtalikwsopogula/sql');
        process.exit(1);
      } else {
        console.log('✅ Column already exists or migration already applied!');
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify the column exists
    console.log('🔍 Verifying column exists...');
    const { data: testData, error: testError } = await supabase
      .from('campaigns')
      .select('background_image')
      .limit(1);

    if (testError) {
      console.error('❌ Column verification failed:', testError.message);
      if (testError.message.includes('background_image')) {
        console.error('The background_image column was not added successfully.');
        console.error('Please add it manually via the Supabase SQL Editor.');
      }
      process.exit(1);
    }

    console.log('✅ Column verification successful!');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Campaign cards will now support AI-generated background images.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Please try running this SQL manually in your Supabase SQL Editor:');
    console.error('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS background_image TEXT;');
    console.error("COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';");
    process.exit(1);
  }
}

// Run the migration
applyMigration();