import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumbs component for navigation hierarchy
 * Automatically generates breadcrumbs based on current route
 */
const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  /**
   * Generates a human-readable label from a URL segment
   * @param segment - URL path segment
   * @returns Formatted string for display
   */
  const getLabel = (segment: string): string => {
    // Remove any URL parameters
    segment = segment.split('?')[0];
    // Capitalize first letter and add spaces before capital letters
    return segment
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  /**
   * Builds the complete path up to a specific segment
   * @param index - Index of the current segment
   * @returns Complete path string
   */
  const buildPath = (index: number): string => {
    return '/' + pathSegments.slice(0, index + 1).join('/');
  };

  if (pathSegments.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link
          to="/"
          className="hover:text-foreground transition-colors"
        >
          Home
        </Link>
        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4" />
            <Link
              to={buildPath(index)}
              className="hover:text-foreground transition-colors"
            >
              {getLabel(segment)}
            </Link>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Breadcrumbs;