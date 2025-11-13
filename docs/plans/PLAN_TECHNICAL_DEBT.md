# Technical Debt & Cleanup Roadmap

**Status:** Draft
**Priority:** Medium-High
**Estimated Total Effort:** 2-3 weeks
**Impact:** Reduces maintenance burden, improves code quality, eliminates blockers

---

## Executive Summary

This plan addresses accumulated technical debt, incomplete migrations, pending TODOs, and code quality issues across the AI Adventure Scribe codebase. By systematically cleaning up these items, we improve maintainability, reduce bugs, and unblock future development.

### Current State
- Multiple pending TODOs across critical paths
- Incomplete database migrations (Blog CMS)
- Feature flags ready for cleanup (Legacy character flow)
- Placeholder implementations in production code
- Missing configuration (Google Analytics)
- Documentation gaps (80% of directories lack READMEs)
- Dual agent system architecture (custom vs LangGraph)

### Success Criteria
- ✅ All critical TODOs resolved or converted to tracked issues
- ✅ All pending migrations applied and verified
- ✅ Legacy feature flags removed after adoption verification
- ✅ All placeholder implementations replaced or documented
- ✅ Configuration completed (GA tracking, environment variables)
- ✅ Documentation coverage improved to 50%+
- ✅ Architectural decision made on LangGraph migration

---

## Quick Wins (Days 1-3, High Priority)

These items can be completed quickly with high impact and low risk.

### 1.1 Apply Blog CMS Migration

**Source:** `POST-MERGE-TODO.md`
**Priority:** HIGH (Incomplete migration)
**Estimated Effort:** 2-3 hours

#### Context
The blog CMS database migration exists but was never applied to production. This creates a schema mismatch between development and production.

#### Tasks
```bash
# Verify migration file exists
ls -la supabase/migrations/20251017_create_blog_cms.sql

# Review migration contents
cat supabase/migrations/20251017_create_blog_cms.sql

# Apply to staging environment first
psql "$STAGING_DATABASE_URL" -f supabase/migrations/20251017_create_blog_cms.sql

# Verify tables created
psql "$STAGING_DATABASE_URL" -c "\dt blog_*"

# Test admin CRUD operations
npm run test:blog-admin

# Test media upload
npm run test:media-upload

# If all tests pass, apply to production
psql "$DATABASE_URL" -f supabase/migrations/20251017_create_blog_cms.sql

# Verify production
psql "$DATABASE_URL" -c "\dt blog_*"

# Mark as complete in POST-MERGE-TODO.md
```

#### Verification Checklist
- [ ] Migration applied to staging without errors
- [ ] Blog tables exist: `blog_posts`, `blog_categories`, `blog_tags`, `blog_media`
- [ ] Admin can create/edit/delete blog posts
- [ ] Media upload works correctly
- [ ] No errors in application logs
- [ ] Migration applied to production
- [ ] Production smoke test passes
- [ ] POST-MERGE-TODO.md updated

#### Rollback Plan
```sql
-- If migration fails, rollback with:
DROP TABLE IF EXISTS blog_media CASCADE;
DROP TABLE IF EXISTS blog_tags CASCADE;
DROP TABLE IF EXISTS blog_categories CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
```

---

### 1.2 Configure Google Analytics

**Source:** `index.html` lines 12, 19, 20
**Priority:** MEDIUM (Missing analytics)
**Estimated Effort:** 30 minutes

#### Context
Google Analytics is integrated but uses placeholder `G-XXXXXXXXXX` measurement ID.

#### Tasks
```typescript
// 1. Create GA4 property (if not exists)
// - Go to https://analytics.google.com
// - Create property: "AI Adventure Scribe"
// - Get Measurement ID (format: G-XXXXXXXXXX)

// 2. Update index.html
// Before:
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

// After:
<script async src="https://www.googletagmanager.com/gtag/js?id=G-REAL123456"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-REAL123456');
</script>

// 3. Add to environment variables
// .env.production
VITE_GA_MEASUREMENT_ID=G-REAL123456

// 4. Update index.html to use env variable
// vite.config.ts - add plugin to inject env vars into index.html
```

#### Better Approach: Move to React
```typescript
// src/utils/analytics.ts
export const initializeAnalytics = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId || measurementId === 'G-XXXXXXXXXX') {
    console.warn('Google Analytics not configured');
    return;
  }

  // Load gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', measurementId);
};

// src/main.tsx
import { initializeAnalytics } from './utils/analytics';

initializeAnalytics();
```

