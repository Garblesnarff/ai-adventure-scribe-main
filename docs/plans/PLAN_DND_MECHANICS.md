# D&D 5E Gameplay Mechanics Implementation Plan

**Status:** Draft
**Priority:** Medium
**Estimated Total Effort:** 7-10 weeks
**Current Gap:** Major D&D mechanics missing per `missing-dnd-elements.md`

---

## Executive Summary

This plan addresses the most significant gap in AI Adventure Scribe: core D&D 5E gameplay mechanics. While the application excels at narrative AI and persistent world management, it currently lacks essential D&D systems like combat, resource management, and character progression.

### Current State
- Strong narrative AI with multi-agent DM system
- Excellent memory and world persistence
- Basic character sheets and dice rolling
- **Missing:** Combat initiative, HP tracking, conditions, spell slots, rest mechanics, level-up, magic items

### Success Criteria
- ✅ Functional combat system with initiative and HP tracking
- ✅ Complete resource management (spell slots, rest mechanics)
- ✅ Character progression with level-up UI
- ✅ Integration with existing AI DM agents
- ✅ 80%+ test coverage for new mechanics
- ✅ Performance: Combat calculations < 100ms

---

## Phase 1: Combat System Foundation (3-4 weeks)

**Priority:** CRITICAL
**Estimated Effort:** 120-160 hours
**Dependencies:** None

### 1.1 Initiative & Turn Order System

#### Database Schema
```sql
-- Migration: 20251112_add_combat_system.sql
CREATE TABLE combat_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  current_round INTEGER NOT NULL DEFAULT 1,
  current_turn_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE combat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- For ad-hoc creatures
  initiative INTEGER NOT NULL,
  initiative_modifier INTEGER NOT NULL DEFAULT 0,
  turn_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT participant_type CHECK (
    (character_id IS NOT NULL AND npc_id IS NULL) OR
    (character_id IS NULL AND npc_id IS NOT NULL) OR
    (character_id IS NULL AND npc_id IS NULL AND name IS NOT NULL)
  )
);

CREATE INDEX idx_combat_encounters_session ON combat_encounters(session_id);
CREATE INDEX idx_combat_participants_encounter ON combat_participants(encounter_id);
CREATE INDEX idx_combat_participants_turn_order ON combat_participants(encounter_id, turn_order);
```

#### Backend API Endpoints
```typescript
// server/src/routes/v1/combat.ts

POST   /v1/sessions/:sessionId/combat/start
  Body: { participantIds: string[], surpriseRound?: boolean }
  Returns: { encounterId: string, turnOrder: Participant[] }

POST   /v1/combat/:encounterId/roll-initiative
  Body: { participantId: string, roll?: number } // Optional pre-rolled value
  Returns: { initiative: number, turnOrder: Participant[] }

POST   /v1/combat/:encounterId/next-turn
  Returns: { currentParticipant: Participant, round: number, turnOrder: number }

PATCH  /v1/combat/:encounterId/reorder
  Body: { participantId: string, newInitiative: number }
  Returns: { turnOrder: Participant[] }

POST   /v1/combat/:encounterId/end
  Returns: { summary: CombatSummary }

GET    /v1/combat/:encounterId/status
  Returns: { encounter: CombatEncounter, participants: Participant[], currentTurn: Participant }
```

#### Frontend Components
```typescript
// src/features/combat/components/initiative-tracker/InitiativeTracker.tsx
// - Real-time initiative order display
// - Drag-and-drop reordering
// - Current turn highlighting
// - Round counter
// - Add/remove participants mid-combat

// src/features/combat/components/initiative-tracker/InitiativeRollModal.tsx
// - Roll initiative for all participants
// - Manual initiative entry option
// - Dexterity modifier auto-calculation
// - Advantage/disadvantage support

// src/features/combat/hooks/useCombatEncounter.ts
// - React Query hooks for combat state
// - Optimistic updates for turn advancement
// - Real-time sync via WebSocket
```

#### Tasks
- [ ] Create database migration for combat tables
- [ ] Implement backend combat service (`server/src/services/combat-service.ts`)
- [ ] Create combat API routes with validation
- [ ] Build `InitiativeTracker` component
- [ ] Build `InitiativeRollModal` component
- [ ] Create `useCombatEncounter` hook
- [ ] Add WebSocket events for real-time updates
- [ ] Write unit tests for combat service (target: 90% coverage)
- [ ] Write integration tests for combat flow
- [ ] Add E2E test for complete combat encounter

**Success Criteria:**
- ✅ Initiative rolls with modifiers applied correctly
- ✅ Turn order advances automatically or manually
- ✅ Multiple combats can run in parallel sessions
- ✅ Real-time updates for all party members
- ✅ Performance: Initiative calculation < 50ms

---

### 1.2 HP & Damage Tracking

#### Database Schema Extension
```sql
-- Add to migration: 20251112_add_combat_system.sql

CREATE TABLE combat_participant_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,
  current_hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  temp_hp INTEGER NOT NULL DEFAULT 0,
  is_conscious BOOLEAN NOT NULL DEFAULT true,
  death_saves_successes INTEGER NOT NULL DEFAULT 0,
  death_saves_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT death_saves_range CHECK (
    death_saves_successes BETWEEN 0 AND 3 AND
    death_saves_failures BETWEEN 0 AND 3
  )
);

CREATE TABLE combat_damage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,
  damage_amount INTEGER NOT NULL,
  damage_type TEXT NOT NULL, -- 'bludgeoning', 'fire', 'healing', etc.
  source_participant_id UUID REFERENCES combat_participants(id) ON DELETE SET NULL,
  source_description TEXT, -- e.g., "Fireball", "Longsword attack"
  round_number INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_combat_damage_log_encounter ON combat_damage_log(encounter_id);
CREATE INDEX idx_combat_damage_log_participant ON combat_damage_log(participant_id);
```

#### Backend API Endpoints
```typescript
POST   /v1/combat/:encounterId/damage
  Body: {
    participantId: string,
    amount: number,
    damageType: string,
    source?: string,
    sourceParticipantId?: string
  }
  Returns: { newHp: number, tempHp: number, isConscious: boolean }

POST   /v1/combat/:encounterId/heal
  Body: { participantId: string, amount: number, source?: string }
  Returns: { newHp: number, wasRevived: boolean }

POST   /v1/combat/:encounterId/temp-hp
  Body: { participantId: string, amount: number }
  Returns: { tempHp: number }

POST   /v1/combat/:encounterId/death-save
  Body: { participantId: string, result: number } // 1d20 result
  Returns: {
    successes: number,
    failures: number,
    isStabilized: boolean,
    isDead: boolean
  }

GET    /v1/combat/:encounterId/damage-log
  Query: { participantId?: string, round?: number }
  Returns: { log: DamageLogEntry[] }
```

#### Frontend Components
```typescript
// src/features/combat/components/hp-tracker/HpTrackerCard.tsx
// - Current/max HP display
// - Temp HP display
// - Quick damage/heal buttons
// - HP bar with color coding (full=green, injured=yellow, critical=red, unconscious=black)
// - Death save tracker

// src/features/combat/components/hp-tracker/DamageModal.tsx
// - Damage amount input
// - Damage type selector
// - Resistance/vulnerability auto-calculation
// - Damage preview before applying

// src/features/combat/components/hp-tracker/HealingModal.tsx
// - Healing amount input
// - Source selection (spell, potion, etc.)
// - Revival logic for unconscious characters

// src/features/combat/components/damage-log/CombatLog.tsx
// - Scrollable damage history
// - Filterable by participant or round
// - Color-coded by damage type
```

