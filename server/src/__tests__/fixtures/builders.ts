/**
 * Test Fixture Builders
 *
 * Flexible builder pattern for creating test data with custom values
 */

import type {
  Character,
  CharacterStats,
  CombatEncounter,
  CombatParticipant,
  CombatParticipantStatus,
  InventoryItem,
  LevelProgression,
  ExperienceEvent,
} from '../../../../db/schema/index.js';

/**
 * Builder for Character fixtures
 */
export class CharacterBuilder {
  private character: Partial<Character> = {
    id: `test-char-${Date.now()}`,
    userId: 'test-user-1',
    campaignId: 'test-campaign-1',
    name: 'Test Character',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    experiencePoints: 0,
    alignment: 'Neutral',
    background: 'Folk Hero',
    appearance: 'A generic adventurer',
    personalityTraits: 'Brave and curious',
    imageUrl: null,
    avatarUrl: null,
    backgroundImage: null,
    cantrips: null,
    knownSpells: null,
    preparedSpells: null,
    ritualSpells: null,
    visionTypes: ['normal'],
    obscurement: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withId(id: string): this {
    this.character.id = id;
    return this;
  }

  withName(name: string): this {
    this.character.name = name;
    return this;
  }

  withClass(className: string): this {
    this.character.class = className;
    return this;
  }

  withRace(race: string): this {
    this.character.race = race;
    return this;
  }

  withLevel(level: number): this {
    this.character.level = level;
    return this;
  }

  withExperiencePoints(xp: number): this {
    this.character.experiencePoints = xp;
    return this;
  }

  withAlignment(alignment: string): this {
    this.character.alignment = alignment;
    return this;
  }

  withSpells(cantrips?: string, known?: string, prepared?: string): this {
    this.character.cantrips = cantrips || null;
    this.character.knownSpells = known || null;
    this.character.preparedSpells = prepared || null;
    return this;
  }

  withVision(visionTypes: string[]): this {
    this.character.visionTypes = visionTypes;
    return this;
  }

  build(): Partial<Character> {
    return { ...this.character };
  }
}

/**
 * Builder for CharacterStats fixtures
 */
export class CharacterStatsBuilder {
  private stats: Partial<CharacterStats> = {
    id: `test-stats-${Date.now()}`,
    characterId: 'test-char-1',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withCharacterId(characterId: string): this {
    this.stats.characterId = characterId;
    return this;
  }

  withStrength(str: number): this {
    this.stats.strength = str;
    return this;
  }

  withDexterity(dex: number): this {
    this.stats.dexterity = dex;
    return this;
  }

  withConstitution(con: number): this {
    this.stats.constitution = con;
    return this;
  }

  withIntelligence(int: number): this {
    this.stats.intelligence = int;
    return this;
  }

  withWisdom(wis: number): this {
    this.stats.wisdom = wis;
    return this;
  }

  withCharisma(cha: number): this {
    this.stats.charisma = cha;
    return this;
  }

  withAllStats(str: number, dex: number, con: number, int: number, wis: number, cha: number): this {
    this.stats.strength = str;
    this.stats.dexterity = dex;
    this.stats.constitution = con;
    this.stats.intelligence = int;
    this.stats.wisdom = wis;
    this.stats.charisma = cha;
    return this;
  }

  build(): Partial<CharacterStats> {
    return { ...this.stats };
  }
}

/**
 * Builder for CombatEncounter fixtures
 */
export class CombatEncounterBuilder {
  private encounter: Partial<CombatEncounter> = {
    id: `test-encounter-${Date.now()}`,
    sessionId: 'test-session-1',
    status: 'active',
    currentRound: 1,
    currentTurnOrder: 0,
    location: 'Test Location',
    difficulty: 'medium',
    experienceAwarded: null,
    startedAt: new Date(),
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withId(id: string): this {
    this.encounter.id = id;
    return this;
  }

  withSessionId(sessionId: string): this {
    this.encounter.sessionId = sessionId;
    return this;
  }

  withStatus(status: 'active' | 'paused' | 'completed'): this {
    this.encounter.status = status;
    return this;
  }

  withRound(round: number): this {
    this.encounter.currentRound = round;
    return this;
  }

  withTurnOrder(turnOrder: number): this {
    this.encounter.currentTurnOrder = turnOrder;
    return this;
  }

  withLocation(location: string): this {
    this.encounter.location = location;
    return this;
  }

  withDifficulty(difficulty: 'easy' | 'medium' | 'hard' | 'deadly'): this {
    this.encounter.difficulty = difficulty;
    return this;
  }

  completed(xpAwarded?: number): this {
    this.encounter.status = 'completed';
    this.encounter.endedAt = new Date();
    this.encounter.experienceAwarded = xpAwarded || null;
    return this;
  }

  build(): Partial<CombatEncounter> {
    return { ...this.encounter };
  }
}

/**
 * Builder for CombatParticipant fixtures
 */
export class CombatParticipantBuilder {
  private participant: Partial<CombatParticipant> = {
    id: `test-participant-${Date.now()}`,
    encounterId: 'test-encounter-1',
    characterId: null,
    npcId: null,
    name: 'Test Participant',
    participantType: 'player',
    initiative: 10,
    initiativeModifier: 0,
    turnOrder: 0,
    isActive: true,
    armorClass: 10,
    maxHp: 10,
    speed: 30,
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
    multiclassInfo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withId(id: string): this {
    this.participant.id = id;
    return this;
  }

  withEncounterId(encounterId: string): this {
    this.participant.encounterId = encounterId;
    return this;
  }

  withCharacterId(characterId: string): this {
    this.participant.characterId = characterId;
    this.participant.npcId = null;
    return this;
  }

  withNpcId(npcId: string): this {
    this.participant.npcId = npcId;
    this.participant.characterId = null;
    return this;
  }

  withName(name: string): this {
    this.participant.name = name;
    return this;
  }

  withType(type: 'player' | 'npc' | 'enemy' | 'monster'): this {
    this.participant.participantType = type;
    return this;
  }

  withInitiative(initiative: number, modifier?: number): this {
    this.participant.initiative = initiative;
    if (modifier !== undefined) {
      this.participant.initiativeModifier = modifier;
    }
    return this;
  }

  withTurnOrder(turnOrder: number): this {
    this.participant.turnOrder = turnOrder;
    return this;
  }

  withAC(ac: number): this {
    this.participant.armorClass = ac;
    return this;
  }

  withHp(maxHp: number): this {
    this.participant.maxHp = maxHp;
    return this;
  }

  withSpeed(speed: number): this {
    this.participant.speed = speed;
    return this;
  }

  withResistances(resistances: string[]): this {
    this.participant.damageResistances = resistances;
    return this;
  }

  withImmunities(immunities: string[]): this {
    this.participant.damageImmunities = immunities;
    return this;
  }

  withVulnerabilities(vulnerabilities: string[]): this {
    this.participant.damageVulnerabilities = vulnerabilities;
    return this;
  }

  inactive(): this {
    this.participant.isActive = false;
    return this;
  }

  build(): Partial<CombatParticipant> {
    return { ...this.participant };
  }
}

/**
 * Builder for CombatParticipantStatus fixtures
 */
export class CombatParticipantStatusBuilder {
  private status: Partial<CombatParticipantStatus> = {
    id: `test-status-${Date.now()}`,
    participantId: 'test-participant-1',
    currentHp: 10,
    maxHp: 10,
    tempHp: 0,
    isConscious: true,
    deathSavesSuccesses: 0,
    deathSavesFailures: 0,
    updatedAt: new Date(),
  };