#### Verification Checklist
- [ ] GA4 property created and measurement ID obtained
- [ ] Environment variable added to `.env.production`
- [ ] Index.html updated OR analytics moved to React
- [ ] Test page views tracked in GA4 Real-Time report
- [ ] Remove placeholder from index.html
- [ ] Document GA setup in README or ANALYTICS.md

---

### 1.3 Update Supabase Environment Variables

**Source:** Various `.env.example` and configuration files
**Priority:** MEDIUM
**Estimated Effort:** 1 hour

#### Context
Environment variables may be outdated or missing across different environments.

#### Tasks
```bash
# 1. Audit all .env files
find . -name ".env*" -not -path "./node_modules/*"

# 2. Compare .env.example with actual .env files
# Ensure all required variables are present:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_OPENAI_API_KEY
# - VITE_GEMINI_API_KEY
# - VITE_ELEVENLABS_API_KEY
# - VITE_GA_MEASUREMENT_ID
# - DATABASE_URL (server-side)
# - JWT_SECRET (server-side)

# 3. Update .env.example with any missing variables
# Add comments explaining each variable

# 4. Update deployment configs (Vercel, Netlify, etc.)
# Ensure all env vars are set in production

# 5. Create .env.local.example for local development
cp .env.example .env.local.example
```

#### Create Environment Validation
```typescript
// src/utils/env-validation.ts
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_GEMINI_API_KEY',
] as const;

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key] || import.meta.env[key] === ''
  );

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}

// src/main.tsx
import { validateEnvironment } from './utils/env-validation';

if (import.meta.env.MODE === 'development') {
  validateEnvironment();
}
```

#### Verification Checklist
- [ ] All environment variables documented in `.env.example`
- [ ] Production environment variables verified
- [ ] Environment validation script created
- [ ] Missing variables throw clear error messages
- [ ] Documentation updated with setup instructions

---

## Medium Priority Items (Days 4-7)

### 2.1 Voice Consistency Service TODO

**Source:** `src/services/voice-consistency-service.ts:209`
**Priority:** MEDIUM
**Estimated Effort:** 4-6 hours

#### Context
```typescript
// Line 209: voice-consistency-service.ts
// TODO: Implement proper lookup once schema finalized
```

The voice consistency service has a placeholder for database lookups. The character voice profile schema needs to be finalized and implemented.

#### Proposed Schema
```sql
-- Migration: 20251112_add_voice_profiles.sql
CREATE TABLE character_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  voice_style TEXT NOT NULL, -- 'gruff', 'eloquent', 'timid', etc.
  speech_patterns TEXT[], -- ['uses contractions', 'formal', 'uses slang']
  vocabulary_level TEXT CHECK (vocabulary_level IN ('simple', 'average', 'advanced', 'archaic')),
  tone TEXT, -- 'serious', 'humorous', 'sarcastic', etc.
  quirks TEXT[], -- ['repeats favorite phrase', 'nervous laugh', 'speaks in third person']
  example_phrases TEXT[], -- Sample dialogue
  consistency_score NUMERIC(3,2) DEFAULT 0.00 CHECK (consistency_score BETWEEN 0 AND 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(character_id)
);

CREATE INDEX idx_voice_profiles_character ON character_voice_profiles(character_id);
```

#### Implementation
```typescript
// src/services/voice-consistency-service.ts

/**
 * Retrieves the voice profile for a character
 */
async function getVoiceProfile(characterId: string): Promise<VoiceProfile | null> {
  const { data, error } = await supabase
    .from('character_voice_profiles')
    .select('*')
    .eq('character_id', characterId)
    .single();

  if (error) {
    console.error('Error fetching voice profile:', error);
    return null;
  }

  return data;
}

/**
 * Creates or updates a character's voice profile
 */
async function upsertVoiceProfile(
  characterId: string,
  profile: Partial<VoiceProfile>
): Promise<VoiceProfile> {
  const { data, error } = await supabase
    .from('character_voice_profiles')
    .upsert({
      character_id: characterId,
      ...profile,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert voice profile: ${error.message}`);
  }

  return data;
}

/**
 * Analyzes dialogue to extract voice characteristics
 */
async function analyzeDialogue(dialogue: string[]): Promise<Partial<VoiceProfile>> {
  // Use AI to analyze speech patterns, vocabulary, tone
  const analysis = await geminiService.analyzeVoiceCharacteristics(dialogue);

  return {
    voice_style: analysis.style,
    speech_patterns: analysis.patterns,
    vocabulary_level: analysis.vocabularyLevel,
    tone: analysis.tone,
    quirks: analysis.quirks,
  };
}

