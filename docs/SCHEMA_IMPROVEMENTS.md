# Database Schema Improvements

This document outlines potential improvements, optimizations, and considerations for the AI Adventure Scribe database schema.

**Status:** Recommendations - Not Required for Current Functionality
**Priority Levels:** 🔴 High | 🟡 Medium | 🟢 Low
**Effort Levels:** 🔨 Small | 🔨🔨 Medium | 🔨🔨🔨 Large

---

## High Priority Improvements

### 1. Enforce Foreign Key to auth.users 🔴 🔨🔨

**Current State:**
- `blog_authors.user_id`, `campaigns.user_id`, `characters.user_id` are soft foreign keys
- No database-level referential integrity

**Issue:**
- Orphaned records possible if auth.users records deleted
- Application-level validation required
- Debugging difficulties

**Recommendation:**
```sql
-- Add foreign key constraints with appropriate delete behavior
ALTER TABLE blog_authors
  ADD CONSTRAINT fk_blog_authors_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE characters
  ADD CONSTRAINT fk_characters_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Benefits:**
- Database-enforced referential integrity
- Automatic cleanup on user deletion
- Clearer data relationships

**Risks:**
- Requires coordination with Supabase auth schema
- Migration complexity for existing data

**Decision:** Implement after validating Supabase auth.users stability

---

### 2. Add Composite Primary Keys to Junction Tables 🔴 🔨

**Current State:**
Junction tables use surrogate UUID primary keys:
- `blog_post_categories` (post_id, category_id)
- `blog_post_tags` (post_id, tag_id)
- `class_spells` (class_id, spell_id)

**Issue:**
- Allows duplicate relationships (same post-category pair multiple times)
- Extra storage for UUID PK
- Potential data integrity issues

**Recommendation:**
```sql
-- Option 1: Composite primary key (preferred)
CREATE TABLE blog_post_categories (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, category_id)
);

-- Option 2: Add unique constraint to existing table
ALTER TABLE blog_post_categories
  ADD CONSTRAINT unique_post_category UNIQUE (post_id, category_id);
```

**Benefits:**
- Prevents duplicate relationships
- Reduced storage (no UUID PK)
- Clearer semantic meaning

**Effort:** 🔨 Small - Straightforward migration

**Status:** Recommended for next schema update

---

### 3. Add Check Constraints for Data Validation 🔴 🔨

**Current State:**
No check constraints on critical fields

**Issues:**
- `character_stats`: ability scores could be negative or > 30
- `combat_participant_status`: HP could be negative
- `level_progression`: levels could be < 1 or > 20
- `experience_events`: XP could be negative

**Recommendation:**
```sql
-- Ability scores (typically 1-30 in D&D 5E)
ALTER TABLE character_stats
  ADD CONSTRAINT check_strength CHECK (strength BETWEEN 1 AND 30),
  ADD CONSTRAINT check_dexterity CHECK (dexterity BETWEEN 1 AND 30),
  ADD CONSTRAINT check_constitution CHECK (constitution BETWEEN 1 AND 30),
  ADD CONSTRAINT check_intelligence CHECK (intelligence BETWEEN 1 AND 30),
  ADD CONSTRAINT check_wisdom CHECK (wisdom BETWEEN 1 AND 30),
  ADD CONSTRAINT check_charisma CHECK (charisma BETWEEN 1 AND 30);

-- HP cannot be negative (allow negative for temp HP mechanics if needed)
ALTER TABLE combat_participant_status
  ADD CONSTRAINT check_max_hp CHECK (max_hp > 0);

-- Character levels (1-20 in D&D 5E)
ALTER TABLE level_progression
  ADD CONSTRAINT check_level CHECK (current_level BETWEEN 1 AND 20),
  ADD CONSTRAINT check_current_xp CHECK (current_xp >= 0),
  ADD CONSTRAINT check_total_xp CHECK (total_xp >= 0);

-- Death saves (0-3 in D&D 5E)
ALTER TABLE combat_participant_status
  ADD CONSTRAINT check_death_saves_successes CHECK (death_saves_successes BETWEEN 0 AND 3),
  ADD CONSTRAINT check_death_saves_failures CHECK (death_saves_failures BETWEEN 0 AND 3);

