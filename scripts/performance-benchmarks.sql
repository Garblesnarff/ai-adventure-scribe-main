-- ===================================================================
-- PERFORMANCE BENCHMARKING SUITE
-- Date: 2025-11-03
-- Purpose: Measure performance improvements from all optimizations
-- ===================================================================

-- ===================================================================
-- UNIT 2: SPELL VALIDATION N+1 QUERY FIX
-- ===================================================================

-- Before: Multiple individual queries
-- Simulate the old approach with separate queries
\echo '========== UNIT 2: SPELL VALIDATION =========='
\echo 'Testing spell validation query performance...'

-- Create a temporary test data set
DO $$
DECLARE
  test_character_id UUID;
  test_class_id UUID;
  spell_ids UUID[];
  spell_id UUID;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  elapsed_ms NUMERIC;
BEGIN
  -- Get a test character and their class
  SELECT id, class INTO test_character_id FROM characters LIMIT 1;
  IF test_character_id IS NULL THEN
    RAISE NOTICE 'No test character found. Skipping spell validation benchmark.';
    RETURN;
  END IF;

  -- Get the class ID
  SELECT id INTO test_class_id FROM classes WHERE name = 'Wizard' LIMIT 1;

  -- Get 10 spell IDs for testing
  SELECT ARRAY_AGG(spell_id) INTO spell_ids
  FROM (SELECT spell_id FROM class_spells WHERE class_id = test_class_id LIMIT 10) sub;

  IF array_length(spell_ids, 1) < 10 THEN
    RAISE NOTICE 'Not enough test spells found. Skipping spell validation benchmark.';
    RETURN;
  END IF;

  -- BEFORE: N separate queries (simulated)
  start_time := clock_timestamp();
  FOREACH spell_id IN ARRAY spell_ids LOOP
    PERFORM cs.id
    FROM class_spells cs
    WHERE cs.class_id = test_class_id
      AND cs.spell_id = spell_id;
  END LOOP;
  end_time := clock_timestamp();
  elapsed_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  RAISE NOTICE 'BEFORE (N queries): %.2f ms for % spells (%.2f ms per spell)',
    elapsed_ms, array_length(spell_ids, 1), elapsed_ms / array_length(spell_ids, 1);

  -- AFTER: Single batch query with JOIN
  start_time := clock_timestamp();
  PERFORM cs.spell_id, s.id, s.name
  FROM class_spells cs
  JOIN spells s ON cs.spell_id = s.id
  WHERE cs.class_id = test_class_id
    AND cs.spell_id = ANY(spell_ids);
  end_time := clock_timestamp();
  elapsed_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  RAISE NOTICE 'AFTER (1 batch query): %.2f ms for % spells', elapsed_ms, array_length(spell_ids, 1);

END $$;

-- Detailed query plans
\echo '\nQuery plan for BEFORE approach (single query):'
EXPLAIN ANALYZE
SELECT cs.id
FROM class_spells cs
WHERE cs.class_id = (SELECT id FROM classes WHERE name = 'Wizard' LIMIT 1)
  AND cs.spell_id = (SELECT id FROM spells LIMIT 1);

\echo '\nQuery plan for AFTER approach (batch query):'
EXPLAIN ANALYZE
SELECT cs.spell_id, s.id, s.name
FROM class_spells cs
JOIN spells s ON cs.spell_id = s.id
WHERE cs.class_id = (SELECT id FROM classes WHERE name = 'Wizard' LIMIT 1)
  AND cs.spell_id IN (SELECT id FROM spells LIMIT 10);

-- ===================================================================
-- UNIT 3: MESSAGE LOADING PAGINATION
-- ===================================================================

\echo '\n========== UNIT 3: MESSAGE LOADING =========='
\echo 'Testing message loading with pagination...'

DO $$
DECLARE
  test_session_id UUID;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  elapsed_ms NUMERIC;
  message_count INTEGER;
