import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignProvider } from '@/contexts/CampaignContext';
import CampaignHub from '@/pages/campaigns/CampaignHub';

// Mock Supabase client to support campaigns, characters, and storage calls used by Overview
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'campaigns') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: '123',
                  name: 'Test Campaign',
                  description: 'A test campaign description',
                  genre: 'Fantasy',
                  tone: 'Serious',
                  difficulty_level: 'Medium',
                  campaign_length: 'short',
                  background_image: null
                },
                error: null
              })
            })
          })
        };
      }
      if (table === 'characters') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null })
            })
          })
        };
      }
      return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
    },
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/${path}` }, error: null })
      })
    }
  }
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
          <MemoryRouter initialEntries={["/app/campaigns/123"]}>
            <Routes>
              <Route path="/app/campaigns/:id/*" element={<CampaignHub />} />
            </Routes>
          </MemoryRouter>
        </CampaignProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Characters/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /World/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Settings/i })).toBeInTheDocument();

    // Overview content
    expect(await screen.findByText(/About/i)).toBeInTheDocument();
    expect(screen.getByText(/Gallery/i)).toBeInTheDocument();
  });
});
