import { Plus } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateNew: () => void;
}

/**
 * EmptyState component displayed when no characters exist
 * Provides a call-to-action to create the first character
 * @param onCreateNew - Callback function to handle character creation
 */
const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNew }) => {
  return (
    <div className="text-center py-8">
      <p className="text-gray-600 mb-4">You haven't created any characters yet.</p>
      <Button onClick={onCreateNew} className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Create Your First Character
      </Button>
    </div>
  );
};

export default EmptyState;