BEGIN
  -- Find a session with messages
  SELECT dh.session_id INTO test_session_id
  FROM dialogue_history dh
  GROUP BY dh.session_id
  HAVING COUNT(*) >= 50
  LIMIT 1;

  IF test_session_id IS NULL THEN
    RAISE NOTICE 'No session with 50+ messages found. Skipping message loading benchmark.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO message_count
  FROM dialogue_history
  WHERE session_id = test_session_id;

  RAISE NOTICE 'Testing with session containing % messages', message_count;

  -- BEFORE: Load all messages at once (no pagination)
  start_time := clock_timestamp();
  PERFORM dh.*, gs.character_id, c.name, c.avatar_url
  FROM dialogue_history dh
  JOIN game_sessions gs ON dh.session_id = gs.id
  LEFT JOIN characters c ON gs.character_id = c.id
  WHERE dh.session_id = test_session_id
  ORDER BY dh.timestamp DESC;
  end_time := clock_timestamp();
  elapsed_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  RAISE NOTICE 'BEFORE (load all): %.2f ms for % messages', elapsed_ms, message_count;

  -- AFTER: Load first page only (50 messages)
  start_time := clock_timestamp();
  PERFORM dh.*, gs.character_id, c.name, c.avatar_url
  FROM dialogue_history dh
  JOIN game_sessions gs ON dh.session_id = gs.id
  LEFT JOIN characters c ON gs.character_id = c.id
  WHERE dh.session_id = test_session_id
  ORDER BY dh.timestamp DESC
  LIMIT 50;
  end_time := clock_timestamp();
  elapsed_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  RAISE NOTICE 'AFTER (first page): %.2f ms for 50 messages', elapsed_ms;

  -- Calculate improvement
  RAISE NOTICE 'Speed improvement: %.1fx faster for initial load',
    (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000) / elapsed_ms;

END $$;

-- Query plans
\echo '\nQuery plan for paginated message loading:'
EXPLAIN ANALYZE
SELECT dh.*, gs.character_id, c.name, c.avatar_url
FROM dialogue_history dh
JOIN game_sessions gs ON dh.session_id = gs.id
LEFT JOIN characters c ON gs.character_id = c.id
WHERE dh.session_id = (
  SELECT session_id
  FROM dialogue_history
  GROUP BY session_id
  HAVING COUNT(*) >= 50
  LIMIT 1
)
ORDER BY dh.timestamp DESC
LIMIT 50;

-- ===================================================================
-- UNIT 4: CHARACTER SPELL LOADING
-- ===================================================================

\echo '\n========== UNIT 4: CHARACTER SPELL LOADING =========='
\echo 'Testing character spell loading optimization...'

DO $$
DECLARE
  test_character_id UUID;
  test_user_id UUID;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  elapsed_ms NUMERIC;
  spell_count INTEGER;
BEGIN
  -- Find a character with spells
  SELECT c.id, c.user_id INTO test_character_id, test_user_id
  FROM characters c
  WHERE EXISTS (SELECT 1 FROM character_spells cs WHERE cs.character_id = c.id)
  LIMIT 1;

  IF test_character_id IS NULL THEN
    RAISE NOTICE 'No character with spells found. Skipping character spell loading benchmark.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO spell_count
  FROM character_spells
  WHERE character_id = test_character_id;

  RAISE NOTICE 'Testing with character having % spells', spell_count;

  -- BEFORE: Two separate queries
  start_time := clock_timestamp();
  -- Query 1: Get character
  PERFORM id, class, level, user_id
  FROM characters
  WHERE id = test_character_id AND user_id = test_user_id;
  -- Query 2: Get spells
  PERFORM cs.spell_id, cs.is_prepared, cs.source_feature,
          s.id, s.name, s.level, s.school
  FROM character_spells cs
  JOIN spells s ON cs.spell_id = s.id
  WHERE cs.character_id = test_character_id;
  end_time := clock_timestamp();
  elapsed_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  RAISE NOTICE 'BEFORE (2 queries): %.2f ms', elapsed_ms;

  -- AFTER: Single query with nested JOIN
  start_time := clock_timestamp();
  PERFORM c.id, c.class, c.level, c.user_id,
          cs.spell_id, cs.is_prepared, cs.source_feature,
          s.id, s.name, s.level, s.school
  FROM characters c
  LEFT JOIN character_spells cs ON cs.character_id = c.id
  LEFT JOIN spells s ON cs.spell_id = s.id
  WHERE c.id = test_character_id AND c.user_id = test_user_id;
  end_time := clock_timestamp();
  elapsed_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  RAISE NOTICE 'AFTER (1 query with JOIN): %.2f ms', elapsed_ms;

