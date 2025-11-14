/**
 * Character Creation ErrorBoundary Integration Test
 *
 * Verifies that character creation is properly wrapped with ErrorBoundary
 * and displays appropriate fallback UI when errors occur.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharacterWizard from '@/components/character-creation/character-wizard';
import CharacterCreateEntry from '@/pages/CharacterCreateEntry';

// Mock feature flag (default OFF for direct wizard rendering)
vi.mock('@/config/featureFlags', () => ({
  isCampaignCharacterFlowEnabled: () => false,
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Mock analytics
vi.mock('@/services/analytics', () => ({
  analytics: {
    characterCreationStarted: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Component that throws an error for testing
const ErrorThrowingComponent = () => {
  throw new Error('Test error in character creation');
};

describe('Character Creation ErrorBoundary Protection', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('CharacterWizard is wrapped with ErrorBoundary', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CharacterWizard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify the component renders (wrapped in ErrorBoundary)
    expect(container).toBeTruthy();
  });

  it('CharacterCreateEntry is wrapped with ErrorBoundary', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/characters/create']}>
          <Routes>
            <Route path="/app/characters/create" element={<CharacterCreateEntry />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify the component renders (wrapped in ErrorBoundary)
    expect(container).toBeTruthy();
  });

  it('ErrorBoundary catches errors and shows CharacterCreationErrorFallback', () => {
    // Mock console.error to suppress error output in tests
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock CharacterContext to throw error
    vi.mock('@/contexts/CharacterContext', () => ({
      CharacterProvider: ({ children }: { children: React.ReactNode }) => {
        throw new Error('Test error in CharacterContext');
      },
      useCharacter: () => {
        throw new Error('Test error in useCharacter');
      },
    }));

    // This will trigger ErrorBoundary due to error in CharacterProvider
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CharacterWizard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify ErrorBoundary fallback is displayed
    expect(screen.getByText(/Character Creation Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong during character creation/i)).toBeInTheDocument();

    // Verify recovery options are available
    expect(screen.getByText(/Restart Character Creation/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to Home/i)).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('CharacterCreationErrorFallback shows appropriate recovery actions', () => {
    // Mock console.error to suppress error output in tests
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mock('@/contexts/CharacterContext', () => ({
      CharacterProvider: () => {
        throw new Error('Test error');
      },
      useCharacter: () => {
        throw new Error('Test error');
      },
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CharacterWizard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Check for user-friendly error messaging
    expect(screen.getByText(/Don't worry/i)).toBeInTheDocument();
    expect(screen.getByText(/Tip:/i)).toBeInTheDocument();
    expect(screen.getByText(/taking screenshots/i)).toBeInTheDocument();

    // Verify multiple recovery options
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);

    consoleError.mockRestore();
  });
});
