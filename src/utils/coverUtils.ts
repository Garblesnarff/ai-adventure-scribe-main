/**
 * Cover Mechanics for D&D 5e
 * 
 * Handles cover calculations, AC bonuses, and targeting restrictions
 */

import { CoverType, CoverInfo, CombatParticipant } from '@/types/combat';

/**
 * Cover information lookup
 */
export const COVER_INFO: Record<CoverType, CoverInfo> = {
  none: {
    type: 'none',
    acBonus: 0,
    dexSaveBonus: 0,
    canBeTargeted: true
  },
  half: {
    type: 'half',
    acBonus: 2,
    dexSaveBonus: 2,
    canBeTargeted: true
  },
  three_quarters: {
    type: 'three_quarters',
    acBonus: 5,
    dexSaveBonus: 5,
    canBeTargeted: true
  },
  total: {
    type: 'total',
    acBonus: 0, // Can't be targeted at all
    dexSaveBonus: 0,
    canBeTargeted: false
  }
};

/**
 * Determine cover type between attacker and target (simplified)
 */
export function determineCover(
  attacker: CombatParticipant,
  target: CombatParticipant
): CoverType {
  // In a real implementation, this would use positioning data
  // For now, use simplified logic based on position strings
  
  const targetPosition = target.position || '';
  
  // Check for total cover keywords
  if (targetPosition.includes('behind wall') || 
      targetPosition.includes('around corner') ||
      targetPosition.includes('total cover')) {
    return 'total';
  }
  
  // Check for three-quarters cover keywords
  if (targetPosition.includes('behind pillar') ||
      targetPosition.includes('arrow slit') ||
      targetPosition.includes('portcullis') ||
      targetPosition.includes('three-quarters cover')) {
    return 'three_quarters';
  }
  
  // Check for half cover keywords
  if (targetPosition.includes('low wall') ||
      targetPosition.includes('behind ally') ||
      targetPosition.includes('furniture') ||
      targetPosition.includes('half cover')) {
    return 'half';
  }
  
  return 'none';
}

/**
 * Apply cover to participant
 */
export function applyCover(
  participant: CombatParticipant,
  coverType: CoverType
): CombatParticipant {
  return {
    ...participant,
    cover: COVER_INFO[coverType]
  };
}

/**
 * Get effective AC considering cover
 */
export function getEffectiveAC(
  target: CombatParticipant,
  attacker?: CombatParticipant
): number {
  let baseAC = target.armorClass;
  
  // Apply cover bonus if attacker is specified
  if (attacker && target.cover) {
    const coverType = target.cover.type;
    if (coverType === 'total') {
      // Total cover means can't be targeted - this should be handled before attack
      return baseAC;
    }
    baseAC += target.cover.acBonus;
  }
  
  return baseAC;
}

/**
 * Get effective Dex save bonus considering cover
 */
export function getEffectiveDexSaveBonus(target: CombatParticipant): number {
  return target.cover?.dexSaveBonus || 0;
}

/**
 * Check if target can be targeted by attacker
 */
export function canBeTargeted(
  target: CombatParticipant,
  attacker: CombatParticipant
): {
  canTarget: boolean;
  reason?: string;
  coverType: CoverType;
} {
  const coverType = target.cover?.type || determineCover(attacker, target);
  
  if (coverType === 'total') {
    return {
      canTarget: false,
      reason: 'Target has total cover',
      coverType
    };
  }
  
  return {
    canTarget: true,
    coverType
  };
}

/**
 * Calculate cover for area of effect spells
 */
export function getAOECover(
  target: CombatParticipant,
  spellOrigin: { x: number; y: number; z: number },
  targetPosition: { x: number; y: number; z: number }
): {
  coverType: CoverType;
  dexSaveBonus: number;
  description: string;
} {
  // Simplified AOE cover calculation
  // In reality, this would trace a line from spell origin to target
  
  const coverType = target.cover?.type || 'none';
  let dexSaveBonus = 0;
  let description = '';
  
  switch (coverType) {
    case 'half':
      dexSaveBonus = 2;
      description = 'Half cover provides +2 to Dex save';
      break;
    case 'three_quarters':
      dexSaveBonus = 5;
      description = 'Three-quarters cover provides +5 to Dex save';
      break;
    case 'total':
      dexSaveBonus = 0; // Total cover doesn't help against most AOE
      description = 'Total cover provides no benefit against area effects';
      break;
    default:
      description = 'No cover against area effect';
  }
  
  return {
    coverType,
    dexSaveBonus,
    description
  };
}

/**
 * Get cover description for UI
 */
export function getCoverDescription(coverType: CoverType): string {
  switch (coverType) {
    case 'none':
      return 'No Cover';
    case 'half':
      return 'Half Cover (+2 AC, +2 Dex saves)';
    case 'three_quarters':
      return 'Three-Quarters Cover (+5 AC, +5 Dex saves)';
    case 'total':
      return 'Total Cover (cannot be targeted directly)';
    default:
      return 'Unknown Cover';
  }
}

/**
 * Update participant position and recalculate cover
 */
export function updatePositionAndCover(
  participant: CombatParticipant,
  newPosition: string,
  enemies: CombatParticipant[]
): CombatParticipant {
  let updatedParticipant = {
    ...participant,
    position: newPosition
  };
  
  // Recalculate cover based on new position
  // For simplicity, just determine based on position string
  const coverType = determineCoverFromPosition(newPosition);
  updatedParticipant = applyCover(updatedParticipant, coverType);
  
  return updatedParticipant;
}

/**
 * Determine cover type from position string (simplified)
 */
function determineCoverFromPosition(position: string): CoverType {
  const pos = position.toLowerCase();
  
  if (pos.includes('total cover') || pos.includes('behind wall') || pos.includes('around corner')) {
    return 'total';
  }
  
  if (pos.includes('three-quarters') || pos.includes('behind pillar') || pos.includes('arrow slit')) {
    return 'three_quarters';
  }
  
  if (pos.includes('half cover') || pos.includes('low wall') || pos.includes('behind ally')) {
    return 'half';
  }
  
  return 'none';
}

/**
 * Check if attacker can see target (considering total cover)
 */
export function hasLineOfSight(
  attacker: CombatParticipant,
  target: CombatParticipant
): boolean {
  const coverCheck = canBeTargeted(target, attacker);
  return coverCheck.canTarget;
}

/**
 * Get all valid targets for an attack (excluding total cover)
 */
export function getValidTargets(
  attacker: CombatParticipant,
  potentialTargets: CombatParticipant[]
): CombatParticipant[] {
  return potentialTargets.filter(target => {
    const targetCheck = canBeTargeted(target, attacker);
    return targetCheck.canTarget && target.currentHitPoints > 0;
  });
}

/**
 * Apply improved cover (feat or class feature)
 */
export function hasImprovedCover(participant: CombatParticipant): boolean {
  // Check for feats or features that improve cover
  return participant.classFeatures?.some(f => 
    f.name === 'improved_cover' || f.name === 'defensive_tactics'
  ) || false;
}

/**
 * Calculate enhanced cover bonuses
 */
export function getEnhancedCoverBonus(
  participant: CombatParticipant,
  baseCoverType: CoverType
): CoverInfo {
  const baseCover = COVER_INFO[baseCoverType];
  
  if (hasImprovedCover(participant)) {
    // Some features might upgrade half cover to three-quarters, etc.
    if (baseCoverType === 'half') {
      return COVER_INFO.three_quarters;
    }
  }
  
  return baseCover;
}