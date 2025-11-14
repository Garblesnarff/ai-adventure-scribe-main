import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spy on the CrewAI client respond method to avoid network
import { AgentOrchestrator } from '@/services/crewai/agent-orchestrator';
import * as crewaiClient from '@/services/crewai/crewai-client';

describe('AgentOrchestrator contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates and normalizes CrewAI response (roll-first)', async () => {
    vi.spyOn(crewaiClient.CrewAIClient, 'respond').mockResolvedValue({
      text: '[CrewAI placeholder] roll requested',
      narration_segments: [{ type: 'dm', text: 'After you roll, this will continue.' }],
      roll_requests: [{ type: 'check', formula: '1d20+3', purpose: 'Stealth check', dc: 14 }],
    } as any);

    const out = await AgentOrchestrator.generateResponse({
      message: 'I sneak past the guard',
      context: { campaignId: 'c1', characterId: 'pc1', sessionId: 's1' },
      conversationHistory: [{ id: 'm1', role: 'user', content: 'hello', timestamp: new Date() }],
      sessionState: null,
    });

    expect(Array.isArray(out.narration_segments)).toBe(true);
    expect((out.roll_requests || []).length).toBe(1);
    expect(out.roll_requests?.[0]?.type).toBe('check');
  });

  it('returns safe defaults on invalid shape', async () => {
    vi.spyOn(crewaiClient.CrewAIClient, 'respond').mockResolvedValue({ foo: 'bar' } as any);
    const out = await AgentOrchestrator.generateResponse({
      message: 'Test',
      context: { campaignId: 'c1', characterId: 'pc1', sessionId: 's1' },
    } as any);
    expect(out).toMatchObject({ text: '', narration_segments: [], roll_requests: [] });
  });
});
