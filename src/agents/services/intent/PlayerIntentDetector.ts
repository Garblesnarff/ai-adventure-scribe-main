/**
 * Player Intent Detector
 * 
 * This file defines the PlayerIntentDetector class, responsible for detecting
 * the player's intent based on their input message. It uses keyword matching
 * to classify intent into categories like 'dialogue', 'exploration', or 'other'.
 * 
 * Main Class:
 * - PlayerIntentDetector: Detects player intent from text messages.
 * 
 * Key Dependencies: None external.
 * 
 * @author AI Dungeon Master Team
 */

export type PlayerIntent = 'dialogue' | 'exploration' | 'other';

export class PlayerIntentDetector {
  private dialogueKeywords = ['talk', 'speak', 'chat', 'ask', 'tell', 'say', 'greet'];
  private explorationKeywords = ['explore', 'look', 'search', 'investigate', 'examine'];

  public detectIntent(message: string): PlayerIntent {
    message = message.toLowerCase();
    
    if (this.dialogueKeywords.some(keyword => message.includes(keyword))) {
      return 'dialogue';
    }
    if (this.explorationKeywords.some(keyword => message.includes(keyword))) {
      return 'exploration';
    }
    return 'other';
  }
}