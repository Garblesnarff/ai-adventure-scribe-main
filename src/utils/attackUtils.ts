/**
 * Attack Roll Utilities for D&D 5e
 * 
 * Handles attack roll calculations with all modifiers, advantage/disadvantage,
 * critical hits, and special conditions
 */

import { 
  CombatParticipant, 
  CombatEncounter, 
  DiceRoll, 
  DiceRollOptions, 
  WeaponProperties,
  DamageType
} from '@/types/combat';
import { rollDice } from '@/utils/diceUtils';
import { getFightingStyleAttackBonus, getFightingStyleDamageBonus } from '@/utils/fightingStyles';
import { canUseSneakAttack, getSneakAttackDice, getDivineSmiteDamage } from '@/utils/classFeatures';

/**
 * Calculate attack bonus for a weapon attack
 */
export function calculateAttackBonus(
  participant: CombatParticipant,
  weapon: { properties: WeaponProperties; attackBonus: number },
  isOffHand: boolean = false,
  isRanged: boolean = false
): number {
  let attackBonus = weapon.attackBonus; // Base weapon bonus
  
  // Add ability modifier (Strength for melee, Dexterity for ranged)
  const abilityModifier = isRanged 
    ? participant.abilityScores.dexterity.modifier 
    : participant.abilityScores.strength.modifier;
  
  // For finesse weapons, use the higher of Strength or Dexterity
  const isFinesseWeapon = weapon.properties.finesse;
  if (isFinesseWeapon) {
    attackBonus += Math.max(
      participant.abilityScores.strength.modifier,
      participant.abilityScores.dexterity.modifier
    );
  } else {
    attackBonus += abilityModifier;
  }
  
  // Add proficiency bonus if proficient with weapon
  // Simplified: assume proficiency for now
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  attackBonus += proficiencyBonus;
  
  // Add fighting style bonuses
  attackBonus += getFightingStyleAttackBonus(participant, isRanged);
  
  // Add rage bonus for Barbarians
  if (participant.isRaging) {
    attackBonus += 2; // Rage gives +2 to melee attack rolls
  }
  
  // Off-hand attacks don't get ability modifier unless Two-Weapon Fighting style
  if (isOffHand) {
    const hasTwoWeaponFighting = participant.fightingStyles?.some(
      style => style.name === 'two_weapon_fighting'
    ) || false;
    
    if (!hasTwoWeaponFighting) {
      // Remove ability modifier for off-hand attacks without Two-Weapon Fighting
      if (isFinesseWeapon) {
        const maxMod = Math.max(
          participant.abilityScores.strength.modifier,
          participant.abilityScores.dexterity.modifier
        );
        attackBonus -= maxMod;
      } else {
        attackBonus -= abilityModifier;
      }
    }
  }
  
  return attackBonus;
}

/**
 * Roll an attack with all modifiers and conditions
 */