// Replace TODO on line 209 with:
const voiceProfile = await getVoiceProfile(characterId);
if (!voiceProfile) {
  // Create profile based on character background and initial dialogue
  const initialProfile = await analyzeDialogue(characterDialogueHistory);
  await upsertVoiceProfile(characterId, initialProfile);
}
```

#### Tasks
- [ ] Create database migration for voice profiles
- [ ] Implement `getVoiceProfile` function
- [ ] Implement `upsertVoiceProfile` function
- [ ] Implement `analyzeDialogue` function using Gemini
- [ ] Replace TODO with actual implementation
- [ ] Write unit tests for voice profile CRUD
- [ ] Write integration test for voice consistency across sessions
- [ ] Update character creation flow to initialize voice profile
- [ ] Add voice profile UI to character sheet (optional)

#### Verification Checklist
- [ ] Migration applied successfully
- [ ] Voice profiles created for new characters
- [ ] Voice consistency maintained across multiple sessions
- [ ] Tests passing
- [ ] TODO comment removed

---

### 2.2 Implement Passive Skills

**Source:** `src/services/ai-service.ts:1058`
**Priority:** MEDIUM
**Estimated Effort:** 6-8 hours

#### Context
```typescript
// Line 1058: ai-service.ts
// TODO: Implement Passive Skills (Perception, Insight checks)
```

D&D characters have passive skill scores (most commonly Passive Perception) that the DM uses for automatic checks without rolling dice.

#### D&D 5E Rules
- **Passive Perception** = 10 + Wisdom modifier + Proficiency (if proficient)
- Used for: Noticing hidden enemies, traps, secret doors
- **Passive Insight** = 10 + Wisdom modifier + Proficiency (if proficient)
- Used for: Detecting lies, reading motives
- **Passive Investigation** = 10 + Intelligence modifier + Proficiency (if proficient)
- Used for: Noticing clues, finding hidden objects

#### Database Schema
```sql
-- Extend characters table or create computed columns
ALTER TABLE characters ADD COLUMN passive_perception INTEGER GENERATED ALWAYS AS (10 + ((ability_scores->>'wisdom')::int - 10) / 2 + CASE WHEN 'perception' = ANY(proficiencies) THEN proficiency_bonus ELSE 0 END) STORED;

ALTER TABLE characters ADD COLUMN passive_insight INTEGER GENERATED ALWAYS AS (10 + ((ability_scores->>'wisdom')::int - 10) / 2 + CASE WHEN 'insight' = ANY(proficiencies) THEN proficiency_bonus ELSE 0 END) STORED;

ALTER TABLE characters ADD COLUMN passive_investigation INTEGER GENERATED ALWAYS AS (10 + ((ability_scores->>'intelligence')::int - 10) / 2 + CASE WHEN 'investigation' = ANY(proficiencies) THEN proficiency_bonus ELSE 0 END) STORED;
```

#### Implementation
```typescript
// src/services/passive-skills-service.ts
export class PassiveSkillsService {
  /**
   * Calculates passive skill score
   */
  static calculatePassiveSkill(
    abilityScore: number,
    proficiencyBonus: number,
    isProficient: boolean
  ): number {
    const modifier = Math.floor((abilityScore - 10) / 2);
    const proficiency = isProficient ? proficiencyBonus : 0;
    return 10 + modifier + proficiency;
  }

  /**
   * Checks if character passively notices something
   */
  static async checkPassivePerception(
    characterId: string,
    dc: number
  ): Promise<{ success: boolean; score: number }> {
    const character = await getCharacter(characterId);

    const passivePerception = this.calculatePassiveSkill(
      character.ability_scores.wisdom,
      character.proficiency_bonus,
      character.proficiencies.includes('perception')
    );

    return {
      success: passivePerception >= dc,
      score: passivePerception,
    };
  }

  /**
   * DM uses passive checks automatically during narration
   */
  static async evaluatePassiveChecks(
    characters: Character[],
    scene: Scene
  ): Promise<PassiveCheckResult[]> {
    const results = [];

    for (const character of characters) {
      // Check for hidden creatures (Passive Perception vs Stealth)
      if (scene.hiddenCreatures) {
        const perception = await this.checkPassivePerception(
          character.id,
          scene.hiddenCreatures.stealthDC
        );

        if (perception.success) {
          results.push({
            characterId: character.id,
            type: 'perception',
            detected: 'hidden creature',
            narrative: `${character.name} notices something lurking in the shadows.`,
          });
        }
      }

      // Check for traps (Passive Investigation)
      if (scene.traps) {
        const investigation = await this.checkPassiveInvestigation(
          character.id,
          scene.traps.dc
        );

        if (investigation.success) {
          results.push({
            characterId: character.id,
            type: 'investigation',
            detected: 'trap',
            narrative: `${character.name} spots a pressure plate on the floor.`,
          });
        }
      }

      // Check for lies (Passive Insight vs Deception)
      if (scene.npcDeception) {
        const insight = await this.checkPassiveInsight(
          character.id,
          scene.npcDeception.deceptionRoll
        );

        if (insight.success) {
          results.push({
            characterId: character.id,
            type: 'insight',
            detected: 'deception',
            narrative: `${character.name} senses the NPC is hiding something.`,
          });
        }
      }
    }

    return results;
  }
}

