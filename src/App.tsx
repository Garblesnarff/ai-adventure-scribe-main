import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './contexts/AuthContext';
import { CampaignProvider } from './contexts/CampaignContext';
import { CharacterProvider } from './contexts/CharacterContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { useTelemetry } from './hooks/use-telemetry';
import { ErrorBoundary } from './shared/components/error/ErrorBoundary';
import Breadcrumbs from './shared/components/layout/breadcrumbs';
import Navigation from './shared/components/layout/navigation';
import { RouteLoading } from './shared/components/RouteLoading';

// Lazy load route page components for code splitting
const Index = lazy(() => import('./pages/Index'));
const Landing = lazy(() => import('./pages/Landing'));
const LaunchPage = lazy(() => import('./pages/LaunchPage'));
const DiceTest = lazy(() => import('./pages/DiceTest'));
const CharacterSheet = lazy(() => import('./features/character/components/sheet/character-sheet'));
const CharacterList = lazy(() => import('./features/character/components/list/character-list'));
const CampaignWizard = lazy(
  () => import('./features/campaign/components/creation/campaign-wizard'),
);
const GameContentWithErrorBoundary = lazy(
  () => import('./features/game-session/components/game/GameContentWithErrorBoundary'),
);
const CharacterCreateEntry = lazy(() => import('./pages/CharacterCreateEntry'));
const CampaignHubWithErrorBoundary = lazy(
  () => import('./pages/campaigns/CampaignHubWithErrorBoundary'),
);
const SceneManagementPage = lazy(() => import('./pages/SceneManagementPage'));
const BattleMapPage = lazy(() => import('./pages/BattleMapPage'));

// TODO [legacy-character-deprecation]: Feature flag for legacy character entry. When disabling legacy character creation, set to false and then remove this flag following docs/cleanup/campaign-character-migration.md
const ENABLE_LEGACY_CHARACTER_ENTRY = true;

/**
 * Create a new QueryClient instance
 * This will be used to manage and cache all React Query operations
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
      retry: 1, // Only retry failed requests once
    },
  },
});

/**
 * Main App component
 * Provides routing and global providers for the application
 */
function App() {
  // Enable global telemetry tracking with crash detection
  useTelemetry({
    enableCrashDetection: true,
  });

  return (
    <ErrorBoundary level="app">
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CharacterProvider>
              <CampaignProvider>
                <Router
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <div className="min-h-screen">
                    {/* Skip to content for keyboard users */}
                    <a
                      href="#main-content"
                      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded"
                    >
                      Skip to content
                    </a>
                    <Routes>
                      {/* Beta Launch Page - new main entry point */}
                      <Route
                        path="/"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <LaunchPage />
                          </Suspense>
                        }
                      />

                      {/* Original landing page - keep as backup */}
                      <Route
                        path="/original-landing"
                        element={
                          <Suspense fallback={<RouteLoading />}>
                            <Landing />
                          </Suspense>
                        }
                      />

                      {/* Protected app routes */}
                      <Route
                        path="/app/*"
                        element={
                          <ProtectedRoute>
                            <Navigation />
                            <Breadcrumbs />
                            <main id="main-content" tabIndex={-1}>
                              <Routes>
                                <Route
                                  path="/"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <Index />
                                    </Suspense>
                                  }
                                />
                                <Route
                                  path="/dice-test"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <DiceTest />
                                    </Suspense>
                                  }
                                />
                                {/* TODO [legacy-character-deprecation]: Legacy character list and creation routes. Gate behind ENABLE_LEGACY_CHARACTER_ENTRY and remove per docs/cleanup/campaign-character-migration.md */}
                                {ENABLE_LEGACY_CHARACTER_ENTRY && (
                                  <Route
                                    path="/characters"
                                    element={
                                      <Suspense fallback={<RouteLoading />}>
                                        <CharacterList />
                                      </Suspense>
                                    }
                                  />
                                )}
                                {ENABLE_LEGACY_CHARACTER_ENTRY && (
                                  <Route
                                    path="/characters/create"
                                    element={
                                      <Suspense fallback={<RouteLoading />}>
                                        <CharacterCreateEntry />
                                      </Suspense>
                                    }
                                  />
                                )}
                                <Route
                                  path="/character/:id"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <CharacterSheet />
                                    </Suspense>
                                  }
                                />
                                <Route
                                  path="/campaigns/create"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <CampaignWizard />
                                    </Suspense>
                                  }
                                />
                                <Route
                                  path="/campaigns/:campaignId/scenes/:sceneId"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <BattleMapPage />
                                    </Suspense>
                                  }
                                />
                                <Route
                                  path="/campaigns/:campaignId/scenes"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <SceneManagementPage />
                                    </Suspense>
                                  }
                                />
                                <Route
                                  path="/campaigns/:id/*"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <CampaignHubWithErrorBoundary />
                                    </Suspense>
                                  }
                                />
                                <Route
                                  path="/game/:id"
                                  element={
                                    <Suspense fallback={<RouteLoading />}>
                                      <GameContentWithErrorBoundary />
                                    </Suspense>
                                  }
                                />
                              </Routes>
                            </main>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                    <Toaster />
                  </div>
                </Router>
              </CampaignProvider>
            </CharacterProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
