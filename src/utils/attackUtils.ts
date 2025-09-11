/**
 * Attack utility functions for D&D 5e combat calculations
 */

import { Participant } from '@/types/combat';
import { rollDice, rollDamage } from '@/utils/diceUtils';
import { getClassFeatures, getSneakAttackDice } from '@/utils/classFeatures';

/**
 * Calculates comprehensive damage for an attack, including sneak attack and divine smite
 * 
 * @param weapon - The weapon being used for the attack
 * @param participant - The participant making the attack
 * @param isRanged - Whether this is a ranged attack (affects sneak attack)
 * @param isCritical - Whether the attack was a critical hit
 * @param target - The target participant (for advantage calculations)
 * @param encounter - The current encounter (for ally positioning)
 * @param divineSmiteLevel - Spell slot level for Divine Smite (Paladin feature)
 * @returns Object containing damage calculations
 */
export function calculateDamageForAttack(
  weapon: any,
  participant: Participant,
  isRanged: boolean = false,
  isCritical: boolean = false,
  target?: Participant,
  encounter?: any,
  divineSmiteLevel?: number
) {
  const abilityModifier = participant.abilityScores?.strength?.modifier || 
                         participant.abilityScores?.dexterity?.modifier || 0;
  
  // Base weapon damage
  let baseDamageRoll = rollDamage(weapon.damage, abilityModifier);
  
  if (isCritical) {
    baseDamageRoll.results = baseDamageRoll.results.flatMap(result => [result, result]);
    baseDamageRoll.total *= 2;
  }
  
  // Sneak Attack (Rogue feature)
  let sneakAttackRoll = null;
  if (participant.characterClass === 'rogue') {
    const sneakAttackDice = getSneakAttackDice(participant.level || 1);
    
    // Sneak Attack conditions: advantage OR ally within 5ft of target (melee) OR ranged within 30ft
    const hasAdvantage = participant.conditions?.some(c => c.name === 'advantage') || false;
    const hasAllyAdvantage = encounter?.participants.some((p: Participant) => 
      p.participantType === 'player' && 
      p.id !== participant.id &&
      Math.abs(p.position.x - target.position.x) <= 1 && // 5ft grid
      Math.abs(p.position.y - target.position.y) <= 1
    ) || false;
    const isWithinRangedLimit = isRanged && Math.abs(participant.position.x - target.position.x) <= 6; // 30ft
    
    const canUseSneakAttack = hasAdvantage || 
                             (!isRanged && hasAllyAdvantage) || 
                             (isRanged && isWithinRangedLimit);
    
    if (canUseSneakAttack && sneakAttackDice > 0) {
      sneakAttackRoll = rollDamage(`${sneakAttackDice}d6`, 0);
      if (isCritical) {
        sneakAttackRoll.results = sneakAttackRoll.results.flatMap(result => [result, result]);
        sneakAttackRoll.total *= 2;
      }
    }
  }
  
  // Divine Smite (Paladin feature)
  let divineSmiteRoll = null;
  if (divineSmiteLevel && participant.characterClass === 'paladin') {
    // Divine Smite damage: 2d8 radiant + 1d8 per spell slot level above 1st
    let smiteDice = 2;
    if (divineSmiteLevel > 1) {
      smiteDice += divineSmiteLevel - 1;
    }
    
    // Max 5d8 for 4th level slots
    smiteDice = Math.min(smiteDice, 5);
    
    divineSmiteRoll = rollDamage(`${smiteDice}d8`, 0, false, 'radiant');
    if (isCritical) {
      divineSmiteRoll.results = divineSmiteRoll.results.flatMap(result => [result, result]);
      divineSmiteRoll.total *= 2;
    }
    
    // Only works against undead/fiends with higher slots, but we'll allow it for all
  }
  
  // Rage damage bonus (Barbarian)
  let rageBonus = 0;
  if (participant.isRaging && participant.characterClass === 'barbarian') {
    rageBonus = Math.min(participant.level || 1, 9) <= 9 ? 2 : 
                Math.min(participant.level || 1, 16) <= 16 ? 3 : 4;
    
    if (weapon.damageType === 'piercing' || weapon.damageType === 'slashing') {
      // Double rage bonus for these damage types
      rageBonus *= 2;
    }
  }
  
  // Fighting Style bonuses
  let fightingStyleBonus = 0;
  if (participant.fightingStyles) {
    if (participant.fightingStyles.some(fs => fs.name === 'dueling') && 
        !participant.offHandWeapon) {
      fightingStyleBonus += 2;
    }
    if (participant.fightingStyles.some(fs => fs.name === 'great_weapon_fighting') && 
        weapon.properties?.includes('two-handed')) {
      // Reroll 1s and 2s on damage dice (handled in rollDamage if flag set)
    }
  }
  
  // Class feature damage bonuses
  let classFeatureBonus = 0;
  
  // Fighter: None additional
  // Paladin: Divine Smite handled separately
  // Ranger: None additional here
  // Barbarian: Reckless Attack handled in attack roll advantage
  // Rogue: Sneak Attack handled separately
  // Monk: Martial Arts handled in unarmed strikes
  // etc.
  
  // Calculate total damage
  let totalDamage = baseDamageRoll.total;
  const damageComponents = [baseDamageRoll];
  
  if (sneakAttackRoll) {
    totalDamage += sneakAttackRoll.total;
    damageComponents.push(sneakAttackRoll);
  }
  
  if (divineSmiteRoll) {
    totalDamage += divineSmiteRoll.total;
    damageComponents.push(divineSmiteRoll);
  }
  
  totalDamage += rageBonus + fightingStyleBonus + classFeatureBonus;
  
  return {
    baseDamageRoll,
    sneakAttackRoll,
    divineSmiteRoll,
    rageBonus,
    fightingStyleBonus,
    classFeatureBonus,
    totalDamage,
    damageComponents,
    damageType: weapon.damageType || 'slashing',
    isCritical,
    weaponUsed: weapon.name,
    canApplySneakAttack: !!sneakAttackRoll,
    canApplyDivineSmite: !!divineSmiteRoll,
    description: buildDamageDescription({
      weapon,
      participant,
      sneakAttack: !!sneakAttackRoll,
      divineSmite: !!divineSmiteRoll,
      rage: participant.isRaging,
      critical: isCritical
    })
  };
}