-- Initiative modifier reasonable range
ALTER TABLE combat_participants
  ADD CONSTRAINT check_initiative_modifier CHECK (initiative_modifier BETWEEN -10 AND 20);
```

**Benefits:**
- Prevent invalid data at database level
- Better error messages
- Data quality enforcement

**Effort:** 🔨 Small - Easy to add

**Status:** Recommended immediately

---

## Medium Priority Improvements

### 4. Add Full-Text Search Indexes 🟡 🔨🔨

**Current State:**
No full-text search capabilities on text fields

**Use Cases:**
- Search blog posts by content
- Search spells by description
- Search NPCs by backstory
- Search locations by description

**Recommendation:**
```sql
-- PostgreSQL full-text search
ALTER TABLE blog_posts
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, ''))
  ) STORED;

CREATE INDEX idx_blog_posts_search ON blog_posts USING GIN(search_vector);

-- Similar for spells
ALTER TABLE spells
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(higher_level_text, ''))
  ) STORED;

CREATE INDEX idx_spells_search ON spells USING GIN(search_vector);

-- For NPCs
ALTER TABLE npcs
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(backstory, ''))
  ) STORED;

CREATE INDEX idx_npcs_search ON npcs USING GIN(search_vector);
```

**Benefits:**
- Fast full-text search
- Better user experience
- Supports complex queries

**Effort:** 🔨🔨 Medium - Requires index build time

**Status:** Consider for Phase 2

---

### 5. Normalize Spell Fields in characters Table 🟡 🔨🔨🔨

**Current State:**
Spells stored as comma-separated text in `characters` table:
- `cantrips` TEXT
- `known_spells` TEXT
- `prepared_spells` TEXT
- `ritual_spells` TEXT

**Issues:**
- Denormalized data (violates 1NF)
- Duplicate data with `character_spells` table
- Query complexity
- Data integrity risks

**Recommendation:**
```sql
-- Remove denormalized fields from characters table
ALTER TABLE characters
  DROP COLUMN cantrips,
  DROP COLUMN known_spells,
  DROP COLUMN prepared_spells,
  DROP COLUMN ritual_spells;

-- Use character_spells table exclusively with additional fields
ALTER TABLE character_spells
  ADD COLUMN is_cantrip BOOLEAN DEFAULT FALSE,
  ADD COLUMN is_ritual BOOLEAN DEFAULT FALSE;

-- Create view for backward compatibility
CREATE VIEW character_spell_lists AS
SELECT
  character_id,
  string_agg(CASE WHEN is_cantrip THEN spell_id::text END, ',') as cantrips,
  string_agg(CASE WHEN NOT is_cantrip THEN spell_id::text END, ',') as known_spells,
  string_agg(CASE WHEN is_prepared THEN spell_id::text END, ',') as prepared_spells,
  string_agg(CASE WHEN is_ritual THEN spell_id::text END, ',') as ritual_spells
FROM character_spells
GROUP BY character_id;
```

**Benefits:**
- Proper normalization
- Single source of truth
- Better query capabilities
- Data integrity

**Effort:** 🔨🔨🔨 Large - Breaking change, requires application updates

**Status:** Consider for major version update

---

### 6. Add Partitioning for High-Volume Tables 🟡 🔨🔨🔨

**Current State:**
All tables are standard tables without partitioning

**Candidates for Partitioning:**
- `dialogue_history` (partition by timestamp - monthly)
- `combat_damage_log` (partition by created_at - monthly)
- `consumable_usage_log` (partition by timestamp - monthly)
- `feature_usage_log` (partition by used_at - monthly)
- `experience_events` (partition by timestamp - monthly)

**Recommendation:**
```sql
-- Example: Partition dialogue_history by month
CREATE TABLE dialogue_history (
  -- existing columns
) PARTITION BY RANGE (created_at);

