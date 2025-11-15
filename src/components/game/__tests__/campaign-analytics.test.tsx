import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GameSidePanel } from '@/components/game/MemoryPanel';
import * as AnalyticsModule from '@/services/analytics';

// Mock contexts used inside GameSidePanel so we don't need full providers
vi.mock('@/contexts/MemoryContext', () => ({
  useMemoryContext: () => ({ memories: [], isLoading: false }),
}));
vi.mock('@/contexts/CharacterContext', () => ({
  useCharacter: () => ({ state: { character: { theme: 'fantasy' } } }),
}));
vi.mock('@/contexts/CombatContext', () => ({
  useCombat: () => ({ state: { isInCombat: false } }),
}));
vi.mock('@/contexts/CampaignContext', () => ({
  useCampaign: () => ({ state: { campaign: { genre: 'high-fantasy' } } }),
}));

// Minimal ScrollArea, Card etc styles are irrelevant in tests

describe('Campaign hub tab analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fires analytics on tab switch to Memories', async () => {
    const spy = vi
      .spyOn(AnalyticsModule.analytics, 'campaignTabViewed')
      .mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/app/game/cmp-123']}>
        <Routes>
          <Route
            path="/app/game/:id"
            element={
              <GameSidePanel
                sessionData={{ session_notes: '' } as any}
                updateGameSessionState={async () => {}}
                combatMode={false}
                isCollapsed={false}
                onToggle={() => {}}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Find any button that, when clicked, switches header to Memories
    const buttons = screen.getAllByRole('button');
    let switched = false;
    for (const btn of buttons) {
      fireEvent.click(btn);
      if (screen.queryByText(/Memories/i)) {
        switched = true;
        break;
      }
    }

    expect(switched).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
});