export function rollAttack(
  participant: CombatParticipant,
  target: CombatParticipant,
  weapon: { properties: WeaponProperties; attackBonus: number },
  isOffHand: boolean = false,
  isRanged: boolean = false
): {
  roll: DiceRoll;
  description: string;
  advantage: boolean;
  disadvantage: boolean;
  modifiers: Array<{ name: string; value: number }>;
  conditions: string[];
} {
  // Calculate base attack bonus
  const baseAttackBonus = weapon.attackBonus;
  
  // Add ability modifier (Strength for melee, Dexterity for ranged)
  const abilityModifier = isRanged 
    ? participant.abilityScores.dexterity.modifier 
    : participant.abilityScores.strength.modifier;
  
  // For finesse weapons, use the higher of Strength or Dexterity
  const isFinesseWeapon = weapon.properties.finesse;
  const finalAbilityModifier = isFinesseWeapon
    ? Math.max(
        participant.abilityScores.strength.modifier,
        participant.abilityScores.dexterity.modifier
      )
    : abilityModifier;
  
  // Add proficiency bonus if proficient with weapon
  // Simplified: assume proficiency for now
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  
  // Add fighting style bonuses
  const fightingStyleBonus = getFightingStyleAttackBonus(participant, isRanged);
  
  // Add rage bonus for Barbarians
  const rageBonus = participant.isRaging ? 2 : 0; // Rage gives +2 to melee attack rolls
  
  // Calculate total attack bonus
  let attackBonus = baseAttackBonus + finalAbilityModifier + proficiencyBonus + fightingStyleBonus + rageBonus;
  
  // Track modifiers for visualization
  const modifiers = [
    { name: 'Base', value: baseAttackBonus },
    { name: 'Ability', value: finalAbilityModifier },
    { name: 'Proficiency', value: proficiencyBonus },
    { name: 'Fighting Style', value: fightingStyleBonus },
    { name: 'Rage', value: rageBonus }
  ].filter(mod => mod.value !== 0);
  
  // Off-hand attacks don't get ability modifier unless Two-Weapon Fighting style
  if (isOffHand) {
    const hasTwoWeaponFighting = participant.fightingStyles?.some(
      style => style.name === 'two_weapon_fighting'
    ) || false;
    
    if (!hasTwoWeaponFighting) {
      // Remove ability modifier for off-hand attacks without Two-Weapon Fighting
      attackBonus -= finalAbilityModifier;
      const abilityModIndex = modifiers.findIndex(mod => mod.name === 'Ability');
      if (abilityModIndex !== -1) {
        modifiers.splice(abilityModIndex, 1);
      }
    }
  }
  
  // Determine advantage/disadvantage conditions
  let advantage = false;
  let disadvantage = false;
  const conditions: string[] = [];
  
  // Check for exhaustion
  if (hasDisadvantageOnAttacksAndSaves(participant)) {
    disadvantage = true;
    conditions.push('exhaustion');
  }
  
  // Check for cover
  if (hasCover(target)) {
    disadvantage = true;
    conditions.push('cover');
  }
  
  // Check for invisible target
  const isInvisibleTarget = target.conditions.some(c => c.name === 'invisible');
  if (isInvisibleTarget) {
    disadvantage = true;
    conditions.push('invisible target');
  }
  
  // Check for blinded attacker
  const isBlindedAttacker = participant.conditions.some(c => c.name === 'blinded');
  if (isBlindedAttacker) {
    disadvantage = true;
    conditions.push('blinded');
  }
  
  // Check for prone condition (ranged attacks have disadvantage against prone targets within 5ft)
  const isTargetProne = target.conditions.some(c => c.name === 'prone');
  if (isTargetProne && isRanged) {
    // Simplified: assume target is within 5ft for disadvantage
    disadvantage = true;
    conditions.push('prone target (ranged)');
  }
  
  // Check for invisible attacker (advantage)
  const isInvisibleAttacker = participant.conditions.some(c => c.name === 'invisible');
  if (isInvisibleAttacker) {
    advantage = true;
    conditions.push('invisible attacker');
  }
  
  // Check for paralyzed or restrained target (advantage)
  const isTargetParalyzed = target.conditions.some(c => c.name === 'paralyzed');
  const isTargetRestrained = target.conditions.some(c => c.name === 'restrained');
  if (isTargetParalyzed || isTargetRestrained) {
    advantage = true;
    conditions.push(isTargetParalyzed ? 'paralyzed target' : 'restrained target');
  }
  
  // Check for prone attacker (disadvantage on ranged attacks)
  const isAttackerProne = participant.conditions.some(c => c.name === 'prone');
  if (isAttackerProne && isRanged) {
    disadvantage = true;
    conditions.push('prone attacker (ranged)');
  }
  
  // Check for loading weapons (disadvantage if used improperly)
  if (weapon.properties.loading && !isRanged) {
    disadvantage = true;
    conditions.push('loading weapon (melee)');
  }
  
  // Check for heavy weapons (disadvantage if user has low strength)
  if (weapon.properties.heavy && participant.abilityScores.strength.score < 13) {
    disadvantage = true;
    conditions.push('heavy weapon (low strength)');
  }
  
  // Roll the attack
  const rollOptions: DiceRollOptions = {
    advantage,
    disadvantage
  };
  
  const roll = rollDice(20, 1, attackBonus, rollOptions);
  
  // Build description
  let description = `${participant.name} attacks with ${weapon.properties} (+${attackBonus} to hit)`;
  if (conditions.length > 0) {
    description += ` [${conditions.join(', ')}]`;
  }
  
  return {
    roll,
    description,
    advantage,
    disadvantage,
    modifiers,
    conditions
  };
}

/**
 * Get detailed attack visualization data
 */
export function getAttackVisualizationData(
  participant: CombatParticipant,
  target: CombatParticipant,
  weapon: { properties: WeaponProperties; attackBonus: number },
  isOffHand: boolean = false,
  isRanged: boolean = false
): {
  attackerName: string;
  targetName: string;
  weaponName: string;
  attackBonus: number;
  modifiers: Array<{ name: string; value: number }>;
  conditions: string[];
  advantage: boolean;
  disadvantage: boolean;
  targetAC: number;
} {
  const attackRollResult = rollAttack(participant, target, weapon, isOffHand, isRanged);
  
  return {
    attackerName: participant.name,
    targetName: target.name,
    weaponName: weapon.name || 'Unarmed Strike',
    attackBonus: attackRollResult.roll.modifier,
    modifiers: attackRollResult.modifiers,
    conditions: attackRollResult.conditions,
    advantage: attackRollResult.advantage,
    disadvantage: attackRollResult.disadvantage,
    targetAC: target.armorClass
  };
}

