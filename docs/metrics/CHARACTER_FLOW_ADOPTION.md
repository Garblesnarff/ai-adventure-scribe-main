# Character Creation Flow Adoption Metrics

## Overview

This document describes how to monitor the adoption of the new campaign-based character creation flow and determine when the legacy character creation flow can be safely deprecated.

## Background

The application has two character creation flows:

1. **Legacy Flow**: Direct character creation via `/app/characters/create`
   - Users create characters independently without campaign association
   - Controlled by `ENABLE_LEGACY_CHARACTER_ENTRY` flag in `App.tsx`
   - Will be deprecated once new flow reaches 95% adoption

2. **New Flow**: Campaign-based character creation via `/app/campaigns/:id/characters/new`
   - Characters are created within the context of a campaign
   - Controlled by `VITE_ENABLE_CAMPAIGN_CHARACTER_FLOW` feature flag
   - Currently in rollout phase

## Deprecation Requirement

**The legacy flow can ONLY be deprecated when:**
- ✅ New flow adoption ≥ 95% for **14 consecutive days**
- ✅ No critical bugs reported in the new flow
- ✅ All stakeholders have been notified

## Tracking Infrastructure

### Database Table

**Table**: `character_creation_metrics`

Columns:
- `id`: UUID primary key
- `flow`: `'legacy'` or `'new'`
- `timestamp`: When the character creation was completed
- `user_id`: User who created the character (nullable)
- `campaign_id`: Campaign ID if using new flow (null for legacy)
- `created_at`: Record creation timestamp

### Tracking Points

**Where tracking happens:**
- **Entry**: Not tracked (to avoid noise from abandoned sessions)
- **Completion**: Tracked when character is successfully saved
  - Location: `src/components/character-creation/wizard/WizardContent.tsx`
  - Function: `analytics.trackCharacterCreationFlow(flow, { campaignId, userId })`

**Flow determination:**
```typescript
const isNewFlow = isCampaignCharacterFlowEnabled() && !!campaignId;
const flow = isNewFlow ? 'new' : 'legacy';
```

## Monitoring Queries

All queries are located in: `server/src/queries/character-flow-metrics.sql`

### Quick Check: Current Adoption Status

Run this query to see the current adoption percentage over the last 14 days:

```sql
SELECT
  COUNT(CASE WHEN flow = 'new' THEN 1 END) AS new_flow_count,
  COUNT(CASE WHEN flow = 'legacy' THEN 1 END) AS legacy_flow_count,
  COUNT(*) AS total_count,
  ROUND(
    (COUNT(CASE WHEN flow = 'new' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS new_flow_percentage
FROM character_creation_metrics
WHERE timestamp >= NOW() - INTERVAL '14 days';
```

**Expected output:**
```
 new_flow_count | legacy_flow_count | total_count | new_flow_percentage
----------------+-------------------+-------------+---------------------
           150 |                 8 |         158 |               94.94
```

### Critical Query: Can We Deprecate?

**This is the KEY query** to determine if the legacy flow can be deprecated:

```sql
WITH daily_adoption AS (
  SELECT
    DATE(timestamp) AS date,
    COUNT(CASE WHEN flow = 'new' THEN 1 END) AS new_count,
    COUNT(*) AS total_count,
    ROUND(
      (COUNT(CASE WHEN flow = 'new' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS new_percentage
  FROM character_creation_metrics
  WHERE timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(timestamp)
),
consecutive_days AS (
  SELECT
    date,
    new_percentage,
    CASE WHEN new_percentage >= 95 THEN 1 ELSE 0 END AS meets_threshold,
    SUM(CASE WHEN new_percentage >= 95 THEN 1 ELSE 0 END)
      OVER (
        ORDER BY date DESC
        ROWS BETWEEN CURRENT ROW AND 13 FOLLOWING
      ) AS days_meeting_threshold_in_window
  FROM daily_adoption
)
SELECT
  MAX(date) AS most_recent_date,
  MAX(days_meeting_threshold_in_window) AS consecutive_days_above_95,
  CASE
    WHEN MAX(days_meeting_threshold_in_window) >= 14 THEN 'YES - Safe to deprecate legacy flow'
    ELSE 'NO - Need ' || (14 - COALESCE(MAX(days_meeting_threshold_in_window), 0)) || ' more consecutive days above 95%'
  END AS can_deprecate_legacy
FROM consecutive_days
WHERE date >= NOW() - INTERVAL '14 days';
```

**Expected output:**
```
 most_recent_date | consecutive_days_above_95 | can_deprecate_legacy
------------------+---------------------------+-----------------------------------------
       2025-11-14 |                        14 | YES - Safe to deprecate legacy flow
```

### Daily Breakdown (Trend Analysis)

See daily adoption trends over the last 30 days:

