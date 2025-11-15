import { Sword, Users, Home, LogOut, FileText } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/constants/z-index';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Main navigation component that provides consistent navigation across the application
 * Includes links to main sections and visual indicators for current route
 */
const Navigation: React.FC = () => {
  const location = useLocation();
  const { user, signOut, isBlogAdmin } = useAuth();

  /**
   * Helper function to determine if a path is active
   * @param path - The path to check
   * @returns boolean indicating if path is active
   */
  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav
      id="app-nav"
      className={`bg-infinite-dark/95 backdrop-blur supports-[backdrop-filter]:bg-infinite-dark/60 sticky top-0 z-[${Z_INDEX.STICKY}] w-full border-b border-infinite-purple/30`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo/Home */}
          <Link
            to="/app"
            className="flex items-center space-x-2 font-bold text-xl text-infinite-gold hover:text-infinite-gold/80 transition-colors"
          >
            <Sword className="h-6 w-6 text-infinite-purple" />
            <span>InfiniteRealms</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <div className="flex space-x-4">
              <Link
                to="/app"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive('/app') ? 'bg-infinite-purple/20 text-infinite-gold border border-infinite-purple/40' : 'text-infinite-gold/90 hover:text-infinite-gold hover:bg-infinite-purple/10'} focus-visible:ring-2 focus-visible:ring-infinite-gold focus-visible:ring-offset-2 focus-visible:ring-offset-infinite-dark`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
              {/* TODO [legacy-character-deprecation]: Legacy Characters nav item. Remove (or gate behind VITE_FEATURE_ENABLE_LEGACY_CHARACTER_ENTRY) per docs/cleanup/campaign-character-migration.md */}
              <Link
                to="/app/characters"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive('/app/characters') ? 'bg-infinite-purple/20 text-infinite-gold border border-infinite-purple/40' : 'text-infinite-gold/90 hover:text-infinite-gold hover:bg-infinite-purple/10'} focus-visible:ring-2 focus-visible:ring-infinite-gold focus-visible:ring-offset-2 focus-visible:ring-offset-infinite-dark`}
              >
                <Users className="h-4 w-4" />
                <span>Characters</span>
              </Link>
              {isBlogAdmin && (
                <Link
                  to="/app/blog"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive('/app/blog') ? 'bg-infinite-purple/20 text-infinite-gold border border-infinite-purple/40' : 'text-infinite-gold/90 hover:text-infinite-gold hover:bg-infinite-purple/10'} focus-visible:ring-2 focus-visible:ring-infinite-gold focus-visible:ring-offset-2 focus-visible:ring-offset-infinite-dark`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Blog Admin</span>
                </Link>
              )}
            </div>

            {/* User Info and Sign Out */}
            <div className="flex items-center space-x-2 border-l border-border pl-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
