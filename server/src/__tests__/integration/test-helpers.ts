/**
 * Test Helpers
 *
 * Helper functions for creating test data and common operations
 * in integration tests.
 */

import { db } from '../../../../db/client.js';
import {
  campaigns,
  characters,
  characterStats,
  gameSessions,
  npcs,
  combatParticipants,
  weaponAttacks,
  creatureStats,
  type Campaign,
  type Character,
  type CharacterStats,
  type GameSession,
  type NPC,
  type CombatParticipant,
} from '../../../../db/schema/index.js';
import { testCharacters, testMonsters, testSession, testCampaigns, testWeapons, TEST_USER_ID } from './test-fixtures.js';
import { CombatHPService } from '../../services/combat-hp-service.js';

/**
 * Create a test campaign
 */
export async function createTestCampaign(
  campaignData: Partial<typeof testCampaigns.default> = {}
): Promise<Campaign> {
  const [campaign] = await db
    .insert(campaigns)
    .values({
      ...testCampaigns.default,
      ...campaignData,
    } as any)
    .returning();

  if (!campaign) {
    throw new Error('Failed to create test campaign');
  }

  return campaign;
}

/**
 * Create a test character with stats
 */
export async function createTestCharacter(
  characterType: keyof typeof testCharacters,
  overrides: {
    character?: Partial<typeof testCharacters.fighter.character>;
    stats?: Partial<typeof testCharacters.fighter.stats>;
    campaignId?: string;
  } = {}
): Promise<{ character: Character; stats: CharacterStats }> {
  const fixture = testCharacters[characterType];

  // Create character
  const [character] = await db
    .insert(characters)
    .values({
      ...fixture.character,
      ...overrides.character,
      campaignId: overrides.campaignId || null,
    } as any)
    .returning();

  if (!character) {
    throw new Error('Failed to create test character');
  }

  // Create stats
  const [stats] = await db
    .insert(characterStats)
    .values({
      characterId: character.id,
      ...fixture.stats,
      ...overrides.stats,
    } as any)
    .returning();

  if (!stats) {
    throw new Error('Failed to create test character stats');
  }

  return { character, stats };
}

/**
 * Create a test NPC/Monster
 */
export async function createTestNPC(
  monsterType: keyof typeof testMonsters,
  overrides: {
    npc?: Partial<typeof testMonsters.goblin.npc>;
    campaignId?: string;
  } = {}
): Promise<NPC> {
  const fixture = testMonsters[monsterType];

  const [npc] = await db
    .insert(npcs)
    .values({
      ...fixture.npc,
      ...overrides.npc,
      campaignId: overrides.campaignId || null,
      userId: TEST_USER_ID,
    } as any)
    .returning();

  if (!npc) {
    throw new Error('Failed to create test NPC');
  }

  return npc;
}

/**
 * Create a test game session
 */
export async function createTestSession(
  campaignId: string,
  characterId?: string,
  overrides: Partial<typeof testSession> = {}
): Promise<GameSession> {
  const [session] = await db
    .insert(gameSessions)
    .values({
      ...testSession,
      ...overrides,
      campaignId,
      characterId: characterId || null,
    } as any)
    .returning();

  if (!session) {
    throw new Error('Failed to create test session');
  }

  return session;
}

/**
 * Create a weapon attack for a character
 */
export async function createTestWeapon(
  characterId: string,
  weaponType: keyof typeof testWeapons
) {
  const weapon = testWeapons[weaponType];

  const [created] = await db
    .insert(weaponAttacks)
    .values({
      characterId,
      ...weapon,
    } as any)
    .returning();

  return created;
}

/**
 * Create creature stats for a character or NPC
 */
export async function createTestCreatureStats(
  entityId: string,
  entityType: 'character' | 'npc',
  stats: {
    armorClass: number;
    resistances?: string[];
    vulnerabilities?: string[];
    immunities?: string[];
    conditionImmunities?: string[];
  }
) {
  const [created] = await db
    .insert(creatureStats)
    .values({
      characterId: entityType === 'character' ? entityId : null,
      npcId: entityType === 'npc' ? entityId : null,
      armorClass: stats.armorClass,
      resistances: stats.resistances || [],
      vulnerabilities: stats.vulnerabilities || [],
      immunities: stats.immunities || [],
      conditionImmunities: stats.conditionImmunities || [],
    } as any)
    .returning();

  return created;
}

/**
 * Create a combat participant and initialize their HP status
 */
