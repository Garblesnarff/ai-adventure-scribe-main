import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CampaignProvider } from '@/contexts/CampaignContext';
import CampaignHub from '@/pages/campaigns/CampaignHub';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: '123',
              name: 'Test Campaign',
              description: null,
              genre: null,
              tone: null,
              difficulty_level: null,
              campaign_length: null,
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

const queryClient = new QueryClient();

describe('CampaignHub routing and tabs', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders tabs and overview by default', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CampaignProvider>
          <MemoryRouter initialEntries={['/app/campaigns/123']}>
            <Routes>
              <Route path="/app/campaigns/:id/*" element={<CampaignHub />} />
            </Routes>
          </MemoryRouter>
        </CampaignProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Characters/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /World/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Settings/i })).toBeInTheDocument();
  });
});