CREATE TABLE dialogue_history_2025_01
  PARTITION OF dialogue_history
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE dialogue_history_2025_02
  PARTITION OF dialogue_history
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-partition creation with pg_partman extension
```

**Benefits:**
- Better query performance for time-range queries
- Easier data archival
- Improved maintenance operations
- Better vacuum performance

**Effort:** 🔨🔨🔨 Large - Requires migration and ongoing partition management

**Status:** Implement when table size exceeds 100K rows

---

### 7. Add Vector Extension for Semantic Search 🟡 🔨🔨

**Current State:**
`memories.embedding` field exists but no vector index

**Recommendation:**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Change embedding type to vector
ALTER TABLE memories
  ALTER COLUMN embedding TYPE vector(1536); -- OpenAI ada-002 dimension

-- Add vector similarity index
CREATE INDEX idx_memories_embedding ON memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Similar for other potential vector fields
ALTER TABLE npcs
  ADD COLUMN embedding vector(1536);

CREATE INDEX idx_npcs_embedding ON npcs
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Benefits:**
- Fast semantic search
- Better AI agent memory retrieval
- Supports RAG patterns

**Effort:** 🔨🔨 Medium - Requires pgvector extension and embedding generation

**Status:** Recommended for AI-powered features

---

## Low Priority Improvements

### 8. Add Materialized Views for Common Queries 🟢 🔨🔨

**Current State:**
Complex joins performed on every query

**Candidates:**
- Character with full stats and spell counts
- Combat encounter summaries with participant counts
- Campaign statistics and metrics

**Recommendation:**
```sql
-- Materialized view for character overview
CREATE MATERIALIZED VIEW character_overview AS
SELECT
  c.id,
  c.name,
  c.race,
  c.class,
  c.level,
  cs.strength,
  cs.dexterity,
  cs.constitution,
  cs.intelligence,
  cs.wisdom,
  cs.charisma,
  COUNT(DISTINCT chsp.id) as spell_count,
  COUNT(DISTINCT ii.id) as item_count,
  lp.current_xp,
  lp.total_xp
FROM characters c
LEFT JOIN character_stats cs ON c.id = cs.character_id
LEFT JOIN character_spells chsp ON c.id = chsp.character_id
LEFT JOIN inventory_items ii ON c.id = ii.character_id
LEFT JOIN level_progression lp ON c.id = lp.character_id
GROUP BY c.id, cs.id, lp.character_id;

CREATE UNIQUE INDEX idx_character_overview_id ON character_overview(id);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_character_overview()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY character_overview;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

**Benefits:**
- Faster read queries
- Reduced join overhead
- Consistent data shape

**Effort:** 🔨🔨 Medium - Requires refresh strategy

**Status:** Implement based on performance testing

---

### 9. Add Audit Logging Tables 🟢 🔨🔨

**Current State:**
Limited audit trail (only created_at/updated_at)

**Recommendation:**
```sql
-- Generic audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, operation, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, operation, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Benefits:**
- Complete audit trail
- Debugging capabilities
- Compliance support
- User behavior tracking

**Effort:** 🔨🔨 Medium - Trigger creation for each table

**Status:** Implement for compliance requirements

---

### 10. Optimize JSONB Fields with Indexes 🟢 🔨

**Current State:**
JSONB fields without indexes for common access patterns

**Recommendation:**
```sql
-- Index on metadata fields for common queries
CREATE INDEX idx_campaigns_style_config ON campaigns
  USING GIN (style_config);

CREATE INDEX idx_characters_metadata ON characters
  USING GIN (metadata);

-- Index specific JSONB paths
CREATE INDEX idx_spells_damage_type ON spells
  ((damage_at_slot_level->>'type'));

CREATE INDEX idx_races_ability_increases ON races
  USING GIN (ability_score_increases jsonb_path_ops);
```

**Benefits:**
- Faster JSONB queries
- Better filter performance
- Path-specific optimizations

**Effort:** 🔨 Small - Straightforward index creation

**Status:** Add based on query patterns

---

## Naming Consistency Issues

### Issue 1: Inconsistent Naming Convention
**Tables:** Some use singular, some use plural
- `characters` (plural) vs `spells` (plural) ✓ Consistent
- `class_features_library` vs `conditions_library` ✓ Consistent
- `dialogue_history` vs `consumable_usage_log` - Inconsistent suffixes

**Recommendation:** Not critical but consider standardization in future major version

---

### Issue 2: Foreign Key Naming
**Current:** Mix of `_id` and `Id` (camelCase)
- `campaign_id` (snake_case) ✓
- `campaignId` (camelCase) in Drizzle schema

**Status:** Acceptable - Drizzle ORM handles conversion

---

## Missing Indexes Analysis

Based on common query patterns, the following indexes may be beneficial:

```sql
-- Character lookup by campaign and level
CREATE INDEX idx_characters_campaign_level ON characters(campaign_id, level);

