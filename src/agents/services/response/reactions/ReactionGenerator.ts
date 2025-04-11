import { Character } from '@/types/character';

export class ReactionGenerator {
  generateNPCReactions(character: Character, personality: string = 'neutral'): string[] {
    const reactions = [];
    
    // Race-based reactions
    if (character.race?.name?.toLowerCase() === 'dragonborn') {
      reactions.push('watches with barely concealed awe at your draconic presence');
    }
    
    // Class-based reactions
    if (character.class?.name?.toLowerCase() === 'wizard') {
      reactions.push('eyes your arcane implements with a mixture of respect and caution');
    }

    // Personality-based reactions
    switch (personality.toLowerCase()) {
      case 'friendly':
        reactions.push('smiles warmly and gestures welcomingly');
        break;
      case 'suspicious':
        reactions.push('keeps a careful distance while studying you');
        break;
      case 'mysterious':
        reactions.push('regards you with an enigmatic expression');
        break;
      default:
        reactions.push('regards you with curiosity');
    }

    return reactions;
  }
}