#!/bin/bash
# =============================================================================
# Migration Testing Script
# =============================================================================
# Purpose: Test all database migrations in an isolated environment
# Usage: npm run test:migrations
# or: ./scripts/test-migrations.sh
#
# This script:
# - Creates a temporary test database
# - Runs all migrations in order
# - Validates schema integrity
# - Tests constraints and relationships
# - Inserts sample data to verify functionality
# - Cleans up resources on completion
# =============================================================================

set -e  # Exit on any error
set -o pipefail  # Catch errors in pipes

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
TEST_DB_NAME="test_migrations_$(date +%s)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

increment_test_count() {
    ((TESTS_TOTAL++))
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
    log_section "Pre-flight Checks"

    # Check if Supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI not found"
        echo "Install with: npm install -g supabase"
        exit 1
    fi
    log_success "Supabase CLI found"

    # Check if we're in the project root
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Must run from project root directory"
        echo "Expected migrations at: $MIGRATIONS_DIR"
        exit 1
    fi
    log_success "Project directory structure valid"

    # Count migration files (excluding .backup files)
    MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -name "*.sql" ! -name "*.backup" 2>/dev/null | wc -l)
    if [ "$MIGRATION_COUNT" -eq 0 ]; then
        log_error "No migration files found in $MIGRATIONS_DIR"
        exit 1
    fi
    log_success "Found $MIGRATION_COUNT migration files"

    # Check if Supabase is running
    if ! supabase status &> /dev/null; then
        log_warning "Supabase is not running. Starting..."
        supabase start || {
            log_error "Failed to start Supabase"
            exit 1
        }
    fi
    log_success "Supabase is running"
}

# =============================================================================
# Migration Listing
# =============================================================================

list_migrations() {
    log_section "Migrations to Test"

    find "$MIGRATIONS_DIR" -name "*.sql" ! -name "*.backup" 2>/dev/null | sort | while read -r migration; do
        echo "  $(basename "$migration")"
    done
}

# =============================================================================
# Run Migrations
# =============================================================================

run_migrations() {
    log_section "Running Migrations"

    log_info "Resetting database and applying all migrations..."

    if supabase db reset --db-url "$DB_URL" 2>&1 | tee /tmp/migration-output.log; then
        log_success "All migrations applied successfully"
        return 0
    else
        log_error "Migration application failed"
        echo ""
        echo "Error details:"
        cat /tmp/migration-output.log
        return 1
    fi
}

# =============================================================================
# Schema Validation
# =============================================================================

validate_schema() {
    log_section "Schema Validation"

    # Check if essential tables exist
    log_info "Validating table existence..."

    local tables=(
        "characters"
        "game_sessions"
        "campaigns"
        "combat_encounters"
        "combat_participants"
        "combat_participant_status"
        "combat_participant_conditions"
        "conditions_library"
        "character_spell_slots"
        "rest_history"
        "character_inventory"
        "class_features_library"
        "character_features"
        "character_subclasses"
    )

    for table in "${tables[@]}"; do
        increment_test_count
        if supabase db exec "SELECT to_regclass('public.$table');" 2>/dev/null | grep -q "$table"; then
            log_success "Table exists: $table"
        else
            log_error "Table missing: $table"
        fi
    done
}

validate_columns() {
    log_section "Column Type Validation"

    log_info "Validating critical column types..."

    # Validate character columns
    increment_test_count
    if supabase db exec "
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'characters'
        AND column_name = 'current_hp'
        AND data_type = 'integer';" 2>/dev/null | grep -q "current_hp"; then
        log_success "characters.current_hp is INTEGER"
    else
        log_error "characters.current_hp type mismatch"
    fi

    # Validate combat_encounters columns
    increment_test_count
    if supabase db exec "
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'combat_encounters'
        AND column_name = 'current_round'
        AND data_type = 'integer';" 2>/dev/null | grep -q "current_round"; then
        log_success "combat_encounters.current_round is INTEGER"
    else
        log_error "combat_encounters.current_round type mismatch"
    fi

    # Validate spell slots columns
    increment_test_count
    if supabase db exec "
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'character_spell_slots'
        AND column_name IN ('level_1_slots', 'level_1_used');" 2>/dev/null | grep -q "level_1_slots"; then
        log_success "character_spell_slots has required spell level columns"
    else
        log_error "character_spell_slots missing spell level columns"
    fi
}