#### Tasks
- [ ] Extend database schema for HP tracking
- [ ] Implement damage calculation service with resistance/vulnerability
- [ ] Create HP tracking API endpoints
- [ ] Build `HpTrackerCard` component
- [ ] Build `DamageModal` and `HealingModal`
- [ ] Build `CombatLog` component
- [ ] Add death save mechanics
- [ ] Integrate with character sheet for max HP
- [ ] Add WebSocket events for HP changes
- [ ] Write unit tests for damage calculations (edge cases: temp HP, resistance, vulnerability)
- [ ] Write integration tests for damage flow
- [ ] Add E2E test for character going unconscious and being revived

**Success Criteria:**
- ✅ Damage applied correctly with resistance/vulnerability
- ✅ Temp HP shields damage before real HP
- ✅ Death saves tracked accurately (3 successes = stabilized, 3 failures = dead)
- ✅ Combat log shows complete damage history
- ✅ Performance: Damage calculation < 50ms

---

### 1.3 Conditions & Status Effects

#### Database Schema
```sql
-- Migration: 20251112_add_conditions_system.sql

CREATE TABLE conditions_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'blinded', 'charmed', 'frightened', etc.
  description TEXT NOT NULL,
  mechanical_effects TEXT NOT NULL, -- JSON describing mechanical impacts
  icon_name TEXT, -- For UI rendering
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE combat_participant_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES conditions_library(id) ON DELETE CASCADE,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('rounds', 'minutes', 'hours', 'until_save', 'permanent')),
  duration_value INTEGER, -- NULL for 'until_save' or 'permanent'
  save_dc INTEGER, -- For 'until_save' conditions
  save_ability TEXT, -- 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'
  applied_at_round INTEGER NOT NULL,
  expires_at_round INTEGER, -- Calculated based on duration
  source_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conditions_participant ON combat_participant_conditions(participant_id);
CREATE INDEX idx_conditions_active ON combat_participant_conditions(participant_id, is_active);

-- Seed core D&D 5E conditions
INSERT INTO conditions_library (name, description, mechanical_effects) VALUES
('blinded', 'A blinded creature can''t see and automatically fails ability checks that require sight.',
  '{"attack_rolls": "disadvantage", "attacks_against": "advantage"}'),
('charmed', 'A charmed creature can''t attack the charmer or target them with harmful abilities or magical effects.',
  '{"social_checks_by_charmer": "advantage"}'),
('deafened', 'A deafened creature can''t hear and automatically fails ability checks that require hearing.',
  '{}'),
('frightened', 'A frightened creature has disadvantage on ability checks and attack rolls while the source of fear is in sight.',
  '{"attack_rolls": "disadvantage", "ability_checks": "disadvantage", "movement": "cannot_move_closer"}'),
('grappled', 'A grappled creature''s speed becomes 0.', '{"speed": 0}'),
('incapacitated', 'An incapacitated creature can''t take actions or reactions.', '{"actions": "none", "reactions": "none"}'),
('invisible', 'An invisible creature is impossible to see without magic or special senses.',
  '{"attack_rolls": "advantage", "attacks_against": "disadvantage"}'),
('paralyzed', 'A paralyzed creature is incapacitated and can''t move or speak.',
  '{"actions": "none", "movement": 0, "saving_throws_dex": "auto_fail", "attacks_against": "advantage", "attacks_against_within_5ft": "critical_on_hit"}'),
('petrified', 'A petrified creature is transformed into stone.',
  '{"actions": "none", "movement": 0, "resistance": "all_damage", "immunity": "poison_disease", "weight": "multiplied_by_10"}'),
('poisoned', 'A poisoned creature has disadvantage on attack rolls and ability checks.',
  '{"attack_rolls": "disadvantage", "ability_checks": "disadvantage"}'),
('prone', 'A prone creature has disadvantage on attack rolls.',
  '{"attack_rolls": "disadvantage", "attacks_against_melee": "advantage", "attacks_against_ranged": "disadvantage", "movement": "half_to_stand"}'),
('restrained', 'A restrained creature''s speed becomes 0.',
  '{"speed": 0, "attack_rolls": "disadvantage", "dexterity_saves": "disadvantage", "attacks_against": "advantage"}'),
('stunned', 'A stunned creature is incapacitated, can''t move, and can speak only falteringly.',
  '{"actions": "none", "movement": 0, "saving_throws_dex": "auto_fail", "attacks_against": "advantage"}'),
('unconscious', 'An unconscious creature is incapacitated, can''t move or speak, and is unaware of its surroundings.',
  '{"actions": "none", "movement": 0, "drops_held_items": true, "saving_throws_dex": "auto_fail", "attacks_against": "advantage", "attacks_against_within_5ft": "critical_on_hit", "prone": true}');
```

#### Backend API Endpoints
```typescript
POST   /v1/combat/:encounterId/conditions/apply
  Body: {
    participantId: string,
    conditionName: string,
    durationType: 'rounds' | 'minutes' | 'hours' | 'until_save' | 'permanent',
    durationValue?: number,
    saveDC?: number,
    saveAbility?: string,
    source?: string
  }
  Returns: { appliedCondition: Condition, mechanicalEffects: object }

DELETE /v1/combat/:encounterId/conditions/:conditionId
  Returns: { removed: boolean }

POST   /v1/combat/:encounterId/conditions/:conditionId/save
  Body: { saveRoll: number }
  Returns: { success: boolean, removed: boolean }

GET    /v1/combat/:encounterId/conditions/active
  Query: { participantId?: string }
  Returns: { conditions: Condition[] }

POST   /v1/combat/:encounterId/advance-turn (modified)
  // Auto-decrement condition durations
  // Auto-prompt for saves on 'until_save' conditions
  Returns: { expiredConditions: Condition[], activeConditions: Condition[] }
```

#### Frontend Components
```typescript
// src/features/combat/components/conditions/ConditionBadge.tsx
// - Small icon badge for each active condition
// - Tooltip with condition description
// - Click to view details or remove

// src/features/combat/components/conditions/ConditionManager.tsx
// - Add condition modal
// - Duration selector
// - Save DC configuration
// - Active conditions list with expiry tracking

// src/features/combat/components/conditions/ConditionEffectsPanel.tsx
// - Real-time display of mechanical effects
// - Integration with attack rolls (auto-apply advantage/disadvantage)
// - Integration with movement (enforce speed restrictions)

// src/features/combat/services/condition-effects-service.ts
// - Apply mechanical effects to rolls
// - Validate actions based on conditions (e.g., can't move if paralyzed)
// - Auto-prompt saves at end of turn
```

#### Tasks
- [ ] Create conditions database schema and seed data
- [ ] Implement condition application service
- [ ] Create conditions API endpoints
- [ ] Build `ConditionBadge` component
- [ ] Build `ConditionManager` component
- [ ] Build `ConditionEffectsPanel` component
- [ ] Implement mechanical effects service
- [ ] Integrate conditions with attack rolls (advantage/disadvantage)
- [ ] Integrate conditions with movement restrictions
- [ ] Add automatic save prompts at end of turn
- [ ] Add condition expiry logic on turn advancement
- [ ] Write unit tests for condition mechanics (edge cases: multiple conditions, conflicting effects)
- [ ] Write integration tests for condition lifecycle
- [ ] Add E2E test for applying, saving against, and removing conditions

**Success Criteria:**
- ✅ All 13 core D&D 5E conditions implemented
- ✅ Mechanical effects applied automatically to rolls
- ✅ Duration tracking and auto-expiry working
- ✅ Save prompts appear correctly
- ✅ UI clearly shows active conditions with descriptions
- ✅ Performance: Condition check < 20ms per roll