// src/services/ai-service.ts - Replace TODO with:
import { PassiveSkillsService } from './passive-skills-service';

// Inside generateNarrative or processMessage:
const passiveChecks = await PassiveSkillsService.evaluatePassiveChecks(
  characters,
  currentScene
);

// Incorporate passive check results into narration
if (passiveChecks.length > 0) {
  narrative += '\n\n' + passiveChecks.map(c => c.narrative).join('\n');
}
```

#### Integration with DM Agent
```typescript
// src/agents/dungeon-master-agent.ts
async function narrateScene(scene: Scene, characters: Character[]): Promise<string> {
  // Generate base narration
  let narrative = await generateSceneDescription(scene);

  // Evaluate passive checks
  const passiveResults = await PassiveSkillsService.evaluatePassiveChecks(
    characters,
    scene
  );

  // Incorporate passive check results
  for (const result of passiveResults) {
    if (result.success) {
      // Reveal information to perceptive characters
      narrative += `\n\n${result.narrative}`;
    }
  }

  return narrative;
}
```

#### Tasks
- [ ] Create `PassiveSkillsService` class
- [ ] Implement passive skill calculations
- [ ] Extend database schema (or use computed columns)
- [ ] Integrate passive checks into scene narration
- [ ] Add passive skill display to character sheet
- [ ] Write unit tests for passive skill calculations
- [ ] Write integration tests for passive checks during gameplay
- [ ] Document passive skill mechanics for DMs
- [ ] Remove TODO comment

#### Verification Checklist
- [ ] Passive Perception calculated correctly (10 + WIS mod + prof)
- [ ] Characters with high Passive Perception notice hidden things automatically
- [ ] Passive checks integrated into DM narration
- [ ] Character sheet displays passive scores
- [ ] Tests passing
- [ ] TODO comment removed

---

### 2.3 Legacy Character Flow Deprecation

**Source:** `campaign-character-migration.md`
**Priority:** MEDIUM (After adoption metrics verified)
**Estimated Effort:** 4-6 hours

#### Context
A new character creation flow was introduced, and the legacy flow is being phased out. The migration document outlines a clear deprecation process.

#### Current Status
- Feature flag: `VITE_FEATURE_ENABLE_LEGACY_CHARACTER_ENTRY=true`
- Need to monitor adoption metrics: ≥95% usage of new flow for 14 consecutive days
- Old routes: `/app/characters` and `/app/characters/create`

#### Step 1: Monitor Adoption Metrics
```typescript
// src/utils/analytics.ts
export function trackCharacterCreationFlow(flow: 'legacy' | 'new') {
  if (window.gtag) {
    gtag('event', 'character_creation', {
      event_category: 'Character',
      event_label: flow,
      value: flow === 'new' ? 1 : 0,
    });
  }

  // Also track in database for internal metrics
  fetch('/api/v1/metrics/character-flow', {
    method: 'POST',
    body: JSON.stringify({ flow, timestamp: new Date() }),
  });
}

// Add to both old and new character creation flows
```

#### Step 2: Create Metrics Dashboard Query
```sql
-- Check adoption percentage over last 14 days
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE flow = 'new') as new_flow_count,
  COUNT(*) FILTER (WHERE flow = 'legacy') as legacy_flow_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE flow = 'new') / COUNT(*), 2) as new_flow_percentage
FROM character_creation_metrics
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check if we meet 95% threshold for 14 days
SELECT
  COUNT(*) as days_above_threshold
FROM (
  SELECT
    DATE(created_at) as date,
    ROUND(100.0 * COUNT(*) FILTER (WHERE flow = 'new') / COUNT(*), 2) as pct
  FROM character_creation_metrics
  WHERE created_at >= NOW() - INTERVAL '14 days'
  GROUP BY DATE(created_at)
) subquery
WHERE pct >= 95;
-- If result is 14, we can deprecate
```

#### Step 3: Deprecation Process (Only After Metrics Met)
```typescript
// 1. Set feature flag to false
// .env.production
VITE_FEATURE_ENABLE_LEGACY_CHARACTER_ENTRY=false

