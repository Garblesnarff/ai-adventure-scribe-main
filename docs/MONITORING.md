# Database Optimizations - Monitoring Guide

**Last Updated:** November 3, 2025
**Purpose:** Track health and effectiveness of database optimizations

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Dashboard Setup](#monitoring-dashboard-setup)
3. [Key Metrics](#key-metrics)
4. [Health Checks](#health-checks)
5. [Alerting Rules](#alerting-rules)
6. [Troubleshooting Workflows](#troubleshooting-workflows)
7. [Weekly Review Checklist](#weekly-review-checklist)

---

## Overview

This guide helps you monitor the effectiveness of database optimizations and detect potential issues before they impact users.

### What to Monitor

1. **Query Performance** - Response times, query counts
2. **Database Size** - Table growth, archival effectiveness
3. **Index Usage** - Hit rates, scan types
4. **Client Storage** - IndexedDB cleanup stats
5. **Race Conditions** - Constraint violations
6. **Error Rates** - Failed queries, archival errors

---

## Monitoring Dashboard Setup

### Supabase Dashboard

**Built-in Metrics:**

1. Go to: Supabase Dashboard → Your Project → Database
2. Sections to monitor:
   - **Query Performance** - Slow queries, query volume
   - **Table Sizes** - Growth trends
   - **Logs** - Error patterns

### Custom Monitoring Views

Create these views for easy monitoring:

```sql
-- Create a monitoring schema
CREATE SCHEMA IF NOT EXISTS monitoring;

-- 1. Query Performance Summary
CREATE OR REPLACE VIEW monitoring.query_performance AS
SELECT
  'game_sessions' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  pg_size_pretty(pg_total_relation_size('game_sessions')) as table_size
FROM game_sessions
UNION ALL
SELECT
  'dialogue_history',
  COUNT(*),
  NULL,
  pg_size_pretty(pg_total_relation_size('dialogue_history'))
FROM dialogue_history
UNION ALL
SELECT
  'character_spells',
  COUNT(*),
  NULL,
  pg_size_pretty(pg_total_relation_size('character_spells'))
FROM character_spells;

-- 2. Index Health
CREATE OR REPLACE VIEW monitoring.index_health AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW_USAGE'
    ELSE 'HEALTHY'
  END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 3. Archival Effectiveness
CREATE OR REPLACE VIEW monitoring.archival_summary AS
SELECT
  (SELECT COUNT(*) FROM game_sessions WHERE status = 'completed' AND end_time < NOW() - INTERVAL '90 days') as archivable_sessions,
  (SELECT COUNT(*) FROM game_sessions_archive) as archived_sessions,
  (SELECT MAX(archived_at) FROM game_sessions_archive) as last_archival,
  (SELECT COUNT(*) FROM game_sessions WHERE status = 'active') as active_sessions,
  (SELECT pg_size_pretty(pg_total_relation_size('game_sessions'))) as active_table_size,
  (SELECT pg_size_pretty(pg_total_relation_size('game_sessions_archive'))) as archive_table_size;

-- 4. Duplicate Session Detection
CREATE OR REPLACE VIEW monitoring.duplicate_sessions AS
SELECT
  campaign_id,
  character_id,
  COUNT(*) as active_count,
  array_agg(id) as session_ids
FROM game_sessions
WHERE status = 'active'
GROUP BY campaign_id, character_id
HAVING COUNT(*) > 1;
```

---

## Key Metrics

### 1. Query Performance Metrics

#### Daily Query Volume

```sql
-- Total queries by table (last 24 hours)
-- Note: Requires pg_stat_statements extension
SELECT
  query,
  calls,
  total_time / 1000 as total_seconds,
  mean_time as avg_ms,
  max_time as max_ms
FROM pg_stat_statements
WHERE query LIKE '%game_sessions%'
   OR query LIKE '%dialogue_history%'
   OR query LIKE '%character_spells%'
ORDER BY calls DESC
LIMIT 20;
```

**Target Metrics:**
- Spell validation: < 2 queries per request
- Character loading: 1 query per request
- Session creation: 1 query per request

#### Response Time Tracking

```sql
-- Slow query detection
SELECT
  query,
  calls,
  mean_time as avg_ms,
  max_time as max_ms,
  total_time / calls as per_call_ms
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries averaging > 100ms
ORDER BY mean_time DESC
LIMIT 10;
```

**Target Metrics:**
- P50 (median): < 50ms
- P95: < 200ms
- P99: < 500ms

### 2. Database Size Metrics

#### Table Growth Tracking

```sql
-- Table sizes and row counts
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
  (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_name = tablename) as row_count_placeholder
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('game_sessions', 'dialogue_history', 'memories', 'character_spells')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Detailed row counts
SELECT
  'game_sessions' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'active') as active_rows,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_rows
FROM game_sessions
UNION ALL
SELECT
  'dialogue_history',
  COUNT(*),
  NULL,
  NULL
FROM dialogue_history
UNION ALL
SELECT
  'memories',
  COUNT(*),
  NULL,
  NULL
FROM memories;
```

**Target Metrics:**
- game_sessions: < 5,000 active rows
- dialogue_history: < 100,000 rows
- Total database: < 200 MB

#### Growth Rate Analysis

```sql
-- Weekly growth (requires historical tracking)
WITH weekly_sizes AS (
  SELECT
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as new_sessions
  FROM game_sessions
  WHERE created_at > NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
  ORDER BY week DESC
)
SELECT
  week,
  new_sessions,
  new_sessions - LAG(new_sessions) OVER (ORDER BY week) as growth
FROM weekly_sizes;
```

**Target Metrics:**
- Weekly growth: < 200 new sessions
- Monthly growth: < 10 MB

### 3. Index Usage Metrics

#### Index Hit Rates

```sql
-- Index effectiveness
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  ROUND(100.0 * idx_scan / NULLIF(idx_scan + seq_scan, 0), 2) as index_hit_rate
FROM pg_stat_user_indexes
JOIN pg_stat_user_tables USING (schemaname, tablename)
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Target Metrics:**
- Index hit rate: > 95%
- Unused indexes: 0 (remove if consistently unused)

#### Sequential Scan Detection

```sql
-- Tables with high sequential scans (should use indexes)
SELECT
  schemaname,
  tablename,
  seq_scan as sequential_scans,
  seq_tup_read as tuples_read_seq,
  idx_scan as index_scans,
  CASE
    WHEN seq_scan > idx_scan THEN 'NEEDS_INDEX'
    ELSE 'OK'
  END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;
```

**Target Metrics:**
- Sequential scans: < index scans
- Status: 'OK' for all critical tables

### 4. Archival System Metrics

#### Archival Effectiveness

```sql
-- Use the built-in view
SELECT * FROM archive_statistics;

-- Additional detail
SELECT
  COUNT(*) as eligible_sessions,
  MIN(end_time) as oldest_session,
  MAX(end_time) as newest_eligible,
  AVG(EXTRACT(EPOCH FROM (NOW() - end_time)) / 86400) as avg_age_days
FROM game_sessions
WHERE status = 'completed'
  AND end_time IS NOT NULL
  AND end_time < NOW() - INTERVAL '90 days';
```

**Target Metrics:**
- Archivable sessions: < 100 (run archival if exceeding)
- Last archival: < 7 days ago
- Archive success rate: 100%

#### Archival History

```sql
-- Recent archival activity
SELECT
  DATE_TRUNC('day', archived_at) as date,
  COUNT(*) as sessions_archived,
  MIN(archived_at) as first_archive,
  MAX(archived_at) as last_archive
FROM game_sessions_archive
WHERE archived_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', archived_at)
ORDER BY date DESC;
```

**Target Metrics:**
- Archival frequency: Weekly
- Sessions per archival: 100-500

### 5. Client Storage Metrics

#### IndexedDB Cleanup Stats

**Browser Console:**

```javascript
// Check cleanup statistics
const service = window.IndexedDBService?.getInstance();
if (service) {
  const stats = await service.getCleanupStats();
  console.table({
    'Last Cleanup': new Date(stats.lastCleanupTime).toLocaleString(),
    'Total Deleted': stats.totalMessagesDeleted,
    'Last Deleted': stats.lastDeletedCount,
    'Hours Since Cleanup': Math.floor((Date.now() - stats.lastCleanupTime) / 3600000)
  });
}

// Check current message count
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('agentMessaging');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const tx = db.transaction('messages', 'readonly');
const store = tx.objectStore('messages');
const count = await new Promise((resolve, reject) => {
  const request = store.count();
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

console.log('Current message count:', count);
```

**Target Metrics:**
- Message count: < 100
- Storage size: < 1 MB
- Last cleanup: < 12 hours ago
- Cleanup success rate: > 95%

### 6. Race Condition Metrics

#### Constraint Violations

```sql
-- Check Supabase logs for constraint errors
-- Dashboard → Database → Logs → Filter: "duplicate key value violates"

-- Query to verify no duplicates exist
SELECT * FROM monitoring.duplicate_sessions;
```

**Target Metrics:**
- Duplicate active sessions: 0
- Constraint violations: Handled gracefully by application

---

## Health Checks

### Daily Health Check (5 minutes)

Run this query every day:

```sql
-- Daily health check
WITH health_metrics AS (
  SELECT
    (SELECT COUNT(*) FROM game_sessions WHERE status = 'active') as active_sessions,
    (SELECT COUNT(*) FROM monitoring.duplicate_sessions) as duplicate_sessions,
    (SELECT COUNT(*) FROM game_sessions WHERE status = 'completed' AND end_time < NOW() - INTERVAL '90 days') as archivable_sessions,
    (SELECT pg_size_pretty(pg_database_size(current_database()))) as total_db_size,
    (SELECT MAX(archived_at) FROM game_sessions_archive) as last_archival
)
SELECT
  active_sessions,
  duplicate_sessions,
  archivable_sessions,
  total_db_size,
  last_archival,
  CASE
    WHEN duplicate_sessions > 0 THEN 'CRITICAL: Duplicates detected'
    WHEN archivable_sessions > 100 THEN 'WARNING: Run archival'
    WHEN active_sessions > 10000 THEN 'WARNING: High active sessions'
    ELSE 'OK'
  END as status
FROM health_metrics;
```

**Action Items:**
- ✅ `OK` - No action needed
- ⚠️ `WARNING` - Schedule maintenance
- 🔴 `CRITICAL` - Immediate action required

### Weekly Deep Dive (30 minutes)

1. **Review Query Performance**
   ```sql
   SELECT * FROM monitoring.query_performance;
   ```

2. **Check Index Usage**
   ```sql
   SELECT * FROM monitoring.index_health;
   ```

3. **Analyze Archival Trends**
   ```sql
   SELECT * FROM monitoring.archival_summary;
   ```

4. **Verify Client Cleanup**
   - Test in browser console
   - Check for errors in console logs

### Monthly Review (1 hour)

1. **Performance Trend Analysis**
   - Compare query times month-over-month
   - Identify any degradation patterns
   - Review slow query logs

2. **Storage Growth Analysis**
   - Chart database size growth
   - Verify archival is maintaining target size
   - Project future storage needs

3. **Optimization Opportunities**
   - Identify new N+1 patterns
   - Review unused indexes
   - Consider additional caching

---

## Alerting Rules

### Critical Alerts (Immediate Action)

**1. Duplicate Active Sessions Detected**
```sql
-- Alert if: COUNT(*) FROM monitoring.duplicate_sessions > 0
```
**Action:** Run duplicate cleanup migration immediately

**2. Database Size Exceeds Threshold**
```sql
-- Alert if: pg_database_size(current_database()) > 500 MB
```
**Action:** Run archival immediately, review retention policy

**3. Query Performance Degradation**
```sql
-- Alert if: mean_time > 1000ms for critical queries
```
**Action:** Investigate slow queries, check for missing indexes

### Warning Alerts (Action Within 24 Hours)

**1. Archival Needed**
```sql
-- Alert if: archivable_sessions > 100
```
**Action:** Schedule archival run

**2. Index Not Being Used**
```sql
-- Alert if: idx_scan < 100 after 7 days
```
**Action:** Investigate why index isn't used, consider removing

**3. Client Cleanup Failures**
```javascript
// Alert if: cleanup errors > 5% of attempts
```
**Action:** Check browser console errors, review cleanup logic

### Informational Alerts (Monitor)

**1. High Query Volume**
```sql
-- Alert if: queries per second > 100
```
**Action:** Monitor for performance impact

**2. Storage Growth Rate**
```sql
-- Alert if: weekly growth > 50 MB
```
**Action:** Review data retention policies

---

## Troubleshooting Workflows

### Issue: Slow Query Performance

**Symptoms:**
- Response times > 500ms
- User complaints about slowness
- High CPU usage in database

**Diagnosis:**
```sql
-- 1. Identify slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Check if indexes are being used
EXPLAIN ANALYZE [slow_query_here];

-- 3. Look for sequential scans
SELECT * FROM monitoring.index_health WHERE status = 'UNUSED';
```

**Resolution:**
1. Add missing indexes
2. Rewrite query to use existing indexes
3. Consider query result caching
4. Apply N+1 query optimization pattern

### Issue: Database Size Growing Too Fast

**Symptoms:**
- Database > 500 MB
- Archival not reducing size
- Backup times increasing

**Diagnosis:**
```sql
-- 1. Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- 2. Check archival status
SELECT * FROM monitoring.archival_summary;

-- 3. Check for orphaned data
SELECT COUNT(*) FROM dialogue_history dh
LEFT JOIN game_sessions gs ON dh.session_id = gs.id
WHERE gs.id IS NULL;
```

**Resolution:**
1. Run archival with lower retention (e.g., 60 days)
2. Clean up orphaned data
3. Review CASCADE DELETE constraints
4. Consider more aggressive cleanup policies

### Issue: Duplicate Active Sessions

**Symptoms:**
- Multiple active sessions for same campaign+character
- Constraint violation errors in logs

**Diagnosis:**
```sql
-- Check for duplicates
SELECT * FROM monitoring.duplicate_sessions;
```

**Resolution:**
```sql
-- Apply cleanup migration
-- See: supabase/migrations/20251103_cleanup_duplicate_sessions.sql

-- Verify constraint exists
SELECT indexname FROM pg_indexes
WHERE indexname = 'idx_active_session_per_character';
```

### Issue: IndexedDB Cleanup Not Working

**Symptoms:**
- Browser storage warnings
- Message count > 500
- No recent cleanup

**Diagnosis:**
```javascript
// Browser console
const service = IndexedDBService.getInstance();
const stats = await service.getCleanupStats();
console.log('Last cleanup:', new Date(stats.lastCleanupTime));
console.log('Hours ago:', (Date.now() - stats.lastCleanupTime) / 3600000);

// Check for errors
// Look in console for cleanup-related errors
```

**Resolution:**
1. Manually trigger cleanup:
   ```javascript
   const deleted = await service.manualCleanup();
   console.log(`Deleted ${deleted} messages`);
   ```

2. Check configuration:
   ```typescript
   // src/agents/messaging/services/storage/config/StorageConfig.ts
   cleanup: {
     maxMessageAgeMs: 24 * 60 * 60 * 1000,
     checkIntervalMs: 6 * 60 * 60 * 1000,
   }
   ```

3. Verify `requestIdleCallback` support:
   ```javascript
   if ('requestIdleCallback' in window) {
     console.log('requestIdleCallback supported');
   } else {
     console.log('Using setTimeout fallback');
   }
   ```

---

## Weekly Review Checklist

### Performance Review

- [ ] Run daily health check query
- [ ] Check query performance metrics
- [ ] Review index usage statistics
- [ ] Identify slow queries
- [ ] Document any performance degradation

### Database Health

- [ ] Check table sizes and growth rates
- [ ] Verify archival ran successfully
- [ ] Confirm no duplicate active sessions
- [ ] Review database error logs
- [ ] Check backup status

### Client-Side Health

- [ ] Test IndexedDB cleanup in browser
- [ ] Check cleanup statistics
- [ ] Review browser console for errors
- [ ] Verify message counts are low
- [ ] Test manual cleanup trigger

### Action Items

- [ ] Run archival if > 100 archivable sessions
- [ ] Investigate any slow queries
- [ ] Address any critical alerts
- [ ] Update documentation if patterns change
- [ ] Share findings with team

---

## Monitoring Tools

### Recommended Tools

1. **Supabase Dashboard** (Built-in)
   - Database → Query Performance
   - Database → Logs
   - Database → Table Editor

2. **pg_stat_statements** (PostgreSQL Extension)
   - Query performance tracking
   - Already enabled in Supabase

3. **Custom Monitoring Views** (Created above)
   - `monitoring.query_performance`
   - `monitoring.index_health`
   - `monitoring.archival_summary`
   - `monitoring.duplicate_sessions`

4. **Browser DevTools**
   - Application → IndexedDB
   - Console → Manual checks
   - Network → Query inspection

### Optional Advanced Tools

1. **Grafana + Prometheus**
   - Visual dashboards
   - Historical trend tracking
   - Custom alerts

2. **Datadog / New Relic**
   - APM integration
   - Real-time monitoring
   - Anomaly detection

3. **PgHero**
   - PostgreSQL performance insights
   - Query optimization suggestions
   - Index recommendations

---

## Automation

### Automated Monitoring Script

Create `/home/wonky/ai-adventure-scribe-main/scripts/monitor-health.js`:

```javascript
#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkHealth() {
  console.log('🔍 Running health checks...\n');

  // Check for duplicates
  const { data: duplicates } = await supabase.rpc('execute_sql', {
    query: 'SELECT * FROM monitoring.duplicate_sessions'
  });

  if (duplicates?.length > 0) {
    console.error('🔴 CRITICAL: Duplicate sessions detected!');
    console.error(duplicates);
  } else {
    console.log('✅ No duplicate sessions');
  }

  // Check archival status
  const { data: archival } = await supabase.rpc('execute_sql', {
    query: 'SELECT * FROM monitoring.archival_summary'
  });

  console.log('\n📊 Archival Status:');
  console.log(archival);

  if (archival?.archivable_sessions > 100) {
    console.warn('⚠️  WARNING: Run archival soon');
  }

  // Check query performance
  const { data: performance } = await supabase.rpc('execute_sql', {
    query: 'SELECT * FROM monitoring.query_performance'
  });

  console.log('\n⚡ Query Performance:');
  console.table(performance);

  console.log('\n✨ Health check complete');
}

checkHealth().catch(console.error);
```

**Usage:**
```bash
node scripts/monitor-health.js
```

### Scheduled Monitoring (cron)

```bash
# Add to crontab for daily monitoring at 9 AM
0 9 * * * cd /path/to/project && node scripts/monitor-health.js >> logs/monitoring.log 2>&1
```

---

## Summary

### Monitoring Best Practices

1. **Daily:** Run quick health check (5 min)
2. **Weekly:** Deep dive review (30 min)
3. **Monthly:** Trend analysis and optimization review (1 hour)
4. **Alert-Driven:** Respond to critical alerts immediately
5. **Document:** Keep notes on patterns and solutions

### Success Metrics

Your optimizations are working if:

- ✅ Query times < 200ms (P95)
- ✅ Database size < 200 MB and stable
- ✅ No duplicate active sessions
- ✅ Archival runs weekly automatically
- ✅ IndexedDB stays < 1 MB
- ✅ Index hit rate > 95%

### Red Flags

Take immediate action if:

- 🔴 Duplicate sessions detected
- 🔴 Database size > 500 MB
- 🔴 Query times > 1000ms
- 🔴 Archival hasn't run in 14+ days
- 🔴 Index hit rate < 80%

---

**Last Updated:** November 3, 2025
**Next Review:** December 3, 2025
**Maintained By:** AI Adventure Scribe Team