END $$;

-- Query plan
\echo '\nQuery plan for optimized character spell loading:'
EXPLAIN ANALYZE
SELECT c.id, c.class, c.level, c.user_id,
       cs.spell_id, cs.is_prepared, cs.source_feature,
       s.id, s.name, s.level, s.school
FROM characters c
LEFT JOIN character_spells cs ON cs.character_id = c.id
LEFT JOIN spells s ON cs.spell_id = s.id
WHERE c.id = (
  SELECT id FROM characters
  WHERE EXISTS (SELECT 1 FROM character_spells WHERE character_id = characters.id)
  LIMIT 1
)
ORDER BY s.level, s.name;

-- ===================================================================
-- UNIT 9: CHARACTER LIST PAYLOAD REDUCTION
-- ===================================================================

\echo '\n========== UNIT 9: CHARACTER LIST PAYLOAD =========='
\echo 'Testing character list payload size optimization...'

DO $$
DECLARE
  test_user_id UUID;
  before_size INTEGER;
  after_size INTEGER;
  character_count INTEGER;
BEGIN
  -- Find a user with characters
  SELECT user_id INTO test_user_id
  FROM characters
  GROUP BY user_id
  HAVING COUNT(*) >= 3
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No user with 3+ characters found. Skipping character list benchmark.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO character_count
  FROM characters
  WHERE user_id = test_user_id;

  RAISE NOTICE 'Testing with user having % characters', character_count;

  -- BEFORE: Full character data (simulated size)
  SELECT pg_column_size(row(c.*))
  INTO before_size
  FROM characters c
  WHERE c.user_id = test_user_id;

  -- AFTER: Minimal fields only
  SELECT pg_column_size(row(
    c.id, c.name, c.race, c.class, c.level,
    c.image_url, c.avatar_url, c.campaign_id,
    c.created_at, c.updated_at
  ))
  INTO after_size
  FROM characters c
  WHERE c.user_id = test_user_id;

  RAISE NOTICE 'BEFORE (all fields): ~% bytes per character', before_size;
  RAISE NOTICE 'AFTER (minimal fields): ~% bytes per character', after_size;
  RAISE NOTICE 'Reduction: ~%.1f%% smaller payload',
    (1 - after_size::NUMERIC / before_size::NUMERIC) * 100;

END $$;

-- ===================================================================
-- UNIT 10: CAMPAIGN LIST PAYLOAD REDUCTION
-- ===================================================================

\echo '\n========== UNIT 10: CAMPAIGN LIST PAYLOAD =========='
\echo 'Testing campaign list payload size optimization...'

DO $$
DECLARE
  test_user_id UUID;
  before_size INTEGER;
  after_size INTEGER;
  campaign_count INTEGER;
