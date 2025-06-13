import React from 'react';
import { useCampaign } from '@/contexts/campaign-context';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectableCardGroup } from '@/components/ui/selectable-card-group';

// genres array structure already matches the options prop structure.
const genres = [
  { value: 'traditional-fantasy', label: 'Traditional Fantasy' },
  { value: 'dark-fantasy', label: 'Dark Fantasy' },
  { value: 'high-fantasy', label: 'High Fantasy' },
  { value: 'science-fantasy', label: 'Science Fantasy' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'horror', label: 'Horror' },
];

/**
 * Genre selection component for campaign creation
 * Includes loading states and validation feedback
 */
const GenreSelection: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => {
  const { state, dispatch } = useCampaign();

  /**
   * Handles genre selection change
   * @param value - Selected genre value
   */
  const handleGenreChange = (value: string) => {
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { genre: value }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Choose Campaign Genre</h2>
        <SelectableCardGroup
          value={state.campaign?.genre || ''}
          onValueChange={handleGenreChange}
          options={genres}
          className="grid grid-cols-1 md:grid-cols-2 gap-4" // Standard grid layout
        />
      </div>
    </div>
  );
};

export default GenreSelection;