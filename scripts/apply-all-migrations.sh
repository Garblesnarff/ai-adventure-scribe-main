#!/bin/bash

# Apply All Database Migrations
# This script applies all performance and scalability improvements to the database

set -e  # Exit on error

echo "========================================="
echo "Applying Database Migrations"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npx supabase is available
if ! command -v npx &> /dev/null; then
    echo -e "${YELLOW}npx not found. Please install Node.js and npm.${NC}"
    exit 1
fi

echo -e "${BLUE}Checking Supabase CLI...${NC}"
npx supabase --version || {
    echo -e "${YELLOW}Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
}

echo ""
echo -e "${BLUE}Migration Order:${NC}"
echo "1. cleanup_duplicate_sessions - Fix existing duplicates"
echo "2. add_session_constraints - Add unique constraint"
echo "3. create_session_archive_system - Archive old sessions"
echo "4. create_character_atomic_function - Atomic character creation"
echo "5. add_message_sequence_numbers - Message ordering"
echo ""

# Apply migrations in order
echo -e "${BLUE}[1/5] Applying cleanup_duplicate_sessions...${NC}"
npx supabase db execute --file supabase/migrations/20251103_01_cleanup_duplicate_sessions.sql
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${BLUE}[2/5] Applying add_session_constraints...${NC}"
npx supabase db execute --file supabase/migrations/20251103_02_add_session_constraints.sql
echo -e "${GREEN}✓ Constraints added${NC}"
echo ""

echo -e "${BLUE}[3/5] Applying create_session_archive_system...${NC}"
npx supabase db execute --file supabase/migrations/20251103_03_create_session_archive_system.sql
echo -e "${GREEN}✓ Archive system created${NC}"
echo ""

echo -e "${BLUE}[4/5] Applying create_character_atomic_function...${NC}"
npx supabase db execute --file supabase/migrations/20251103_create_character_atomic_function.sql
echo -e "${GREEN}✓ Atomic function created${NC}"
echo ""

echo -e "${BLUE}[5/5] Applying add_message_sequence_numbers...${NC}"
npx supabase db execute --file supabase/migrations/20251103151855_add_message_sequence_numbers.sql
echo -e "${GREEN}✓ Sequence numbers added${NC}"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}All migrations applied successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Verification
echo -e "${BLUE}Running verification queries...${NC}"
echo ""

echo -e "${BLUE}Checking for duplicate active sessions:${NC}"
npx supabase db execute --query "
  SELECT campaign_id, character_id, COUNT(*) as active_count
  FROM game_sessions
  WHERE status = 'active'
  GROUP BY campaign_id, character_id
  HAVING COUNT(*) > 1;
" || echo "(Expected: 0 rows)"

echo ""
echo -e "${BLUE}Checking indexes created:${NC}"
npx supabase db execute --query "
  SELECT indexname
  FROM pg_indexes
  WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
  ORDER BY indexname;
"

echo ""
echo -e "${BLUE}Checking functions created:${NC}"
npx supabase db execute --query "
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_character_atomic',
    'archive_old_sessions',
    'restore_archived_session',
    'get_next_message_sequence',
    'assign_message_sequence_number'
  )
  ORDER BY routine_name;
"

echo ""
echo -e "${GREEN}Verification complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run integration tests: node scripts/integration-test.js"
echo "2. Monitor performance improvements"
echo "3. Set up automated archival (monthly cron job)"
