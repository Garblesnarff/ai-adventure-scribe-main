# Performance Benchmarking Results

This directory contains the results of performance benchmarks for the AI Adventure Scribe platform.

## Quick Start

### Run All Benchmarks

```bash
# 1. Run SQL query benchmarks
./scripts/run-performance-benchmarks.sh

# 2. Measure API payload sizes
node scripts/measure-payload-sizes.js

# 3. View results
cat benchmark-results/latest.txt
```

## Available Benchmark Tools

### 1. SQL Query Benchmarks (`performance-benchmarks.sql`)

**Purpose:** Measure database query performance for all optimizations.

**What it tests:**
- Unit 2: Spell validation (N+1 fix)
- Unit 3: Message loading (pagination)
- Unit 4: Character spell loading (JOIN optimization)
- Unit 9: Character list payload reduction
- Unit 10: Campaign list payload reduction
- Index performance analysis
- Table size analysis
- Archival system impact

**How to run:**
```bash
./scripts/run-performance-benchmarks.sh
```

**Output:** `benchmark-results/benchmark_YYYYMMDD_HHMMSS.txt`

### 2. API Payload Size Measurement (`measure-payload-sizes.js`)

**Purpose:** Measure actual API response payload sizes.

**What it tests:**
- Character list endpoint payload size
- Campaign list endpoint payload size
- Message list endpoint payload size
- Spell data payload size
- Bandwidth savings calculations

**How to run:**
```bash
node scripts/measure-payload-sizes.js
```

**Output:** `benchmark-results/payload-sizes-YYYY-MM-DDTHH-MM-SS.json`

## Result Files

### SQL Benchmark Results

**File format:** `benchmark_YYYYMMDD_HHMMSS.txt`

**Contains:**
- Query execution times (ms)
- EXPLAIN ANALYZE output
- Before/after comparisons
- Index usage statistics
- Table size information
- Archival impact projections

**Example excerpt:**
```
========== UNIT 2: SPELL VALIDATION ==========
Testing spell validation query performance...
BEFORE (N queries): 150.00 ms for 10 spells (15.00 ms per spell)
AFTER (1 batch query): 12.00 ms for 10 spells
```

### Payload Size Results

**File format:** `payload-sizes-YYYY-MM-DDTHH-MM-SS.json`

**Structure:**
```json
{
  "timestamp": "2025-11-03T10:30:00.000Z",
  "results": [
    {
      "name": "Character List",
      "before": 20480,
      "after": 8192,
      "count": 10,
      "reduction": 12288,
      "percentage": 60.0,
      "ratio": "2.50x"
    }
  ],
  "summary": {
    "totalBefore": 50000,
    "totalAfter": 15000,
    "totalReduction": 35000,
    "avgPercentage": 65.5
  },
  "scenarios": [
    {
      "users": 1000,
      "requestsPerDay": 10,
      "dailyRequests": 10000,
      "dailySavings": 350000000,
      "monthlySavings": 10500000000
    }
  ]
}
```

## Latest Results

The `latest.txt` symlink always points to the most recent SQL benchmark results.

```bash
# View latest results
cat benchmark-results/latest.txt

# Or with less for scrolling
less benchmark-results/latest.txt
```

## Interpreting Results

### SQL Query Performance

**Good:**
- Query time < 50ms
- Query reduction > 70%
- Index usage > 90%

**Needs attention:**
- Query time > 200ms
- Sequential scans on large tables
- Index not being used

### Payload Sizes

**Good:**
- Payload reduction > 50%
- Per-item size < 1 KB
- Total response < 100 KB

**Needs attention:**
- Payload size > 100 KB for list endpoints
- Large JSONB fields in list views
- No compression applied

## Comparing Results Over Time

### Create Baseline

```bash
# Run benchmarks on current state
./scripts/run-performance-benchmarks.sh
node scripts/measure-payload-sizes.js

# Save as baseline
cp benchmark-results/latest.txt benchmark-results/baseline.txt
```

### Compare After Changes

```bash
# Run benchmarks again
./scripts/run-performance-benchmarks.sh

# Compare
diff benchmark-results/baseline.txt benchmark-results/latest.txt
```

## Expected Performance Targets

Based on the optimization work, you should see:

### Query Performance
- Spell validation: < 20ms (batch query)
- Message loading: < 50ms (paginated)
- Character spell loading: < 30ms (single JOIN)
- Session lookup: < 10ms (indexed)

### Payload Sizes
- Character list: ~800 bytes/character
- Campaign list: ~1500 bytes/campaign
- Message page: ~25 KB (50 messages)

### Improvements vs Baseline
- Query count: 67-95% reduction
- Query time: 5-12× faster
- Payload size: 60-70% reduction

## Troubleshooting

### SQL Benchmarks Fail

**Problem:** Connection to database fails

**Solution:**
1. Check `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Verify database password
3. Check firewall allows connection to Supabase

### No Test Data

**Problem:** Benchmarks skip tests due to missing data

**Solution:**
1. Run database migrations
2. Seed test data: `npm run server:seed`
3. Create at least one character with spells
4. Create at least one session with messages

### Payload Measurement Fails

**Problem:** API requests return errors

**Solution:**
1. Ensure backend server is running: `npm run server:dev`
2. Check environment variables are set
3. Verify API endpoints exist and are accessible

## Continuous Monitoring

### Set Up Regular Benchmarks

**Option 1: Local cron job**
```bash
# Add to crontab (run weekly)
0 0 * * 0 cd /path/to/project && ./scripts/run-performance-benchmarks.sh
```

**Option 2: CI/CD pipeline**
```yaml
# .github/workflows/benchmarks.yml
name: Performance Benchmarks
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run benchmarks
        run: |
          ./scripts/run-performance-benchmarks.sh
          node scripts/measure-payload-sizes.js
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: benchmark-results/
```

### Track Metrics Over Time

Create a spreadsheet or dashboard to track:

| Date | Spell Validation (ms) | Message Load (ms) | Character List (KB) | Campaign List (KB) |
|------|---------------------|------------------|-------------------|-------------------|
| 2025-11-03 | 12 | 45 | 8 | 7.5 |
| 2025-11-10 | ... | ... | ... | ... |

## Need Help?

1. Check the main performance report: `PERFORMANCE_BENCHMARKING_REPORT.md`
2. Review optimization documentation in unit completion reports
3. Check database indexes: `supabase/migrations/20251103_add_session_constraints.sql`
4. Review archival system: `supabase/migrations/20251103_create_session_archive_system.sql`

## Related Documentation

- `/home/wonky/ai-adventure-scribe-main/PERFORMANCE_BENCHMARKING_REPORT.md` - Main report
- `/home/wonky/ai-adventure-scribe-main/UNIT_2_COMPLETION_REPORT.md` - Spell validation fix
- `/home/wonky/ai-adventure-scribe-main/server/QUERY_FIX_VERIFICATION.md` - Character spell loading
- `/home/wonky/ai-adventure-scribe-main/docs/SESSION_ARCHIVAL_SUMMARY.md` - Archival system

---

**Last Updated:** November 3, 2025
