/**
 * Combat Detection Utilities
 *
 * Analyzes DM responses and player actions to detect combat scenarios
 * and automatically initialize combat encounters
 */

import type { CombatParticipant } from '@/types/combat';

export interface CombatDetectionResult {
  isCombat: boolean;
  combatType: 'initiative' | 'attack' | 'spell_cast' | 'damage_taken' | 'none';
  confidence: number; // 0-1
  enemies?: DetectedEnemy[];
  combatActions?: DetectedCombatAction[];
  shouldStartCombat: boolean;
  shouldEndCombat: boolean;
}

export interface DetectedEnemy {
  name: string;
  type: 'mech' | 'humanoid' | 'beast' | 'undead' | 'dragon' | 'construct' | 'unknown';
  estimatedCR: string;
  description: string;
  suggestedHP: number;
  suggestedAC: number;
}

export interface DetectedCombatAction {
  actor: string;
  action: string;
  target?: string;
  weapon?: string;
  damage?: string;
  rollNeeded: boolean;
  rollType: 'attack' | 'damage' | 'save' | 'skill';
}

/**
 * Combat trigger keywords organized by category
 */
const COMBAT_KEYWORDS = {
  // Direct combat initiation
  initiative: [
    'roll initiative',
    'initiative order',
    'combat begins',
    'battle starts',
    'turn order',
    'who goes first',
    'initiative count',
  ],

  // Attack actions
  attacks: [
    'attacks',
    'strikes',
    'swings',
    'fires',
    'shoots',
    'lunges',
    'makes an attack',
    'weapon attack',
    'melee attack',
    'ranged attack',
    'attempts to hit',
    'tries to strike',
  ],

  // Spell casting
  spellcasting: [
    'casts',
    'conjures',
    'invokes',
    'channels',
    'spell attack',
    'magic missile',
    'fireball',
    'lightning bolt',
    'healing word',
    'sacred flame',
    'eldritch blast',
  ],

  // Damage and effects
  damage: [
    'takes damage',
    'deals damage',
    'hit points',
    'HP',
    'wounded',
    'injured',
    'bleeding',
    'unconscious',
    'knocked out',
  ],

  // Combat creatures/enemies
  enemies: [
    'mech',
    'robot',
    'automaton',
    'guard',
    'soldier',
    'bandit',
    'goblin',
    'orc',
    'troll',
    'dragon',
    'skeleton',
    'zombie',
    'cultist',
    'assassin',
    'warrior',
  ],

  // Combat ending
  endings: [
    'combat ends',
    'battle over',
    'enemies defeated',
    'victory',
    'retreat',
    'flee',
    'escape',
    'surrender',
    'unconscious',
    'all enemies dead',
    'threat eliminated',
  ],
};

/**
 * Enemy stat templates for common creature types
 */
const ENEMY_TEMPLATES = {
  mech: { hp: 45, ac: 16, cr: '2' },
  humanoid: { hp: 25, ac: 14, cr: '1' },
  beast: { hp: 30, ac: 12, cr: '1' },
  undead: { hp: 22, ac: 13, cr: '1/2' },
  dragon: { hp: 200, ac: 18, cr: '10' },
  construct: { hp: 60, ac: 17, cr: '3' },
  unknown: { hp: 30, ac: 14, cr: '1' },
};

/**
 * Detect combat scenarios from DM text
 */
