-- Character Creation Flow Adoption Metrics Queries
-- Purpose: Monitor adoption of new campaign-based character creation flow
-- Requirement: 95% adoption for 14 consecutive days before legacy deprecation

-- ============================================================================
-- Query 1: Current Adoption Percentage (Last 14 Days)
-- ============================================================================
-- Returns the percentage of new flow usage over the last 14 days
-- Use this to check current adoption status

SELECT
  COUNT(CASE WHEN flow = 'new' THEN 1 END) AS new_flow_count,
  COUNT(CASE WHEN flow = 'legacy' THEN 1 END) AS legacy_flow_count,
  COUNT(*) AS total_count,
  ROUND(
    (COUNT(CASE WHEN flow = 'new' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS new_flow_percentage,
  NOW() - INTERVAL '14 days' AS period_start,
  NOW() AS period_end
FROM character_creation_metrics
WHERE timestamp >= NOW() - INTERVAL '14 days';


-- ============================================================================
-- Query 2: Daily Adoption Breakdown (Last 30 Days)
-- ============================================================================
-- Shows daily breakdown of flow usage to identify trends
-- Useful for visualizing adoption over time

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


-- ============================================================================
-- Query 3: Verify 95% Threshold Met for 14 Consecutive Days
-- ============================================================================
-- Returns whether the 95% adoption threshold has been met for 14 consecutive days
-- This is the KEY query for determining if legacy flow can be deprecated

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
    -- Calculate streak of consecutive days meeting threshold
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


-- ============================================================================
-- Query 4: User Adoption Patterns
-- ============================================================================
-- Shows which users are still using the legacy flow
-- Useful for targeted migration support

SELECT
  user_id,
  COUNT(CASE WHEN flow = 'new' THEN 1 END) AS new_flow_uses,
  COUNT(CASE WHEN flow = 'legacy' THEN 1 END) AS legacy_flow_uses,
  COUNT(*) AS total_uses,
  MAX(timestamp) FILTER (WHERE flow = 'legacy') AS last_legacy_use,
  MAX(timestamp) FILTER (WHERE flow = 'new') AS last_new_use
FROM character_creation_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(CASE WHEN flow = 'legacy' THEN 1 END) > 0
ORDER BY legacy_flow_uses DESC, last_legacy_use DESC;


-- ============================================================================
-- Query 5: Campaign-Based Flow Usage
-- ============================================================================
-- Shows which campaigns are being used for character creation
-- Helps validate new flow is working correctly

SELECT
  campaign_id,
  COUNT(*) AS character_creations,
  MIN(timestamp) AS first_creation,
  MAX(timestamp) AS last_creation
FROM character_creation_metrics
WHERE flow = 'new'
  AND campaign_id IS NOT NULL
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY campaign_id
ORDER BY character_creations DESC
LIMIT 20;


-- ============================================================================
-- Query 6: Hourly Adoption Rate (Real-time Monitoring)
-- ============================================================================
-- Shows adoption rate by hour for the last 24 hours
-- Useful for monitoring immediate impact of feature flag changes

SELECT
  DATE_TRUNC('hour', timestamp) AS hour,
  COUNT(CASE WHEN flow = 'new' THEN 1 END) AS new_flow_count,
  COUNT(CASE WHEN flow = 'legacy' THEN 1 END) AS legacy_flow_count,
  COUNT(*) AS total_count,
  ROUND(
    (COUNT(CASE WHEN flow = 'new' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS new_flow_percentage
FROM character_creation_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;
