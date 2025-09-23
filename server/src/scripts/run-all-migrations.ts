import 'dotenv/config';
import { createClient } from '../lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Complete Database Migration Runner
 *
 * This script runs all necessary migrations and seeding in the correct order:
 * 1. Core table migrations
 * 2. Spellcasting table migrations
 * 3. Comprehensive base data seeding
 * 4. Bard-specific spell data seeding
 *
 * Safe to run multiple times - uses ON CONFLICT clauses
 */

async function runMigration(scriptName: string, description: string) {
  console.log(`\n🔄 Running: ${description}`);
  console.log(`   Script: ${scriptName}`);

  try {
    const { stdout, stderr } = await execAsync(`npm run server:dev -- --script ${scriptName}`, {
      cwd: process.cwd()
    });

    if (stderr && !stderr.includes('Warning')) {
      console.log(`⚠️  Warnings: ${stderr}`);
    }

    if (stdout) {
      console.log(`✅ ${description} completed`);
      // Show only the summary lines
      const lines = stdout.split('\n');
      const summaryLines = lines.filter(line =>
        line.includes('✅') ||
        line.includes('📊') ||
        line.includes('•') ||
        line.includes('Migration Summary') ||
        line.includes('Seeding Summary')
      );
      if (summaryLines.length > 0) {
        summaryLines.forEach(line => console.log(`   ${line.trim()}`));
      }
    }
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function checkDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please configure your database connection.');
    process.exit(1);
  }

  console.log('🔍 Checking database connection...');
  const db = createClient();
  try {
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

async function runDirectScript(scriptPath: string, description: string) {
  console.log(`\n🔄 Running: ${description}`);
  console.log(`   Direct execution: ${scriptPath}`);

  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${scriptPath}`, {
      cwd: process.cwd()
    });

    if (stderr && !stderr.includes('Warning')) {
      console.log(`⚠️  Warnings: ${stderr}`);
    }

    if (stdout) {
      console.log(`✅ ${description} completed`);
      // Show summary lines
      const lines = stdout.split('\n');
      const summaryLines = lines.filter(line =>
        line.includes('✅') ||
        line.includes('📊') ||
        line.includes('•') ||
        line.includes('Migration Summary') ||
        line.includes('Seeding Summary')
      );
      if (summaryLines.length > 0) {
        summaryLines.forEach(line => console.log(`   ${line.trim()}`));
      }
    }
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Complete D&D 5E Database Setup');
  console.log('==========================================');

  try {
    // 1. Check database connection
    await checkDatabaseConnection();

    // 2. Run core migrations
    await runDirectScript(
      'server/src/scripts/migrate.ts',
      'Core Table Migrations (users, campaigns, characters, etc.)'
    );

    // 3. Run comprehensive seeding (base classes, races, essential spells)
    await runDirectScript(
      'server/src/scripts/comprehensive-seed.ts',
      'Comprehensive Base Data Seeding'
    );

    // 4. Run Bard-specific spell seeding
    await runDirectScript(
      'server/src/scripts/seed-bard-spells.ts',
      'Bard Spell Data Population'
    );

    console.log('\n🎉 Complete D&D 5E Database Setup Successful!');
    console.log('==============================================');
    console.log('📝 What was configured:');
    console.log('   ✅ Core database tables and relationships');
    console.log('   ✅ D&D 5E spellcasting system tables');
    console.log('   ✅ All 12 core D&D 5E classes with spellcasting info');
    console.log('   ✅ All 9 core D&D 5E races');
    console.log('   ✅ Essential cross-class spells');
    console.log('   ✅ Complete Bard spell list (9 cantrips + 20 1st level spells)');
    console.log('   ✅ Bard spell progression for levels 1-20');
    console.log('   ✅ Multiclass spell slot calculations');
    console.log('   ✅ Spellcasting focuses and components');
    console.log('   ✅ Class-spell relationships for proper validation');
    console.log('\n🎯 Ready for Bard character creation!');
    console.log('   • Characters can now select from 9 Bard cantrips');
    console.log('   • Characters can now select from 20 Bard 1st level spells');
    console.log('   • Spell validation enforces D&D 5E rules');
    console.log('   • Spell progression tracks cantrips known and spell slots');

  } catch (error) {
    console.error('\n💥 Migration failed. Database may be in inconsistent state.');
    console.error('   Please review errors above and run individual scripts as needed.');
    process.exit(1);
  }
}

main();