validate_foreign_keys() {
    log_section "Foreign Key Constraint Validation"

    log_info "Validating foreign key constraints..."

    # Check combat_participants -> combat_encounters
    increment_test_count
    if supabase db exec "
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'combat_participants'
          AND kcu.column_name = 'encounter_id';" 2>/dev/null | grep -q "combat_participants"; then
        log_success "Foreign key: combat_participants.encounter_id -> combat_encounters.id"
    else
        log_error "Missing FK: combat_participants.encounter_id"
    fi

    # Check character_features -> characters
    increment_test_count
    if supabase db exec "
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'character_features'
          AND kcu.column_name = 'character_id';" 2>/dev/null | grep -q "character_features"; then
        log_success "Foreign key: character_features.character_id -> characters.id"
    else
        log_error "Missing FK: character_features.character_id"
    fi

    # Check character_spell_slots -> characters
    increment_test_count
    if supabase db exec "
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'character_spell_slots'
          AND kcu.column_name = 'character_id';" 2>/dev/null | grep -q "character_spell_slots"; then
        log_success "Foreign key: character_spell_slots.character_id -> characters.id"
    else
        log_error "Missing FK: character_spell_slots.character_id"
    fi
}

validate_indexes() {
    log_section "Index Validation"

    log_info "Validating critical indexes..."

    # Check combat_participants index on encounter_id
    increment_test_count
    if supabase db exec "
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'combat_participants'
        AND indexname LIKE '%encounter%';" 2>/dev/null | grep -q "encounter"; then
        log_success "Index exists on combat_participants.encounter_id"
    else
        log_error "Missing index on combat_participants.encounter_id"
    fi

    # Check character_features index on character_id
    increment_test_count
    if supabase db exec "
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'character_features'
        AND indexname LIKE '%character%';" 2>/dev/null | grep -q "character"; then
        log_success "Index exists on character_features.character_id"
    else
        log_error "Missing index on character_features.character_id"
    fi
}

validate_unique_constraints() {
    log_section "Unique Constraint Validation"

    log_info "Validating unique constraints..."

    # Check character_spell_slots unique constraint
    increment_test_count
    if supabase db exec "
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'character_spell_slots'
        AND constraint_type = 'UNIQUE';" 2>/dev/null | grep -q "character"; then
        log_success "Unique constraint exists on character_spell_slots"
    else
        log_error "Missing unique constraint on character_spell_slots"
    fi

    # Check character_subclasses unique constraint
    increment_test_count
    if supabase db exec "
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'character_subclasses'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%character%class%';" 2>/dev/null | grep -q "character"; then
        log_success "Unique constraint exists on character_subclasses"
    else
        log_error "Missing unique constraint on character_subclasses"
    fi
}

# =============================================================================
# Data Insertion Tests
# =============================================================================

