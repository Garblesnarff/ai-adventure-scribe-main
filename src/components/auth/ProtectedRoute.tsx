import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from './AuthPage';
import { FantasyLoader } from '@/components/ui/fantasy-loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FantasyLoader
          type="cosmic"
          size="lg"
          label="Authenticating..."
          tip="Verifying your identity in the realm!"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;