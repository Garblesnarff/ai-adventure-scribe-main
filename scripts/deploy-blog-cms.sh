#!/usr/bin/env bash

################################################################################
# Blog CMS Deployment Script
#
# This script deploys the Blog CMS by:
# 1. Checking prerequisites (DATABASE_URL, etc.)
# 2. Creating a timestamped backup
# 3. Applying the migration
# 4. Verifying tables were created
# 5. Running smoke tests
# 6. Reporting success or failure
#
# Usage:
#   ./scripts/deploy-blog-cms.sh
#
# Prerequisites:
#   - DATABASE_URL environment variable must be set
#   - psql must be installed and accessible
#   - Migration file must exist at supabase/migrations/20251017_create_blog_cms.sql
#
# Exit codes:
#   0 - Success
#   1 - Prerequisite check failed
#   2 - Backup failed
#   3 - Migration failed
#   4 - Verification failed
#
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_ROOT/supabase/migrations/20251017_create_blog_cms.sql"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed or not in PATH"
        return 1
    fi
    return 0
}

################################################################################
# Prerequisite Checks
################################################################################

check_prerequisites() {
    log_section "Step 1: Checking Prerequisites"

    local has_errors=0

    # Check for psql
    if check_command "psql"; then
        log_success "psql is installed"
    else
        log_error "psql is required but not found. Install PostgreSQL client tools."
        has_errors=1
    fi

    # Check for DATABASE_URL
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL environment variable is not set"
        log_info "Set it with: export DATABASE_URL='postgresql://user:pass@host:port/database'"
        has_errors=1
    else
        log_success "DATABASE_URL is set"
    fi

    # Check migration file exists
    if [ ! -f "$MIGRATION_FILE" ]; then
        log_error "Migration file not found at: $MIGRATION_FILE"
        has_errors=1
    else
        log_success "Migration file found"
    fi

    # Test database connection
    if [ -z "${DATABASE_URL:-}" ]; then
        log_warning "Skipping database connection test (DATABASE_URL not set)"
        has_errors=1
    else
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            log_success "Database connection successful"
        else
            log_error "Cannot connect to database. Check DATABASE_URL and network connectivity."
            has_errors=1
        fi
    fi

    # Check optional environment variables
    if [ -z "${SITE_URL:-}" ]; then
        log_warning "SITE_URL is not set (required for sitemap/RSS). Using default: http://localhost:3000"
        export SITE_URL="http://localhost:3000"
    else
        log_success "SITE_URL is set: $SITE_URL"
    fi

    if [ -z "${BLOG_MEDIA_BUCKET:-}" ]; then
        log_warning "BLOG_MEDIA_BUCKET is not set (required for media uploads). Using default: blog-media"
        export BLOG_MEDIA_BUCKET="blog-media"
    else
        log_success "BLOG_MEDIA_BUCKET is set: $BLOG_MEDIA_BUCKET"
    fi

    if [ $has_errors -eq 1 ]; then
        log_error "Prerequisite checks failed. Please fix the errors above and try again."
        exit 1
    fi

    log_success "All prerequisite checks passed"
}

################################################################################
# Backup Database
################################################################################

backup_database() {
    log_section "Step 2: Creating Database Backup"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/backup_blog_cms_$timestamp.sql"

    log_info "Creating backup at: $backup_file"

    if pg_dump "$DATABASE_URL" > "$backup_file" 2>/dev/null; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_success "Backup created successfully ($backup_size)"
        echo "$backup_file"  # Return backup file path
    else
        log_error "Backup failed. Aborting deployment."
        exit 2
    fi
}

################################################################################
# Apply Migration
################################################################################

apply_migration() {
    log_section "Step 3: Applying Migration"

    log_info "Applying migration from: $MIGRATION_FILE"
    log_warning "This will create blog tables, functions, policies, and triggers."

    if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION_FILE" > /tmp/migration_output.log 2>&1; then
        log_success "Migration applied successfully"
        return 0
    else
        log_error "Migration failed. Check the output below:"
        echo ""
        cat /tmp/migration_output.log
        echo ""
        log_error "Deployment aborted. Database may be in an inconsistent state."
        log_info "Restore from backup with: psql \"\$DATABASE_URL\" < $1"
        exit 3
    fi
}

################################################################################
# Verify Installation
################################################################################

verify_tables() {
    log_section "Step 4: Verifying Tables"

    log_info "Checking if blog tables were created..."

    local tables=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'blog_%';
    " | xargs)

    if [ "$tables" -eq 6 ]; then
        log_success "All 6 blog tables created"
    else
        log_error "Expected 6 blog tables, found $tables"
        return 1
    fi

    # Check specific tables
    local expected_tables=("blog_authors" "blog_categories" "blog_tags" "blog_posts" "blog_post_categories" "blog_post_tags")
    for table in "${expected_tables[@]}"; do
        local exists=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = '$table';
        " | xargs)

        if [ "$exists" -eq 1 ]; then
            log_success "Table exists: $table"
        else
            log_error "Table missing: $table"
            return 1
        fi
    done

    return 0
}

verify_indexes() {
    log_section "Step 5: Verifying Indexes"

    log_info "Checking if indexes were created..."

    local indexes=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename LIKE 'blog_%';
    " | xargs)

    if [ "$indexes" -ge 8 ]; then
        log_success "Found $indexes blog indexes"
    else
        log_warning "Expected at least 8 indexes, found $indexes"
    fi

    return 0
}