-- Session lookup by campaign and status
CREATE INDEX idx_sessions_campaign_status ON game_sessions(campaign_id, status);

-- Combat participant lookup by encounter and type
CREATE INDEX idx_participants_encounter_type ON combat_participants(encounter_id, participant_type);

-- Quest filtering by campaign and status
CREATE INDEX idx_quests_campaign_status ON quests(campaign_id, status);

-- Inventory lookup by character and equipped status
CREATE INDEX idx_inventory_equipped ON inventory_items(character_id, is_equipped);

-- Features by character and active status
CREATE INDEX idx_features_character_active ON character_features(character_id, is_active);
```

**Priority:** 🟡 Medium
**Effort:** 🔨 Small
**Status:** Add based on query performance monitoring

---

## Denormalization Opportunities

### Opportunity 1: Cache Spell Count on Characters
**Current:** Requires join to `character_spells`
**Recommendation:**
```sql
ALTER TABLE characters
  ADD COLUMN spell_count INTEGER DEFAULT 0;

-- Maintain with trigger
CREATE OR REPLACE FUNCTION update_character_spell_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE characters
  SET spell_count = (SELECT COUNT(*) FROM character_spells WHERE character_id = NEW.character_id)
  WHERE id = NEW.character_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trade-off:** Write performance vs read performance
**Status:** Consider if spell count queries are frequent

---

### Opportunity 2: Cache Combat Participant Count
**Current:** Requires COUNT query
**Recommendation:**
```sql
ALTER TABLE combat_encounters
  ADD COLUMN participant_count INTEGER DEFAULT 0;
```

**Status:** Low priority - counts are typically small

---

## Circular Dependency Concerns

### Current Circular Dependencies:
1. **characters ↔ character_spells**
   - characters references spells via character_spells
   - character_spells references characters
   - **Resolution:** character_spells.character_id not enforced in Drizzle ✓

2. **combat_participants self-reference**
   - combat_damage_log.source_participant_id references combat_participants
   - **Resolution:** Proper handling with nullable FK ✓

**Status:** All resolved appropriately

---

## Schema Performance Metrics

### Expected Query Patterns:
1. **High Frequency:**
   - Character lookup by user_id
   - Session lookup by campaign_id
   - Spell lookup by class
   - Inventory lookup by character

2. **Medium Frequency:**
   - Combat encounter queries
   - Dialogue history queries
   - Quest status updates

3. **Low Frequency:**
   - Blog post queries
   - Reference data lookups
   - Audit/analytics queries

### Optimization Priority:
Focus on high-frequency patterns first, especially character-centric queries.

---

## Implementation Roadmap

### Phase 1 (Immediate - 1 week)
- ✅ Add check constraints for data validation (#3)
- ✅ Add unique constraints to junction tables (#2)
- ✅ Add missing composite indexes (from analysis)

### Phase 2 (Short Term - 1 month)
- ⚠️ Implement vector search for memories (#7)
- ⚠️ Add full-text search for blog/spells (#4)
- ⚠️ Add foreign keys to auth.users (#1)

### Phase 3 (Medium Term - 3 months)
- 🔮 Implement audit logging (#9)
- 🔮 Add materialized views (#8)
- 🔮 Optimize JSONB indexes (#10)

### Phase 4 (Long Term - 6+ months)
- 🔮 Consider partitioning strategy (#6)
- 🔮 Evaluate spell field normalization (#5)
- 🔮 Comprehensive performance review

---

## Monitoring Recommendations

### Queries to Monitor:
```sql
-- Slow query log
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Table bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

See [PERFORMANCE_DASHBOARD.md](./PERFORMANCE_DASHBOARD.md) for more details.

---

## Conclusion

The current schema is well-designed and follows best practices. The improvements outlined above are optimizations and enhancements, not critical fixes. Implementation should be prioritized based on:

1. **User impact** - Features that improve user experience
2. **Performance** - Optimizations for slow queries
3. **Data integrity** - Constraints and validation
4. **Maintainability** - Simplifications and consistency

The schema is production-ready as-is. Improvements should be implemented incrementally based on actual usage patterns and performance metrics.

---

**Document Status:** Complete
**Last Updated:** 2025-11-14
**Next Review:** After 3 months of production usage
