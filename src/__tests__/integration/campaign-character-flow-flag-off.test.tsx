import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CharacterCreateEntry from '@/pages/CharacterCreateEntry';

// Mock feature flag to toggle OFF
vi.mock('@/config/featureFlags', () => ({
  isCampaignCharacterFlowEnabled: () => false,
}));

const queryClient = new QueryClient();

describe('CharacterCreateEntry with feature flag OFF', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders legacy character wizard', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/characters/create"]}>
          <Routes>
            <Route path="/app/characters/create" element={<CharacterCreateEntry />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Create Your Character')).toBeInTheDocument();
  });
});