---

### 1.4 Attack & Damage Resolution

#### Database Schema Extension
```sql
-- Migration: 20251112_add_attack_resolution.sql

CREATE TABLE creature_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  armor_class INTEGER NOT NULL DEFAULT 10,
  resistances TEXT[] DEFAULT '{}', -- ['fire', 'cold']
  vulnerabilities TEXT[] DEFAULT '{}',
  immunities TEXT[] DEFAULT '{}',
  condition_immunities TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT stats_owner CHECK (
    (character_id IS NOT NULL AND npc_id IS NULL) OR
    (character_id IS NULL AND npc_id IS NOT NULL)
  )
);

CREATE TABLE weapon_attacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attack_bonus INTEGER NOT NULL,
  damage_dice TEXT NOT NULL, -- '1d8', '2d6', etc.
  damage_bonus INTEGER NOT NULL DEFAULT 0,
  damage_type TEXT NOT NULL,
  properties TEXT[] DEFAULT '{}', -- ['finesse', 'versatile', 'reach']
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weapon_attacks_character ON weapon_attacks(character_id);
```

#### Backend API Endpoints
```typescript
POST   /v1/combat/:encounterId/attack
  Body: {
    attackerId: string,
    targetId: string,
    weaponId?: string,
    attackRoll: number, // 1d20 result
    damageRoll?: number, // Optional pre-rolled damage
    attackType: 'melee' | 'ranged' | 'spell',
    isCritical?: boolean
  }
  Returns: {
    hit: boolean,
    targetAC: number,
    totalAttackRoll: number,
    damage: number,
    damageType: string,
    effectiveResistance: boolean,
    effectiveVulnerability: boolean,
    finalDamage: number,
    targetNewHp: number
  }

POST   /v1/combat/:encounterId/spell-attack
  Body: {
    casterId: string,
    targetIds: string[], // Multiple targets for AoE
    spellName: string,
    attackRoll?: number, // For spell attacks
    saveDC?: number, // For saving throw spells
    saveRolls?: { [targetId: string]: number },
    damageRoll: number
  }
  Returns: { results: AttackResult[] }

GET    /v1/characters/:characterId/attacks
  Returns: { attacks: WeaponAttack[] }

POST   /v1/characters/:characterId/attacks
  Body: { weapon: WeaponAttack }
  Returns: { attack: WeaponAttack }
```

#### Frontend Components
```typescript
// src/features/combat/components/attack/AttackRollModal.tsx
// - Attacker and target selection
// - Weapon/spell selection
// - Attack roll with modifiers
// - Advantage/disadvantage toggle
// - Critical hit detection
// - Damage roll interface

// src/features/combat/components/attack/AttackResultPanel.tsx
// - Hit/miss display
// - Damage dealt with type
// - Resistance/vulnerability indicators
// - HP change visualization
// - Add to combat log

// src/features/combat/components/weapons/WeaponManager.tsx
// - Character weapon list
// - Add/edit/delete weapons
// - Attack and damage bonus calculation from abilities
// - Property management (finesse, versatile, etc.)
```

#### Tasks
- [ ] Create attack resolution database schema
- [ ] Implement attack calculation service (hit/miss, damage, resistance)
- [ ] Create attack API endpoints
- [ ] Build `AttackRollModal` component
- [ ] Build `AttackResultPanel` component
- [ ] Build `WeaponManager` component
- [ ] Implement critical hit rules (2x damage dice)
- [ ] Integrate with conditions (apply advantage/disadvantage)
- [ ] Integrate with HP tracker (auto-apply damage)
- [ ] Add AoE spell support (multiple targets)
- [ ] Write unit tests for attack calculations (edge cases: crits, resistance, conditions)
- [ ] Write integration tests for attack flow
- [ ] Add E2E test for complete attack sequence

**Success Criteria:**
- ✅ Attack rolls compared against AC correctly
- ✅ Damage applied with resistance/vulnerability/immunity
- ✅ Critical hits double damage dice (not modifiers)
- ✅ Conditions affect attack rolls automatically
- ✅ Combat log shows complete attack details
- ✅ Performance: Attack resolution < 100ms

---

### 1.5 Combat UI Integration

#### Main Combat Interface
```typescript
// src/features/combat/pages/CombatScreen.tsx
// - Three-panel layout:
//   - Left: Initiative tracker
//   - Center: Combat log and narrative
//   - Right: Active participant details
// - Quick action buttons (Attack, Cast Spell, Dash, Disengage, Dodge, Help, Hide, Ready)
// - AI DM narrative integration
// - Real-time updates via WebSocket

// src/features/combat/components/combat-controls/ActionBar.tsx
// - Standard actions (Attack, Bonus Action, Move, Reaction)
// - Action economy tracker (action used, bonus action used, movement remaining)
// - End turn button

// src/features/combat/components/narrative/CombatNarrative.tsx
// - AI-generated combat descriptions
// - Roll results formatted as story
// - Integration with dungeon-master-agent
```

#### AI DM Integration
```typescript
// Extend dungeon-master-agent.ts to handle combat

interface CombatContext {
  encounter: CombatEncounter;
  participants: Participant[];
  currentTurn: Participant;
  recentActions: string[];
  damageLog: DamageLogEntry[];
}

async function narrateCombatAction(
  action: 'attack' | 'spell' | 'movement' | 'turn_end',
  result: AttackResult | MovementResult,
  context: CombatContext
): Promise<string> {
  // Generate cinematic combat descriptions
  // Example: "Your arrow whistles through the air, striking the goblin
  //          squarely in the chest for 12 points of damage. He staggers
  //          back, clutching the wound."
}
```

#### Tasks
- [ ] Design combat screen layout (3-panel)
- [ ] Build `CombatScreen` component
- [ ] Build `ActionBar` component
- [ ] Build `CombatNarrative` component
- [ ] Integrate combat actions with AI DM narration
- [ ] Add WebSocket handlers for real-time combat updates
- [ ] Create mobile-responsive combat UI
- [ ] Add keyboard shortcuts for common actions
- [ ] Implement action economy tracker
- [ ] Write component tests for combat UI
- [ ] Conduct UX testing with D&D players
- [ ] Add accessibility features (screen reader support, keyboard navigation)

**Success Criteria:**
- ✅ Intuitive combat UI that feels like D&D
- ✅ AI DM generates engaging combat narration
- ✅ Real-time updates visible to all players
- ✅ Mobile-friendly combat interface
- ✅ Performance: UI updates < 100ms, 60fps smooth

---

### 1.6 Testing & Performance Optimization

#### Test Coverage Targets
- Unit tests: 90% coverage for combat services
- Integration tests: All combat flows (start → turns → damage → end)
- E2E tests: Complete combat encounters with multiple participants
- Performance tests: Large combats (10+ participants)

#### Performance Benchmarks
- Initiative roll: < 50ms per participant
- Damage calculation: < 50ms
- Attack resolution: < 100ms
- Combat state sync: < 200ms
- Database queries: < 100ms (use indexes effectively)

#### Tasks
- [ ] Write comprehensive unit tests for all combat services
- [ ] Write integration tests for combat lifecycle
- [ ] Add E2E tests with Playwright/Cypress
- [ ] Profile combat calculations and optimize slow paths
- [ ] Load test with 10+ participants
- [ ] Stress test WebSocket synchronization
- [ ] Optimize database queries (add missing indexes)
- [ ] Add performance monitoring to production

**Success Criteria:**
- ✅ 90%+ test coverage for combat code
- ✅ All performance benchmarks met
- ✅ Zero critical bugs in manual testing
- ✅ Smooth experience with 8+ participants

