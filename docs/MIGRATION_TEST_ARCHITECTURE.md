# Migration Test Script - Architecture & Design

## Overview

The migration test script is a comprehensive Bash-based testing framework designed to validate database migrations in isolation before production deployment.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Migration Test Script                      │
│                  (test-migrations.sh)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pre-flight Checks                         │
│  • Verify Supabase CLI installation                          │
│  • Check project directory structure                         │
│  • Count migration files                                     │
│  • Ensure Supabase is running                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Migration Listing                           │
│  • List all .sql files in supabase/migrations/              │
│  • Exclude .backup files                                     │
│  • Sort by filename (chronological order)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              User Confirmation (if not CI)                   │
│  • Display migrations to be tested                           │
│  • Ask for confirmation                                      │
│  • Skip if CI=true                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Migration Execution                         │
│  • Reset database (drop & recreate)                          │
│  • Apply all migrations sequentially                         │
│  • Capture output to log file                                │
│  • Fail fast on first error                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Schema Validation                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Table Existence (14 tables)                           │  │
│  │  • characters, campaigns, game_sessions               │  │
│  │  • combat_encounters, combat_participants             │  │
│  │  • character_spell_slots, character_inventory         │  │
│  │  • class_features_library, etc.                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Column Type Validation (3 tests)                      │  │
│  │  • characters.current_hp → INTEGER                    │  │
│  │  • combat_encounters.current_round → INTEGER          │  │
│  │  • character_spell_slots.level_X_slots → INTEGER      │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Foreign Key Validation (3 tests)                      │  │
│  │  • combat_participants → combat_encounters            │  │
│  │  • character_features → characters                    │  │
│  │  • character_spell_slots → characters                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Index Validation (2 tests)                            │  │
│  │  • combat_participants.encounter_id                   │  │
│  │  • character_features.character_id                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Unique Constraint Validation (2 tests)                │  │
│  │  • character_spell_slots.character_id                 │  │
│  │  • character_subclasses (character+class)             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Integrity Tests                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Sample Data Insertion (5 tests)                       │  │
│  │  • Insert campaign                                    │  │
│  │  • Insert character                                   │  │
│  │  • Insert spell slots                                 │  │
│  │  • Insert game session                                │  │
│  │  • Verify conditions library seed                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Cascade Delete Test (1 test)                          │  │
│  │  • Create encounter + participant                     │  │
│  │  • Delete encounter                                   │  │
│  │  • Verify participant auto-deleted                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Constraint Enforcement (2 tests)                      │  │
│  │  • Test unique constraint violation                   │  │
│  │  • Test check constraint violation                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Relationship Query Tests                      │
│  • Test character → campaign JOIN                            │
│  • Test character → spell_slots JOIN                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Performance Tests                          │
│  • Verify index usage with EXPLAIN                           │
│  • Check query plans for optimal execution                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cleanup                                 │
│  • Delete all test data                                      │
│  • Restore database to clean state                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Summary Report                             │
│  • Total tests run                                           │
│  • Tests passed                                              │
│  • Tests failed                                              │
│  • Success/failure indicator                                 │
│  • Exit code (0=success, 1=failure)                          │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Helper Functions

```bash
log_info()     # Blue informational message
log_success()  # Green success message (increments pass counter)
log_error()    # Red error message (increments fail counter)
log_warning()  # Yellow warning message
log_section()  # Blue section header
increment_test_count()  # Increment total test counter
```

### 2. Test Counter System

```bash
TESTS_PASSED=0   # Successfully passed tests
TESTS_FAILED=0   # Failed tests
TESTS_TOTAL=0    # Total tests run
```

Each test:
1. Increments `TESTS_TOTAL`
2. Calls either `log_success()` (increments `TESTS_PASSED`) or `log_error()` (increments `TESTS_FAILED`)

### 3. Configuration Variables

```bash
SCRIPT_DIR           # Script directory path
PROJECT_ROOT         # Project root directory
MIGRATIONS_DIR       # Path to migrations
TEST_DB_NAME         # Temporary DB name (with timestamp)
MIGRATION_COUNT      # Number of migration files
```

### 4. Test Categories

#### A. Pre-flight Checks (4 tests)
- Supabase CLI availability
- Project directory structure
- Migration file counting
- Supabase running status

#### B. Schema Validation (24 tests)
- 14 table existence checks
- 3 column type validations
- 3 foreign key validations
- 2 index validations
- 2 unique constraint validations

#### C. Data Integrity (8 tests)
- 5 sample data insertions
- 1 cascade delete test
- 1 unique constraint test
- 1 check constraint test

#### D. Relationship Tests (2 tests)
- Character to Campaign JOIN
- Character to Spell Slots JOIN

#### E. Performance Tests (1 test)
- Index usage verification

