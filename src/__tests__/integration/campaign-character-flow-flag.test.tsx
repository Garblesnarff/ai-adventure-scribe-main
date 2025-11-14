import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharacterCreateEntry from '@/pages/CharacterCreateEntry';

// Mock feature flag to toggle ON
vi.mock('@/config/featureFlags', () => ({
  isCampaignCharacterFlowEnabled: () => true,
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

const queryClient = new QueryClient();

describe('CharacterCreateEntry with feature flag', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('shows campaign picker interstitial when flag is ON', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/characters/create']}>
          <Routes>
            <Route path="/app/characters/create" element={<CharacterCreateEntry />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Choose a Campaign/i)).toBeInTheDocument();
  });
});
