import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharacterFinalization from '@/components/character-creation/steps/CharacterFinalization';
import * as AnalyticsModule from '@/services/analytics';

vi.mock('@/services/character-description-generator', () => ({
  characterDescriptionGenerator: {
    generateDescription: vi.fn(async () => ({
      description: 'new desc',
      appearance: 'appearance',
      personality_traits: 'traits',
      backstory_elements: 'backstory',
    })),
  },
}));

vi.mock('@/contexts/CharacterContext', async () => {
  const dispatch = vi.fn();
  return {
    useCharacter: () => ({
      state: { character: { name: 'Hero', description: 'existing', theme: 'fantasy' } },
      dispatch,
    }),
  };
});

// Toast can be a no-op
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: () => {} }) }));

// Silence image generator network usage in this test file
vi.mock('@/services/openrouter-service', () => ({ openRouterService: { uploadImage: vi.fn() } }));

describe('AI regenerate analytics', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('dispatches analytics and triggers description generator on Regenerate click', async () => {
    const spy = vi
      .spyOn(AnalyticsModule.analytics, 'aiRegenerateClicked')
      .mockImplementation(() => {});
    const { characterDescriptionGenerator } = await import(
      '@/services/character-description-generator'
    );

    render(
      <MemoryRouter initialEntries={['/app/characters/create?campaign=cmp-123']}>
        <CharacterFinalization />
      </MemoryRouter>,
    );

    const btn = await screen.findByRole('button', { name: /Regenerate with AI/i });
    fireEvent.click(btn);

    // The handler should be called and analytics dispatched
    expect(spy).toHaveBeenCalled();
    expect(characterDescriptionGenerator.generateDescription).toHaveBeenCalled();
  });
});
