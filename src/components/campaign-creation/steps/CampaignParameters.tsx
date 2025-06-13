import React from 'react';
import { useCampaign } from '@/contexts/campaign-context';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectableCardGroup } from '@/components/ui/selectable-card-group';

/**
 * Predefined options for campaign parameters
 */
// Data arrays (difficultyLevels, campaignLengths, tones) remain the same as they fit the options structure.
const difficultyLevels = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const campaignLengths = [
  { value: 'one-shot', label: 'One-Shot Adventure' },
  { value: 'short', label: 'Short Campaign' },
  { value: 'full', label: 'Full Campaign' },
];

const tones = [
  { value: 'serious', label: 'Serious' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'gritty', label: 'Gritty' },
];

/**
 * Campaign parameters selection component
 * Handles difficulty, length, and tone selection with loading states
 */
const CampaignParameters: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => {
  const { state, dispatch } = useCampaign();

  /**
   * Handles parameter value changes
   * @param field - Parameter field name
   * @param value - Selected parameter value
   */
  const handleParameterChange = (field: string, value: string) => {
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { [field]: value }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((section) => (
          <div key={section}>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Difficulty Level</h3>
        <SelectableCardGroup
          value={state.campaign?.difficulty_level || ''}
          onValueChange={(value) => handleParameterChange('difficulty_level', value)}
          options={difficultyLevels}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign Length</h3>
        <SelectableCardGroup
          value={state.campaign?.campaign_length || ''}
          onValueChange={(value) => handleParameterChange('campaign_length', value)}
          options={campaignLengths}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign Tone</h3>
        <SelectableCardGroup
          value={state.campaign?.tone || ''}
          onValueChange={(value) => handleParameterChange('tone', value)}
          options={tones}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        />
      </div>
    </div>
  );
};

export default CampaignParameters;