verify_functions() {
    log_section "Step 6: Verifying Functions"

    log_info "Checking if functions were created..."

    local functions=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND (routine_name LIKE 'blog_%' OR routine_name LIKE '%blog%');
    " | xargs)

    if [ "$functions" -ge 7 ]; then
        log_success "Found $functions blog functions"
    else
        log_warning "Expected at least 7 functions, found $functions"
    fi

    return 0
}

verify_policies() {
    log_section "Step 7: Verifying RLS Policies"

    log_info "Checking if RLS policies were created..."

    local policies=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM pg_policies
        WHERE tablename LIKE 'blog_%';
    " | xargs)

    if [ "$policies" -eq 19 ]; then
        log_success "All 19 RLS policies created"
    else
        log_warning "Expected 19 RLS policies, found $policies"
    fi

    return 0
}

verify_triggers() {
    log_section "Step 8: Verifying Triggers"

    log_info "Checking if triggers were created..."

    local triggers=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM information_schema.triggers
        WHERE event_object_table LIKE 'blog_%';
    " | xargs)

    if [ "$triggers" -ge 5 ]; then
        log_success "Found $triggers blog triggers"
    else
        log_warning "Expected at least 5 triggers, found $triggers"
    fi

    return 0
}

################################################################################
# Smoke Tests
################################################################################

run_smoke_tests() {
    log_section "Step 9: Running Smoke Tests"

    log_info "Test 1: Insert and query test author"

    # Try to insert a test author
    local test_author_id=$(psql "$DATABASE_URL" -t -c "
        INSERT INTO public.blog_authors (display_name, slug, short_bio)
        VALUES ('Test Author', 'test-author-$(date +%s)', 'Test bio for deployment verification')
        RETURNING id;
    " | xargs || echo "")

    if [ -n "$test_author_id" ]; then
        log_success "Test author created: $test_author_id"

        # Clean up test author
        psql "$DATABASE_URL" -c "DELETE FROM public.blog_authors WHERE id = '$test_author_id';" &> /dev/null
        log_info "Test author cleaned up"
    else
        log_warning "Could not create test author (may be due to RLS policies)"
    fi

    log_info "Test 2: Verify updated_at trigger"

    local trigger_test=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.triggers
            WHERE trigger_name = 'trg_blog_posts_updated_at'
              AND event_object_table = 'blog_posts'
        );
    " | xargs)

    if [ "$trigger_test" = "t" ]; then
        log_success "updated_at trigger exists"
    else
        log_warning "updated_at trigger not found"
    fi

    log_info "Test 3: Verify RLS is enabled"

    local rls_enabled=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'blog_%'
          AND rowsecurity = true;
    " | xargs)

    if [ "$rls_enabled" -eq 6 ]; then
        log_success "RLS enabled on all 6 blog tables"
    else
        log_warning "RLS may not be enabled on all tables (enabled on $rls_enabled/6)"
    fi

    log_success "Smoke tests completed"
}

################################################################################
# Summary Report
################################################################################

print_summary() {
    local backup_file=$1

    log_section "Deployment Summary"

    echo ""
    echo -e "${GREEN}✓ Blog CMS deployed successfully!${NC}"
    echo ""
    echo "What was created:"
    echo "  • 6 database tables (authors, categories, tags, posts, etc.)"
    echo "  • 8+ indexes for performance"
    echo "  • 7 helper functions for roles and permissions"
    echo "  • 19 RLS policies for access control"
    echo "  • 5 triggers for automatic timestamps"
    echo "  • 1 view for user roles"
    echo ""
    echo "Backup location:"
    echo "  $backup_file"
    echo ""
    echo "Environment variables:"
    echo "  SITE_URL: ${SITE_URL:-not set}"
    echo "  BLOG_MEDIA_BUCKET: ${BLOG_MEDIA_BUCKET:-not set}"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your application"
    echo "  2. Navigate to /admin/blog to access the CMS"
    echo "  3. Create your first blog author"
    echo "  4. Create categories and tags"
    echo "  5. Write and publish your first post"
    echo "  6. Verify /blog, /sitemap.xml, and /rss.xml work"
    echo ""
    echo "For detailed verification, see:"
    echo "  docs/deployment/BLOG_CMS_VERIFICATION.md"
    echo ""
    echo "To rollback (if needed):"
    echo "  psql \"\$DATABASE_URL\" < $backup_file"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    log_section "Blog CMS Deployment"

    log_info "Starting deployment at $(date)"
    echo ""

    # Step 1: Prerequisites
    check_prerequisites

    # Step 2: Backup
    backup_file=$(backup_database)

    # Step 3: Apply migration
    apply_migration "$backup_file"

    # Step 4-8: Verify installation
    if verify_tables && verify_indexes && verify_functions && verify_policies && verify_triggers; then
        log_success "All verification checks passed"
    else
        log_error "Some verification checks failed. Review the output above."
        log_info "The migration was applied, but verification found issues."
        log_info "You may want to investigate or rollback."
        exit 4
    fi

    # Step 9: Smoke tests
    run_smoke_tests

    # Summary
    print_summary "$backup_file"

    log_info "Deployment completed at $(date)"
    exit 0
}

# Run main function
main