// 2. Add deprecation warning to legacy routes (transition period)
// src/pages/characters/LegacyCharacterPage.tsx
export function LegacyCharacterPage() {
  useEffect(() => {
    toast.warning(
      'This character creation flow is deprecated. You will be redirected to the new flow.',
      { duration: 5000 }
    );

    setTimeout(() => {
      navigate('/campaigns/:campaignId/characters/create');
    }, 5000);
  }, []);

  // ... existing page
}

// 3. Wait 7 days (transition period)

// 4. Remove legacy routes from router
// src/router.tsx
// Delete:
// - /app/characters
// - /app/characters/create

// 5. Remove legacy components
rm -rf src/pages/characters/legacy/

// 6. Remove feature flag from codebase
git grep -l "VITE_FEATURE_ENABLE_LEGACY_CHARACTER_ENTRY" | xargs sed -i '/VITE_FEATURE_ENABLE_LEGACY_CHARACTER_ENTRY/d'

// 7. Update navigation and breadcrumbs
// Remove any references to /app/characters

// 8. Clean up database (optional)
-- Archive old character creation events
INSERT INTO archived_character_creation_metrics
SELECT * FROM character_creation_metrics WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM character_creation_metrics WHERE created_at < NOW() - INTERVAL '30 days';
```

#### Tasks
- [ ] Implement character creation flow tracking in both flows
- [ ] Create metrics dashboard or SQL query
- [ ] Monitor adoption for 14 consecutive days
- [ ] **WAIT UNTIL 95%+ ADOPTION ACHIEVED**
- [ ] Set feature flag to false
- [ ] Add deprecation warning to legacy routes
- [ ] Wait 7 days (transition period)
- [ ] Remove legacy routes from router
- [ ] Remove legacy components
- [ ] Remove feature flag from codebase
- [ ] Update navigation and documentation
- [ ] Archive old metrics data

#### Verification Checklist
- [ ] 95%+ adoption for 14 days verified
- [ ] Feature flag disabled
- [ ] Legacy routes redirect to new flow
- [ ] No broken links or navigation issues
- [ ] All references to legacy flow removed
- [ ] campaign-character-migration.md marked as complete

---

## Larger Refactoring Tasks (Week 2)

### 3.1 LangGraph Migration Decision

**Source:** Analysis of `src/agents/langgraph/` and custom messaging system
**Priority:** HIGH (Architectural debt)
**Estimated Effort:** 40-80 hours (if migrating) OR 4 hours (if keeping custom)

#### Context
The codebase currently has TWO parallel agent communication systems:
1. **Custom messaging system** (`src/agents/messaging/` - 300+ files)
2. **LangGraph integration** (`src/agents/langgraph/` - Partial implementation)

According to the LangGraph README:
- Work Unit 6.1: Architecture Planning - ✅ Complete
- Work Unit 6.2: Node Implementations - ⚠️ Placeholder only
- Work Unit 6.3: Integration Testing - ❌ Not started
- Work Unit 6.4: Migration & Cleanup - ❌ Not started

#### Decision Matrix

| Factor | Custom System | LangGraph | Weight |
|--------|--------------|-----------|--------|
| **Performance** | Optimized for our use case | Unknown (needs testing) | 30% |
| **Maintainability** | Fully owned, documented | Industry standard, community support | 25% |
| **Features** | Offline-first, message queuing | Agent coordination, workflow management | 20% |
| **Learning Curve** | Team knows it well | Need to learn LangGraph | 10% |
| **Future-proofing** | Custom = more work | LangGraph evolving rapidly | 15% |

#### Option A: Complete LangGraph Migration (Recommended)
**Rationale:** Industry-standard agent orchestration with better tooling and community support.

**Estimated Effort:** 40-80 hours

**Tasks:**
```typescript
// 1. Complete node implementations (Work Unit 6.2)
// src/agents/langgraph/nodes/intent-detector.ts - REPLACE placeholder
export async function intentDetectorNode(state: GraphState): Promise<GraphState> {
  const { message, character } = state;

  // Use Gemini to detect intent
  const intent = await geminiService.detectIntent(message, character);

  return {
    ...state,
    intent: intent.type,
    confidence: intent.confidence,
    entities: intent.entities,
  };
}