export function detectCombatFromText(text: string, context?: unknown): CombatDetectionResult {
  const lowerText = text.toLowerCase();
  let combatScore = 0;
  let combatType: CombatDetectionResult['combatType'] = 'none';
  const enemies: DetectedEnemy[] = [];
  let combatActions: DetectedCombatAction[] = [];
  let shouldStartCombat = false;
  let hasDirectCombatCue = false;
  let shouldEndCombat = false;

  // Check for initiative keywords
  if (COMBAT_KEYWORDS.initiative.some((keyword) => lowerText.includes(keyword))) {
    combatScore += 0.9;
    combatType = 'initiative';
    hasDirectCombatCue = true;
  }

  // Check for attack keywords
  if (COMBAT_KEYWORDS.attacks.some((keyword) => lowerText.includes(keyword))) {
    combatScore += 0.7;
    if (combatType === 'none') combatType = 'attack';
    hasDirectCombatCue = true;
  }

  // Check for spellcasting
  if (COMBAT_KEYWORDS.spellcasting.some((keyword) => lowerText.includes(keyword))) {
    combatScore += 0.6;
    if (combatType === 'none') combatType = 'spell_cast';
    hasDirectCombatCue = true;
  }

  // Check for damage
  if (COMBAT_KEYWORDS.damage.some((keyword) => lowerText.includes(keyword))) {
    combatScore += 0.5;
    if (combatType === 'none') combatType = 'damage_taken';
    hasDirectCombatCue = true;
  }

  // Check for enemies
  for (const enemy of COMBAT_KEYWORDS.enemies) {
    if (lowerText.includes(enemy)) {
      combatScore += 0.2; // Mentioning enemies alone shouldn't trigger combat

      // Extract enemy information
      const enemyType = enemy as keyof typeof ENEMY_TEMPLATES;
      const template = ENEMY_TEMPLATES[enemyType] || ENEMY_TEMPLATES.unknown;

      enemies.push({
        name: enemy.charAt(0).toUpperCase() + enemy.slice(1),
        type: enemyType,
        estimatedCR: template.cr,
        description: `A ${enemy} encountered in combat`,
        suggestedHP: template.hp,
        suggestedAC: template.ac,
      });
    }
  }

  // Check for combat ending
  if (COMBAT_KEYWORDS.endings.some((keyword) => lowerText.includes(keyword))) {
    combatScore += 0.3;
    shouldEndCombat = true;
    shouldStartCombat = false;
  }

  // Detect combat actions in the text
  combatActions = detectCombatActions(text);
  if (combatActions.length > 0) {
    combatScore += 0.3 * combatActions.length;
    hasDirectCombatCue = true;
  }

  // Stealth/avoidance override: if text is clearly about stealth and no direct combat cue, don't start combat
  const stealthCues = [
    'stealth',
    'sneak',
    'hide',
    'hidden',
    'unseen',
    'shadows',
    'quietly',
    'listen',
    'avoid',
  ];
  const hasStealthCue = stealthCues.some((k) => lowerText.includes(k));
  if (hasStealthCue && !hasDirectCombatCue) {
    combatScore = Math.min(combatScore, 0.2);
  }

  // Final scoring
  const confidence = Math.min(combatScore, 1.0);
  const isCombat = confidence >= 0.5;

  // Decide if combat should start: requires direct cues (attacks/initiative/spell/damage) or very strong signal
  shouldStartCombat = hasDirectCombatCue && isCombat;

  return {
    isCombat,
    combatType,
    confidence,
    enemies: enemies.length > 0 ? enemies : undefined,
    combatActions: combatActions.length > 0 ? combatActions : undefined,
    shouldStartCombat,
    shouldEndCombat,
  };
}

/**
 * Detect specific combat actions that need dice rolls
 */
function detectCombatActions(text: string): DetectedCombatAction[] {
  const actions: DetectedCombatAction[] = [];
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase().trim();

    // Attack actions
    if (lowerSentence.includes('attacks') || lowerSentence.includes('strikes')) {
      const action = extractAction(sentence, 'attack');
      if (action) actions.push(action);
    }

    // Spell casting
    if (lowerSentence.includes('casts') || lowerSentence.includes('spell')) {
      const action = extractAction(sentence, 'spell');
      if (action) actions.push(action);
    }

    // Damage dealing
    if (lowerSentence.includes('damage') || lowerSentence.includes('hit points')) {
      const action = extractAction(sentence, 'damage');
      if (action) actions.push(action);
    }
  }

  return actions;
}

/**
 * Extract combat action details from a sentence
 */
function extractAction(sentence: string, actionType: string): DetectedCombatAction | null {
  // Simple extraction - in a real implementation, this could use NLP
  const words = sentence.split(' ');
  let actor = 'Unknown';
  const target = '';
  let weapon = '';

  // Try to find actor (usually first entity mentioned)
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (COMBAT_KEYWORDS.enemies.includes(word)) {
      actor = word.charAt(0).toUpperCase() + word.slice(1);
      break;
    }
  }

  // Try to find weapon
  const weaponKeywords = ['sword', 'crossbow', 'bow', 'dagger', 'mace', 'weapon', 'claw', 'bite'];
  for (const weaponWord of weaponKeywords) {
    if (sentence.toLowerCase().includes(weaponWord)) {
      weapon = weaponWord;
      break;
    }
  }

  // Determine roll type
  let rollType: DetectedCombatAction['rollType'] = 'attack';
  let rollNeeded = true;

  if (actionType === 'spell') {
    rollType = 'save';
  } else if (actionType === 'damage') {
    rollType = 'damage';
    rollNeeded = false; // Damage might already be determined
  }

  return {
    actor,
    action: actionType,
    target,
    weapon,
    rollNeeded,
    rollType,
  };
}

/**
 * Detect player combat actions from player input
 */
