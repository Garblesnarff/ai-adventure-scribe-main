# Encounter Services

## Purpose
Encounter generation and orchestration services for creating balanced, contextual D&D encounters including combat, social interactions, and environmental challenges. Provides SRD-compliant monster data and telemetry tracking.

## Key Files
- `encounter-generator.ts` - Main encounter generation service with AI-powered encounter design
- `encounter-orchestrator.ts` - Orchestrates multi-stage encounters and manages encounter flow
- `monster-catalog.ts` - D&D 5e SRD monster database with stats, abilities, and CR ratings
- `social-templates.ts` - Templates for social encounters (negotiations, investigations, roleplay)
- `srd-loader.ts` - Loads and caches SRD monster data from various sources
- `telemetry-client.ts` - Client for posting encounter telemetry to analytics service
- `telemetry.ts` - Encounter telemetry tracking (difficulty, outcomes, player engagement)

## How It Works
The encounter system generates contextually appropriate challenges based on party composition, campaign setting, and narrative context:

**Encounter Generation**: The generator analyzes party level, size, and capabilities to create balanced encounters. It uses the SRD monster catalog combined with AI to select appropriate enemies, adjust difficulty, and create interesting tactical scenarios. Encounters are rated by Challenge Rating (CR) and can include environmental hazards, terrain features, and objectives beyond simple combat.

**Monster Selection**: The monster catalog provides access to hundreds of D&D 5e creatures with complete stat blocks. Monsters are indexed by CR, type (undead, beast, humanoid, etc.), environment, and special abilities. The system can suggest monsters that fit the narrative context or create custom variants.

**Social Encounters**: Templates provide frameworks for non-combat encounters including negotiations, investigations, chases, and social challenges. These templates adapt to character skills and campaign themes.

## Usage Examples
```typescript
// Generate a combat encounter
import encounterGenerator from '@/services/encounters/encounter-generator';

const encounter = await encounterGenerator.generateEncounter({
  partyLevel: 5,
  partySize: 4,
  difficulty: 'medium',
  environment: 'dungeon',
  theme: 'undead'
});

// Access monster data
import { monsterCatalog } from '@/services/encounters/monster-catalog';

const goblin = monsterCatalog.getMonster('goblin');
const mediumMonsters = monsterCatalog.getMonstersByCR(2, 3);

// Post encounter telemetry
import { postEncounterTelemetry } from '@/services/encounters/telemetry-client';

await postEncounterTelemetry({
  encounterId: encounter.id,
  outcome: 'victory',
  duration: 45,
  difficulty: 'medium'
});
```

## Dependencies
- **SRD Data** - D&D 5e System Reference Document
- **AI Service** - For contextual encounter generation
- **Supabase** - Encounter persistence and telemetry storage
- **Combat Services** - For combat mechanics integration

## Related Documentation
- [SRD Documentation](../../data/srd/README.md)
- [Combat Services](../combat/README.md)
- [AI Services](../README.md)
- [Game Session](../../features/game-session/README.md)

## Maintenance Notes
- Monster data must comply with D&D 5e SRD Open Gaming License
- CR calculations follow official D&D encounter building guidelines
- Telemetry helps tune encounter difficulty over time
- Custom monster variants should maintain balanced CR ratings
