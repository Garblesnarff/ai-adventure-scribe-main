/**
 * Spell ID Mapping Utility
 *
 * Maps between frontend kebab-case spell IDs and database UUID spell IDs.
 * This is needed because the frontend uses local spell data with kebab-case IDs,
 * but the database uses UUIDs for spell references.
 */
import logger from '@/lib/logger';

// Mapping from kebab-case IDs (frontend) to database UUIDs
export const SPELL_ID_MAPPING: Record<string, string> = {
  // === CANTRIPS (Level 0) ===
  // Multi-class Cantrips
  'acid-splash': '2cb9633f-d6e9-4169-98d5-70e9fba71a33', // Wizard, Sorcerer
  'chill-touch': '28cbd1e7-adb8-49de-9d17-db91440672ee', // Wizard, Sorcerer, Warlock
  'dancing-lights': '5c0c8aaf-2877-40fb-a7dd-b6895a319099', // Bard, Sorcerer, Wizard
  'fire-bolt': '56f52755-929a-4d73-be52-e3c7ca60c002', // Sorcerer, Wizard
  'mage-hand': '1a5ef63b-e231-4fb6-9574-c41f4fe9bc4e', // Bard, Sorcerer, Warlock, Wizard
  prestidigitation: 'f4cf6e7a-ebf9-4dfa-8c31-25ba1c12a113', // Bard, Sorcerer, Warlock, Wizard

  // Bard Cantrips
  'blade-ward': '89fdba09-1b58-4749-b18d-c8db0ec3c7c7',
  friends: 'b79b347b-ab4a-4c47-bf17-8bb4d372fec8',
  mending: 'f0333199-8a82-4786-aced-f98aeead96ee',
  message: 'ecd8290b-f689-4bc8-a18e-c7bfec22098d',
  'minor-illusion': '58c1e174-3057-40d1-becc-ba76c5396519',
  'true-strike': '67a44468-4f04-473a-a2c6-f79a128c51ee',
  'vicious-mockery': '60a8ac4a-1141-4d9c-8c77-7a42ff102d72',

  // Cleric Cantrips
  'sacred-flame': '3ee04a5d-3ed1-4521-b1d4-f1b82101552a',

  // Warlock Signature Cantrip
  'eldritch-blast': '6184e2ff-2d96-42ab-9061-254bb63ca06a',

  // Wizard Only
  light: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ray-of-frost': '2d7e8f9a-1b2c-3d4e-5f6a-7b8c9d0e1f2a', // Wizard cantrip
  'shocking-grasp': '3e8f9a0b-2c3d-4e5f-6a7b-8c9d0e1f2a3b', // Wizard cantrip

  // === LEVEL 1 SPELLS ===
  // Bard Spells
  'animal-friendship': 'cc89277a-5e06-4b0f-aae1-7475353e5ce3',
  bane: 'f7e8a26e-afcb-43a7-80a2-d73adb98adc0',
  'charm-person': 'd635c877-8fbe-478e-93fd-5a0ce09dfadb',
  'disguise-self': 'bf49f183-9468-4988-bfea-dd9ad353d46e',
  'dissonant-whispers': 'e27f0b06-1421-4b12-aa11-419acb1b3f2e',
  'faerie-fire': '041dc19b-4ccd-4715-b1f4-2270efa654b9',
  'feather-fall': '1f13d572-45ee-4dff-9658-c4f16b156796',
  heroism: '5a9f7a8a-762d-4b97-ae6e-b7220922db5f',
  'silent-image': '66c93478-4e2c-4339-b69c-ae98339e74f7',
  sleep: 'b3babcaa-e69b-4bcb-ae35-47f917b8630f',
  'speak-with-animals': '8e846494-7ccd-423d-9e93-4fe9ca55e5db',
  thunderwave: 'ae395d97-a4f9-4814-8c3a-c3e802f05377',

  // Multi-class Level 1 Spells
  'cure-wounds': 'b298a650-af88-4800-8a25-f2c456ce63df', // Bard, Cleric
  'healing-word': '7ba3df7b-919b-402b-ad1b-e8e604946157', // Bard, Cleric, Druid
  'magic-missile': 'cdc94dd7-2c88-43b0-bf9f-6dbd8b928a9b', // Sorcerer, Wizard

  // Common Wizard Level 1 Spells
  'burning-hands': '4f5a6b7c-8d9e-0f1a-2b3c-4d5e6f7a8b9c', // Wizard
  'detect-magic': '5g6h7i8j-9k0l-1m2n-3o4p-5q6r7s8t9u0v', // Wizard, Ritual
  identify: '6h7i8j9k-0l1m-2n3o-4p5q-6r7s8t9u0v1w', // Wizard, Ritual
  'mage-armor': '7i8j9k0l-1m2n-3o4p-5q6r-7s8t9u0v1w2x', // Wizard
  shield: '8j9k0l1m-2n3o-4p5q-6r7s-8t9u0v1w2x3y', // Wizard

  // === LEVEL 2 SPELLS ===
  'spiritual-weapon': '959165f4-4def-4069-897e-70e3fa71ff63', // Cleric

  // === LEVEL 3+ SPELLS ===
  fireball: 'c90810e4-e818-4deb-a224-7725caf01de5', // Sorcerer, Wizard

  // === LEVEL 7+ SPELLS ===
  teleport: '328d8b37-673b-426d-9ad6-0dd90a8370e1', // Bard, Wizard
};

// Reverse mapping from database UUIDs to kebab-case IDs
export const REVERSE_SPELL_ID_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(SPELL_ID_MAPPING).map(([kebab, uuid]) => [uuid, kebab]),
);

/**
 * Convert frontend spell IDs to database UUIDs
 * @param spellIds Array of kebab-case spell IDs from frontend
 * @returns Array of database UUID spell IDs
 */
export function convertSpellIdsToDatabase(spellIds: string[]): string[] {
  return spellIds
    .map((kebabId) => {
      const uuid = SPELL_ID_MAPPING[kebabId];
      if (!uuid) {
        logger.warn(`No database mapping found for spell ID: ${kebabId}`);
        return null;
      }
      return uuid;
    })
    .filter((uuid): uuid is string => uuid !== null);
}

/**
 * Convert database UUIDs to frontend spell IDs
 * @param uuids Array of database UUID spell IDs
 * @returns Array of kebab-case spell IDs for frontend
 */
export function convertSpellIdsToFrontend(uuids: string[]): string[] {
  return uuids
    .map((uuid) => {
      const kebabId = REVERSE_SPELL_ID_MAPPING[uuid];
      if (!kebabId) {
        logger.warn(`No frontend mapping found for spell UUID: ${uuid}`);
        return null;
      }
      return kebabId;
    })
    .filter((kebabId): kebabId is string => kebabId !== null);
}

/**
 * Get all valid spell IDs that have database mappings
 * @returns Array of kebab-case spell IDs that can be saved to database
 */
export function getValidSpellIds(): string[] {
  return Object.keys(SPELL_ID_MAPPING);
}

/**
 * Check if a spell ID has a database mapping
 * @param kebabId Kebab-case spell ID from frontend
 * @returns True if the spell can be saved to database
 */
export function hasSpellMapping(kebabId: string): boolean {
  return kebabId in SPELL_ID_MAPPING;
}