```sql
SELECT
  DATE(timestamp) AS date,
  COUNT(CASE WHEN flow = 'new' THEN 1 END) AS new_flow_count,
  COUNT(CASE WHEN flow = 'legacy' THEN 1 END) AS legacy_flow_count,
  COUNT(*) AS total_count,
  ROUND(
    (COUNT(CASE WHEN flow = 'new' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS new_flow_percentage
FROM character_creation_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### User-Level Analysis

Identify users still using the legacy flow:

```sql
SELECT
  user_id,
  COUNT(CASE WHEN flow = 'new' THEN 1 END) AS new_flow_uses,
  COUNT(CASE WHEN flow = 'legacy' THEN 1 END) AS legacy_flow_uses,
  COUNT(*) AS total_uses,
  MAX(timestamp) FILTER (WHERE flow = 'legacy') AS last_legacy_use
FROM character_creation_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(CASE WHEN flow = 'legacy' THEN 1 END) > 0
ORDER BY legacy_flow_uses DESC
LIMIT 20;
```

## How to Access Metrics

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the desired query from `server/src/queries/character-flow-metrics.sql`
5. Click **Run**

### Option 2: Direct Database Access

If you have direct database access:

```bash
# Connect to the database
psql $DATABASE_URL

# Run the critical query
\i server/src/queries/character-flow-metrics.sql
```

### Option 3: Application Dashboard (Future)

A metrics dashboard can be built using the queries in this document. This is not currently implemented but would be valuable for real-time monitoring.

## Monitoring Schedule

**Recommended monitoring frequency:**

- **Days 1-7**: Daily checks to ensure tracking is working correctly
- **Days 8-14**: Daily checks as we approach the threshold
- **After Day 14**: Check the "Can We Deprecate?" query
- **If ≥ 95% for 14 days**: Proceed with deprecation plan

## When to Deprecate Legacy Flow

### Prerequisites Checklist

Before deprecating the legacy flow, verify:

- [ ] ✅ New flow adoption ≥ 95% for 14 consecutive days (verified via Query 3)
- [ ] ✅ No critical bugs in new flow (check error logs, support tickets)
- [ ] ✅ Analytics confirm tracking is accurate (sample check)
- [ ] ✅ Stakeholders notified (product, eng, support)
- [ ] ✅ Documentation updated
- [ ] ✅ Migration guide created for remaining legacy users (if needed)

### Deprecation Steps

1. **Disable Legacy Entry Points**
   ```typescript
   // In App.tsx
   const ENABLE_LEGACY_CHARACTER_ENTRY = false;
   ```

2. **Remove Routes (After Testing)**
   ```typescript
   // Remove these routes from App.tsx:
   // - /app/characters (list)
   // - /app/characters/create
   ```

3. **Clean Up Code**
   - Follow the plan in `docs/cleanup/campaign-character-migration.md`
   - Remove legacy feature flag checks
   - Remove `CharacterCreateEntry` legacy path

4. **Database Migration**
   - Add migration to mark legacy flow as deprecated
   - Archive legacy metrics (optional, for historical analysis)

## Analytics Providers

Character creation flow events are sent to:

1. **Database** (`character_creation_metrics` table)
   - Source of truth for deprecation metrics
   - Used for all queries in this document

2. **Google Analytics 4** (if configured)
   - Event: `character_creation_flow`
   - Parameters: `flow`, `campaignId`, `timestamp`

3. **PostHog** (if configured)
   - Event: `character_creation_flow`
   - Properties: `flow`, `campaignId`, `timestamp`

## Troubleshooting

### No data in metrics table

**Check:**
1. Is the migration applied? `SELECT * FROM character_creation_metrics LIMIT 1;`
2. Are users completing character creation? (Check characters table for recent inserts)
3. Are there any JavaScript errors? (Check browser console)

### Adoption percentage seems wrong

**Check:**
1. Is the feature flag `VITE_ENABLE_CAMPAIGN_CHARACTER_FLOW` enabled?
2. Are users using the new flow entry point? (Check navigation analytics)
3. Sample check: Create a character yourself and verify it's tracked correctly

### Need to reset tracking period

If you need to restart the 14-day monitoring period (e.g., after a major bug fix):

```sql
-- Archive old data
CREATE TABLE character_creation_metrics_archive AS
SELECT * FROM character_creation_metrics
WHERE timestamp < NOW() - INTERVAL '14 days';

-- Optional: Clear old data if desired
-- DELETE FROM character_creation_metrics WHERE timestamp < NOW() - INTERVAL '14 days';
```

## Related Documentation

- Legacy deprecation plan: `docs/cleanup/campaign-character-migration.md`
- Feature flags: `src/config/featureFlags.ts`
- Analytics service: `src/services/analytics.ts`
- Database migrations: `supabase/migrations/20251114_add_character_flow_metrics.sql`

## Contact

For questions about this metrics system, contact:
- Engineering lead for character creation flow
- Data/Analytics team
- Product owner for character management

---

**Last Updated**: 2025-11-14
**Status**: Monitoring in progress (Day 0 of 14)
