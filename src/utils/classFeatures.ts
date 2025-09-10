/**
 * Class Features Definitions and Utilities
 * 
 * Defines all D&D 5e class features and their combat effects
 */

import { ClassFeature, CharacterResources, DamageType } from '@/types/combat';

/**
 * Get class features for a given class and level
 */
export function getClassFeatures(className: string, level: number): ClassFeature[] {
  const classFeatures: Record<string, (level: number) => ClassFeature[]> = {
    'barbarian': (level: number) => {
      const features: ClassFeature[] = [];
      
      if (level >= 1) {
        features.push({
          name: 'rage',
          description: 'In battle, you fight with primal ferocity. You gain resistance to bludgeoning, piercing, and slashing damage, and bonus damage to Strength-based melee attacks.',
          className: 'barbarian',
          level: 1,
          type: 'bonus_action',
          usesPerRest: 'long',
          maxUses: level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : level < 17 ? 5 : 6,
          currentUses: level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : level < 17 ? 5 : 6
        });
      }
      
      return features;
    },
    
    'rogue': (level: number) => {
      const features: ClassFeature[] = [];
      
      if (level >= 1) {
        features.push({
          name: 'sneak_attack',
          description: 'Once per turn, you can deal extra damage when you hit a target with advantage or when another enemy is within 5 feet of the target.',
          className: 'rogue',
          level: 1,
          type: 'passive',
          usesPerRest: 'none'
        });
      }
      
      if (level >= 5) {
        features.push({
          name: 'uncanny_dodge',
          description: 'When an attacker that you can see hits you with an attack, you can use your reaction to halve the damage.',
          className: 'rogue',
          level: 5,
          type: 'reaction',
          usesPerRest: 'none'
        });
      }
      
      return features;
    },
    
    'fighter': (level: number) => {
      const features: ClassFeature[] = [];
      
      if (level >= 1) {
        features.push({
          name: 'second_wind',
          description: 'You can use a bonus action to regain hit points equal to 1d10 + your fighter level.',
          className: 'fighter',
          level: 1,
          type: 'bonus_action',
          usesPerRest: 'short',
          maxUses: 1,
          currentUses: 1
        });
      }
      
      if (level >= 2) {
        features.push({
          name: 'action_surge',
          description: 'You can take one additional action on top of your regular action and a possible bonus action.',
          className: 'fighter',
          level: 2,
          type: 'active',
          usesPerRest: 'short',
          maxUses: level >= 17 ? 2 : 1,
          currentUses: level >= 17 ? 2 : 1
        });
      }
      
      return features;
    },
    
    'paladin': (level: number) => {
      const features: ClassFeature[] = [];
      
      if (level >= 1) {
        features.push({
          name: 'lay_on_hands',
          description: 'Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest.',
          className: 'paladin',
          level: 1,
          type: 'active',
          usesPerRest: 'long',
          maxUses: level * 5,
          currentUses: level * 5
        });
      }
      
      if (level >= 2) {
        features.push({
          name: 'divine_smite',
          description: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target.',
          className: 'paladin',
          level: 2,
          type: 'passive',
          usesPerRest: 'none'
        });
      }
      
      return features;
    },
    
    'monk': (level: number) => {
      const features: ClassFeature[] = [];
      
      if (level >= 1) {
        features.push({
          name: 'ki',
          description: 'Your training allows you to harness the mystic energy of ki.',
          className: 'monk',
          level: 2,
          type: 'passive',
          usesPerRest: 'short'
        });
      }
      
      if (level >= 3) {
        features.push({
          name: 'deflect_missiles',
          description: 'You can use your reaction to deflect or catch the missile when you are hit by a ranged weapon attack.',
          className: 'monk',
          level: 3,
          type: 'reaction',
          usesPerRest: 'none'
        });
      }
      
      return features;
    },
    
    'bard': (level: number) => {
      const features: ClassFeature[] = [];
      
      if (level >= 1) {
        features.push({
          name: 'bardic_inspiration',
          description: 'You can inspire others through stirring words or music, giving them a Bardic Inspiration die.',
          className: 'bard',
          level: 1,
          type: 'bonus_action',
          usesPerRest: 'short',
          maxUses: level < 5 ? 2 : level < 15 ? 3 : 4,
          currentUses: level < 5 ? 2 : level < 15 ? 3 : 4
        });
      }
      
      return features;
    },
    
    'cleric': (level: number) => {
      const features: ClassFeature[] = [];
      
      if (level >= 2) {
        features.push({
          name: 'channel_divinity',
          description: 'You can channel divine energy to fuel magical effects.',
          className: 'cleric',
          level: 2,
          type: 'active',
          usesPerRest: 'short',
          maxUses: level < 6 ? 1 : level < 18 ? 2 : 3,
          currentUses: level < 6 ? 1 : level < 18 ? 2 : 3
        });
      }
      
      return features;
    }
  };

  return classFeatures[className.toLowerCase()]?.(level) || [];
}

/**
 * Initialize character resources based on class and level
 */
