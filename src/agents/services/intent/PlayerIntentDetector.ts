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