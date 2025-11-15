import { describe, expect, it, vi } from 'vitest';

import type { ConversationState } from '@/agents/services/conversation/ConversationStateManager';
import type { AgentResult, AgentTask } from '@/agents/types';

import { ResponsePipeline } from '@/agents/services/response/ResponsePipeline';

class FakeCoordinator {
  initialize = vi.fn(async () => {});
  hydrateConversation = vi.fn(() => {});
  getConversationSnapshot = vi.fn(
    () =>
      ({
        currentNPC: 'Test NPC',
        dialogueHistory: [],
        playerChoices: [],
        lastResponse: null,
      }) as ConversationState,
  );
  generateResponse = vi.fn(
    async () =>
      ({
        success: true,
        message: 'ok',
        data: {},
      }) satisfies AgentResult,
  );
}

class FakeCampaignProvider {
  fetchCampaignDetails = vi.fn(async () => ({ id: 'camp-1', name: 'Test Campaign' }));
}

class FakeConversationStore {
  load = vi.fn(
    async () =>
      ({
        currentNPC: null,
        dialogueHistory: [],
        playerChoices: [],
        lastResponse: null,
      }) as ConversationState,
  );
  save = vi.fn(async () => {});
}

describe('ResponsePipeline', () => {
  it('fails gracefully when context is missing', async () => {
    const coordinator = new FakeCoordinator();
    const provider = new FakeCampaignProvider();
    const store = new FakeConversationStore();
    const pipeline = new ResponsePipeline({
      responseCoordinator: coordinator as any,
      campaignProvider: provider as any,
      conversationStore: store as any,
    });

    const task: AgentTask = {
      id: 'task-1',
      description: 'Test',
      expectedOutput: 'narrative',
      context: {},
    };

    const { result } = await pipeline.execute(task);

    expect(result.success).toBe(false);
    expect(coordinator.initialize).not.toHaveBeenCalled();
  });

  it('initializes coordinator and persists conversation snapshot', async () => {
    const coordinator = new FakeCoordinator();
    const provider = new FakeCampaignProvider();
    const store = new FakeConversationStore();
    const pipeline = new ResponsePipeline({
      responseCoordinator: coordinator as any,
      campaignProvider: provider as any,
      conversationStore: store as any,
    });

    const task: AgentTask = {
      id: 'task-2',
      description: 'Test',
      expectedOutput: 'narrative',
      context: {
        campaignId: 'camp-1',
        sessionId: 'session-1',
      },
    };

    const { result } = await pipeline.execute(task);

    expect(result.success).toBe(true);
    expect(coordinator.initialize).toHaveBeenCalledWith('camp-1', 'session-1');
    expect(store.save).toHaveBeenCalled();
  });
});