/**
 * Check if an attack hits based on target's AC
 */
export function checkHit(
  attackRoll: number,
  targetAC: number,
  naturalRoll?: number,
  criticalThreshold: number = 20
): {
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  description: string;
} {
  const critical = naturalRoll !== undefined && naturalRoll >= criticalThreshold;
  const fumble = naturalRoll === 1;
  
  let hit = false;
  let description = '';
  
  if (critical) {
    hit = true;
    description = `Critical hit! (Natural ${naturalRoll})`;
  } else if (fumble) {
    hit = false;
    description = `Critical miss! (Natural 1)`;
  } else {
    hit = attackRoll >= targetAC;
    description = hit ? `Hits AC ${targetAC}` : `Misses AC ${targetAC}`;
  }
  
  return {
    hit,
    critical,
    fumble,
    description
  };
}

/**
 * Calculate damage for an attack, including class features like Sneak Attack and Divine Smite
 */
export function calculateDamageForAttack(
  weapon: { name?: string; damage: string; damageType: DamageType; properties: WeaponProperties },
  participant: CombatParticipant,
  isOffHand: boolean = false,
  isCritical: boolean = false,
  target?: CombatParticipant,
  encounter?: CombatEncounter,
  divineSmiteSlotLevel?: number // For Paladin's Divine Smite
): {
  damageRoll: DiceRoll;
  description: string;
  sneakAttackRoll?: DiceRoll;
  sneakAttackDescription?: string;
  divineSmiteRoll?: DiceRoll;
  divineSmiteDescription?: string;
} {
  // Parse weapon damage
  const damageParts = weapon.damage.split('+');
  let damageDice = damageParts[0];
  let damageModifier = 0;
  
  if (damageParts.length > 1) {
    damageModifier = parseInt(damageParts[1]) || 0;
  }
  
  // Add ability modifier (Strength for melee, Dexterity for ranged)
  const isRangedWeapon = weapon.properties.thrown || 
                         (weapon.name && (weapon.name.toLowerCase().includes('bow') || 
                                         weapon.name.toLowerCase().includes('crossbow')));
  
  const abilityModifier = isRangedWeapon 
    ? participant.abilityScores.dexterity.modifier 
    : participant.abilityScores.strength.modifier;
  
  // For finesse weapons, use the higher of Strength or Dexterity
  const isFinesseWeapon = weapon.properties.finesse;
  const finalAbilityModifier = isFinesseWeapon
    ? Math.max(
        participant.abilityScores.strength.modifier,
        participant.abilityScores.dexterity.modifier
      )
    : abilityModifier;
  
  // For off-hand attacks, don't add ability modifier unless Two-Weapon Fighting style
  if (isOffHand) {
    const hasTwoWeaponFighting = participant.fightingStyles?.some(
      style => style.name === 'two_weapon_fighting'
    ) || false;
    
    if (!hasTwoWeaponFighting) {
      damageModifier = 0; // Don't add ability modifier
    } else {
      damageModifier += finalAbilityModifier;
    }
  } else {
    damageModifier += finalAbilityModifier;
  }
  
  // Add fighting style damage bonus
  const fightingStyleDamageBonus = getFightingStyleDamageBonus(participant, { properties: weapon.properties }, isOffHand);
  damageModifier += fightingStyleDamageBonus;
  
  // Handle critical hits (double dice count)
  let diceCount = 1;
  if (damageDice.includes('d')) {
    const parts = damageDice.split('d');
    diceCount = parseInt(parts[0]) || 1;
    
    if (isCritical) {
      diceCount *= 2; // Double dice for critical hits
    }
  }
  
  const dieType = damageDice.includes('d') 
    ? parseInt(damageDice.split('d')[1]) || 6 
    : 6;
  
  const damageRoll = rollDice(dieType, diceCount, damageModifier);
  
  let description = `${diceCount}d${dieType}`;
  if (damageModifier > 0) {
    description += `+${damageModifier}`;
  } else if (damageModifier < 0) {
    description += `${damageModifier}`;
  }
  
  if (isCritical) {
    description += ' (Critical!)';
  }
  
  // Check for Sneak Attack
  let sneakAttackRoll: DiceRoll | undefined;
  let sneakAttackDescription: string | undefined;
  
  if (participant.characterClass === 'rogue' && 
      target && 
      encounter && 
      canUseSneakAttack(participant, target, encounter)) {
    
    const sneakAttackDiceCount = getSneakAttackDice(participant.level || 1);
    let sneakDiceCount = sneakAttackDiceCount;
    
    if (isCritical) {
      sneakDiceCount *= 2; // Double dice for critical hits
    }
    
    sneakAttackRoll = rollDice(6, sneakDiceCount, 0);
    sneakAttackDescription = `${sneakDiceCount}d6 Sneak Attack${isCritical ? ' (Critical!)' : ''}`;
  }
  
  // Check for Divine Smite
  let divineSmiteRoll: DiceRoll | undefined;
  let divineSmiteDescription: string | undefined;
  
  if (participant.characterClass === 'paladin' && 
      divineSmiteSlotLevel && 
      divineSmiteSlotLevel > 0) {
    
    const divineSmiteDice = getDivineSmiteDamage(divineSmiteSlotLevel, isCritical);
    const parts = divineSmiteDice.split('d');
    const diceCount = parseInt(parts[0]) || 0;
    const dieType = parseInt(parts[1]) || 8;
    
    if (diceCount > 0) {
      divineSmiteRoll = rollDice(dieType, diceCount, 0);
      divineSmiteDescription = `${divineSmiteDice} Divine Smite${isCritical ? ' (Critical!)' : ''}`;
    }
  }
  
  return {
    damageRoll,
    description,
    sneakAttackRoll,
    sneakAttackDescription,
    divineSmiteRoll,
    divineSmiteDescription
  };
}

