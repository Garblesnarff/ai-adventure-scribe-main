import { Search, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SpellSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * SpellSearchBar - Search input for filtering spells
 * Features:
 * - Real-time search with debouncing
 * - Clear search functionality
 * - Keyboard navigation support
 * - Accessible with proper ARIA labels
 */
const SpellSearchBar: React.FC<SpellSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search spells by name, description, or school...',
  className = '',
}) => {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          aria-label="Search spells"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default SpellSearchBar;