// src/agents/langgraph/nodes/rules-validator.ts - REPLACE placeholder
export async function rulesValidatorNode(state: GraphState): Promise<GraphState> {
  const { intent, character, action } = state;

  const validation = await rulesInterpreter.validateAction(action, character);

  return {
    ...state,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

// src/agents/langgraph/nodes/response-generator.ts - REPLACE placeholder
export async function responseGeneratorNode(state: GraphState): Promise<GraphState> {
  const { intent, valid, character, context } = state;

  if (!valid) {
    return {
      ...state,
      response: `Sorry, that action isn't valid: ${state.errors.join(', ')}`,
    };
  }

  const response = await dungeonMasterAgent.generateResponse({
    intent,
    character,
    context,
    recentMemories: state.memories,
  });

  return {
    ...state,
    response: response.narrative,
    needsRoll: response.requiresRoll,
  };
}

// 2. Add memory retrieval node
// src/agents/langgraph/nodes/memory-retrieval.ts
export async function memoryRetrievalNode(state: GraphState): Promise<GraphState> {
  const { message, campaignId } = state;

  const memories = await memoryService.searchMemories({
    query: message,
    campaignId,
    limit: 5,
  });

  return {
    ...state,
    memories,
  };
}

// 3. Add dice rolling node
// src/agents/langgraph/nodes/dice-roller.ts
export async function diceRollerNode(state: GraphState): Promise<GraphState> {
  const { rollRequest, character } = state;

  if (!rollRequest) {
    return state;
  }

  const roll = await diceService.roll(rollRequest.type);
  const modifier = calculateModifier(character, rollRequest.skill);
  const total = roll + modifier;

  return {
    ...state,
    rollResult: {
      die: rollRequest.type,
      roll,
      modifier,
      total,
    },
  };
}

// 4. Update graph to use real nodes
// src/agents/langgraph/dm-graph.ts
const dmGraph = new StateGraph<GraphState>({
  channels: graphStateChannels,
});

dmGraph.addNode('memory_retrieval', memoryRetrievalNode);
dmGraph.addNode('intent_detector', intentDetectorNode);
dmGraph.addNode('rules_validator', rulesValidatorNode);
dmGraph.addNode('dice_roller', diceRollerNode);
dmGraph.addNode('response_generator', responseGeneratorNode);

// Define edges
dmGraph.addEdge(START, 'memory_retrieval');
dmGraph.addEdge('memory_retrieval', 'intent_detector');
dmGraph.addConditionalEdges('intent_detector', routeByIntent, {
  combat: 'rules_validator',
  exploration: 'response_generator',
  dialogue: 'response_generator',
  roll: 'dice_roller',
});
dmGraph.addEdge('rules_validator', 'response_generator');
dmGraph.addEdge('dice_roller', 'response_generator');
dmGraph.addEdge('response_generator', END);

export const compiledDMGraph = dmGraph.compile();

// 5. Integration testing (Work Unit 6.3)
// tests/langgraph/integration.test.ts
describe('LangGraph DM Integration', () => {
  it('should process player message through graph', async () => {
    const result = await compiledDMGraph.invoke({
      message: 'I attack the goblin',
      character: mockCharacter,
      campaignId: 'test',
    });

    expect(result.intent).toBe('combat');
    expect(result.valid).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.needsRoll).toBe(true);
  });

  it('should retrieve relevant memories', async () => {
    const result = await compiledDMGraph.invoke({
      message: 'What do I know about the wizard?',
      character: mockCharacter,
      campaignId: 'test',
    });

    expect(result.memories.length).toBeGreaterThan(0);
  });
});

// 6. Performance comparison
// tests/langgraph/performance.test.ts
describe('LangGraph vs Custom Performance', () => {
  it('should compare response times', async () => {
    // LangGraph
    const langGraphStart = performance.now();
    await compiledDMGraph.invoke(testInput);
    const langGraphTime = performance.now() - langGraphStart;

    // Custom system
    const customStart = performance.now();
    await customMessagingSystem.processMessage(testInput);
    const customTime = performance.now() - customStart;

    console.log('LangGraph:', langGraphTime, 'ms');
    console.log('Custom:', customTime, 'ms');

    // No assertion - just gather data
  });
});

// 7. Gradual migration (Work Unit 6.4)
// src/services/ai-service.ts
const USE_LANGGRAPH = import.meta.env.VITE_FEATURE_USE_LANGGRAPH === 'true';

export async function processPlayerMessage(message: string, context: Context) {
  if (USE_LANGGRAPH) {
    return await langGraphProcessor.process(message, context);
  } else {
    return await customProcessor.process(message, context);
  }
}

// 8. Cleanup after successful migration
// - Remove src/agents/messaging/ (300+ files)
// - Remove custom message queue implementation
// - Update documentation
// - Remove feature flag
```

**Migration Checklist:**
- [ ] Complete all node implementations (replace placeholders)
- [ ] Add memory retrieval and dice rolling nodes
- [ ] Write integration tests for graph execution
- [ ] Run performance comparison tests
- [ ] Identify performance bottlenecks
- [ ] Optimize slow nodes
- [ ] Add feature flag for gradual rollout
- [ ] Test with 10+ users on staging
- [ ] Monitor error rates and performance
- [ ] Migrate 100% traffic to LangGraph
- [ ] Deprecate custom messaging system
- [ ] Remove 300+ custom messaging files
- [ ] Update documentation

---

#### Option B: Keep Custom System (Alternative)
**Rationale:** Custom system is battle-tested, performant, and meets all requirements.

**Estimated Effort:** 4 hours (cleanup and documentation)

**Tasks:**
- [ ] Remove LangGraph integration code (`src/agents/langgraph/`)
- [ ] Document decision in ADR (Architecture Decision Record)
- [ ] Improve custom system documentation
- [ ] Add more integration tests for custom system
- [ ] Consider: Extract custom system as open-source library (optional)

**Decision Criteria:**
- If performance tests show LangGraph is slower: Keep custom
- If LangGraph doesn't support offline-first: Keep custom
- If migration effort > 80 hours: Keep custom
- If custom system has proven stability: Keep custom

---

### 3.2 Documentation Coverage Improvement

**Source:** Analysis shows 53 READMEs for 265 directories (20% coverage)
**Priority:** MEDIUM
**Estimated Effort:** 20-30 hours
**Target:** 50%+ coverage (133+ directories)

#### Strategy: Prioritize High-Traffic Directories

**Tier 1: Critical (Must Document)**
1. `src/agents/` - Multi-agent AI system
2. `src/services/` - Core services (70+ files)
3. `src/features/` - Feature modules
4. `server/src/routes/` - API endpoints
5. `server/src/services/` - Backend services

**Tier 2: Important (Should Document)**
6. `src/components/` - UI components
7. `src/hooks/` - Custom React hooks
8. `src/utils/` - Utility functions
9. `src/contexts/` - React contexts
10. `server/src/middleware/` - Express middleware

**Tier 3: Nice to Have**
11. `src/types/` - TypeScript types
12. `tests/` - Test organization
13. `docs/` - Documentation structure

#### README Template
```markdown
# [Directory Name]

## Purpose
[1-2 sentence description of what this directory contains and why it exists]

## Key Files
- `file1.ts` - Brief description
- `file2.ts` - Brief description
- `file3.ts` - Brief description

## How It Works
[2-3 paragraphs explaining the main concepts, patterns, or architecture]

## Usage Examples
\`\`\`typescript
// Example code showing how to use the main exports
\`\`\`

## Dependencies
- [Dependency 1] - Why it's used
- [Dependency 2] - Why it's used

## Related Documentation
- Link to related READMEs
- Link to external docs
- Link to ADRs (if applicable)

## Maintenance Notes
- [Any gotchas, known issues, or maintenance considerations]
```

#### Automated README Generation
```typescript
// scripts/generate-readme-template.ts
import fs from 'fs';
import path from 'path';

function generateReadmeTemplate(dirPath: string): string {
  const dirName = path.basename(dirPath);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

  return `# ${dirName}

## Purpose
[Describe the purpose of this directory]

## Key Files
${files.map(f => `- \`${f}\` - [Brief description]`).join('\n')}

## How It Works
[Explain how the code in this directory works]

## Usage Examples
\`\`\`typescript
// Example code
\`\`\`

## Dependencies
- [List key dependencies]

## Related Documentation
- [Links to related docs]
`;
}