### 5. Exit Codes

```bash
0   # All tests passed
1   # One or more tests failed
1   # Pre-flight check failed
1   # Migration application failed
```

## Design Principles

### 1. Fail Fast
- Exit immediately on critical failures (CLI missing, migrations fail)
- Continue through validation tests to report all issues

### 2. Clear Feedback
- Color-coded output for quick scanning
- Detailed error messages with context
- Section headers for organization
- Test counter for progress tracking

### 3. Idempotent
- Safe to run multiple times
- Cleans up test data
- Doesn't modify production data
- Uses temporary identifiers

### 4. CI/CD Friendly
- Detects `CI` environment variable
- Skips interactive prompts in CI
- Returns proper exit codes
- Provides parseable output

### 5. Comprehensive Coverage
- Tests all critical database features
- Validates schema, data, and relationships
- Checks performance (indexes)
- Verifies seed data

## Test Execution Flow

```
Start
  ├─ Pre-flight Checks ──[FAIL]─→ Exit 1
  │         ↓ [PASS]
  ├─ List Migrations
  │         ↓
  ├─ User Confirmation (if not CI) ──[NO]─→ Exit 0
  │         ↓ [YES]
  ├─ Run Migrations ──[FAIL]─→ Exit 1
  │         ↓ [PASS]
  ├─ Schema Validation
  │         ↓
  ├─ Data Integrity Tests
  │         ↓
  ├─ Relationship Tests
  │         ↓
  ├─ Performance Tests
  │         ↓
  ├─ Cleanup
  │         ↓
  ├─ Summary Report
  │         ↓
  └─ Exit (0 if all passed, 1 if any failed)
```

## Error Handling

### Critical Errors (Exit Immediately)
- Supabase CLI not found
- Invalid project directory
- No migrations found
- Supabase not running
- Migration application failed

### Non-Critical Errors (Continue Testing)
- Table not found
- Column type mismatch
- Missing foreign key
- Missing index
- Constraint violation
- Query failure

These accumulate in `TESTS_FAILED` counter and are reported in summary.

## Output Formatting

### Color Scheme
```
Blue    (#0000FF) - Section headers, borders
Cyan    (#00FFFF) - Informational messages
Green   (#00FF00) - Success indicators
Yellow  (#FFFF00) - Warnings
Red     (#FF0000) - Errors
```

### Unicode Characters
```
✓  - Success (U+2713)
✗  - Failure (U+2717)
⚠  - Warning (U+26A0)
ℹ  - Information (U+2139)
━  - Section border (U+2501)
```

## Extension Points

### Adding New Tests

1. Create test function:
```bash
test_new_feature() {
    log_section "New Feature Tests"
    log_info "Testing new feature..."

    increment_test_count
    if supabase db exec "YOUR SQL HERE"; then
        log_success "Test description"
    else
        log_error "Test description"
    fi
}
```

2. Call in main():
```bash
main() {
    # ... existing code ...
    test_new_feature
    # ... rest of code ...
}
```

### Adding New Validation Categories

Follow the pattern of existing validations:
- Create section with `log_section()`
- Add informational message with `log_info()`
- Run tests with `increment_test_count()` before each
- Use `log_success()` or `log_error()` for results

## Performance Characteristics

- **Script execution**: < 1 second (without tests)
- **Pre-flight checks**: 1-2 seconds
- **Database reset**: 10-15 seconds
- **Migration application**: 20-30 seconds (51 migrations)
- **Validation tests**: 30-40 seconds (35 tests)
- **Total runtime**: 1-2 minutes

## Dependencies

- **Bash** 4.0+ (for arrays, string manipulation)
- **Supabase CLI** (for database operations)
- **PostgreSQL client tools** (psql, via Supabase CLI)
- **Standard Unix tools** (grep, find, wc, date)

## Limitations

- Requires Supabase CLI (can't test against raw PostgreSQL without modification)
- Tests run sequentially (not parallelized)
- Limited to validation defined in script (extensible though)
- Assumes standard Supabase project structure

## Future Enhancements

1. **Parallel test execution** for faster runtime
2. **Custom test definitions** via config file
3. **Snapshot testing** to detect schema drift
4. **Performance benchmarking** with timing data
5. **HTML/JSON output** for CI integration
6. **Rollback testing** (apply then reverse migrations)
7. **Load testing** with large datasets

## Best Practices

When using this script:

1. **Run before every deployment**
2. **Add new tests as features are added**
3. **Review failed tests carefully** - they prevent production issues
4. **Keep tests fast** - developers should run frequently
5. **Document test failures** for future reference
6. **Integrate into CI/CD** for automated validation

---

**Architecture Version**: 1.0
**Last Updated**: November 14, 2025
**Maintained By**: Development Team
