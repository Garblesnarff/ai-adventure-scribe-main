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
    const msg = (message || '').toLowerCase().trim();
    if (!msg) return 'other';

    const firstIndex = (keywords: string[]) => {
      let idx = -1;
      for (const kw of keywords) {
        const i = msg.indexOf(kw);
        if (i !== -1 && (idx === -1 || i < idx)) idx = i;
      }
      return idx;
    };

    const dialogueIdx = firstIndex(this.dialogueKeywords);
    const explorationIdx = firstIndex(this.explorationKeywords);

    if (dialogueIdx === -1 && explorationIdx === -1) return 'other';
    if (dialogueIdx === -1) return 'exploration';
    if (explorationIdx === -1) return 'dialogue';
    return dialogueIdx <= explorationIdx ? 'dialogue' : 'exploration';
  }
}
