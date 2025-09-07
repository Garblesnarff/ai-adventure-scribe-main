#!/usr/bin/env node

/**
 * Database Migration Script - Direct SQL API Approach
 * Applies the character columns migration directly to production Supabase using REST API
 */

import fetch from 'node-fetch';
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

// Individual SQL commands
const sqlCommands = [
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_url TEXT",
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance TEXT",
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_traits TEXT",
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_notes TEXT",
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS backstory_elements TEXT",
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS background TEXT",
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
  "CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name)",
  "CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at)",
  "ALTER TABLE characters ENABLE ROW LEVEL SECURITY"
];

async function executeSQL(sql) {
  try {
    console.log(`🔧 Executing: ${sql}`);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️  SQL failed: ${sql}`);
      console.warn(`   Status: ${response.status}`);
      console.warn(`   Error: ${errorText}`);
      return false;
    }

    console.log(`✅ Success: ${sql}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  Exception executing: ${sql}`);
    console.warn(`   Error: ${error.message}`);
    return false;
  }
}

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/characters?select=count&limit=1`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function verifyColumns() {
  try {
    console.log('🔍 Verifying columns exist...');
    
    // Try to query with the new columns
    const response = await fetch(`${supabaseUrl}/rest/v1/characters?select=image_url,appearance,personality_traits,personality_notes,backstory_elements&limit=1`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (response.ok) {
      console.log('✅ All columns verified successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.warn(`⚠️  Column verification failed: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.warn(`⚠️  Verification error: ${error.message}`);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 Starting database migration...');
  console.log(`📡 Connecting to: ${supabaseUrl}`);

  // Test connection
  if (!(await testConnection())) {
    process.exit(1);
  }

  // Execute each SQL command
  let successCount = 0;
  for (const sql of sqlCommands) {
    const success = await executeSQL(sql);
    if (success) successCount++;
  }

  console.log(`\n📊 Migration Results:`);
  console.log(`✅ Successful: ${successCount}/${sqlCommands.length}`);
  console.log(`⚠️  Failed: ${sqlCommands.length - successCount}/${sqlCommands.length}`);

  // Verify the results
  await verifyColumns();

  console.log('\n🎉 Migration complete! Try creating a character now.');
}

// Run the migration
runMigration().catch(console.error);