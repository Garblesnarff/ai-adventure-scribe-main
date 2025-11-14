import type { MemoryType } from '@/components/game/memory/types';

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
    'village',
    'town',
    'city',
    'realm',
    'kingdom',
    'land',
    // Structures and buildings
    'castle',
    'fortress',
    'temple',
    'cottage',
    'house',
    'tavern',
    // Natural locations
    'forest',
    'mountain',
    'cave',
    'valley',
    'river',
    // Parts of locations
    'gate',
    'door',
    'bridge',
    'road',
    'path',
    // Area descriptors
    'district',
    'quarter',
    'region',
    'area',
    'domain',
  ],
  contextPatterns: [
    // Matches "X of Y" where Y is likely a location name
    /(?:village|town|city|realm) of [A-Z][a-z]+/,
    // Matches location descriptions
    /(?:ancient|old|abandoned|sacred|cursed|hidden) (?:temple|fortress|castle|grove)/,
    // Matches named locations
    /[A-Z][a-z]+ (?:Woods|Mountains|Valley|Keep|Castle|Village|Town)/,
  ],
  importance: 7,
};

/**
 * Enhanced patterns for NPC classification
 */
const npcPatterns: ClassificationPattern = {
  type: 'npc',
  patterns: [
    // Named NPCs and specific individuals
    'npc',
    'character',
    'person',
    'individual',
    'figure',
    // Common fantasy titles
    'king',
    'queen',
    'lord',
    'lady',
    // Roles and titles
    'elder',
    'chief',
    'leader',
    'merchant',
    'guard',
    'innkeeper',
    // Fantasy beings
    'wizard',
    'sage',
    'oracle',
    'spirit',
    'demon',
    'dragon',
    // Character descriptors
    'warrior',
    'mage',
    'priest',
    'hero',
    'villain',
    'stranger',
  ],
  contextPatterns: [
    // Matches "the X" where X is likely a character title
    /the\s+(?:\w+\s+)?(?:elder|chief|king|queen|lord|lady|wizard|innkeeper|merchant)/i,
    // Matches character descriptions
    /(?:wise|old|young|mysterious|brave|dark) (?:wizard|warrior|sage|master|stranger)/i,
    // Matches character names with titles
    /[A-Z][a-z]+ the (?:Elder|Wise|Bold|Great)/i,
  ],
  importance: 6,
};

/**
 * Enhanced patterns for event classification
 */
const eventPatterns: ClassificationPattern = {
  type: 'event',
  patterns: [
    // Actions
    'quest',
    'journey',
    'adventure',
    'mission',
    'task',
    // Combat events
    'battle',
    'fight',
    'war',
    'conflict',
    'siege',
    // Story events
    'prophecy',
    'revelation',
    'discovery',
    'ceremony',
    // State changes
    'transformation',
    'awakening',
    'fall',
    'rise',
  ],
  contextPatterns: [
    // Matches event descriptions
    /(?:begin|start|embark|undertake) (?:quest|journey|mission)/i,
    // Matches significant moments
    /(?:ancient|great|terrible|mysterious) (?:battle|war|prophecy)/i,
  ],
  importance: 8,
};

/**
 * Enhanced patterns for item classification
 */
const itemPatterns: ClassificationPattern = {
  type: 'item',
  patterns: [
    // Weapons
    'sword',
    'blade',
    'axe',
    'bow',
    'shield',
    // Magic items
    'scroll',
    'potion',
    'ring',
    'amulet',
    'staff',
    // Quest items
    'artifact',
    'relic',
    'key',
    'map',
    'crystal',
    // Common items
    'book',
    'tome',
    'letter',
    'coin',
    'gem',
  ],
  contextPatterns: [
    // Matches magical items
    /(?:enchanted|magical|cursed|blessed|ancient) (?:sword|staff|ring|amulet)/i,
    // Matches important items
    /(?:legendary|mythical|powerful|sacred) (?:artifact|weapon|relic)/i,
  ],
  importance: 5,
};

/**
 * Enhanced patterns for quest classification
 */