// Find all directories without READMEs
function findUndocumentedDirs(rootDir: string): string[] {
  const undocumented = [];

  function traverse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const hasReadme = entries.some(e => e.name.toLowerCase() === 'readme.md');

    if (!hasReadme && entries.some(e => e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx')))) {
      undocumented.push(dir);
    }

    entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .forEach(e => traverse(path.join(dir, e.name)));
  }

  traverse(rootDir);
  return undocumented;
}

// Generate template READMEs for all undocumented directories
const undocumented = findUndocumentedDirs('./src');
console.log(`Found ${undocumented.length} undocumented directories`);

undocumented.forEach(dir => {
  const template = generateReadmeTemplate(dir);
  fs.writeFileSync(path.join(dir, 'README.md'), template);
  console.log(`Created: ${dir}/README.md`);
});
```

#### Tasks
- [ ] Run script to identify all undocumented directories
- [ ] Generate README templates for Tier 1 directories
- [ ] Fill in templates with actual content (use AI assistance)
- [ ] Review and improve generated READMEs
- [ ] Generate README templates for Tier 2 directories
- [ ] Fill in templates with actual content
- [ ] Add README requirement to PR checklist
- [ ] Update CODE_STANDARDS.md with README guidelines
- [ ] Measure final coverage (target: 50%+)

---

## Code Quality Improvements (Week 3)

### 4.1 Remove Console Logs and Debug Code

```bash
# Find all console.log statements
git grep -n "console.log" src/ server/

