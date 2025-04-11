import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sword, Users, Map, Home } from 'lucide-react';

/**
 * Main navigation component that provides consistent navigation across the application
 * Includes links to main sections and visual indicators for current route
 */
const Navigation: React.FC = () => {
  const location = useLocation();
  
  /**
   * Helper function to determine if a path is active
   * @param path - The path to check
   * @returns boolean indicating if path is active
   */
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo/Home */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 font-bold text-xl"
          >
            <Sword className="h-6 w-6" />
            <span>D&D AI</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive('/') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link
              to="/characters"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive('/characters') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Users className="h-4 w-4" />
              <span>Characters</span>
            </Link>
            <Link
              to="/campaigns"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive('/campaigns') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Map className="h-4 w-4" />
              <span>Campaigns</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;