/**
 * Builds a descriptive string for the damage calculation
 */
function buildDamageDescription(params: {
  weapon: any;
  participant: Participant;
  sneakAttack?: boolean;
  divineSmite?: boolean;
  rage?: boolean;
  critical?: boolean;
}): string {
  const parts = [`${params.weapon.name} attack`];
  
  if (params.critical) parts.push('CRITICAL HIT!');
  if (params.sneakAttack) parts.push('Sneak Attack');
  if (params.divineSmite) parts.push('Divine Smite');
  if (params.rage) parts.push('Raging');
  
  return parts.join(' + ');
}

/**
 * Calculates attack bonus for a given weapon and participant
 */
export function calculateAttackBonus(
  weapon: any,
  participant: Participant
): number {
  let abilityModifier = 0;
  let proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  
  // Determine ability modifier based on weapon properties
  if (weapon.properties?.includes('finesse')) {
    abilityModifier = Math.max(
      participant.abilityScores?.dexterity?.modifier || 0,
      participant.abilityScores?.strength?.modifier || 0
    );
  } else if (weapon.properties?.includes('ranged')) {
    abilityModifier = participant.abilityScores?.dexterity?.modifier || 0;
  } else {
    abilityModifier = participant.abilityScores?.strength?.modifier || 0;
  }
  
  // Proficiency
  let isProficient = false;
  if (participant.proficiencies?.weapons?.includes(weapon.name)) {
    isProficient = true;
  } else if (weapon.properties?.includes('simple')) {
    // Most classes proficient with simple weapons
    const simpleWeaponClasses = ['fighter', 'paladin', 'ranger', 'barbarian', 'rogue', 'cleric', 'druid'];
    isProficient = simpleWeaponClasses.includes(participant.characterClass || '');
  } else if (weapon.properties?.includes('martial')) {
    // Martial weapon proficiency
    const martialClasses = ['fighter', 'paladin', 'ranger', 'barbarian'];
    isProficient = martialClasses.includes(participant.characterClass || '');
  }
  
  // Fighting Style bonuses
  let fightingStyleBonus = 0;
  if (participant.fightingStyles?.some(fs => fs.name === 'archery') && 
      weapon.properties?.includes('ranged')) {
    fightingStyleBonus += 2;
  }
  
  // Magic weapon bonus
  const magicBonus = weapon.magicBonus || 0;
  
  return abilityModifier + (isProficient ? proficiencyBonus : 0) + 
         fightingStyleBonus + magicBonus;
}

/**
 * Determines if an attack hits based on roll vs target AC
 */
export function doesAttackHit(
  attackRoll: number,
  targetAC: number,
  hasAdvantage: boolean = false,
  hasDisadvantage: boolean = false
): boolean {
  // For advantage/disadvantage, we'd need the actual rolls, but for simple calculation:
  const effectiveRoll = attackRoll;
  
  return effectiveRoll >= targetAC;
}

/**
 * Calculates the expected hit chance percentage
 */
export function calculateHitChance(
  attackBonus: number,
  targetAC: number,
  hasAdvantage: boolean = false,
  hasDisadvantage: boolean = false
): number {
  let hitChance = 0;
  
  if (hasAdvantage && !hasDisadvantage) {
    // Advantage: take higher of two d20 rolls
    for (let d20_1 = 1; d20_1 <= 20; d20_1++) {
      for (let d20_2 = 1; d20_2 <= 20; d20_2++) {
        const roll = Math.max(d20_1, d20_2) + attackBonus;
        if (roll >= targetAC) hitChance += 0.0025; // 1/400 chance
      }
    }
  } else if (hasDisadvantage && !hasAdvantage) {
    // Disadvantage: take lower of two d20 rolls
    for (let d20_1 = 1; d20_1 <= 20; d20_1++) {
      for (let d20_2 = 1; d20_2 <= 20; d20_2++) {
        const roll = Math.min(d20_1, d20_2) + attackBonus;
        if (roll >= targetAC) hitChance += 0.0025;
      }
    }
  } else {
    // Normal roll
    for (let d20 = 1; d20 <= 20; d20++) {
      if (d20 + attackBonus >= targetAC) {
        hitChance += 0.05; // 1/20 chance
      }
    }
  }
  
  return Math.round(hitChance * 100);
}

/**
 * Gets the damage type resistances and vulnerabilities for a participant
 */
export function getDamageModifiers(
  participant: Participant,
  damageType: string
): {
  resistance: boolean;
  vulnerability: boolean;
  immunity: boolean;
  multiplier: number;
} {
  const resistances = participant.resistances || [];
  const vulnerabilities = participant.vulnerabilities || [];
  const immunities = participant.immunities || [];
  
  const resistance = resistances.includes(damageType);
  const vulnerability = vulnerabilities.includes(damageType);
  const immunity = immunities.includes(damageType);
  
  let multiplier = 1;
  if (immunity) multiplier = 0;
  else if (vulnerability) multiplier = 2;
  else if (resistance) multiplier = 0.5;
  
  return { resistance, vulnerability, immunity, multiplier };
}