/**
 * Process critical hit effects
 */
export function processCriticalHit(
  participant: CombatParticipant,
  target: CombatParticipant,
  weapon: { name?: string; damage: string; damageType: DamageType; properties: WeaponProperties }
): {
  additionalDamageRoll?: DiceRoll;
  description: string;
  effects: string[];
} {
  // Some features grant additional critical hit effects
  const hasImprovedCritical = participant.classFeatures?.some(
    feature => feature.name === 'improved_critical'
  ) || false;
  
  // Champion fighters can score critical hits on 19-20
  const criticalThreshold = hasImprovedCritical ? 19 : 20;
  
  // Roll additional damage dice for critical hits
  const additionalDamage = calculateDamageForAttack(weapon, participant, false, true);
  
  // Check for special critical hit effects
  const effects: string[] = [];
  
  // Brutal Critical (Barbarian)
  const hasBrutalCritical = participant.classFeatures?.some(
    feature => feature.name === 'brutal_critical'
  ) || false;
  
  if (hasBrutalCritical) {
    effects.push('Brutal Critical: Extra weapon damage die');
  }
  
  // Sharpshooter or Great Weapon Master
  const hasSharpshooter = participant.classFeatures?.some(
    feature => feature.name === 'sharpshooter'
  ) || false;
  
  const hasGreatWeaponMaster = participant.classFeatures?.some(
    feature => feature.name === 'great_weapon_master'
  ) || false;
  
  if (hasSharpshooter || hasGreatWeaponMaster) {
    effects.push(`${hasSharpshooter ? 'Sharpshooter' : 'Great Weapon Master'}: Additional effects apply`);
  }
  
  return {
    additionalDamageRoll: additionalDamage.damageRoll,
    description: `Critical hit! Rolled additional damage: ${additionalDamage.description}`,
    effects
  };
}

/**
 * Get critical hit indicator data
 */
export function getCriticalHitIndicatorData(
  participant: CombatParticipant,
  target: CombatParticipant,
  weapon: { name?: string; damage: string; damageType: DamageType; properties: WeaponProperties },
  isCritical: boolean
): {
  isCritical: boolean;
  criticalEffects: string[];
  additionalDamage?: DiceRoll;
  description: string;
} {
  if (!isCritical) {
    return {
      isCritical: false,
      criticalEffects: [],
      description: 'Not a critical hit'
    };
  }
  
  const criticalData = processCriticalHit(participant, target, weapon);
  
  return {
    isCritical: true,
    criticalEffects: criticalData.effects,
    additionalDamage: criticalData.additionalDamageRoll,
    description: criticalData.description
  };
}

/**
 * Get attack description for UI with critical hit indicators
 */
export function getAttackDescription(
  participant: CombatParticipant,
  target: CombatParticipant,
  weapon: { name?: string; damage: string; damageType: DamageType },
  attackRoll: number,
  hit: boolean,
  critical: boolean,
  fumble: boolean
): string {
  let description = `${participant.name} attacks ${target.name} with ${weapon.name || 'a weapon'}`;
  
  if (critical) {
    description += ` - CRITICAL HIT!`;
  } else if (fumble) {
    description += ` - Critical miss!`;
  } else if (hit) {
    description += ` - Hits!`;
  } else {
    description += ` - Misses.`;
  }
  
  return description;
}
