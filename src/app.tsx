import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/index';
import CharacterSheet from './components/character-sheet/character-sheet';
import CharacterList from './components/character-list/character-list';
import CharacterWizard from './components/character-creation/character-wizard';
import CampaignWizard from './components/campaign-creation/campaign-wizard';
import CampaignView from './components/campaign-view/campaign-view';
import Navigation from './components/layout/navigation';
import Breadcrumbs from './components/layout/breadcrumbs';

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