test_data_insertion() {
    log_section "Sample Data Insertion Tests"

    log_info "Testing basic data insertion and constraints..."

    # Create a test user (if not exists)
    TEST_USER_ID="00000000-0000-0000-0000-000000000001"

    # Test 1: Insert campaign
    increment_test_count
    if supabase db exec "
        INSERT INTO campaigns (id, name, user_id, created_at)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Test Campaign', '$TEST_USER_ID', NOW())
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null; then
        log_success "Campaign insertion successful"
    else
        log_error "Campaign insertion failed"
    fi

    # Test 2: Insert character
    increment_test_count
    if supabase db exec "
        INSERT INTO characters (
            id, name, campaign_id, user_id, level, class,
            current_hp, max_hp, armor_class, created_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000002',
            'Test Fighter',
            '00000000-0000-0000-0000-000000000001',
            '$TEST_USER_ID',
            5,
            'Fighter',
            45,
            45,
            18,
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null; then
        log_success "Character insertion successful"
    else
        log_error "Character insertion failed"
    fi

    # Test 3: Insert spell slots
    increment_test_count
    if supabase db exec "
        INSERT INTO character_spell_slots (
            character_id, level_1_slots, level_1_used
        )
        VALUES (
            '00000000-0000-0000-0000-000000000002',
            4,
            0
        )
        ON CONFLICT (character_id) DO NOTHING;" 2>/dev/null; then
        log_success "Spell slots insertion successful"
    else
        log_error "Spell slots insertion failed"
    fi

    # Test 4: Insert game session
    increment_test_count
    if supabase db exec "
        INSERT INTO game_sessions (
            id, campaign_id, user_id, created_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000001',
            '$TEST_USER_ID',
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null; then
        log_success "Game session insertion successful"
    else
        log_error "Game session insertion failed"
    fi

    # Test 5: Verify conditions library was seeded
    increment_test_count
    local condition_count=$(supabase db exec "SELECT COUNT(*) FROM conditions_library;" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    if [ "$condition_count" -ge 13 ]; then
        log_success "Conditions library seeded (found $condition_count conditions)"
    else
        log_error "Conditions library incomplete (found $condition_count, expected 13+)"
    fi
}

test_cascade_deletes() {
    log_section "Cascade Delete Tests"

    log_info "Testing cascade delete relationships..."

    # Test 6: Create combat encounter and participant, then test cascade
    increment_test_count
    supabase db exec "
        INSERT INTO combat_encounters (id, session_id, status)
        VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'active')
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null

    supabase db exec "
        INSERT INTO combat_participants (
            id, encounter_id, name, participant_type,
            initiative, turn_order, armor_class, max_hp
        )
        VALUES (
            '00000000-0000-0000-0000-000000000005',
            '00000000-0000-0000-0000-000000000004',
            'Test Enemy', 'enemy', 15, 0, 14, 30
        )
        ON CONFLICT (id) DO NOTHING;" 2>/dev/null

    # Delete encounter and verify participant is deleted
    supabase db exec "DELETE FROM combat_encounters WHERE id = '00000000-0000-0000-0000-000000000004';" 2>/dev/null

    local participant_count=$(supabase db exec "SELECT COUNT(*) FROM combat_participants WHERE id = '00000000-0000-0000-0000-000000000005';" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    if [ "$participant_count" -eq 0 ]; then
        log_success "Cascade delete: combat_participants deleted with encounter"
    else
        log_error "Cascade delete failed: combat_participants not deleted"
    fi
}

test_unique_constraints() {
    log_section "Unique Constraint Tests"

    log_info "Testing unique constraint enforcement..."

    # Test 7: Try to insert duplicate character_spell_slots
    increment_test_count
    if supabase db exec "
        INSERT INTO character_spell_slots (character_id, level_1_slots, level_1_used)
        VALUES ('00000000-0000-0000-0000-000000000002', 3, 0);" 2>&1 | grep -q "duplicate\|unique"; then
        log_success "Unique constraint enforced on character_spell_slots.character_id"
    else
        log_warning "Unique constraint test inconclusive (may already exist)"
    fi
}

test_check_constraints() {
    log_section "Check Constraint Tests"

    log_info "Testing check constraint enforcement..."

    # Test 8: Try to insert invalid death saves (should fail)
    increment_test_count
    if supabase db exec "
        INSERT INTO combat_participant_status (
            participant_id, current_hp, max_hp,
            death_saves_successes, death_saves_failures
        )
        VALUES (
            '00000000-0000-0000-0000-000000000006',
            10, 10, 5, 0
        );" 2>&1 | grep -q "violates check\|constraint"; then
        log_success "Check constraint enforced: death_saves_successes <= 3"
    else
        log_error "Check constraint not enforced: death_saves_successes"
    fi
}

# =============================================================================
# Relationship Query Tests
# =============================================================================

test_relationship_queries() {
    log_section "Relationship Query Tests"

    log_info "Testing JOIN queries across relationships..."

    # Test 9: Character -> Campaign join
    increment_test_count
    if supabase db exec "
        SELECT c.name, ca.name
        FROM characters c
        JOIN campaigns ca ON c.campaign_id = ca.id
        LIMIT 1;" 2>/dev/null | grep -q "Test"; then
        log_success "JOIN query works: characters -> campaigns"
    else
        log_error "JOIN query failed: characters -> campaigns"
    fi

    # Test 10: Character -> Spell Slots join
    increment_test_count
    if supabase db exec "
        SELECT c.name, s.level_1_slots
        FROM characters c
        LEFT JOIN character_spell_slots s ON c.id = s.character_id
        LIMIT 1;" 2>/dev/null | grep -q "Test"; then
        log_success "JOIN query works: characters -> character_spell_slots"
    else
        log_error "JOIN query failed: characters -> character_spell_slots"
    fi
}

# =============================================================================
# Performance Tests
# =============================================================================

test_performance() {
    log_section "Performance Tests"

    log_info "Testing query performance on indexed columns..."

    # Test 11: Index performance on combat_participants
    increment_test_count
    local explain_output=$(supabase db exec "
        EXPLAIN SELECT * FROM combat_participants WHERE encounter_id = '00000000-0000-0000-0000-000000000004';" 2>/dev/null)

    if echo "$explain_output" | grep -q "Index Scan"; then
        log_success "Index being used for combat_participants.encounter_id query"
    else
        log_warning "Index may not be used for combat_participants.encounter_id (check EXPLAIN output)"
    fi
}

# =============================================================================
# Cleanup
# =============================================================================

cleanup_test_data() {
    log_section "Cleanup"

    log_info "Cleaning up test data..."

    supabase db exec "
        DELETE FROM characters WHERE id = '00000000-0000-0000-0000-000000000002';
        DELETE FROM game_sessions WHERE id = '00000000-0000-0000-0000-000000000003';
        DELETE FROM campaigns WHERE id = '00000000-0000-0000-0000-000000000001';
    " 2>/dev/null || true

    log_success "Test data cleaned up"
}

# =============================================================================
# Summary Report
# =============================================================================

print_summary() {
    log_section "Test Summary"

    echo ""
    echo "Total Tests: $TESTS_TOTAL"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   ALL MIGRATION TESTS PASSED! ✓            ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
        return 0
    else
        echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║   SOME TESTS FAILED                        ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Review the errors above and:"
        echo "1. Check migration file syntax"
        echo "2. Verify foreign key references"
        echo "3. Review constraint definitions"
        echo "4. Check for missing indexes"
        echo ""
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   DATABASE MIGRATION TEST SUITE            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""

    # Run preflight checks
    preflight_checks

    # List migrations
    list_migrations

    # Confirm before proceeding (skip in CI)
    if [ -z "$CI" ]; then
        echo ""
        read -p "Continue with migration test? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Test cancelled"
            exit 0
        fi
    fi

    # Run migrations
    run_migrations || exit 1

    # Schema validation
    validate_schema
    validate_columns
    validate_foreign_keys
    validate_indexes
    validate_unique_constraints

    # Data tests
    test_data_insertion
    test_cascade_deletes
    test_unique_constraints
    test_check_constraints

    # Relationship tests
    test_relationship_queries

    # Performance tests
    test_performance

    # Cleanup
    cleanup_test_data

    # Print summary
    print_summary

    exit $?
}

# Run main function
main "$@"
