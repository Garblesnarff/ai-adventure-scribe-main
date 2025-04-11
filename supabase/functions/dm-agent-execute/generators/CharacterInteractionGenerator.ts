import { CharacterContext } from '../types.ts';

export class CharacterInteractionGenerator {
  generateInteractions(worldId: string, character: CharacterContext) {
    // Generate NPC reactions based on character traits
    const reactions = this.generateNPCReactions(character);
    const dialogue = this.generateNPCDialogue(character);

    return {
      activeNPCs: ['Village Elder', 'Mysterious Merchant', 'Local Guard'],
      reactions,
      dialogue
    };
  }

  private generateNPCReactions(character: CharacterContext): string[] {
    const reactions = [];
    
    // Race-based reactions
    if (character.race.toLowerCase() === 'dragonborn') {
      reactions.push('watches with barely concealed awe at your draconic presence');
    }
    
    // Class-based reactions
    if (character.class.toLowerCase() === 'wizard') {
      reactions.push('eyes your arcane implements with a mixture of respect and caution');
    }

    return reactions.length ? reactions : ['regards you with curiosity'];
  }

  private generateNPCDialogue(character: CharacterContext): string {
    const dialogueOptions = [
      `"We don't see many ${character.race}s in these parts," the village elder remarks.`,
      `"A wielder of the arcane arts? These are... interesting times," a merchant muses quietly.`,
      `"Welcome to our humble village," the guard says, though their eyes betray a mix of wonder and unease.`
    ];

    return dialogueOptions[Math.floor(Math.random() * dialogueOptions.length)];
  }
}