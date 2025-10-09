import { ChatMessage } from '@/types/game';
import logger from '@/lib/logger';

export interface SafetyCommand {
  type: 'x_card' | 'veil' | 'pause' | 'resume';
  triggeredBy: string;
  timestamp: string;
  context?: string;
  autoTriggered?: boolean;
  triggerWord?: string;
}

export interface SafetyCommandResponse {
  isSafetyCommand: boolean;
  command?: SafetyCommand;
  response?: ChatMessage;
  shouldPause?: boolean;
  shouldResume?: boolean;
  shouldProcessNormal?: boolean;
}

// Safety trigger words based on the implementation plan
const SAFETY_TRIGGER_WORDS = {
  x_card: [
    'stop', 'blood', 'gore', 'violence', 'torture', 'abuse', 
    'trauma', 'assault', 'horrible', 'uncomfortable', 'trigger'
  ],
  veil: [
    'suggestive', 'sexual', 'intimate', 'private', 'personal',
    'nsfw', 'explicit', 'mature'
  ],
  pause: [
    'break', 'pause', 'slow down', 'too much', 'overwhelmed'
  ]
};

export class SafetyCommandProcessor {
  private sessionId: string;
  private safetyConfig?: any; // Will be populated from session_config

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Check if message contains explicit safety commands
   */
  checkExplicitSafetyCommands(message: string): SafetyCommandResponse {
    const trimmedMessage = message.trim().toLowerCase();
    
    // Check for explicit /x command
    if (trimmedMessage === '/x' || trimmedMessage.startsWith('/x ')) {
      return this.createXCardResponse(message.trim(), false);
    }
    
    // Check for explicit /veil command
    if (trimmedMessage === '/veil' || trimmedMessage.startsWith('/veil ')) {
      return this.createVeilResponse(message.trim(), false);
    }
    
    // Check for explicit /pause command
    if (trimmedMessage === '/pause' || trimmedMessage.startsWith('/pause ')) {
      return {
        isSafetyCommand: true,
        command: {
          type: 'pause',
          triggeredBy: 'explicit_command',
          timestamp: new Date().toISOString(),
          context: message.trim()
        },
        shouldPause: true
      };
    }
    
    // Check for explicit /resume command
    if (trimmedMessage === '/resume' || trimmedMessage.startsWith('/resume ')) {
      return {
        isSafetyCommand: true,
        command: {
          type: 'resume',
          triggeredBy: 'explicit_command',
          timestamp: new Date().toISOString(),
          context: message.trim()
        },
        shouldResume: true
      };
    }
    
    return { isSafetyCommand: false, shouldProcessNormal: true };
  }

  /**
   * Check for auto-triggered safety commands based on content analysis
   */
  checkAutoTriggerCommands(message: string, aiResponse?: string): SafetyCommandResponse {
    const combinedText = message.toLowerCase() + ' ' + (aiResponse?.toLowerCase() || '');
    
    // Check for X-card triggers
    const xCardTrigger = this.findTriggerWord(combinedText, SAFETY_TRIGGER_WORDS.x_card);
    if (xCardTrigger) {
      return this.createXCardResponse(
        `Auto-triggered by: ${xCardTrigger}`,
        true,
        xCardTrigger
      );
    }
    
    // Check for Veil triggers
    const veilTrigger = this.findTriggerWord(combinedText, SAFETY_TRIGGER_WORDS.veil);
    if (veilTrigger) {
      return this.createVeilResponse(
        `Auto-triggered by: ${veilTrigger}`,
        true,
        veilTrigger
      );
    }
    
    // Check for Pause triggers
    const pauseTrigger = this.findTriggerWord(combinedText, SAFETY_TRIGGER_WORDS.pause);
    if (pauseTrigger) {
      return {
        isSafetyCommand: true,
        command: {
          type: 'pause',
          triggeredBy: 'auto_detect',
          timestamp: new Date().toISOString(),
          context: `Auto-triggered by: ${pauseTrigger}`,
          autoTriggered: true,
          triggerWord: pauseTrigger
        },
        shouldPause: true
      };
    }
    
    return { isSafetyCommand: false, shouldProcessNormal: true };
  }

  private findTriggerWord(text: string, triggerWords: string[]): string | null {
    const words = text.toLowerCase().split(/\s+/);
    for (const trigger of triggerWords) {
      if (words.some(word => word.includes(trigger) || trigger.includes(word))) {
        return trigger;
      }
    }
    return null;
  }

