/**
 * Vision and Obscurement Utilities for D&D 5e
 * 
 * Handles darkvision, blindsight, truesight, and obscurement levels
 */

import { VisionType, VisionInfo, ObscurementLevel, CombatParticipant } from '@/types/combat';

/**
 * Vision type information
 */
export const VISION_INFO: Record<VisionType, { description: string; benefits: string[] }> = {
  normal: {
    description: 'Normal vision',
    benefits: ['Can see in bright light and dim light']
  },
  darkvision: {
    description: 'Can see in darkness as dim light',
    benefits: [
      'See in darkness as if it were dim light',
      'Cannot discern color in darkness (only shades of gray)'
    ]
  },
  blindsight: {
    description: 'Can perceive surroundings without sight',
    benefits: [
      'Perceive surroundings without relying on sight',
      'See invisible creatures and objects within range',
      'Not affected by blinded condition within range'
    ]
  },
  truesight: {
    description: 'Can see through all illusions and transformations',
    benefits: [
      'See in normal and magical darkness',
      'See invisible creatures and objects',
      'Automatically detect visual illusions',
      'Perceive original form of shapechangers and transformed creatures',
      'See into the Ethereal Plane'
    ]
  }
};

/**
 * Obscurement level effects
 */
export const OBSCUREMENT_EFFECTS = {
  clear: {
    description: 'Clear visibility',
    effects: []
  },
  lightly_obscured: {
    description: 'Lightly obscured (dim light, patchy fog, moderate foliage)',
    effects: ['Disadvantage on Wisdom (Perception) checks that rely on sight']
  },
  heavily_obscured: {
    description: 'Heavily obscured (darkness, opaque fog, dense foliage)',
    effects: [
      'Effectively blinded when trying to see',
      'Attack rolls against creature have advantage',
      'Creature\'s attack rolls have disadvantage',
      'Automatically fail ability checks requiring sight'
    ]
  }
};

/**
 * Check what a participant can see in given conditions
 */
export function getVisionCapabilities(
  participant: CombatParticipant,
  ambientLight: 'bright' | 'dim' | 'dark',
  obscurement: ObscurementLevel,
  distance: number = 60
): {
  canSee: boolean;
  visionType: VisionType;
  effectiveObscurement: ObscurementLevel;
  hasAdvantage: boolean;
  hasDisadvantage: boolean;
  description: string;
} {
  const visionTypes = participant.visionTypes || [{ type: 'normal', range: 60 }];
  
  // Determine best applicable vision type
  let bestVision: VisionInfo = { type: 'normal', range: 60 };
  
  for (const vision of visionTypes) {
    if (distance <= vision.range) {
      if (vision.type === 'truesight') {
        bestVision = vision;
        break; // Truesight is always best
      }
      if (vision.type === 'blindsight' && bestVision.type !== 'truesight') {
        bestVision = vision;
      }
      if (vision.type === 'darkvision' && bestVision.type === 'normal') {
        bestVision = vision;
      }
    }
  }
  
  let canSee = true;
  let effectiveObscurement = obscurement;
  let hasAdvantage = false;
  let hasDisadvantage = false;
  let description = '';
  
  // Apply vision type effects
  switch (bestVision.type) {
    case 'truesight':
      // Truesight sees through everything except total cover
      canSee = true;
      effectiveObscurement = 'clear';
      description = 'Truesight sees through darkness and obscurement';
      break;
      
    case 'blindsight':
      // Blindsight ignores obscurement within range
      if (distance <= bestVision.range) {
        canSee = true;
        effectiveObscurement = 'clear';
        description = 'Blindsight perceives without relying on sight';
      } else {
        // Beyond blindsight range, falls back to normal vision
        canSee = ambientLight !== 'dark' || obscurement === 'heavily_obscured';
        effectiveObscurement = obscurement;
        description = 'Beyond blindsight range, using normal vision';
      }
      break;
      
    case 'darkvision':
      if (ambientLight === 'dark' && distance <= bestVision.range) {
        // Darkness becomes dim light
        effectiveObscurement = obscurement === 'heavily_obscured' ? 'lightly_obscured' : obscurement;
        canSee = true;
        description = 'Darkvision treats darkness as dim light';
      } else {
        canSee = ambientLight !== 'dark';
        effectiveObscurement = obscurement;
        description = 'Using darkvision in darkness or normal vision in light';
      }
      break;
      
    case 'normal':
    default:
      canSee = ambientLight !== 'dark';
      effectiveObscurement = obscurement;
      
      if (ambientLight === 'dark') {
        canSee = false;
        effectiveObscurement = 'heavily_obscured';
        description = 'Cannot see in darkness';
      } else {
        description = 'Using normal vision';
      }
      break;
  }
  
  // Apply obscurement effects if still affected
  if (effectiveObscurement === 'heavily_obscured') {
    hasDisadvantage = true;
    description += ' - heavily obscured, effectively blinded';
  } else if (effectiveObscurement === 'lightly_obscured') {
    hasDisadvantage = true; // For Perception checks
    description += ' - lightly obscured, disadvantage on Perception';
  }
  
  return {
    canSee,
    visionType: bestVision.type,
    effectiveObscurement,
    hasAdvantage,
    hasDisadvantage,
    description
  };
}

/**
 * Check if attacker can see target for attacks
 */