  withParticipantId(participantId: string): this {
    this.status.participantId = participantId;
    return this;
  }

  withHp(currentHp: number, maxHp?: number): this {
    this.status.currentHp = currentHp;
    if (maxHp !== undefined) {
      this.status.maxHp = maxHp;
    }
    return this;
  }

  withTempHp(tempHp: number): this {
    this.status.tempHp = tempHp;
    return this;
  }

  unconscious(): this {
    this.status.isConscious = false;
    this.status.currentHp = 0;
    return this;
  }

  withDeathSaves(successes: number, failures: number): this {
    this.status.deathSavesSuccesses = successes;
    this.status.deathSavesFailures = failures;
    return this;
  }

  build(): Partial<CombatParticipantStatus> {
    return { ...this.status };
  }
}

/**
 * Builder for InventoryItem fixtures
 */
export class InventoryItemBuilder {
  private item: Partial<InventoryItem> = {
    id: `test-item-${Date.now()}`,
    characterId: 'test-char-1',
    name: 'Test Item',
    itemType: 'equipment',
    quantity: 1,
    weight: '1',
    description: 'A test item',
    properties: null,
    isEquipped: false,
    isAttuned: false,
    requiresAttunement: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withCharacterId(characterId: string): this {
    this.item.characterId = characterId;
    return this;
  }

  withName(name: string): this {
    this.item.name = name;
    return this;
  }

  withType(itemType: 'weapon' | 'armor' | 'consumable' | 'ammunition' | 'equipment' | 'treasure'): this {
    this.item.itemType = itemType;
    return this;
  }

  withQuantity(quantity: number): this {
    this.item.quantity = quantity;
    return this;
  }

  withWeight(weight: string): this {
    this.item.weight = weight;
    return this;
  }

  equipped(): this {
    this.item.isEquipped = true;
    return this;
  }

  attuned(): this {
    this.item.isAttuned = true;
    this.item.requiresAttunement = true;
    return this;
  }

  requiresAttunement(): this {
    this.item.requiresAttunement = true;
    return this;
  }

  withProperties(properties: any): this {
    this.item.properties = JSON.stringify(properties);
    return this;
  }

  build(): Partial<InventoryItem> {
    return { ...this.item };
  }
}

/**
 * Builder for LevelProgression fixtures
 */
export class LevelProgressionBuilder {
  private progression: Partial<LevelProgression> = {
    characterId: 'test-char-1',
    currentLevel: 1,
    currentXp: 0,
    xpToNextLevel: 300,
    totalXp: 0,
    lastLevelUp: null,
    updatedAt: new Date(),
  };