const questPatterns: ClassificationPattern = {
  type: 'quest',
  patterns: [
    // Quest keywords
    'quest',
    'mission',
    'task',
    'assignment',
    'objective',
    // Quest types
    'journey',
    'expedition',
    'adventure',
    'trial',
    'test',
    // Quest elements
    'retrieve',
    'deliver',
    'rescue',
    'defeat',
    'find',
    // Quest rewards
    'reward',
    'treasure',
    'blessing',
    'boon',
    'payment',
  ],
  contextPatterns: [
    // Matches quest beginnings
    /(?:begin|start|embark|undertake) (?:quest|mission|journey)/i,
    // Matches quest objectives
    /(?:must|need to|have to) (?:find|retrieve|deliver|defeat|rescue)/i,
    // Matches quest completion
    /(?:complete|finish|accomplish|succeed) (?:quest|mission|task)/i,
  ],
  importance: 8,
};

/**
 * Enhanced patterns for story beat classification
 */
const storyBeatPatterns: ClassificationPattern = {
  type: 'story_beat',
  patterns: [
    // Story structure
    'beat',
    'moment',
    'scene',
    'sequence',
    'chapter',
    // Dramatic moments
    'climax',
    'turning point',
    'revelation',
    'confrontation',
    // Pacing elements
    'tension',
    'suspense',
    'buildup',
    'payoff',
    'resolution',
    // Story beats
    'inciting incident',
    'call to action',
    'point of no return',
  ],
  contextPatterns: [
    // Matches dramatic moments
    /(?:dramatic|pivotal|crucial|defining) (?:moment|scene|confrontation)/i,
    // Matches story progression
    /(?:story|narrative) (?:builds|escalates|reaches|climaxes)/i,
    // Matches beat descriptions
    /(?:key|important|significant) (?:beat|moment|development)/i,
  ],
  importance: 7,
};

/**
 * Enhanced patterns for character moment classification
 */
const characterMomentPatterns: ClassificationPattern = {
  type: 'character_moment',
  patterns: [
    // Character development
    'growth',
    'change',
    'development',
    'evolution',
    'transformation',
    // Emotional moments
    'realization',
    'epiphany',
    'breakthrough',
    'awakening',
    // Character interactions
    'bonding',
    'conflict',
    'reconciliation',
    'betrayal',
    // Personal moments
    'decision',
    'choice',
    'sacrifice',
    'courage',
    'fear',
  ],
  contextPatterns: [
    // Matches character growth
    /(?:character|player) (?:grows|learns|realizes|understands)/i,
    // Matches emotional moments
    /(?:feels|experiences|realizes|discovers) (?:fear|courage|love|anger)/i,
    // Matches defining moments
    /(?:defining|pivotal|life-changing) (?:moment|decision|choice)/i,
  ],
  importance: 6,
};

/**
 * Enhanced patterns for dialogue gem classification
 */
const dialogueGemPatterns: ClassificationPattern = {
  type: 'dialogue_gem',
  patterns: [
    // Memorable dialogue
    'quote',
    'saying',
    'words',
    'speech',
    'declaration',
    // Dialogue types
    'wisdom',
    'wit',
    'humor',
    'threat',
    'promise',
    // Speech acts
    'prophecy',
    'curse',
    'blessing',
    'warning',
    'advice',
    // Memorable phrases
    'catchphrase',
    'motto',
    'rallying cry',
    'final words',
  ],
  contextPatterns: [
    // Matches quoted speech
    /"[^"]*"/,
    // Matches memorable dialogue
    /(?:memorably|wisely|boldly|dramatically) (?:said|declared|proclaimed)/i,
    // Matches significant speech
    /(?:famous|legendary|prophetic|wise) (?:words|quote|saying)/i,
  ],
  importance: 5,
};

/**
 * Enhanced patterns for plot point classification
 */
