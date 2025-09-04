import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Index from './pages/Index';
import Landing from './pages/Landing';
import CharacterSheet from './components/character-sheet/character-sheet';
import CharacterList from './components/character-list/character-list';
import CharacterWizard from './components/character-creation/character-wizard';
import CampaignWizard from './components/campaign-creation/campaign-wizard';
import { SimpleCampaignView } from './components/campaign-view/SimpleCampaignView';
import Navigation from './components/layout/navigation';
import Breadcrumbs from './components/layout/breadcrumbs';
import { CharacterProvider } from './contexts/CharacterContext';
import { CampaignProvider } from './contexts/CampaignContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CharacterProvider>
          <CampaignProvider>
            <Router>
              <div className="min-h-screen">
                <Routes>
                  {/* Public landing page */}
                  <Route path="/welcome" element={<Landing />} />
                  
                  {/* Protected app routes */}
                  <Route path="/*" element={
                    <ProtectedRoute>
                      <Navigation />
                      <Breadcrumbs />
                      <main>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/characters" element={<CharacterList />} />
                          <Route path="/characters/create" element={<CharacterWizard />} />
                          <Route path="/character/:id" element={<CharacterSheet />} />
                          <Route path="/campaigns/create" element={<CampaignWizard />} />
                          <Route path="/campaign/:id" element={<SimpleCampaignView />} />
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
  );
}

export default App;
