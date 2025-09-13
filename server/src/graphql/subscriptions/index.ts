import { PubSub } from 'graphql-subscriptions';

// Create a PubSub instance for managing subscriptions
export const pubSub = new PubSub();

// Subscription topics
export const SUBSCRIPTION_TOPICS = {
  // Chat and AI responses
  CHAT_RESPONSE: (sessionId: string) => `CHAT_RESPONSE_${sessionId}`,
  DM_RESPONSE: (sessionId: string) => `DM_RESPONSE_${sessionId}`,
  
  // Memory updates
  MEMORY_UPDATED: (sessionId: string) => `MEMORY_UPDATED_${sessionId}`,
  
  // Campaign updates
  CAMPAIGN_UPDATED: (campaignId: string) => `CAMPAIGN_UPDATED_${campaignId}`,
  
  // Character updates
  CHARACTER_UPDATED: (characterId: string) => `CHARACTER_UPDATED_${characterId}`,
} as const;

// Helper functions for publishing events
export const publishChatResponse = (sessionId: string, response: any) => {
  pubSub.publish(SUBSCRIPTION_TOPICS.CHAT_RESPONSE(sessionId), response);
};

export const publishDMResponse = (sessionId: string, response: any) => {
  pubSub.publish(SUBSCRIPTION_TOPICS.DM_RESPONSE(sessionId), response);
};

export const publishMemoryUpdate = (sessionId: string, memory: any) => {
  pubSub.publish(SUBSCRIPTION_TOPICS.MEMORY_UPDATED(sessionId), memory);
};

export const publishCampaignUpdate = (campaignId: string, campaign: any) => {
  pubSub.publish(SUBSCRIPTION_TOPICS.CAMPAIGN_UPDATED(campaignId), campaign);
};

export const publishCharacterUpdate = (characterId: string, character: any) => {
  pubSub.publish(SUBSCRIPTION_TOPICS.CHARACTER_UPDATED(characterId), character);
};