export function detectPlayerCombatAction(playerInput: string): DetectedCombatAction | null {
  const lowerInput = playerInput.toLowerCase();

  // Attack actions
  if (lowerInput.includes('attack') || lowerInput.includes('hit') || lowerInput.includes('shoot')) {
    return {
      actor: 'Player',
      action: 'attack',
      rollNeeded: true,
      rollType: 'attack',
    };
  }

  // Spell casting
  if (lowerInput.includes('cast') || lowerInput.includes('spell')) {
    return {
      actor: 'Player',
      action: 'cast spell',
      rollNeeded: true,
      rollType: 'attack',
    };
  }

  // Defense actions
  if (
    lowerInput.includes('dodge') ||
    lowerInput.includes('defend') ||
    lowerInput.includes('block')
  ) {
    return {
      actor: 'Player',
      action: 'defend',
      rollNeeded: false,
      rollType: 'skill',
    };
  }

  return null;
}

/**
 * Generate combat participants from detected enemies
 */
export function createCombatParticipantsFromDetection(
  enemies: DetectedEnemy[],
  playerCharacter: PlayerCharacterLike | null,
): Partial<CombatParticipant>[] {
  const participants: Partial<CombatParticipant>[] = [];

  // Add player character
  if (playerCharacter) {
    // Calculate initiative modifier from dexterity
    const dexModifier = playerCharacter.abilityScores?.dexterity?.modifier || 0;

    participants.push({
      id: `player-${playerCharacter.id}`,
      participantType: 'player',
      name: playerCharacter.name,
      characterId: playerCharacter.id,
      initiative: dexModifier, // This will be added to d20 roll in startCombat
      armorClass: playerCharacter.armor_class || 10,
      maxHitPoints: playerCharacter.hit_points || 10,
      currentHitPoints: playerCharacter.hit_points || 10,
      temporaryHitPoints: 0,
      conditions: [],
      deathSaves: { successes: 0, failures: 0, isStable: false },
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
    });
  }

  // Add detected enemies
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    // Estimate initiative modifier based on CR (higher CR = better dex)
    // CR 0-2: +1, CR 3-5: +2, CR 6-10: +3, CR 11+: +4
    const initiativeModifier = Math.min(
      4,
      Math.max(1, Math.floor((enemy.estimatedCR || 1) / 3) + 1),
    );

    participants.push({
      id: `enemy-${enemy.name.toLowerCase()}-${i}`,
      participantType: 'monster',
      name: `${enemy.name} ${i > 0 ? i + 1 : ''}`.trim(),
      initiative: initiativeModifier, // This will be added to d20 roll in startCombat
      armorClass: enemy.suggestedAC,
      maxHitPoints: enemy.suggestedHP,
      currentHitPoints: enemy.suggestedHP,
      temporaryHitPoints: 0,
      conditions: [],
      deathSaves: { successes: 0, failures: 0, isStable: false },
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
      monsterData: {
        type: enemy.type,
        challengeRating: enemy.estimatedCR,
        alignment: 'hostile',
        specialAbilities: [],
        attacks: [
          {
            name: 'Basic Attack',
            attackBonus: 4,
            damageRoll: '1d8+2',
            damageType: 'bludgeoning',
          },
        ],
      },
    });
  }

  return participants;
}

export interface PlayerCharacterLike {
  id: string;
  name: string;
  armor_class?: number;
  hit_points?: number;
  abilityScores?: {
    dexterity?: {
      modifier: number;
    };
  };
}

/**
 * Check if text indicates combat should end
 */
export function shouldEndCombat(text: string): boolean {
  const lowerText = text.toLowerCase();
  return COMBAT_KEYWORDS.endings.some((keyword) => lowerText.includes(keyword));
}

/**
 * Extract dice roll requirements from combat actions
 */
export function getDiceRollRequirements(actions: DetectedCombatAction[]): {
  attackRolls: number;
  damageRolls: number;
  savingThrows: number;
  skillChecks: number;
} {
  let attackRolls = 0;
  let damageRolls = 0;
  let savingThrows = 0;
  let skillChecks = 0;

  for (const action of actions) {
    if (!action.rollNeeded) continue;

    switch (action.rollType) {
      case 'attack':
        attackRolls++;
        if (action.action === 'attack') damageRolls++; // Attack rolls often need damage rolls
        break;
      case 'damage':
        damageRolls++;
        break;
      case 'save':
        savingThrows++;
        break;
      case 'skill':
        skillChecks++;
        break;
    }
  }

  return { attackRolls, damageRolls, savingThrows, skillChecks };
}