const plotPointPatterns: ClassificationPattern = {
  type: 'plot_point',
  patterns: [
    // Plot structure
    'plot point',
    'development',
    'twist',
    'reveal',
    'discovery',
    // Story progression
    'advancement',
    'progression',
    'escalation',
    'complication',
    // Plot elements
    'conflict',
    'resolution',
    'obstacle',
    'solution',
    'breakthrough',
    // Narrative beats
    'setup',
    'payoff',
    'callback',
    'foreshadowing',
    'culmination',
  ],
  contextPatterns: [
    // Matches plot developments
    /(?:plot|story) (?:thickens|develops|advances|progresses)/i,
    // Matches significant developments
    /(?:major|significant|crucial) (?:development|revelation|discovery)/i,
    // Matches plot points
    /(?:first|second|third) (?:act|plot point)/i,
  ],
  importance: 8,
};

/**
 * Enhanced patterns for foreshadowing classification
 */
const foreshadowingPatterns: ClassificationPattern = {
  type: 'foreshadowing',
  patterns: [
    // Foreshadowing elements
    'foreshadowing',
    'hint',
    'clue',
    'omen',
    'portent',
    // Predictive elements
    'prophecy',
    'vision',
    'dream',
    'premonition',
    'sign',
    // Symbolic elements
    'symbol',
    'metaphor',
    'allegory',
    'parallel',
    'echo',
    // Setup elements
    'setup',
    'plant',
    'seed',
    'foundation',
    'groundwork',
  ],
  contextPatterns: [
    // Matches prophetic language
    /(?:foretells|predicts|hints at|suggests) (?:future|coming|eventual)/i,
    // Matches ominous signs
    /(?:ominous|dark|mysterious|prophetic) (?:sign|omen|portent)/i,
    // Matches symbolic elements
    /(?:symbolic|metaphoric|allegorical) (?:meaning|significance)/i,
  ],
  importance: 6,
};

/**
 * Enhanced patterns for world detail classification
 */
const worldDetailPatterns: ClassificationPattern = {
  type: 'world_detail',
  patterns: [
    // World building
    'lore',
    'history',
    'legend',
    'myth',
    'tradition',
    // Cultural elements
    'culture',
    'custom',
    'ritual',
    'ceremony',
    'practice',
    // World systems
    'magic',
    'politics',
    'economy',
    'religion',
    'society',
    // Environmental details
    'geography',
    'climate',
    'ecology',
    'natural phenomena',
  ],
  contextPatterns: [
    // Matches world building
    /(?:ancient|legendary|mythical) (?:history|lore|tradition)/i,
    // Matches cultural details
    /(?:local|regional|cultural) (?:custom|tradition|practice)/i,
    // Matches world systems
    /(?:magic|political|religious|social) (?:system|structure|order)/i,
  ],
  importance: 5,
};

/**
 * Enhanced patterns for atmosphere classification
 */
const atmospherePatterns: ClassificationPattern = {
  type: 'atmosphere',
  patterns: [
    // Mood and tone
    'atmosphere',
    'mood',
    'tone',
    'feeling',
    'ambiance',
    // Emotional atmosphere
    'tension',
    'suspense',
    'dread',
    'wonder',
    'mystery',
    // Environmental atmosphere
    'eeriness',
    'serenity',
    'chaos',
    'peace',
    'danger',
    // Sensory elements
    'sight',
    'sound',
    'smell',
    'touch',
    'taste',
  ],
  contextPatterns: [
    // Matches atmospheric descriptions
    /(?:air|atmosphere) (?:thick with|heavy with|filled with)/i,
    // Matches mood settings
    /(?:tense|peaceful|mysterious|ominous) (?:atmosphere|mood|feeling)/i,
    // Matches sensory atmosphere
    /(?:sounds|smells|feels) (?:of|like) (?:\w+)/i,
  ],
  importance: 4,
};

export const CLASSIFICATION_PATTERNS: Record<MemoryType, ClassificationPattern> = {
  general: {
    type: 'general',
    patterns: [],
    contextPatterns: [],
    importance: 3,
  },
  npc: npcPatterns,
  location: locationPatterns,
  quest: questPatterns,
  item: itemPatterns,
  event: eventPatterns,
  story_beat: storyBeatPatterns,
  character_moment: characterMomentPatterns,
  world_detail: worldDetailPatterns,
  dialogue_gem: dialogueGemPatterns,
  atmosphere: atmospherePatterns,
  plot_point: plotPointPatterns,
  foreshadowing: foreshadowingPatterns,
};