  private createXCardResponse(context: string, autoTriggered: boolean, triggerWord?: string): SafetyCommandResponse {
    return {
      isSafetyCommand: true,
      command: {
        type: 'x_card',
        triggeredBy: autoTriggered ? 'auto_detect' : 'explicit_command',
        timestamp: new Date().toISOString(),
        context,
        autoTriggered,
        triggerWord
      },
      response: {
        text: "🚨 **X-CARD ACTIVATED** 🚨\n\nThe scene has been immediately stopped. The content will be rewound to before the uncomfortable element. We can take a break or continue in a different direction that works for everyone.\n\nYour comfort and safety are the priority. Please take care of yourself.",
        sender: 'system',
        context: {
          intent: 'safety_x_card',
          urgency: 'immediate',
          autoTriggered,
          triggerWord
        }
      },
      shouldPause: true
    };
  }

  private createVeilResponse(context: string, autoTriggered: boolean, triggerWord?: string): SafetyCommandResponse {
    return {
      isSafetyCommand: true,
      command: {
        type: 'veil',
        triggeredBy: autoTriggered ? 'auto_detect' : 'explicit_command',
        timestamp: new Date().toISOString(),
        context,
        autoTriggered,
        triggerWord
      },
      response: {
        text: "🌫️ **VEIL ACTIVATED** 🌫️\n\nThe sensitive content has been faded or skipped. We'll acknowledge what happened off-screen and move to the aftermath or a different scene element.\n\nWe're redirecting to maintain comfort while preserving the narrative flow.",
        sender: 'system',
        context: {
          intent: 'safety_veil',
          urgency: 'moderate',
          autoTriggered,
          triggerWord
        }
      }
    };
  }

  /**
   * Process a safety command and return appropriate response
   */
  async processSafetyCommand(command: SafetyCommand): Promise<ChatMessage> {
    logger.info(`🛡️ [Safety] Processing ${command.type} command:`, {
      type: command.type,
      triggeredBy: command.triggeredBy,
      autoTriggered: command.autoTriggered,
      context: command.context
    });

    // Log to audit trail (would integrate with safety audit trail system)
    await this.logSafetyEvent(command);

    switch (command.type) {
      case 'x_card':
        return this.createXCardResponse(command.context || '', command.autoTriggered || false).response!;
      
      case 'veil':
        return this.createVeilResponse(command.context || '', command.autoTriggered || false).response!;
      
      case 'pause':
        return {
          text: "⏸️ **GAME PAUSED** ⏸️\n\nThe game has been paused. Take all the time you need. Use /resume when you're ready to continue.\n\nYour comfort is important. We'll wait as long as needed.",
          sender: 'system',
          context: {
            intent: 'safety_pause',
            urgency: 'moderate'
          }
        };
      
      case 'resume':
        return {
          text: "▶️ **GAME RESUMED** ▶️\n\nWelcome back! Let's continue from where we left off. If anything becomes uncomfortable, remember you can always use the safety commands.\n\nWhat would you like to do next?",
          sender: 'system',
          context: {
            intent: 'safety_resume'
          }
        };
      
      default:
        return {
          text: "Safety command processed. Your comfort and safety are the priority.",
          sender: 'system',
          context: {
            intent: 'safety_generic'
          }
        };
    }
  }

  private async logSafetyEvent(command: SafetyCommand): Promise<void> {
    // In a full implementation, this would log to the safety audit trail
    // For now, we'll just log locally
    logger.info('🛡️ [Safety Audit]', {
      sessionId: this.sessionId,
      timestamp: command.timestamp,
      commandType: command.type,
      triggeredBy: command.triggeredBy,
      autoTriggered: command.autoTriggered,
      context: command.context,
      triggerWord: command.triggerWord
    });
  }
}

/**
 * Check if a message contains safety commands (both explicit and auto-triggered)
 */
export function checkSafetyCommands(
  message: string, 
  sessionId: string, 
  aiResponse?: string
): SafetyCommandResponse {
  const processor = new SafetyCommandProcessor(sessionId);
  
  // First check for explicit commands
  const explicitCheck = processor.checkExplicitSafetyCommands(message);
  if (explicitCheck.isSafetyCommand) {
    return explicitCheck;
  }
  
  // Then check for auto-triggered commands
  const autoCheck = processor.checkAutoTriggerCommands(message, aiResponse);
  if (autoCheck.isSafetyCommand) {
    return autoCheck;
  }
  
  return { isSafetyCommand: false, shouldProcessNormal: true };
}

/**
 * Process a safety command and return the response message
 */
export async function processSafetyCommand(command: SafetyCommand, sessionId: string): Promise<ChatMessage> {
  const processor = new SafetyCommandProcessor(sessionId);
  return processor.processSafetyCommand(command);
}