---

## Phase 2: Resource Management (2-3 weeks)

**Priority:** HIGH
**Estimated Effort:** 80-120 hours
**Dependencies:** Phase 1 complete

### 2.1 Spell Slot Tracking

#### Database Schema
```sql
-- Migration: 20251113_add_spell_slots.sql

CREATE TABLE character_spell_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spell_level INTEGER NOT NULL CHECK (spell_level BETWEEN 1 AND 9),
  total_slots INTEGER NOT NULL DEFAULT 0,
  used_slots INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_slot_usage CHECK (used_slots <= total_slots),
  UNIQUE(character_id, spell_level)
);

CREATE TABLE spell_slot_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  spell_name TEXT NOT NULL,
  spell_level INTEGER NOT NULL,
  slot_level_used INTEGER NOT NULL, -- Can upcast
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spell_slots_character ON character_spell_slots(character_id);
CREATE INDEX idx_spell_usage_log_character ON spell_slot_usage_log(character_id);
```

#### Backend API
```typescript
GET    /v1/characters/:characterId/spell-slots
  Returns: { slots: SpellSlot[] } // Levels 1-9 with total/used

POST   /v1/characters/:characterId/spell-slots/use
  Body: { spellName: string, spellLevel: number, slotLevelUsed: number, sessionId?: string }
  Returns: { remainingSlots: number, canUpcast: boolean }

POST   /v1/characters/:characterId/spell-slots/restore
  Body: { level?: number } // Restore specific level or all
  Returns: { slots: SpellSlot[] }

GET    /v1/characters/:characterId/spell-slots/history
  Query: { sessionId?: string, limit?: number }
  Returns: { log: SpellUsageLog[] }
```

#### Frontend Components
```typescript
// src/features/character/components/spell-slots/SpellSlotTracker.tsx
// - Visual grid of spell slots (circles: filled = available, empty = used)
// - Per-level tracking (1st through 9th level)
// - Quick use/restore buttons

// src/features/spells/components/SpellCastModal.tsx
// - Spell selection
// - Upcasting selector (if applicable)
// - Slot availability indicator
// - Cast button (disabled if no slots)
```

#### Tasks
- [ ] Create spell slots database schema
- [ ] Calculate spell slots based on class and level
- [ ] Implement spell slot service with usage tracking
- [ ] Create spell slot API endpoints
- [ ] Build `SpellSlotTracker` component
- [ ] Build `SpellCastModal` component
- [ ] Integrate spell casting with combat system
- [ ] Add pact magic support (warlock short rest slots)
- [ ] Write unit tests for spell slot calculations
- [ ] Write integration tests for spell casting flow
- [ ] Add E2E test for casting spell and tracking slots

**Success Criteria:**
- ✅ Spell slots calculated correctly per class/level
- ✅ Upcasting supported for applicable spells
- ✅ Slots restore on long rest (short rest for warlocks)
- ✅ UI clearly shows available slots
- ✅ Integration with combat spell attacks

---

### 2.2 Rest Mechanics

#### Database Schema
```sql
-- Migration: 20251113_add_rest_system.sql

CREATE TABLE rest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  rest_type TEXT NOT NULL CHECK (rest_type IN ('short', 'long')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  hp_restored INTEGER,
  hit_dice_spent INTEGER,
  resources_restored TEXT, -- JSON: spell slots, class features, etc.
  interrupted BOOLEAN NOT NULL DEFAULT false,
  notes TEXT
);

CREATE TABLE character_hit_dice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  die_type TEXT NOT NULL, -- 'd6', 'd8', 'd10', 'd12'
  total_dice INTEGER NOT NULL,
  used_dice INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dice_usage CHECK (used_dice <= total_dice)
);

CREATE INDEX idx_rest_events_character ON rest_events(character_id);
CREATE INDEX idx_hit_dice_character ON character_hit_dice(character_id);
```

#### Backend API
```typescript
POST   /v1/characters/:characterId/rest/short
  Body: { hitDiceToSpend?: number, sessionId?: string }
  Returns: {
    hpRestored: number,
    hitDiceSpent: number,
    hitDiceRemaining: number,
    resourcesRestored: string[] // e.g., ["Warlock spell slots", "Fighter Second Wind"]
  }

POST   /v1/characters/:characterId/rest/long
  Body: { sessionId?: string }
  Returns: {
    hpRestored: number,
    hitDiceRestored: number,
    resourcesRestored: string[] // Spell slots, hit points, class features
  }

GET    /v1/characters/:characterId/hit-dice
  Returns: { hitDice: HitDice[] }

POST   /v1/characters/:characterId/hit-dice/spend
  Body: { count: number, roll?: number }
  Returns: { hpRestored: number, remaining: number }

GET    /v1/characters/:characterId/rest-history
  Query: { sessionId?: string, limit?: number }
  Returns: { rests: RestEvent[] }
```

#### Frontend Components
```typescript
// src/features/rest/components/ShortRestModal.tsx
// - Hit dice spending interface
// - Roll hit dice for HP (with CON modifier)
// - Resources restored indicator
// - Duration: 1 hour in-game time

// src/features/rest/components/LongRestModal.tsx
// - HP fully restored display
// - Spell slots restored indicator
// - Hit dice restored (up to half total)
// - Class features restored
// - Duration: 8 hours in-game time

// src/features/character/components/hit-dice/HitDiceTracker.tsx
// - Visual display of available hit dice
// - Spend hit dice button
// - Class-based hit dice types (Wizard=d6, Rogue=d8, etc.)
```

#### Tasks
- [ ] Create rest system database schema
- [ ] Implement hit dice tracking per class
- [ ] Implement short rest service
- [ ] Implement long rest service
- [ ] Create rest API endpoints
- [ ] Build `ShortRestModal` component
- [ ] Build `LongRestModal` component
- [ ] Build `HitDiceTracker` component
- [ ] Add class-specific resource restoration (Warlock slots, Fighter features, etc.)
- [ ] Integrate with time tracking system
- [ ] Write unit tests for rest mechanics
- [ ] Write integration tests for rest flow
- [ ] Add E2E test for taking short and long rests

**Success Criteria:**
- ✅ Short rest restores hit dice spent, some class features
- ✅ Long rest fully restores HP, spell slots, and up to half hit dice
- ✅ Hit dice calculated correctly per class level
- ✅ UI clearly shows rest benefits
- ✅ Integration with time tracking

---

### 2.3 Ammunition & Consumables

#### Database Schema
```sql
-- Migration: 20251113_add_inventory_tracking.sql

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'armor', 'consumable', 'ammunition', 'equipment', 'treasure')),
  quantity INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(5,2) DEFAULT 0,
  description TEXT,
  properties TEXT, -- JSON
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  is_attuned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE consumable_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  context TEXT, -- "Combat round 3", "Healing after trap"
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_character ON inventory_items(character_id);
CREATE INDEX idx_consumable_usage_log_character ON consumable_usage_log(character_id);
```

#### Backend API
```typescript
GET    /v1/characters/:characterId/inventory
  Query: { itemType?: string, equipped?: boolean }
  Returns: { items: InventoryItem[], totalWeight: number }

POST   /v1/characters/:characterId/inventory
  Body: { item: InventoryItem }
  Returns: { item: InventoryItem }

PATCH  /v1/characters/:characterId/inventory/:itemId
  Body: { quantity?: number, isEquipped?: boolean, isAttuned?: boolean }
  Returns: { item: InventoryItem }

DELETE /v1/characters/:characterId/inventory/:itemId
  Returns: { deleted: boolean }

POST   /v1/characters/:characterId/inventory/:itemId/use
  Body: { quantity?: number, sessionId?: string, context?: string }
  Returns: { remainingQuantity: number }

GET    /v1/characters/:characterId/encumbrance
  Returns: {
    currentWeight: number,
    carryingCapacity: number,
    isEncumbered: boolean,
    isHeavilyEncumbered: boolean
  }
```