export function canSeeForAttack(
  attacker: CombatParticipant,
  target: CombatParticipant,
  ambientLight: 'bright' | 'dim' | 'dark' = 'bright',
  distance: number = 30
): {
  canSee: boolean;
  attackAdvantage: boolean;
  attackDisadvantage: boolean;
  description: string;
} {
  // Check if target is invisible
  const isInvisible = target.conditions.some(c => c.name === 'invisible');
  
  // Get attacker's vision capabilities
  const vision = getVisionCapabilities(attacker, ambientLight, target.obscurement || 'clear', distance);
  
  let canSee = vision.canSee;
  let attackAdvantage = false;
  let attackDisadvantage = false;
  let description = vision.description;
  
  // Handle invisible targets
  if (isInvisible) {
    // Only blindsight and truesight can see invisible creatures
    if (vision.visionType === 'blindsight' || vision.visionType === 'truesight') {
      canSee = true;
      description += ' - can see invisible target';
    } else {
      canSee = false;
      attackDisadvantage = true;
      description += ' - target is invisible';
    }
  }
  
  // Handle blinded attacker
  const isBlinded = attacker.conditions.some(c => c.name === 'blinded');
  if (isBlinded && vision.visionType !== 'blindsight') {
    canSee = false;
    attackDisadvantage = true;
    description += ' - attacker is blinded';
  }
  
  // Handle heavily obscured areas
  if (vision.effectiveObscurement === 'heavily_obscured') {
    attackDisadvantage = true;
    description += ' - heavily obscured area';
  }
  
  // Invisible attackers get advantage
  const attackerIsInvisible = attacker.conditions.some(c => c.name === 'invisible');
  if (attackerIsInvisible) {
    attackAdvantage = true;
    description += ' - attacker is invisible';
  }
  
  return {
    canSee,
    attackAdvantage,
    attackDisadvantage,
    description
  };
}

/**
 * Apply vision type to participant
 */
export function grantVision(
  participant: CombatParticipant,
  visionType: VisionType,
  range: number
): CombatParticipant {
  const currentVisions = participant.visionTypes || [];
  const newVision: VisionInfo = { type: visionType, range };
  
  // Remove existing vision of the same type and add new one
  const otherVisions = currentVisions.filter(v => v.type !== visionType);
  
  return {
    ...participant,
    visionTypes: [...otherVisions, newVision]
  };
}

/**
 * Set ambient obscurement level
 */
export function setObscurement(
  participant: CombatParticipant,
  level: ObscurementLevel
): CombatParticipant {
  return {
    ...participant,
    obscurement: level
  };
}

/**
 * Check if participant has specific vision type
 */
export function hasVisionType(
  participant: CombatParticipant,
  visionType: VisionType
): { has: boolean; range: number } {
  const vision = participant.visionTypes?.find(v => v.type === visionType);
  return {
    has: !!vision,
    range: vision?.range || 0
  };
}

/**
 * Get vision description for UI
 */
export function getVisionDescription(participant: CombatParticipant): string[] {
  if (!participant.visionTypes || participant.visionTypes.length === 0) {
    return ['Normal vision'];
  }
  
  return participant.visionTypes.map(vision => 
    `${VISION_INFO[vision.type].description} (${vision.range} ft.)`
  );
}

/**
 * Calculate Perception bonus/penalty based on conditions
 */
export function getPerceptionModifiers(
  participant: CombatParticipant,
  ambientLight: 'bright' | 'dim' | 'dark',
  obscurement: ObscurementLevel
): {
  advantage: boolean;
  disadvantage: boolean;
  bonus: number;
  description: string;
} {
  const vision = getVisionCapabilities(participant, ambientLight, obscurement);
  
  let advantage = false;
  let disadvantage = false;
  let bonus = 0;
  let description = '';
  
  // Lightly obscured gives disadvantage on Perception (sight)
  if (vision.effectiveObscurement === 'lightly_obscured') {
    disadvantage = true;
    description = 'Disadvantage due to light obscurement';
  }
  
  // Heavily obscured auto-fails sight-based checks
  if (vision.effectiveObscurement === 'heavily_obscured') {
    bonus = -10; // Effective auto-fail for sight
    description = 'Cannot make sight-based Perception checks';
  }
  
  // Some racial traits or features might give bonuses
  if (participant.racialTraits?.some(t => t.name === 'keen_senses')) {
    advantage = true;
    description += (description ? ' | ' : '') + 'Advantage from Keen Senses';
  }
  
  return {
    advantage,
    disadvantage,
    bonus,
    description
  };
}

/**
 * Get common vision ranges by creature type
 */
export const COMMON_VISION_RANGES = {
  darkvision: {
    elf: 60,
    dwarf: 60,
    halfOrc: 60,
    tiefling: 60,
    dragonborn: 60,
    drow: 120
  },
  blindsight: {
    bat: 60,
    dragon: 60,
    aberration: 60
  },
  truesight: {
    deity: 120,
    solar: 120,
    ancient_dragon: 120
  }
};

/**
 * Apply racial vision traits
 */
export function applyRacialVision(
  participant: CombatParticipant,
  race: string
): CombatParticipant {
  const darkvisionRange = COMMON_VISION_RANGES.darkvision[race.toLowerCase() as keyof typeof COMMON_VISION_RANGES.darkvision];
  
  if (darkvisionRange) {
    return grantVision(participant, 'darkvision', darkvisionRange);
  }
  
  return participant;
}