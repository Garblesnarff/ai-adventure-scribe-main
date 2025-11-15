# Database Migrations

## Location
All Supabase migrations are in: `/supabase/migrations/`

**Note:** Drizzle ORM migrations remain in `/db/migrations/` as part of a separate migration system.

## Execution Order
Migrations are executed in filename order (chronological). The migration system processes files alphabetically, so proper timestamp prefixes ensure correct execution order.

## D&D 5E Mechanics Migrations (November 2025)

The following migrations implement core D&D 5E mechanics in sequential order:

1. **20251112_01_add_combat_system_unified.sql** - Combat encounters, HP tracking, conditions, attacks, initiative
   - Creates combat_encounters table
   - Adds character HP tracking (current_hp, max_hp, temp_hp)
   - Implements all 13 core D&D 5E conditions
   - Adds character_conditions tracking table
   - Implements attack resolution system
   - Adds initiative and turn order management

2. **20251112_02_add_spell_slots.sql** - Spell slot tracking by level
   - Creates character_spell_slots table
   - Tracks slots for spell levels 1-9
   - Manages used and total slots per level

3. **20251112_03_add_rest_system.sql** - Short and long rest mechanics
   - Adds hit dice tracking to characters table
   - Creates rest_history table for tracking rest events
   - Implements short rest (1 hour, spend hit dice)
   - Implements long rest (8 hours, restore HP and hit dice)

4. **20251112_04_add_inventory_system.sql** - Inventory, consumables, attunement
   - Creates character_inventory table
   - Tracks item quantities and equipped status
   - Manages attunement slots (max 3 items)
   - Supports consumable items with usage tracking

5. **20251112_05_add_progression_system.sql** - Experience points and leveling
   - Adds experience_points to characters table
   - Implements level calculation from XP
   - Tracks leveling history

6. **20251112_06_add_class_features.sql** - Class features and subclasses
   - Creates class_features table (300+ D&D 5E features)
   - Creates character_class_features junction table
   - Manages feature unlocking by class and level
   - Tracks subclass selection
   - Supports multiclassing

## Migration Dependencies

The D&D 5E migrations must be run in sequential order due to dependencies:
- Rest system (03) depends on HP tracking from combat system (01)
- Class features (06) may reference spell slots (02)
- Inventory system (04) integrates with character state

## Archived Migrations

The following migrations have been superseded and renamed to `.backup`:
- `20251112_add_combat_initiative.sql.backup` - Replaced by unified combat system
- `20251112_add_hp_tracking.sql.backup` - Replaced by unified combat system
- `20251112_add_conditions_system.sql.backup` - Replaced by unified combat system
- `20251112_add_attack_resolution.sql.backup` - Replaced by unified combat system

**Important:** Do NOT delete `.backup` files until production verification is complete.

## Rollback Procedure

To rollback a migration:

1. Identify the migration to rollback
2. Create a new rollback migration with timestamp after the target migration
3. Write SQL to reverse the changes (DROP tables, REMOVE columns, etc.)
4. Test rollback on development database first
5. Apply to staging, then production

Example rollback migration naming:
```
20251112_07_rollback_class_features.sql
```

Never manually edit or delete applied migrations from the database or filesystem.

## Migration Testing

### Automated Test Suite

The project includes an automated migration testing script that validates all aspects of the database schema:

```bash
npm run test:migrations
```

Or run directly:
```bash
./scripts/test-migrations.sh
```

### What the Test Suite Validates

The migration test suite performs comprehensive validation:

1. **Pre-flight Checks**
   - Verifies Supabase CLI is installed
   - Confirms project directory structure
   - Counts and lists all migration files
   - Ensures Supabase is running

2. **Migration Execution**
   - Resets database to clean state
   - Applies all migrations in sequential order
   - Captures and reports any migration errors

3. **Schema Validation**
   - Verifies all expected tables exist
   - Validates column data types
   - Checks foreign key constraints
   - Confirms indexes are created
   - Validates unique constraints

4. **Data Integrity Tests**
   - Inserts sample data to test constraints
   - Validates cascade delete behavior
   - Tests unique constraint enforcement
   - Verifies check constraints work correctly
   - Confirms seed data was inserted (e.g., conditions library)

5. **Relationship Tests**
   - Tests JOIN queries across related tables
   - Validates foreign key relationships
   - Ensures referential integrity

6. **Performance Tests**
   - Verifies indexes are being used in queries
   - Checks EXPLAIN plans for optimal query paths

7. **Cleanup**
   - Removes all test data
   - Restores database to clean state

### Running Tests in CI/CD

The test script automatically detects CI environments and skips interactive prompts:

```bash
# In CI/CD pipeline
CI=true npm run test:migrations
```

### Understanding Test Output

The test script provides color-coded output:

- **Green ✓**: Test passed
- **Red ✗**: Test failed
- **Yellow ⚠**: Warning or inconclusive result
- **Blue**: Section headers
- **Cyan ℹ**: Informational messages