export async function createCombatParticipantWithStatus(
  encounterId: string,
  participantData: {
    characterId?: string;
    npcId?: string;
    name: string;
    participantType: 'player' | 'npc' | 'enemy' | 'monster';
    initiativeModifier: number;
    armorClass: number;
    maxHp: number;
    speed?: number;
    damageResistances?: string[];
    damageImmunities?: string[];
    damageVulnerabilities?: string[];
  }
): Promise<CombatParticipant> {
  // Create participant
  const [participant] = await db
    .insert(combatParticipants)
    .values({
      encounterId,
      characterId: participantData.characterId || null,
      npcId: participantData.npcId || null,
      name: participantData.name,
      participantType: participantData.participantType,
      initiative: 0, // Will be set when rolling initiative
      initiativeModifier: participantData.initiativeModifier,
      turnOrder: 0,
      isActive: true,
      armorClass: participantData.armorClass,
      maxHp: participantData.maxHp,
      speed: participantData.speed || 30,
      damageResistances: participantData.damageResistances || [],
      damageImmunities: participantData.damageImmunities || [],
      damageVulnerabilities: participantData.damageVulnerabilities || [],
    } as any)
    .returning();

  if (!participant) {
    throw new Error('Failed to create combat participant');
  }

  // Initialize HP status
  await CombatHPService.initializeParticipantStatus(
    participant.id,
    participantData.maxHp,
    participantData.maxHp
  );

  return participant;
}

/**
 * Roll initiative for a participant
 */
export function rollInitiative(modifier: number): number {
  const d20 = Math.floor(Math.random() * 20) + 1;
  return d20 + modifier;
}

/**
 * Roll damage dice
 */
export function rollDice(diceNotation: string, bonus: number = 0): number {
  // Parse dice notation like "2d6" or "1d8"
  const match = diceNotation.match(/(\d+)d(\d+)/);
  if (!match) {
    throw new Error(`Invalid dice notation: ${diceNotation}`);
  }

  const [, numDiceStr, dieSizeStr] = match;
  if (!numDiceStr || !dieSizeStr) {
    throw new Error(`Invalid dice notation: ${diceNotation}`);
  }
  const numDice = parseInt(numDiceStr, 10);
  const dieSize = parseInt(dieSizeStr, 10);

  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * dieSize) + 1;
  }

  return total + bonus;
}

/**
 * Roll a d20
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Calculate ability modifier
 */
export function calculateModifier(abilityScore: number): number {
  return Math.floor((abilityScore - 10) / 2);
}

/**
 * Wait for a short time (useful for async operations)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get a random element from an array
 */
export function randomElement<T>(array: T[]): T {
  const element = array[Math.floor(Math.random() * array.length)];
  if (element === undefined) {
    throw new Error('Cannot get random element from empty array');
  }
  return element;
}

/**
 * Create a full test setup with campaign, session, and character
 */
export async function createFullTestSetup(characterType: keyof typeof testCharacters = 'fighter') {
  const campaign = await createTestCampaign();
  const { character, stats } = await createTestCharacter(characterType, {
    campaignId: campaign.id,
  });
  const session = await createTestSession(campaign.id, character.id);

  return {
    campaign,
    character,
    stats,
    session,
  };
}

/**
 * Create a combat scenario with multiple participants
 */
export async function createCombatScenario(
  sessionId: string,
  participants: {
    characters?: Array<keyof typeof testCharacters>;
    monsters?: Array<keyof typeof testMonsters>;
  }
) {
  const { CombatInitiativeService } = await import('../../services/combat-initiative-service.js');

  // Start combat
  const [combat] = await db
    .insert(await import('../../../../db/schema/index.js').then(m => m.combatEncounters))
    .values({
      sessionId,
      status: 'active',
      currentRound: 1,
      currentTurnOrder: 0,
    } as any)
    .returning();

  if (!combat) {
    throw new Error('Failed to create combat encounter');
  }

  const createdParticipants: CombatParticipant[] = [];

  // Add character participants
  if (participants.characters) {
    for (const charType of participants.characters) {
      const fixture = testCharacters[charType];
      const { character } = await createTestCharacter(charType);

      const participant = await createCombatParticipantWithStatus(combat.id, {
        characterId: character.id,
        name: fixture.character.name!,
        participantType: 'player',
        initiativeModifier: calculateModifier(fixture.stats.dexterity ?? 10),
        armorClass: fixture.armorClass,
        maxHp: fixture.maxHp,
        speed: fixture.speed,
      });

      createdParticipants.push(participant);
    }
  }

  // Add monster participants
  if (participants.monsters) {
    for (const monsterType of participants.monsters) {
      const fixture = testMonsters[monsterType];
      const npc = await createTestNPC(monsterType);

      const participant = await createCombatParticipantWithStatus(combat.id, {
        npcId: npc.id,
        name: fixture.npc.name!,
        participantType: 'monster',
        initiativeModifier: fixture.initiativeModifier,
        armorClass: fixture.armorClass,
        maxHp: fixture.maxHp,
        speed: fixture.speed,
      });

      createdParticipants.push(participant);
    }
  }

  return {
    combat,
    participants: createdParticipants,
  };
}
