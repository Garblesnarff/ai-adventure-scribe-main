import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/Index';
import CharacterSheet from './components/character-sheet/character-sheet';
import CharacterList from './components/character-list/character-list';
import CharacterWizard from './components/character-creation/character-wizard';
import CampaignWizard from './components/campaign-creation/campaign-wizard';
import CampaignView from './components/campaign-view/CampaignView';
import Navigation from './components/layout/navigation';
import Breadcrumbs from './components/layout/breadcrumbs';
import SubscriptionPlans from './components/subscription/SubscriptionPlans'; // Import new component
import UsageDashboard from './components/subscription/UsageDashboard';   // Import new component
import BillingHistory from './components/subscription/BillingHistory';   // Import new component
// import PaymentSuccessPage from './pages/PaymentSuccessPage'; // Example for later
// import PaymentCancelPage from './pages/PaymentCancelPage';   // Example for later


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

              {/* Subscription Routes */}
              <Route path="/subscribe" element={<SubscriptionPlansPage />} />
              <Route path="/account/subscription" element={<UserSubscriptionManagementPage />} />
              {/* Example payment status pages - these would need actual components */}
              {/* <Route path="/payment/success" element={<PaymentSuccessPage />} /> */}
              {/* <Route path="/payment/canceled" element={<PaymentCancelPage />} /> */}

            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

// Helper components to use hooks within route elements if needed, or pass data via context/props
// For now, directly using components. If they need data from `useSubscription` at page level,
// these wrapper pages would instantiate the hook.
// For this iteration, assuming SubscriptionPlans, UsageDashboard, BillingHistory manage their own data fetching via hooks.

const SubscriptionPlansPage = () => {
  // const { subscription } = useSubscription(); // Example if this page needed to pass data down
  return <SubscriptionPlans /* currentUserSubscription={subscription} */ />;
};

const UserSubscriptionManagementPage = () => {
  // This page could combine UsageDashboard and BillingHistory, or link to them.
  // For simplicity, let's assume it's primarily the dashboard.
  // Hooks are used within UsageDashboard and BillingHistory directly.
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">My Subscription</h2>
      <div className="space-y-8">
        <UsageDashboard />
        <BillingHistory />
      </div>
    </div>
  );
};


export default App;