# Find all console.error without proper logging
git grep -n "console.error" src/ server/

# Replace with proper logging
# src/utils/logger.ts
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    // Send to error tracking service (Sentry, etc.)
  },
};

# Replace all console.log with logger
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.log(/logger.debug(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.error(/logger.error(/g'
```

---

### 4.2 TypeScript Strict Mode

```typescript
// tsconfig.json - Enable strict mode gradually
{
  "compilerOptions": {
    "strict": true, // Enable all strict checks
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
  }
}

// Fix errors incrementally
// 1. Start with one directory at a time
// 2. Fix all errors in that directory
// 3. Move to next directory
```

---

### 4.3 Unused Code Removal

```bash
# Find unused exports
npx ts-prune

# Find unused imports
npx eslint . --rule "no-unused-vars: error"

# Find dead code
npx knip

# Remove unused files
git ls-files --others --exclude-standard

# Archive old code instead of deleting
mkdir -p archive/$(date +%Y%m%d)
mv src/old-feature archive/$(date +%Y%m%d)/
```

---

## Testing TODO Resolutions

### 5.1 Add Tests for Uncovered TODOs

All code that currently has TODO comments should have corresponding tests:

```typescript
// For each TODO:
// 1. Add failing test
// 2. Implement functionality
// 3. Test passes
// 4. Remove TODO

// Example:
// Before:
// TODO: Validate spell slots before casting

// After:
describe('Spell Casting Validation', () => {
  it('should reject spell cast without available slots', async () => {
    const character = { ...mockWizard, spell_slots: { 3: 0 } };
    const result = await castSpell(character, 'fireball', 3);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No 3rd-level spell slots');
  });
});
```

---

## Timeline & Milestones

### Week 1: Quick Wins
- **Day 1:** Apply blog CMS migration, configure GA, update env vars
- **Day 2-3:** Voice consistency service implementation
- **Day 4-5:** Passive skills implementation

### Week 2: Larger Refactoring
- **Day 1-3:** LangGraph migration decision and implementation (if chosen)
- **Day 4-5:** Legacy character flow deprecation monitoring and cleanup

### Week 3: Documentation & Quality
- **Day 1-3:** Documentation coverage improvement (generate and fill READMEs)
- **Day 4-5:** Code quality improvements (logging, strict mode, unused code)

---

## Success Metrics

### Quantitative
- ✅ Zero critical TODOs remaining in codebase
- ✅ All pending migrations applied successfully
- ✅ Documentation coverage: 50%+ (133+ directories)
- ✅ Reduced technical debt score by 40%
- ✅ Zero console.log statements in production code

### Qualitative
- ✅ Team confidence in codebase improved
- ✅ Onboarding time for new developers reduced
- ✅ Fewer "How does this work?" questions
- ✅ Clear architectural direction (LangGraph decision)
- ✅ Reduced bug reports related to incomplete features

---

## Open Questions

1. **LangGraph Migration:** Complete migration or keep custom system?
   - **Recommendation:** Run performance tests, then decide

2. **Legacy Character Flow:** When will 95% adoption be reached?
   - **Recommendation:** Monitor for 30 days, then re-evaluate

3. **Documentation Priority:** Which directories are most urgent?
   - **Recommendation:** Start with `src/agents/` and `src/services/`

4. **Passive Skills:** Should we support all 18 skills or just the main 3?
   - **Recommendation:** Start with Perception, Insight, Investigation

---

## Next Steps

Once this plan is approved:

1. **Day 1 Morning:** Apply blog CMS migration to staging
2. **Day 1 Afternoon:** Configure Google Analytics
3. **Day 2:** Implement voice consistency service
4. **Day 3-4:** Implement passive skills
5. **Day 5:** Make LangGraph migration decision
6. **Week 2:** Execute chosen path (migrate or cleanup)
7. **Week 3:** Documentation and code quality blitz

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Owner:** Development Team
**Status:** Draft - Pending Approval