#### Frontend Components
```typescript
// src/features/inventory/components/InventoryManager.tsx
// - Searchable/filterable item list
// - Quantity tracking
// - Weight calculation
// - Equip/unequip toggle
// - Attunement tracking

// src/features/inventory/components/AmmunitionTracker.tsx
// - Quick view of arrow/bolt counts
// - Auto-decrement on ranged attacks
// - Low ammunition warning

// src/features/inventory/components/ConsumableQuickUse.tsx
// - Quick-access potion/scroll buttons
// - Use item modal
// - Effect application
```

#### Tasks
- [ ] Create inventory database schema
- [ ] Implement inventory service with weight calculation
- [ ] Create inventory API endpoints
- [ ] Build `InventoryManager` component
- [ ] Build `AmmunitionTracker` component
- [ ] Build `ConsumableQuickUse` component
- [ ] Integrate ammunition with ranged weapon attacks
- [ ] Add encumbrance rules (carrying capacity)
- [ ] Implement attunement limits (3 items max)
- [ ] Write unit tests for inventory mechanics
- [ ] Write integration tests for item usage
- [ ] Add E2E test for using consumable and tracking quantity

**Success Criteria:**
- ✅ Inventory tracks quantity and weight correctly
- ✅ Ammunition auto-decrements on attacks
- ✅ Encumbrance enforced (speed penalty)
- ✅ Attunement limited to 3 items
- ✅ Consumables apply effects correctly

---

## Phase 3: Character Progression (2-3 weeks)

**Priority:** MEDIUM
**Estimated Effort:** 80-120 hours
**Dependencies:** Phase 2 complete

### 3.1 Experience & Leveling System

#### Database Schema
```sql
-- Migration: 20251114_add_progression_system.sql

CREATE TABLE experience_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  xp_gained INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'combat', 'quest', 'roleplay', 'milestone'
  description TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE level_progression (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 20),
  current_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  last_level_up TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_events_character ON experience_events(character_id);
```

#### Backend API
```typescript
POST   /v1/characters/:characterId/experience/award
  Body: {
    xp: number,
    source: 'combat' | 'quest' | 'roleplay' | 'milestone',
    description?: string,
    sessionId?: string
  }
  Returns: {
    newXp: number,
    leveledUp: boolean,
    newLevel?: number
  }

GET    /v1/characters/:characterId/progression
  Returns: {
    level: number,
    xp: number,
    xpToNext: number,
    percentToNext: number
  }

POST   /v1/characters/:characterId/level-up
  Body: {
    hpRoll: number,
    abilityScoreImprovement?: { ability: string, increase: number }[],
    featSelected?: string,
    classFeatures?: string[],
    spellsLearned?: string[]
  }
  Returns: { character: Character, newFeatures: string[] }

GET    /v1/characters/:characterId/level-up-options
  Query: { newLevel: number }
  Returns: {
    hpIncrease: { dieType: string, modifier: number },
    abilityScoreOptions: boolean, // True at levels 4, 8, 12, 16, 19
    classFeatures: Feature[],
    spellChoices?: SpellChoice[]
  }
```

#### Frontend Components
```typescript
// src/features/character/components/progression/ExperienceBar.tsx
// - Visual XP progress bar
// - Current level display
// - XP to next level
// - Recent XP gains

// src/features/character/components/progression/LevelUpWizard.tsx
// - Multi-step level up flow:
//   1. Roll/take average for HP
//   2. Select ASI or feat (at applicable levels)
//   3. Choose class features
//   4. Learn new spells (if spellcaster)
//   5. Review changes
// - Class-specific guidance
// - D&D 5E rules enforcement

// src/features/character/components/progression/ProgressionHistory.tsx
// - XP gain history
// - Level up timeline
// - Milestone tracking
```

#### Tasks
- [ ] Create progression database schema
- [ ] Implement XP calculation service (D&D 5E XP table)
- [ ] Implement level-up service with class-specific logic
- [ ] Create progression API endpoints
- [ ] Build `ExperienceBar` component
- [ ] Build `LevelUpWizard` component (multi-step)
- [ ] Build `ProgressionHistory` component
- [ ] Add ASI/feat selection at levels 4, 8, 12, 16, 19
- [ ] Add class feature selection (subclass choices, spell lists, etc.)
- [ ] Integrate with character sheet (update stats)
- [ ] Write unit tests for XP and level-up calculations
- [ ] Write integration tests for level-up flow
- [ ] Add E2E test for leveling up and selecting features

**Success Criteria:**
- ✅ XP awarded correctly per D&D 5E guidelines
- ✅ Level-up wizard enforces class rules
- ✅ HP, abilities, and features update correctly
- ✅ Milestone and XP leveling both supported
- ✅ UI guides player through level-up choices

---

### 3.2 Class Features & Subclasses

#### Database Schema
```sql
-- Migration: 20251114_add_class_features.sql

CREATE TABLE class_features_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL,
  subclass_name TEXT,
  feature_name TEXT NOT NULL,
  level_acquired INTEGER NOT NULL CHECK (level_acquired BETWEEN 1 AND 20),
  description TEXT NOT NULL,
  mechanical_effects TEXT, -- JSON
  usage_type TEXT CHECK (usage_type IN ('passive', 'action', 'bonus_action', 'reaction', 'limited_use')),
  uses_per_rest TEXT CHECK (uses_per_rest IN ('at_will', 'short_rest', 'long_rest', 'other')),
  uses_count INTEGER, -- For limited use features
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE character_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES class_features_library(id) ON DELETE CASCADE,
  uses_remaining INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  acquired_at_level INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_class_features_class ON class_features_library(class_name, level_acquired);
CREATE INDEX idx_character_features_character ON character_features(character_id);

-- Seed example features (abbreviated)
INSERT INTO class_features_library (class_name, feature_name, level_acquired, description, usage_type, uses_per_rest, uses_count) VALUES
('Fighter', 'Second Wind', 1, 'Regain 1d10 + fighter level HP as a bonus action.', 'bonus_action', 'short_rest', 1),
('Fighter', 'Action Surge', 2, 'Take one additional action on your turn.', 'action', 'short_rest', 1),
('Rogue', 'Sneak Attack', 1, 'Deal extra damage when you have advantage or an ally is adjacent.', 'passive', 'at_will', NULL),
('Wizard', 'Arcane Recovery', 1, 'Recover spell slots during short rest.', 'other', 'long_rest', 1);
```

#### Backend API
```typescript
GET    /v1/class-features
  Query: { className?: string, subclass?: string, level?: number }
  Returns: { features: ClassFeature[] }

GET    /v1/characters/:characterId/features
  Returns: { features: CharacterFeature[], usesRemaining: { [featureId: string]: number } }

POST   /v1/characters/:characterId/features/:featureId/use
  Body: { context?: string }
  Returns: { usesRemaining: number, effect: string }

POST   /v1/characters/:characterId/features/restore
  Body: { restType: 'short' | 'long' }
  Returns: { featuresRestored: string[] }
```

#### Frontend Components
```typescript
// src/features/character/components/features/FeaturesPanel.tsx
// - List of all class features
// - Active/passive indicator
// - Uses remaining tracker
// - Description tooltips
// - Quick use buttons

// src/features/character/components/features/SubclassSelector.tsx
// - Subclass selection at appropriate level (typically 3)
// - Display subclass features
// - Lock in selection (irreversible)
```

