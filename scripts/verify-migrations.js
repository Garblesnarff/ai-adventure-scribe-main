/**
 * Migration Verification Script
 *
 * Checks:
 * 1. Migration file naming and order
 * 2. SQL syntax (basic check)
 * 3. Foreign key constraints
 * 4. Index naming conflicts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

// ===================================================================
// MIGRATION ANALYSIS
// ===================================================================

function analyzeMigrations() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║          MIGRATION VERIFICATION REPORT                     ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Read all migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`${colors.blue}📂 Found ${files.length} migration files${colors.reset}\n`);

  // Group migrations by date
  const migrationsByDate = {};
  files.forEach(file => {
    const date = file.substring(0, 8);
    if (!migrationsByDate[date]) {
      migrationsByDate[date] = [];
    }
    migrationsByDate[date].push(file);
  });

  // Check for today's migrations
  const today = '20251103';
  const todaysMigrations = migrationsByDate[today] || [];

  if (todaysMigrations.length > 0) {
    console.log(`${colors.green}✅ Today's migrations (${today}):${colors.reset}`);
    todaysMigrations.forEach(file => {
      console.log(`   - ${file}`);
    });
    console.log();
  }

  // Check migration order and naming
  let hasErrors = false;
  let hasWarnings = false;

  console.log(`${colors.blue}🔍 Checking migration order and naming...${colors.reset}\n`);

  const expectedOrder = [
    '20251103_cleanup_duplicate_sessions.sql',
    '20251103_add_session_constraints.sql',
    '20251103_create_session_archive_system.sql'
  ];

  const actualOrder = todaysMigrations.filter(f =>
    f.includes('cleanup') || f.includes('constraints') || f.includes('archive')
  );

  if (actualOrder.length === 3) {
    // Check if cleanup comes before constraints
    const cleanupIndex = actualOrder.findIndex(f => f.includes('cleanup'));
    const constraintsIndex = actualOrder.findIndex(f => f.includes('constraints'));
    const archiveIndex = actualOrder.findIndex(f => f.includes('archive'));

    if (cleanupIndex < constraintsIndex && constraintsIndex < archiveIndex) {
      log(colors.green, '✅', 'Migration order is correct:');
      actualOrder.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file}`);
      });
    } else {
      log(colors.red, '❌', 'Migration order is INCORRECT!');
      console.log('   Expected order:');
      console.log('   1. cleanup_duplicate_sessions (must run first)');
      console.log('   2. add_session_constraints (depends on cleanup)');
      console.log('   3. create_session_archive_system (can run anytime)');
      hasErrors = true;
    }
  } else {
    log(colors.yellow, '⚠️', `Found ${actualOrder.length} session-related migrations (expected 3)`);
    hasWarnings = true;
  }

  console.log();

  // Analyze SQL files
  console.log(`${colors.blue}🔬 Analyzing SQL syntax and structure...${colors.reset}\n`);

  const indexes = new Set();
  const tables = new Set();
  const functions = new Set();

  todaysMigrations.forEach(file => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`${colors.cyan}📄 ${file}${colors.reset}`);

    // Check for CREATE INDEX statements
    const indexMatches = content.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
    if (indexMatches) {
      indexMatches.forEach(match => {
        const indexName = match.match(/(\w+)$/)[1];
        if (indexes.has(indexName)) {
          log(colors.red, '❌', `Duplicate index name: ${indexName}`);
          hasErrors = true;
        } else {
          indexes.add(indexName);
          log(colors.green, '✅', `Index: ${indexName}`);
        }
      });
    }

    // Check for CREATE TABLE statements
    const tableMatches = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
    if (tableMatches) {
      tableMatches.forEach(match => {
        const tableName = match.match(/(\w+)$/)[1];
        tables.add(tableName);
        log(colors.green, '✅', `Table: ${tableName}`);
      });
    }

    // Check for CREATE FUNCTION statements
    const functionMatches = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/gi);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const functionName = match.match(/(\w+)$/)[1];
        functions.add(functionName);
        log(colors.green, '✅', `Function: ${functionName}`);
      });
    }

    // Check for foreign key constraints
    const fkMatches = content.match(/FOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES\s+(\w+)/gi);
    if (fkMatches) {
      log(colors.blue, 'ℹ️', `Found ${fkMatches.length} foreign key constraint(s)`);
    }

    // Check for IF NOT EXISTS (idempotency)
    const hasIfNotExists = /IF\s+NOT\s+EXISTS/i.test(content);
    const hasOrReplace = /OR\s+REPLACE/i.test(content);

    if (hasIfNotExists || hasOrReplace) {
      log(colors.green, '✅', 'Migration is idempotent (safe to run multiple times)');
    } else {
      log(colors.yellow, '⚠️', 'Migration may not be idempotent');
      hasWarnings = true;
    }

    // Check for syntax errors (basic)
    const unclosedParens = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
    if (unclosedParens !== 0) {
      log(colors.red, '❌', `Potential syntax error: ${Math.abs(unclosedParens)} unclosed parentheses`);
      hasErrors = true;
    }

    console.log();
  });

  // Summary
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    SUMMARY                                 ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`📊 Indexes created:   ${indexes.size}`);
  console.log(`📊 Tables created:    ${tables.size}`);
  console.log(`📊 Functions created: ${functions.size}`);
  console.log();

  if (indexes.size > 0) {
    console.log(`${colors.blue}Indexes:${colors.reset}`);
    Array.from(indexes).forEach(idx => console.log(`  - ${idx}`));
    console.log();
  }

  if (tables.size > 0) {
    console.log(`${colors.blue}Tables:${colors.reset}`);
    Array.from(tables).forEach(tbl => console.log(`  - ${tbl}`));
    console.log();
  }

  if (functions.size > 0) {
    console.log(`${colors.blue}Functions:${colors.reset}`);
    Array.from(functions).forEach(fn => console.log(`  - ${fn}`));
    console.log();
  }

  // Expected objects from Units 1-12
  const expectedIndexes = [
    'idx_active_session_per_character',
    'idx_game_sessions_status',
    'idx_dialogue_history_session_speaker',
    'idx_character_spells_spell_id'
  ];

  const expectedTables = [
    'game_sessions_archive',
    'dialogue_history_archive',
    'memories_archive',
    'character_voice_mappings_archive',
    'combat_encounters_archive'
  ];

  const expectedFunctions = [
    'archive_old_sessions',
    'restore_archived_session'
  ];

  console.log(`${colors.blue}🎯 Checking for expected objects...${colors.reset}\n`);

  let allExpectedFound = true;

  expectedIndexes.forEach(idx => {
    if (indexes.has(idx)) {
      log(colors.green, '✅', `Index found: ${idx}`);
    } else {
      log(colors.yellow, '⚠️', `Index missing: ${idx}`);
      hasWarnings = true;
      allExpectedFound = false;
    }
  });

  console.log();

  expectedTables.forEach(tbl => {
    if (tables.has(tbl)) {
      log(colors.green, '✅', `Table found: ${tbl}`);
    } else {
      log(colors.yellow, '⚠️', `Table missing: ${tbl}`);
      hasWarnings = true;
      allExpectedFound = false;
    }
  });

  console.log();

  expectedFunctions.forEach(fn => {
    if (functions.has(fn)) {
      log(colors.green, '✅', `Function found: ${fn}`);
    } else {
      log(colors.yellow, '⚠️', `Function missing: ${fn}`);
      hasWarnings = true;
      allExpectedFound = false;
    }
  });

  console.log();

  // Final verdict
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    VERDICT                                 ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (hasErrors) {
    log(colors.red, '❌', 'FAILED: Migration has errors that must be fixed');
    return false;
  } else if (hasWarnings) {
    log(colors.yellow, '⚠️', 'WARNINGS: Migration has warnings but should work');
    return true;
  } else if (allExpectedFound) {
    log(colors.green, '✅', 'SUCCESS: All migrations are valid and complete');
    return true;
  } else {
    log(colors.yellow, '⚠️', 'INCOMPLETE: Some expected objects are missing');
    return true;
  }
}

// Run analysis
const success = analyzeMigrations();
process.exit(success ? 0 : 1);
