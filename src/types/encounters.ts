export type EncounterType = 'combat' | 'social' | 'exploration';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'deadly';

export interface PartyMember {
  level: number;
  damageTypes?: string[]; // e.g., ['slashing','fire']
  hasMagicalAttacks?: boolean;
  saveProficiencies?: string[]; // e.g., ['con','wis']
}

export interface PartySnapshot {
  members: PartyMember[];
  size?: number; // derived if omitted
  avgLevel?: number; // derived if omitted
  hpState?: 'fresh' | 'wounded' | 'critical';
  resources?: {
    spellSlotsUsed?: number;
    hitDiceUsed?: number;
    limitedFeaturesUsed?: number;
  };
}

export interface WorldContext {
  biome?: string;
  regionTags?: string[];
  weather?: string;
  factionTags?: string[];
}

export interface EncounterEntityRef {
  ref: string; // e.g., "srd:goblin"
  count: number;
}

export interface EncounterSpec {
  type: EncounterType;
  difficulty: Difficulty;
  xpBudget: number;
  participants: {
    hostiles: EncounterEntityRef[];
    friendlies: EncounterEntityRef[];
  };
  terrain: {
    biome?: string;
    features: string[];
  };
  objectives: string[];
  startState: {
    initiative: 'roll' | 'fixed';
    surprise: boolean;
  };
  lootHooks?: string[];
  followUps?: string[];
  hazards?: Array<{
    id?: string;
    description?: string;
    save?: {
      ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
      dc: number;
      timing: 'start' | 'end' | 'trigger';
    };
  }>;
}

export interface EncounterGenerationInput {
  party: PartySnapshot;
  world: WorldContext;
  requestedDifficulty?: Difficulty;
  type?: EncounterType;
  sessionId?: string;
}

export interface MonsterDef {
  id: string; // srd key
  name: string;
  cr: number;
  xp: number;
  tags?: string[]; // biome/keywords
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
}

export interface EncounterOutcome {
  sessionId: string;
  spec: EncounterSpec;
  result: {
    resourcesUsedEst?: number; // 0..1 fraction of adventuring day resources used
    partyDowned?: number; // count
    flee?: boolean;
  };
}