#### Tasks
- [ ] Create class features database schema
- [ ] Seed all core class features for PHB classes
- [ ] Implement feature usage service
- [ ] Create class features API endpoints
- [ ] Build `FeaturesPanel` component
- [ ] Build `SubclassSelector` component
- [ ] Integrate features with rest system (restore uses)
- [ ] Add feature usage to combat UI
- [ ] Add all PHB subclasses (Champion, Battle Master, etc.)
- [ ] Write unit tests for feature mechanics
- [ ] Write integration tests for feature usage and restoration
- [ ] Add E2E test for using limited-use feature

**Success Criteria:**
- ✅ All PHB class features implemented
- ✅ Limited-use features track uses correctly
- ✅ Features restore on appropriate rest type
- ✅ Subclass selection enforced at correct level
- ✅ UI clearly shows available features

---

### 3.3 Multiclassing Support

#### Database Schema
```sql
-- Migration: 20251114_add_multiclassing.sql

CREATE TABLE character_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subclass_name TEXT,
  class_level INTEGER NOT NULL DEFAULT 1 CHECK (class_level >= 1),
  is_primary_class BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE multiclass_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL,
  required_ability TEXT NOT NULL, -- 'STR', 'DEX', etc.
  minimum_score INTEGER NOT NULL DEFAULT 13,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_character_classes_character ON character_classes(character_id);

-- Seed multiclass prerequisites
INSERT INTO multiclass_prerequisites (class_name, required_ability, minimum_score) VALUES
('Barbarian', 'STR', 13),
('Bard', 'CHA', 13),
('Cleric', 'WIS', 13),
('Druid', 'WIS', 13),
('Fighter', 'STR', 13), ('Fighter', 'DEX', 13), -- Either STR or DEX
('Monk', 'DEX', 13), ('Monk', 'WIS', 13), -- Both DEX and WIS
('Paladin', 'STR', 13), ('Paladin', 'CHA', 13),
('Ranger', 'DEX', 13), ('Ranger', 'WIS', 13),
('Rogue', 'DEX', 13),
('Sorcerer', 'CHA', 13),
('Warlock', 'CHA', 13),
('Wizard', 'INT', 13);
```

#### Backend API
```typescript
GET    /v1/characters/:characterId/classes
  Returns: {
    classes: CharacterClass[],
    totalLevel: number,
    canMulticlass: boolean,
    availableClasses: string[]
  }

POST   /v1/characters/:characterId/multiclass/validate
  Body: { newClass: string, currentAbilities: { [ability: string]: number } }
  Returns: { eligible: boolean, requirements: string[] }

POST   /v1/characters/:characterId/multiclass/add
  Body: { className: string }
  Returns: { class: CharacterClass, newFeatures: Feature[] }

GET    /v1/multiclass/spell-slots
  Query: { classes: { className: string, level: number }[] }
  Returns: { spellSlots: SpellSlot[] } // Multiclass spell slot calculation
```

#### Frontend Components
```typescript
// src/features/character/components/multiclass/MulticlassManager.tsx
// - Current classes display
// - Add class button (with prerequisite check)
// - Class level distribution
// - Total character level

// src/features/character/components/multiclass/MulticlassWizard.tsx
// - Class selection
// - Prerequisite validation
// - Proficiency restrictions (no armor/weapon from multiclass)
// - Spell slot recalculation
```

