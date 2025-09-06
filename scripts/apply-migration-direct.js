/**
 * Direct migration script using Supabase Admin client
 * This tries to add the background_image column using raw SQL execution
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function applyMigrationDirect() {
  console.log('🚀 Applying background_image column migration (direct approach)...');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log('🔍 Checking if background_image column exists...');
    
    // Try to select the background_image column to see if it exists
    const { data, error } = await supabase
      .from('campaigns')
      .select('background_image')
      .limit(1);

    if (error) {
      if (error.message.includes('background_image')) {
        console.log('❌ Column does not exist, attempting to add it...');
        
        // Try using the SQL query interface if available
        console.log('💡 Since direct schema modification isn\'t possible via client,');
        console.log('   let me try to work around this...');
        
        // Alternative: Try to create a test campaign with the background_image field
        // to trigger an error that might give us more info
        const testResult = await supabase
          .from('campaigns')
          .insert({
            name: 'Test Campaign for Schema Check',
            background_image: 'test-url'
          })
          .select();
        
        if (testResult.error) {
          console.error('❌ Confirmed: background_image column does not exist');
          console.error('Error:', testResult.error.message);
          
          console.log('\n📋 MANUAL ACTION REQUIRED:');
          console.log('Please run this SQL in your Supabase SQL Editor:');
          console.log('');
          console.log('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS background_image TEXT;');
          console.log("COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';");
          console.log('');
          console.log('Access the SQL Editor at:');
          console.log('https://supabase.com/dashboard/project/cnalyhtalikwsopogula/sql');
          
          process.exit(1);
        } else {
          // Clean up the test record if it was created
          if (testResult.data && testResult.data[0]) {
            await supabase
              .from('campaigns')
              .delete()
              .eq('id', testResult.data[0].id);
          }
          console.log('✅ Column exists and working!');
        }
      } else {
        throw error;
      }
    } else {
      console.log('✅ background_image column already exists!');
      console.log('🎉 Migration has been successfully applied!');
      console.log('Campaign cards can now store AI-generated background images.');
    }

  } catch (error) {
    console.error('❌ Error during migration check:', error);
    
    console.log('\n📋 MANUAL ACTION REQUIRED:');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS background_image TEXT;');
    console.log("COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';");
    console.log('');
    console.log('Access the SQL Editor at:');
    console.log('https://supabase.com/dashboard/project/cnalyhtalikwsopogula/sql');
    
    process.exit(1);
  }
}

applyMigrationDirect();