  withCharacterId(characterId: string): this {
    this.progression.characterId = characterId;
    return this;
  }

  withLevel(level: number): this {
    this.progression.currentLevel = level;
    return this;
  }

  withXp(currentXp: number, totalXp?: number): this {
    this.progression.currentXp = currentXp;
    this.progression.totalXp = totalXp !== undefined ? totalXp : currentXp;
    return this;
  }

  withXpToNextLevel(xpToNextLevel: number): this {
    this.progression.xpToNextLevel = xpToNextLevel;
    return this;
  }

  withLastLevelUp(date: Date): this {
    this.progression.lastLevelUp = date;
    return this;
  }

  build(): Partial<LevelProgression> {
    return { ...this.progression };
  }
}

/**
 * Builder for ExperienceEvent fixtures
 */
export class ExperienceEventBuilder {
  private event: Partial<ExperienceEvent> = {
    id: `test-xp-event-${Date.now()}`,
    characterId: 'test-char-1',
    sessionId: 'test-session-1',
    xpGained: 100,
    source: 'combat',
    description: 'Test XP gain',
    timestamp: new Date(),
  };

  withCharacterId(characterId: string): this {
    this.event.characterId = characterId;
    return this;
  }

  withSessionId(sessionId: string): this {
    this.event.sessionId = sessionId;
    return this;
  }

  withXp(xpGained: number): this {
    this.event.xpGained = xpGained;
    return this;
  }

  withSource(source: 'combat' | 'quest' | 'roleplay' | 'milestone' | 'other'): this {
    this.event.source = source;
    return this;
  }

  withDescription(description: string): this {
    this.event.description = description;
    return this;
  }

  build(): Partial<ExperienceEvent> {
    return { ...this.event };
  }
}
