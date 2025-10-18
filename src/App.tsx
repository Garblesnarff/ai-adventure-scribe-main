import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import Index from './pages/Index';
import Landing from './pages/Landing';
import LaunchPage from './pages/LaunchPage';
import DiceTest from './pages/DiceTest';
import CharacterSheet from './components/character-sheet/character-sheet';
import CharacterList from './components/character-list/character-list';
import CharacterWizard from './components/character-creation/character-wizard';
import CampaignWizard from './components/campaign-creation/campaign-wizard';
import { SimpleCampaignView } from './components/campaign-view/SimpleCampaignView';
import GameContent from './components/game/GameContent';
import Navigation from './components/layout/navigation';
import Breadcrumbs from './components/layout/breadcrumbs';
import { CharacterProvider } from './contexts/CharacterContext';
import { CampaignProvider } from './contexts/CampaignContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import BlogAdmin from './pages/BlogAdmin';

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
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CharacterProvider>
            <CampaignProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
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
                    <Route path="/" element={<LaunchPage />} />

                    {/* Original landing page - keep as backup */}
                    <Route path="/original-landing" element={<Landing />} />

                    {/* Protected app routes */}
                    <Route path="/app/*" element={
                      <ProtectedRoute>
                        <Navigation />
                        <Breadcrumbs />
                        <main id="main-content" tabIndex={-1}>
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/dice-test" element={<DiceTest />} />
                            {/* TODO [legacy-character-deprecation]: Legacy character list and creation routes. Gate behind ENABLE_LEGACY_CHARACTER_ENTRY and remove per docs/cleanup/campaign-character-migration.md */}
                            {ENABLE_LEGACY_CHARACTER_ENTRY && <Route path="/characters" element={<CharacterList />} />}
                            {ENABLE_LEGACY_CHARACTER_ENTRY && <Route path="/characters/create" element={<CharacterWizard />} />}
                            <Route path="/character/:id" element={<CharacterSheet />} />
                            <Route path="/campaigns/create" element={<CampaignWizard />} />
                            <Route path="/campaign/:id" element={<SimpleCampaignView />} />
                            <Route path="/game/:id" element={<GameContent />} />
                            <Route path="/blog" element={<BlogAdmin />} />
                          </Routes>
                        </main>
                      </ProtectedRoute>
                    } />
                  </Routes>
                  <Toaster />
                </div>
              </Router>
            </CampaignProvider>
          </CharacterProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
