#!/bin/bash

# ===================================================================
# Performance Benchmarking Script
# Date: 2025-11-03
# Purpose: Execute performance benchmarks and save results
# ===================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Performance Benchmarking Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create a .env file with your Supabase credentials"
  exit 1
fi

# Load environment variables
source .env

# Check for required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set${NC}"
  echo "Please set these variables in your .env file"
  exit 1
fi

# Extract database connection details from Supabase URL
DB_HOST=$(echo $SUPABASE_URL | sed -e 's/https:\/\///' -e 's/\..*//')
DB_NAME="postgres"
DB_USER="postgres"

# Prompt for database password
echo -e "${YELLOW}Note: You'll need your Supabase database password${NC}"
echo -e "${YELLOW}Find it in: Supabase Dashboard → Settings → Database → Connection String${NC}"
echo ""
read -sp "Enter Supabase database password: " DB_PASSWORD
echo ""
echo ""

# Create output directory
OUTPUT_DIR="benchmark-results"
mkdir -p $OUTPUT_DIR

# Generate timestamp for this benchmark run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/benchmark_$TIMESTAMP.txt"

echo -e "${GREEN}Running benchmarks...${NC}"
echo -e "${YELLOW}Results will be saved to: $OUTPUT_FILE${NC}"
echo ""

# Export password for psql
export PGPASSWORD=$DB_PASSWORD

# Run the benchmark SQL script
psql -h "db.$DB_HOST.supabase.co" \
     -U $DB_USER \
     -d $DB_NAME \
     -p 5432 \
     -f scripts/performance-benchmarks.sql \
     > $OUTPUT_FILE 2>&1

BENCHMARK_STATUS=$?

# Clear password from environment
unset PGPASSWORD

if [ $BENCHMARK_STATUS -eq 0 ]; then
  echo -e "${GREEN}✓ Benchmarks completed successfully!${NC}"
  echo ""
  echo -e "${BLUE}Results saved to: $OUTPUT_FILE${NC}"
  echo ""

  # Show summary if available
  if grep -q "BENCHMARK SUMMARY" $OUTPUT_FILE; then
    echo -e "${BLUE}Summary:${NC}"
    sed -n '/BENCHMARK SUMMARY/,/^$/p' $OUTPUT_FILE | tail -n +2
  fi

  # Create latest symlink
  ln -sf "benchmark_$TIMESTAMP.txt" "$OUTPUT_DIR/latest.txt"
  echo ""
  echo -e "${YELLOW}Tip: View full results with: cat $OUTPUT_FILE${NC}"
  echo -e "${YELLOW}Or view latest: cat $OUTPUT_DIR/latest.txt${NC}"
else
  echo -e "${RED}✗ Benchmarks failed!${NC}"
  echo -e "${RED}Check $OUTPUT_FILE for error details${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}========================================${NC}"
echo "1. Review the benchmark results"
echo "2. Run the benchmark comparison script (if available)"
echo "3. Update the performance report with actual metrics"
echo ""