#### Tasks
- [ ] Create multiclassing database schema
- [ ] Implement prerequisite validation service
- [ ] Implement multiclass spell slot calculation
- [ ] Create multiclassing API endpoints
- [ ] Build `MulticlassManager` component
- [ ] Build `MulticlassWizard` component
- [ ] Enforce proficiency restrictions (don't grant from multiclass)
- [ ] Recalculate spell slots for multiclass casters
- [ ] Update level-up wizard to support multiclassing
- [ ] Write unit tests for multiclass rules
- [ ] Write integration tests for multiclassing flow
- [ ] Add E2E test for adding second class

**Success Criteria:**
- ✅ Multiclass prerequisites validated correctly
- ✅ Spell slots calculated per multiclass rules
- ✅ Proficiencies not granted from multiclass
- ✅ Level-up wizard supports multiple classes
- ✅ UI clearly shows class distribution

---

## Phase 4: World Systems (1-2 weeks)

**Priority:** LOW
**Estimated Effort:** 40-80 hours
**Dependencies:** Phase 3 complete

### 4.1 Time Tracking & Calendar

#### Database Schema
```sql
-- Migration: 20251115_add_time_tracking.sql

CREATE TABLE campaign_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  current_date TEXT NOT NULL, -- 'Year 1485, Day 127' or custom format
  current_time TEXT, -- 'Morning', '3:45 PM', etc.
  days_elapsed INTEGER NOT NULL DEFAULT 0,
  hours_elapsed INTEGER NOT NULL DEFAULT 0,
  custom_calendar_config TEXT, -- JSON for custom calendars
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE time_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('rest', 'travel', 'scene', 'combat', 'other')),
  time_advanced TEXT NOT NULL, -- '8 hours', '3 days', etc.
  in_game_timestamp TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_calendar_campaign ON campaign_calendar(campaign_id);
CREATE INDEX idx_time_events_campaign ON time_events(campaign_id);
```

#### Backend API
```typescript
GET    /v1/campaigns/:campaignId/calendar
  Returns: {
    currentDate: string,
    currentTime: string,
    daysElapsed: number,
    customCalendar?: CalendarConfig
  }

POST   /v1/campaigns/:campaignId/calendar/advance
  Body: {
    amount: number,
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    reason: string
  }
  Returns: { newDate: string, newTime: string, eventsTriggered: string[] }

GET    /v1/campaigns/:campaignId/timeline
  Query: { startDate?: string, endDate?: string }
  Returns: { events: TimeEvent[] }
```

#### Frontend Components
```typescript
// src/features/world/components/calendar/CampaignCalendar.tsx
// - Current in-game date/time display
// - Advance time controls
// - Timeline view
// - Custom calendar support (Forgotten Realms, Greyhawk, homebrew)

// src/features/world/components/calendar/TimeAdvanceModal.tsx
// - Quick time advance (1 hour, 8 hours, 1 day)
// - Custom time entry
// - Reason/description
```

#### Tasks
- [ ] Create time tracking database schema
- [ ] Implement time advancement service
- [ ] Create calendar API endpoints
- [ ] Build `CampaignCalendar` component
- [ ] Build `TimeAdvanceModal` component
- [ ] Integrate with rest system (auto-advance 1 or 8 hours)
- [ ] Add seasonal effects (optional)
- [ ] Support custom calendars
- [ ] Write unit tests for time calculations
- [ ] Write integration tests for time advancement
- [ ] Add E2E test for advancing time

**Success Criteria:**
- ✅ Time advances correctly with rests and events
- ✅ Timeline shows all time-based events
- ✅ Custom calendars supported
- ✅ Integration with rest and travel

---

### 4.2 Factions & Reputation

#### Database Schema
```sql
-- Migration: 20251115_add_factions.sql

CREATE TABLE factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  headquarters TEXT,
  goals TEXT,
  allies TEXT[], -- Faction IDs
  enemies TEXT[], -- Faction IDs
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE character_faction_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  faction_id UUID NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  reputation_score INTEGER NOT NULL DEFAULT 0, -- -100 to 100
  standing TEXT NOT NULL DEFAULT 'neutral' CHECK (standing IN ('hated', 'hostile', 'unfriendly', 'neutral', 'friendly', 'honored', 'revered')),
  notes TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(character_id, faction_id)
);

CREATE INDEX idx_factions_campaign ON factions(campaign_id);
CREATE INDEX idx_reputation_character ON character_faction_reputation(character_id);
```

#### Backend API
```typescript
GET    /v1/campaigns/:campaignId/factions
  Returns: { factions: Faction[] }

POST   /v1/campaigns/:campaignId/factions
  Body: { faction: Faction }
  Returns: { faction: Faction }

POST   /v1/characters/:characterId/reputation/adjust
  Body: { factionId: string, change: number, reason: string }
  Returns: { newScore: number, newStanding: string }

GET    /v1/characters/:characterId/reputation
  Returns: { reputations: Reputation[] }
```

#### Frontend Components
```typescript
// src/features/world/components/factions/FactionManager.tsx
// - Campaign factions list
// - Create/edit factions
// - Relationship mapping

// src/features/character/components/reputation/ReputationPanel.tsx
// - Character's standing with each faction
// - Visual reputation bars
// - Recent reputation changes
```

#### Tasks
- [ ] Create factions database schema
- [ ] Implement faction service
- [ ] Implement reputation calculation
- [ ] Create factions API endpoints
- [ ] Build `FactionManager` component
- [ ] Build `ReputationPanel` component
- [ ] Add reputation effects (dialogue options, prices, etc.)
- [ ] Write unit tests for reputation mechanics
- [ ] Write integration tests for faction system
- [ ] Add E2E test for faction interactions

**Success Criteria:**
- ✅ Factions track relationships (allies/enemies)
- ✅ Reputation changes reflected immediately
- ✅ Standing affects gameplay (dialogue, pricing)
- ✅ UI shows clear reputation status

---

### 4.3 Magic Items & Attunement

#### Database Schema Extension
```sql
-- Extend inventory_items table
ALTER TABLE inventory_items ADD COLUMN rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'));
ALTER TABLE inventory_items ADD COLUMN requires_attunement BOOLEAN DEFAULT false;
ALTER TABLE inventory_items ADD COLUMN attunement_requirements TEXT; -- e.g., "by a spellcaster"
ALTER TABLE inventory_items ADD COLUMN magical_properties TEXT; -- JSON

-- Add attunement tracking
CREATE TABLE character_attunements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  attuned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(character_id, item_id)
);

-- Enforce 3 attunement limit
CREATE OR REPLACE FUNCTION check_attunement_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM character_attunements WHERE character_id = NEW.character_id) >= 3 THEN
    RAISE EXCEPTION 'Character can only attune to 3 items at once';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_attunement_limit
BEFORE INSERT ON character_attunements
FOR EACH ROW EXECUTE FUNCTION check_attunement_limit();
```

#### Backend API
```typescript
GET    /v1/characters/:characterId/attunements
  Returns: { attunedItems: MagicItem[], slotsUsed: number, slotsAvailable: number }

POST   /v1/characters/:characterId/attune
  Body: { itemId: string }
  Returns: { success: boolean, attunedItem: MagicItem }

DELETE /v1/characters/:characterId/attune/:itemId
  Returns: { success: boolean }

GET    /v1/magic-items/library
  Query: { rarity?: string, requiresAttunement?: boolean }
  Returns: { items: MagicItem[] }
```

#### Frontend Components
```typescript
// src/features/items/components/magic-items/MagicItemCard.tsx
// - Rarity indicator
// - Attunement requirements
// - Magical properties description
// - Attune/unattune button

// src/features/items/components/magic-items/AttunementPanel.tsx
// - 3 attunement slots visualization
// - Currently attuned items
// - Swap attunement interface
```

#### Tasks
- [ ] Extend inventory schema for magic items
- [ ] Create magic items library (DMG items)
- [ ] Implement attunement service (3-slot limit)
- [ ] Create magic items API endpoints
- [ ] Build `MagicItemCard` component
- [ ] Build `AttunementPanel` component
- [ ] Add magic item effects to combat/abilities
- [ ] Enforce attunement requirements (class, race, alignment)
- [ ] Write unit tests for attunement logic
- [ ] Write integration tests for magic item usage
- [ ] Add E2E test for attuning and using magic item

**Success Criteria:**
- ✅ Attunement limited to 3 items
- ✅ Attunement requirements enforced
- ✅ Magic item properties apply correctly
- ✅ UI clearly shows attunement status

---

## Integration & Polish

### AI DM Integration

All new mechanics must integrate with the existing AI DM system:

```typescript
// Extend dungeon-master-agent.ts

interface GameMechanicsContext {
  combat?: CombatEncounter;
  activeConditions: Condition[];
  recentDamage: DamageLogEntry[];
  spellSlots: SpellSlot[];
  inventory: InventoryItem[];
  reputation: Reputation[];
}

async function generateContextualNarrative(
  action: string,
  mechanics: GameMechanicsContext,
  campaignMemory: Memory[]
): Promise<string> {
  // Generate narrative that incorporates mechanical results
  // Examples:
  // - "The poisoned condition makes you feel weak as you swing your sword."
  // - "Your Harpers reputation earns you a warm welcome in Waterdeep."
  // - "You're running low on spell slots after that fireball."
}
```

### Rules Interpreter Integration

```typescript
// Extend rules-interpreter-agent.ts

async function validateMechanicalAction(
  action: PlayerAction,
  character: Character,
  combat?: CombatEncounter
): Promise<ValidationResult> {
  // Validate:
  // - Does character have required resources (spell slots, etc)?
  // - Is action allowed given conditions (paralyzed can't move)?
  // - Are prerequisites met (weapon proficiency, etc)?

  return {
    valid: boolean,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  };
}
```

---

## Testing Strategy

### Unit Test Examples
```typescript
// tests/combat/initiative.test.ts
describe('Initiative System', () => {
  test('calculates initiative with dexterity modifier', () => {
    const result = calculateInitiative(15, 3); // Roll: 15, DEX mod: +3
    expect(result).toBe(18);
  });

  test('handles advantage on initiative rolls', () => {
    const results = rollInitiativeWithAdvantage(3, true);
    expect(results.rolls.length).toBe(2);
    expect(results.final).toBe(Math.max(...results.rolls) + 3);
  });
});

// tests/combat/damage.test.ts
describe('Damage Calculation', () => {
  test('applies resistance correctly (half damage)', () => {
    const damage = applyDamage(20, 'fire', { resistances: ['fire'] });
    expect(damage).toBe(10);
  });

  test('applies vulnerability correctly (double damage)', () => {
    const damage = applyDamage(20, 'fire', { vulnerabilities: ['fire'] });
    expect(damage).toBe(40);
  });

  test('temp HP shields damage before real HP', () => {
    const result = applyDamageToCharacter(15, { hp: 30, tempHp: 5, maxHp: 30 });
    expect(result.tempHp).toBe(0);
    expect(result.hp).toBe(20);
  });
});

// tests/resources/spell-slots.test.ts
describe('Spell Slot System', () => {
  test('calculates spell slots for level 5 wizard', () => {
    const slots = calculateSpellSlots('Wizard', 5);
    expect(slots).toEqual({
      1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
    });
  });

  test('multiclass spell slots calculated correctly', () => {
    const slots = calculateMulticlassSpellSlots([
      { class: 'Wizard', level: 3 },
      { class: 'Cleric', level: 2 }
    ]);
    expect(slots).toEqual({
      1: 4, 2: 3, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
    });
  });
});
```

### Integration Test Examples
```typescript
// tests/integration/combat-flow.test.ts
describe('Complete Combat Flow', () => {
  test('start combat, deal damage, end combat', async () => {
    // Create session and characters
    const session = await createTestSession();
    const party = await createTestParty(session.id, 4);
    const monsters = await createTestMonsters(2);

    // Start combat
    const combat = await startCombat(session.id, [...party, ...monsters]);
    expect(combat.status).toBe('active');
    expect(combat.participants.length).toBe(6);

    // Roll initiative
    for (const participant of combat.participants) {
      await rollInitiative(combat.id, participant.id);
    }

    // First turn: attack
    const attacker = combat.participants[0];
    const target = combat.participants[5];
    const attackResult = await makeAttack(combat.id, attacker.id, target.id, {
      attackRoll: 18,
      damageRoll: 12
    });
    expect(attackResult.hit).toBe(true);

    // Verify damage applied
    const updatedTarget = await getParticipantStatus(target.id);
    expect(updatedTarget.currentHp).toBeLessThan(updatedTarget.maxHp);

    // End combat
    await endCombat(combat.id);
    const finalCombat = await getCombat(combat.id);
    expect(finalCombat.status).toBe('completed');
  });
});
```

### E2E Test Examples
```typescript
// tests/e2e/combat.spec.ts
import { test, expect } from '@playwright/test';

test('player can run combat encounter', async ({ page }) => {
  await page.goto('/campaigns/test-campaign/sessions/test-session');

  // Start combat
  await page.click('button:has-text("Start Combat")');
  await page.fill('input[name="monsterName"]', 'Goblin');
  await page.click('button:has-text("Add Monster")');
  await page.click('button:has-text("Roll Initiative")');

  // Verify initiative tracker appears
  await expect(page.locator('.initiative-tracker')).toBeVisible();

  // Player's turn: attack
  await page.click('button:has-text("Attack")');
  await page.selectOption('select[name="target"]', 'Goblin');
  await page.click('button:has-text("Roll Attack")');

  // Verify damage applied
  await expect(page.locator('.damage-log')).toContainText('dealt');
  await expect(page.locator('.hp-tracker')).toContainText('HP:');

  // End combat
  await page.click('button:has-text("End Combat")');
  await expect(page.locator('.combat-summary')).toBeVisible();
});
```

---

## Performance Benchmarks

### Target Metrics
- **Database Queries**:
  - Combat state fetch: < 100ms
  - Damage application: < 50ms
  - Initiative calculation: < 50ms per participant
  - Condition check: < 20ms per roll

- **API Endpoints**:
  - GET endpoints: < 200ms (p95)
  - POST endpoints: < 500ms (p95)
  - WebSocket latency: < 100ms

- **Frontend Rendering**:
  - Initiative tracker update: < 100ms
  - Combat log append: < 50ms
  - HP bar animation: 60fps smooth
  - Condition badge render: < 50ms

- **Concurrent Users**:
  - Support 10+ simultaneous combats
  - Real-time sync for 8+ players per combat
  - No memory leaks during long combats (1+ hours)

### Optimization Strategies
- Use database indexes on foreign keys and frequently queried columns
- Implement optimistic UI updates for instant feedback
- Cache participant data during combat (reduce queries)
- Use WebSocket for real-time updates (avoid polling)
- Debounce rapid actions (prevent spam clicking)
- Lazy load combat log history (paginate old entries)

---

## Migration & Rollout Plan

### Phase 1 Release (Combat Foundation)
**Week 1-4:** Initiative, HP, Conditions, Attack Resolution
**Testing:** 1 week of internal testing with D&D group
**Beta Release:** Invite 10-20 beta testers for feedback
**Metrics:** Track bugs, usability issues, performance

### Phase 2 Release (Resources)
**Week 5-7:** Spell Slots, Rest Mechanics, Inventory
**Testing:** 1 week of internal testing
**Beta Expansion:** Invite 50+ testers

### Phase 3 Release (Progression)
**Week 8-10:** XP, Leveling, Multiclassing
**Testing:** 1 week of internal testing
**Public Beta:** Open to all existing users

### Phase 4 Release (World Systems)
**Week 11-12:** Time, Factions, Magic Items
**Testing:** Final polish and bug fixes
**Production Release:** Full launch with documentation

---

## Success Metrics

### User Engagement
- 80%+ of combats use initiative tracker
- 60%+ of players take at least one rest per session
- 40%+ of characters level up using the new system
- 90%+ satisfaction rating for D&D mechanics

### Technical Metrics
- 90%+ test coverage for all mechanics code
- < 5 critical bugs per 1000 combats
- 99.5% uptime for combat systems
- < 200ms average API response time

### Adoption Metrics
- 50%+ of active campaigns use combat system within 1 month
- 30%+ of characters use multiclassing
- 70%+ of magic items are properly attuned
- 80%+ of sessions track in-game time

---

## Dependencies & Prerequisites

### Before Starting Phase 1:
- ✅ Character sheets must support ability score modifiers
- ✅ Dice rolling system must be functional
- ✅ WebSocket infrastructure must be operational
- ✅ Database migrations must be tested in dev/staging

### Before Starting Phase 2:
- ✅ Phase 1 combat system must be stable (< 5 critical bugs)
- ✅ Character classes must be defined with spell progression
- ✅ Rest mechanics must integrate with time tracking

### Before Starting Phase 3:
- ✅ Phase 2 resource management must be stable
- ✅ XP table must be implemented (D&D 5E standard)
- ✅ Class features library must be seeded

### Before Starting Phase 4:
- ✅ Phase 3 progression system must be stable
- ✅ Campaign management must support world-building
- ✅ NPC system must support faction membership

---

## Open Questions & Decisions Needed

1. **Combat Automation Level**: How much should the AI DM automate vs. requiring player input?
   - Option A: Full automation (AI rolls for monsters, applies damage)
   - Option B: Semi-automation (DM rolls, system applies rules)
   - Option C: Manual (players do everything, system just tracks)

2. **Homebrew Support**: Should we allow custom classes, spells, and items?
   - If yes, Phase 1-4 timeline extends by 1-2 weeks for UI/validation

3. **Mobile UX**: Is mobile combat a priority for Phase 1?
   - If yes, requires additional design/testing time

4. **Integration with Existing Characters**: How to migrate existing characters?
   - Need migration script to populate HP, spell slots, features from existing data

5. **Pricing Impact**: Are D&D mechanics gated by subscription tier?
   - Free tier: Basic combat
   - Pro tier: Full mechanics with multiclassing, magic items, etc.

---

## Next Steps

Once this plan is approved:

1. **Kick-off Meeting**: Review plan with team, assign tasks
2. **Database Design Review**: Validate schema with DBA
3. **UI/UX Design Sprint**: Design combat interface mockups
4. **Set Up Testing Infrastructure**: Configure Vitest, Playwright, performance monitoring
5. **Begin Phase 1 Development**: Start with Initiative & Turn Order (1.1)

---

## Appendix: D&D 5E Resources

### Official References
- Player's Handbook (PHB): Core rules, classes, spells
- Dungeon Master's Guide (DMG): Magic items, world-building
- Monster Manual (MM): Creature stat blocks
- Basic Rules (Free): https://www.dndbeyond.com/sources/basic-rules

### Online Tools
- D&D Beyond: https://www.dndbeyond.com
- Roll20 Compendium: https://roll20.net/compendium/dnd5e
- 5e SRD: https://www.5esrd.com

### API/Data Sources
- Open5e API: https://api.open5e.com
- DnD5eAPI: https://www.dnd5eapi.co

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Owner:** Development Team
**Status:** Draft - Pending Approval
