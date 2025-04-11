import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/Index';
import CharacterSheet from './components/character-sheet/CharacterSheet';
import CharacterList from './components/character-list/CharacterList';
import CharacterWizard from './components/character-creation/CharacterWizard';
import CampaignWizard from './components/campaign-creation/CampaignWizard';
import CampaignView from './components/campaign-view/CampaignView';
import Navigation from './components/layout/Navigation';
import Breadcrumbs from './components/layout/Breadcrumbs';

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
      <Router>
        <div className="min-h-screen bg-background">
          <Navigation />
          <Breadcrumbs />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/characters" element={<CharacterList />} />
              <Route path="/characters/create" element={<CharacterWizard />} />
              <Route path="/character/:id" element={<CharacterSheet />} />
              <Route path="/campaigns/create" element={<CampaignWizard />} />
              <Route path="/campaign/:id" element={<CampaignView />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;