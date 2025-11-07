/**
 * IntentProcessor - Handles text parsing and information extraction from player intents
 *
 * Responsibilities:
 * - Extract entity names, relationships, locations, and events from text
 * - Parse relationship patterns
 * - Analyze action intents for state changes
 */

import { EntityType, RelationshipType } from '../types';
import { SceneState } from '../../scene/types';
import {
  RelationshipPattern,
  EventData,
  RelationshipDetectionPattern
} from './types';
import { EntityTypeInference } from './EntityTypeInference';

export class IntentProcessor {
  private typeInference: EntityTypeInference;

  constructor() {
    this.typeInference = new EntityTypeInference();
  }

  /**
   * Extract entity name from text
   */
  extractEntityName(text: string): string | null {
    const patterns = [
      /(?:the|a|an)\s+([A-Z][a-z]+(?:\s+[a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[a-z]+)*)(?:\s+is|are|was|were)\s+([A-Z][a-z]+)/g,
      /I know\s+([A-Z][a-z]+)/g
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[2];
      }
    }

    return null;
  }

  /**
   * Extract subject name from text (actor in a statement)
   */
  extractSubjectName(text: string): string | null {
    return this.extractEntityName(text);
  }

  /**
   * Extract object name from text (recipient of action)
   */
  extractObjectName(text: string): string | null {
    const patterns = [
      /(?:the|his|her|its)\s+([A-Z][a-z]+(?:\s+id)?)\s*(\w+)/g,
      /(?:my|your|your)\s+([A-Z][a-z]+)/g
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[2];
      }
    }

    return null;
  }

  /**
   * Extract location name from text
   */
  extractLocationName(text: string): string | null {
    const patterns = [
      /(?:to|in|at)\s+([A-Z][a-z]+(?:\s+the\s+([a-z]+)*\s*(?:point|location|place|inn|tavern))/g,
      /(?:arrived at|reached)\s+([A-Z][a-z]+(?:\s+Inn))/g,
      /(?:went to|traveled to|journeyed to)\s+([A-Z][a-z]+)/g,
      /(?:located in|found in)\s+([A-Z][a-z]+)/g
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[2];
      }
    }

    return null;
  }

  /**
   * Parse relationship intent from text
   */
  parseRelationshipIntent(text: string, _sceneState: SceneState): RelationshipPattern | null {
    const patterns: RelationshipDetectionPattern[] = this.getRelationshipPatterns();

    for (const relationship of patterns) {
      for (const pattern of relationship.patterns) {
        const regex = new RegExp(pattern, 'i');
        const match = text.match(regex);
        if (match) {
          const extracted = relationship.extract(text, match);
          return {
            relationshipType: relationship.type,
            subjectName: extracted.subjectName,
            subjectType: this.typeInference.inferEntityType(match[1]) || 'person',
            objectName: extracted.objectName,
            objectType: this.typeInference.inferEntityType(match[2] || match[3]) || 'person'
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract event data from narrative text
   */
  extractEventData(text: string, _sceneState: SceneState): EventData | null {
    const occurredAt = this.extractTimeFromText(text);
    const eventName = this.extractEventName(text);
    const participants = this.extractParticipants(text);

    return { name: eventName, occurredAt, participants };
  }

  /**
   * Infer entity type (delegates to EntityTypeInference)
   */
  inferEntityType(text: string): EntityType {
    return this.typeInference.inferEntityType(text);
  }

  private getRelationshipPatterns(): RelationshipDetectionPattern[] {
    return [
      {
        type: 'friend_of',
        patterns: ['is friends with', 'befriended with', 'friend of the', 'ally with'],
        extract: (_text: string, match: RegExpMatchArray) => ({
          subjectName: match[1],
          objectName: match[2] || match[3]
        })
      },
      {
        type: 'enemy_of',
        patterns: ['is enemies with', 'hates', 'enemy of the', 'opposes'],
        extract: (_text: string, match: RegExpMatchArray) => ({
          subjectName: match[1],
          objectName: match[2] || match[3]
        })
      },
      {
        type: 'parent_of',
        patterns: ['is the parent of', 'is mother of', 'is father of'],
        extract: (_text: string, match: RegExpMatchArray) => ({
          subjectName: match[1],
          objectName: match[2] || match[3]
        })
      },
      {
        type: 'child_of',
        patterns: ['is the child of', 'is son of', 'is daughter of'],
        extract: (_text: string, match: RegExpMatchArray) => ({
          subjectName: match[1],
          objectName: match[2] || match[3]
        })
      },
      {
        type: 'owns',
        patterns: ['owns the', 'has a', 'carries a', 'possesses'],
        extract: (_text: string, match: RegExpMatchArray) => ({
          subjectName: match[1],
          objectName: match[2] || match[3]
        })
      },
      {
        type: 'works_for',
        patterns: ['works for', 'is employed by', 'serves'],
        extract: (_text: string, match: RegExpMatchArray) => ({
          subjectName: match[1],
          objectName: match[2] || match[3]
        })
      }
    ];
  }

  private extractTimeFromText(text: string): Date {
    const timePatterns = [
      /yesterday\s+(\d+)/,
      /(\d+)\s+(?:hours?|minutes?|days?\s+ago)/i,
      /(\d+)\s+days\s+ago/i,
      /last\s+(\d+)\s+days/i,
      /(?:this\s+morning|tonight|evening)/i
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseTimeExpression(match[0]);
      }
    }

    return new Date(); // Default to now
  }

  private extractEventName(text: string): string {
    const namePatterns = [
      /(?:there\s+was|there\s+were)\s+(?:a\s+)?([A-Z][a-z][a-z]+)/,
      /(?:the\s+battle|the\s+fight)\s+of\s+(\w+)/i,
      /(?:the\s+wedding|the\s+funeral|the\s+celebration)/g,
      /(?:the\s+meeting|the\s+council|the\s+court)/g
    ];

    const lowerText = text.toLowerCase();

    for (const pattern of namePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        return match[2] || match[1];
      }
    }

    return 'Unknown Event';
  }

  private extractParticipants(text: string): string[] {
    const participants: string[] = [];
    const participantMatches = text.matchAll(/(?:with|and)\s+([A-Z][a-z]+)?(?:\s+the)?/g);

    for (const match of participantMatches) {
      if (match[1]) {
        participants.push(match[1]);
      }
    }

    return participants;
  }

  private parseTimeExpression(expr: string): Date {
    const now = new Date();
    const lowerExpr = expr.toLowerCase();

    if (lowerExpr.includes('yesterday')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const match = expr.match(/(\d+)\s+(hour|minute|day)/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'hour':
          return new Date(now.getTime() - amount * 60 * 60 * 1000);
        case 'minute':
          return new Date(now.getTime() - amount * 60 * 1000);
        case 'day':
          return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      }
    }

    return now;
  }
}