export function getCharacterResources(className: string, level: number): CharacterResources {
  const resources: CharacterResources = {
    hitDice: {
      [`d${getHitDie(className)}`]: { max: level, current: level }
    }
  };

  switch (className.toLowerCase()) {
    case 'barbarian':
      resources.rages = { 
        max: level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : level < 17 ? 5 : 6,
        current: level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : level < 17 ? 5 : 6
      };
      break;
      
    case 'fighter':
      resources.actionSurge = { 
        max: level >= 17 ? 2 : 1, 
        current: level >= 17 ? 2 : 1 
      };
      break;
      
    case 'monk':
      if (level >= 2) {
        resources.kiPoints = { max: level, current: level };
      }
      break;
      
    case 'sorcerer':
      if (level >= 2) {
        resources.sorceryPoints = { max: level, current: level };
      }
      break;
      
    case 'bard':
      resources.bardic_inspiration = { 
        max: level < 5 ? 2 : level < 15 ? 3 : 4,
        current: level < 5 ? 2 : level < 15 ? 3 : 4
      };
      break;
      
    case 'cleric':
    case 'paladin':
      if (level >= 2) {
        resources.channelDivinity = { 
          max: level < 6 ? 1 : level < 18 ? 2 : 3,
          current: level < 6 ? 1 : level < 18 ? 2 : 3
        };
      }
      break;
      
    case 'paladin':
      resources.layOnHands = { max: level * 5, current: level * 5 };
      break;
  }

  return resources;
}

/**
 * Get hit die for a class
 */
function getHitDie(className: string): number {
  const hitDice: Record<string, number> = {
    'barbarian': 12,
    'fighter': 10,
    'paladin': 10,
    'ranger': 10,
    'bard': 8,
    'cleric': 8,
    'druid': 8,
    'monk': 8,
    'rogue': 8,
    'warlock': 8,
    'sorcerer': 6,
    'wizard': 6
  };
  
  return hitDice[className.toLowerCase()] || 8;
}

/**
 * Calculate Barbarian rage damage bonus
 */
export function getRageDamageBonus(level: number): number {
  if (level < 9) return 2;
  if (level < 16) return 3;
  return 4;
}

/**
 * Calculate Rogue sneak attack dice
 */
export function getSneakAttackDice(level: number): number {
  return Math.ceil(level / 2);
}

/**
 * Calculate Monk martial arts die
 */
export function getMartialArtsDie(level: number): number {
  if (level < 5) return 4;
  if (level < 11) return 6;
  if (level < 17) return 8;
  return 10;
}

/**
 * Calculate Bardic Inspiration die
 */
export function getBardicInspirationDie(level: number): number {
  if (level < 5) return 6;
  if (level < 10) return 8;
  if (level < 15) return 10;
  return 12;
}

/**
 * Check if a class feature can be used
 */
export function canUseClassFeature(feature: ClassFeature, resources: CharacterResources): boolean {
  if (feature.type === 'passive') return true;
  if (!feature.maxUses) return true;
  
  // Check specific resource requirements
  switch (feature.name) {
    case 'ki':
      return (resources.kiPoints?.current || 0) > (feature.resourceCost || 1);
    default:
      return (feature.currentUses || 0) > 0;
  }
}

/**
 * Use a class feature (decrement uses or resources)
 */
export function useClassFeature(
  feature: ClassFeature, 
  resources: CharacterResources
): { feature: ClassFeature; resources: CharacterResources } {
  const updatedFeature = { ...feature };
  const updatedResources = { ...resources };
  
  // Handle resource costs (Ki, Sorcery Points, etc.)
  if (feature.resourceCost) {
    switch (feature.name) {
      case 'ki':
        if (updatedResources.kiPoints) {
          updatedResources.kiPoints = {
            ...updatedResources.kiPoints,
            current: Math.max(0, updatedResources.kiPoints.current - feature.resourceCost)
          };
        }
        break;
    }
  } else if (feature.currentUses !== undefined && feature.currentUses > 0) {
    // Handle uses per rest features
    updatedFeature.currentUses = feature.currentUses - 1;
  }
  
  return { feature: updatedFeature, resources: updatedResources };
}

/**
 * Restore class feature uses on rest
 */
export function restoreClassFeatures(
  features: ClassFeature[], 
  resources: CharacterResources,
  restType: 'short' | 'long'
): { features: ClassFeature[]; resources: CharacterResources } {
  const updatedFeatures = features.map(feature => {
    if (feature.usesPerRest === restType || (restType === 'long' && feature.usesPerRest === 'short')) {
      return {
        ...feature,
        currentUses: feature.maxUses || 0
      };
    }
    return feature;
  });
  
  const updatedResources = { ...resources };
  
  // Restore resources
  if (restType === 'short' || restType === 'long') {
    Object.keys(updatedResources).forEach(key => {
      const resource = updatedResources[key as keyof CharacterResources] as any;
      if (resource && typeof resource === 'object' && 'max' in resource) {
        resource.current = resource.max;
      }
    });
  }
  
  return { features: updatedFeatures, resources: updatedResources };
}