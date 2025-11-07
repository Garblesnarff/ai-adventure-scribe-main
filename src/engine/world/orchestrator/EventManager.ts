/**
 * EventManager - Handles event creation and participant tracking
 *
 * Responsibilities:
 * - Create event entities from narration
 * - Track event participants
 * - Link events to related entities
 */

import { WorldGraph, EntityCreateRequest } from '../types';
import { SceneState, DMAction } from '../../scene/types';
import { IntentProcessor } from './IntentProcessor';

export class EventManager {
  private worldGraph: WorldGraph;
  private intentProcessor: IntentProcessor;

  constructor(worldGraph: WorldGraph, intentProcessor: IntentProcessor) {
    this.worldGraph = worldGraph;
    this.intentProcessor = intentProcessor;
  }

  /**
   * Handle event narration intent
   */
  handleEventNarration(
    text: string,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const eventData = this.intentProcessor.extractEventData(text, sceneState);

    if (!eventData) {
      return;
    }

    const request: EntityCreateRequest = {
      entityType: 'event',
      name: eventData.name,
      description: text,
      confidenceScore: 0.7,
      sourceType: 'player_action',
      metadata: {
        occurredAt: eventData.occurredAt.toISOString()
      }
    };

    const result = this.worldGraph.createEntity(request);

    if (result.success && result.data) {
      const event = result.data;

      actions.push({
        type: 'world_event_created',
        data: {
          event,
          confidence: event.confidenceScore
        }
      } as any);

      sceneState.metadata = sceneState.metadata || {};
      sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities as string[] || []).concat(event.id);
      sceneState.metadata.lastEventAction = {
        eventId: event.id,
        action: 'created',
        timestamp: new Date().toISOString()
      };

      // Link participants to event
      this.linkEventParticipants(event.id, eventData.participants);
    }
  }

  /**
   * Link participants to an event
   */
  private linkEventParticipants(eventId: string, participantNames: string[]): void {
    participantNames.forEach(participantName => {
      const participants = this.worldGraph.queryEntities({ name: participantName });

      if (participants.length > 0) {
        this.worldGraph.createRelationship({
          subjectId: participants[0].id,
          objectId: eventId,
          relationshipType: 'participates_in' as any,
          confidenceScore: 0.6
        });
      }
    });
  }
}