Example output:
```
╔════════════════════════════════════════════╗
║   DATABASE MIGRATION TEST SUITE            ║
╚════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pre-flight Checks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Supabase CLI found
✓ Project directory structure valid
✓ Found 51 migration files
✓ Supabase is running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Schema Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating table existence...
✓ Table exists: characters
✓ Table exists: combat_encounters
✓ Table exists: character_spell_slots
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 35
Passed: 35
Failed: 0

╔════════════════════════════════════════════╗
║   ALL MIGRATION TESTS PASSED! ✓            ║
╚════════════════════════════════════════════╝
```

### Troubleshooting Test Failures

If tests fail, the script provides detailed error information:

1. **Migration Application Failed**
   - Check error message in migration output
   - Verify SQL syntax in failing migration
   - Ensure dependencies exist (tables, columns referenced)
   - Review transaction boundaries

2. **Schema Validation Failed**
   - Verify migration created expected tables
   - Check column names and data types
   - Ensure migrations ran in correct order

3. **Foreign Key Validation Failed**
   - Confirm referenced tables exist
   - Verify column names match
   - Check ON DELETE/ON UPDATE clauses

4. **Index Validation Failed**
   - Ensure CREATE INDEX statements exist
   - Check index names match expected patterns
   - Verify indexes are on correct columns

5. **Data Insertion Failed**
   - Check for missing NOT NULL columns
   - Verify foreign key references exist
   - Review constraint definitions

6. **Cascade Delete Failed**
   - Ensure ON DELETE CASCADE is specified
   - Check foreign key relationships
   - Verify referential integrity

### Manual Testing Checklist

In addition to the automated tests, perform these manual checks before production deployment:

- [ ] Run automated test suite: `npm run test:migrations`
- [ ] Review test output for any warnings
- [ ] Verify all tables created with correct schema
- [ ] Run application test suite
- [ ] Check application logs for errors
- [ ] Test with production-like data volume
- [ ] Verify data integrity after migration
- [ ] Review migration for SQL injection vulnerabilities
- [ ] Ensure migrations are idempotent (can be run multiple times safely)
- [ ] Document any manual steps required

## Development Workflow

### Creating New Migrations

1. Create migration file with timestamp prefix:
   ```bash
   touch supabase/migrations/$(date +%Y%m%d_%H%M%S)_description.sql
   ```

2. Write SQL migration:
   ```sql
   -- Migration: Description of changes
   -- Created: YYYY-MM-DD

   BEGIN;

   -- Your migration SQL here

   COMMIT;
   ```

3. Test migration locally:
   ```bash
   psql $LOCAL_DB_URL -f supabase/migrations/TIMESTAMP_description.sql
   ```

4. Verify changes:
   ```bash
   psql $LOCAL_DB_URL -c "\d+ table_name"
   ```

### Running Migrations

Migrations are automatically applied by Supabase CLI:
```bash
supabase db reset  # Reset and reapply all migrations
supabase db push   # Push new migrations to remote
```

## Migration Best Practices

1. **Always use transactions** - Wrap migrations in BEGIN/COMMIT blocks
2. **Make migrations idempotent** - Use IF NOT EXISTS, IF EXISTS clauses
3. **Never modify applied migrations** - Create new migrations to fix issues
4. **Include rollback plans** - Document how to reverse changes
5. **Test thoroughly** - Test on development before production
6. **Use descriptive names** - Clear, concise migration file names
7. **Document dependencies** - Note which migrations depend on others
8. **Maintain sequential order** - Use timestamps to ensure order
9. **Avoid data transformations in schema migrations** - Separate schema and data migrations
10. **Keep migrations focused** - One logical change per migration

## Troubleshooting

### Migration Failed to Apply

1. Check error message in migration output
2. Verify database connection
3. Check for syntax errors in SQL
4. Verify dependencies (tables, columns, etc.) exist
5. Check for constraint violations

### Migration Applied But Application Errors

1. Verify schema matches application expectations
2. Check for missing indexes
3. Verify foreign key constraints
4. Check RLS policies
5. Review application logs for specific errors

### Need to Rollback Migration

1. Create rollback migration (see Rollback Procedure above)
2. DO NOT manually delete or edit applied migrations
3. Test rollback on development first
4. Apply rollback to production with same process as forward migration

## Additional Resources

### Documentation

- [Migration Test Output Examples](./MIGRATION_TEST_OUTPUT.md) - Sample output from successful and failed test runs
- [CI/CD Integration Guide](./MIGRATION_CI_CD.md) - How to integrate migration testing into your CI/CD pipeline
- [Supabase Migrations Documentation](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/ddl.html)

### Project Files

- Migration test script: `/scripts/test-migrations.sh`
- Migration files: `/supabase/migrations/`
- Test output: `/tmp/migration-output.log` (after running tests)