BEGIN
  -- Find a user with campaigns
  SELECT user_id INTO test_user_id
  FROM campaigns
  GROUP BY user_id
  HAVING COUNT(*) >= 2
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No user with 2+ campaigns found. Skipping campaign list benchmark.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO campaign_count
  FROM campaigns
  WHERE user_id = test_user_id;

  RAISE NOTICE 'Testing with user having % campaigns', campaign_count;

  -- BEFORE: Full campaign data including heavy JSONB fields
  SELECT pg_column_size(row(c.*))
  INTO before_size
  FROM campaigns c
  WHERE c.user_id = test_user_id
  LIMIT 1;

  -- AFTER: Minimal fields (exclude JSONB columns)
  SELECT pg_column_size(row(
    c.id, c.name, c.description, c.genre,
    c.difficulty_level, c.campaign_length, c.tone,
    c.status, c.background_image, c.art_style,
    c.created_at, c.updated_at
  ))
  INTO after_size
  FROM campaigns c
  WHERE c.user_id = test_user_id
  LIMIT 1;

  RAISE NOTICE 'BEFORE (all fields): ~% bytes per campaign', before_size;
  RAISE NOTICE 'AFTER (minimal fields): ~% bytes per campaign', after_size;
  RAISE NOTICE 'Reduction: ~%.1f%% smaller payload',
    (1 - after_size::NUMERIC / before_size::NUMERIC) * 100;

END $$;

-- ===================================================================
-- INDEX PERFORMANCE ANALYSIS
-- ===================================================================

\echo '\n========== INDEX PERFORMANCE =========='
\echo 'Analyzing index usage and performance...'

-- Check index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON indexname = relname
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_active_session_per_character',
    'idx_game_sessions_status',
    'idx_dialogue_history_session_speaker',
    'idx_character_spells_spell_id'
  )
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_active_session_per_character',
    'idx_game_sessions_status',
    'idx_dialogue_history_session_speaker',
    'idx_character_spells_spell_id'
  )
ORDER BY idx_scan DESC;

-- ===================================================================
-- TABLE SIZE ANALYSIS
-- ===================================================================

\echo '\n========== TABLE SIZE ANALYSIS =========='
\echo 'Analyzing table sizes and growth projections...'

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
  (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_schema = schemaname AND t.table_name = tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'game_sessions',
    'dialogue_history',
    'character_spells',
    'characters',
    'campaigns',
    'class_spells',
    'spells'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ===================================================================
-- ARCHIVAL SYSTEM IMPACT
-- ===================================================================

\echo '\n========== ARCHIVAL SYSTEM IMPACT =========='
\echo 'Analyzing potential archival impact...'

-- Count sessions eligible for archival
SELECT
  COUNT(*) as eligible_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE status = 'completed' AND end_time < NOW() - INTERVAL '90 days') as archival_eligible,
  pg_size_pretty(
    pg_total_relation_size('game_sessions') *
    COUNT(*) FILTER (WHERE status = 'completed' AND end_time < NOW() - INTERVAL '90 days')::NUMERIC /
    NULLIF(COUNT(*), 0)::NUMERIC
  ) as estimated_archival_size
FROM game_sessions;

-- Count related records
SELECT
  'dialogue_history' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (
    WHERE session_id IN (
      SELECT id FROM game_sessions
      WHERE status = 'completed' AND end_time < NOW() - INTERVAL '90 days'
    )
  ) as archival_eligible,
  pg_size_pretty(pg_total_relation_size('dialogue_history')) as current_size
FROM dialogue_history
UNION ALL
SELECT
  'memories',
  COUNT(*),
  COUNT(*) FILTER (
    WHERE session_id IN (
      SELECT id FROM game_sessions
      WHERE status = 'completed' AND end_time < NOW() - INTERVAL '90 days'
    )
  ),
  pg_size_pretty(pg_total_relation_size('memories'))
FROM memories;

-- ===================================================================
-- SUMMARY
-- ===================================================================

\echo '\n========== BENCHMARK SUMMARY =========='
\echo 'Performance benchmarking complete!'
\echo 'Review the output above for detailed metrics.'
\echo ''
\echo 'Key optimizations measured:'
\echo '  1. Spell validation: N queries → 1 batch query'
\echo '  2. Message loading: Pagination reduces initial load'
\echo '  3. Character spells: 2 queries → 1 JOIN query'
\echo '  4. Character list: Reduced payload size'
\echo '  5. Campaign list: Reduced payload size'
\echo '  6. Archival system: Prevents unbounded growth'
