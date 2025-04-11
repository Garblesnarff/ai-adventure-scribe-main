import { MemoryType } from '@/components/game/memory/types';

/**
 * Interface for classification pattern
 */
interface ClassificationPattern {
  type: MemoryType;
  patterns: string[];
  contextPatterns: RegExp[];
  importance: number;
}

const locationPatterns: ClassificationPattern = {
  type: 'location',
  patterns: [
    // Named locations and realms
    'village', 'town', 'city', 'realm', 'kingdom', 'land',
    // Structures and buildings
    'castle', 'fortress', 'temple', 'cottage', 'house', 'tavern',
    // Natural locations
    'forest', 'mountain', 'cave', 'valley', 'river',
    // Parts of locations
    'gate', 'door', 'bridge', 'road', 'path',
    // Area descriptors
    'district', 'quarter', 'region', 'area', 'domain',
  ],
  contextPatterns: [
    // Matches "X of Y" where Y is likely a location name
    /(?:village|town|city|realm) of [A-Z][a-z]+/,
    // Matches location descriptions
    /(?:ancient|old|abandoned|sacred|cursed|hidden) (?:temple|fortress|castle|grove)/,
    // Matches named locations
    /[A-Z][a-z]+ (?:Woods|Mountains|Valley|Keep|Castle|Village|Town)/,
  ],
  importance: 7
};

/**
 * Enhanced patterns for character classification
 */
const characterPatterns: ClassificationPattern = {
  type: 'character',
  patterns: [
    // Groups
    'villagers', 'people', 'adventurers', 'citizens', 'folk',
    // Roles and titles
    'elder', 'chief', 'leader', 'merchant', 'guard',
    // Fantasy beings
    'god', 'deity', 'spirit', 'demon', 'dragon',
    // Character descriptors
    'warrior', 'mage', 'priest', 'hero', 'villain',
  ],
  contextPatterns: [
    // Matches "the X" where X is likely a character title
    /the (?:elder|chief|king|queen|lord|lady|wizard)/i,
    // Matches character descriptions
    /(?:wise|old|young|mysterious|brave|dark) (?:wizard|warrior|sage|master)/i,
  ],
  importance: 6
};

/**
 * Enhanced patterns for event classification
 */
const eventPatterns: ClassificationPattern = {
  type: 'event',
  patterns: [
    // Actions
    'quest', 'journey', 'adventure', 'mission', 'task',
    // Combat events
    'battle', 'fight', 'war', 'conflict', 'siege',
    // Story events
    'prophecy', 'revelation', 'discovery', 'ceremony',
    // State changes
    'transformation', 'awakening', 'fall', 'rise',
  ],
  contextPatterns: [
    // Matches event descriptions
    /(?:begin|start|embark|undertake) (?:quest|journey|mission)/i,
    // Matches significant moments
    /(?:ancient|great|terrible|mysterious) (?:battle|war|prophecy)/i,
  ],
  importance: 8
};

/**
 * Enhanced patterns for item classification
 */
const itemPatterns: ClassificationPattern = {
  type: 'item',
  patterns: [
    // Weapons
    'sword', 'blade', 'axe', 'bow', 'shield',
    // Magic items
    'scroll', 'potion', 'ring', 'amulet', 'staff',
    // Quest items
    'artifact', 'relic', 'key', 'map', 'crystal',
    // Common items
    'book', 'tome', 'letter', 'coin', 'gem',
  ],
  contextPatterns: [
    // Matches magical items
    /(?:enchanted|magical|cursed|blessed|ancient) (?:sword|staff|ring|amulet)/i,
    // Matches important items
    /(?:legendary|mythical|powerful|sacred) (?:artifact|weapon|relic)/i,
  ],
  importance: 5
};

/**
 * Enhanced patterns for plot classification
 */
const plotPatterns: ClassificationPattern = {
  type: 'plot',
  patterns: [
    // Story elements
    'plot', 'story', 'narrative', 'arc', 'chapter',
    // Plot developments
    'twist', 'reveal', 'secret', 'mystery', 'development',
    // Story progression
    'climax', 'resolution', 'conclusion', 'outcome',
    // Plot points
    'quest', 'mission', 'objective', 'goal', 'destiny',
  ],
  contextPatterns: [
    // Matches plot developments
    /(?:major|important|crucial|significant) (?:revelation|discovery|development)/i,
    // Matches story progression
    /(?:story|plot|narrative) (?:advances|progresses|unfolds)/i,
    // Matches plot twists
    /(?:unexpected|surprising|dramatic) (?:turn|twist|change)/i,
  ],
  importance: 9
};

export const CLASSIFICATION_PATTERNS: Record<MemoryType, ClassificationPattern> = {
  location: locationPatterns,
  character: characterPatterns,
  event: eventPatterns,
  item: itemPatterns,
  plot: plotPatterns,
  general: {
    type: 'general',
    patterns: [],
    contextPatterns: [],
    importance: 3
  }
};
