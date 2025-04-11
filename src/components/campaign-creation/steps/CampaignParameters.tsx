import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCampaign } from '@/contexts/CampaignContext';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Predefined options for campaign parameters
 */
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
        <RadioGroup
          value={state.campaign?.difficulty_level || ''}
          onValueChange={(value) => handleParameterChange('difficulty_level', value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {difficultyLevels.map((level) => (
            <Card
              key={level.value}
              className={`p-4 cursor-pointer transition-all border-2 ${
                state.campaign?.difficulty_level === level.value
                  ? 'border-primary bg-accent/10'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={level.value} id={`difficulty-${level.value}`} />
                <Label htmlFor={`difficulty-${level.value}`}>{level.label}</Label>
              </div>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign Length</h3>
        <RadioGroup
          value={state.campaign?.campaign_length || ''}
          onValueChange={(value) => handleParameterChange('campaign_length', value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {campaignLengths.map((length) => (
            <Card
              key={length.value}
              className={`p-4 cursor-pointer transition-all border-2 ${
                state.campaign?.campaign_length === length.value
                  ? 'border-primary bg-accent/10'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={length.value} id={`length-${length.value}`} />
                <Label htmlFor={`length-${length.value}`}>{length.label}</Label>
              </div>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign Tone</h3>
        <RadioGroup
          value={state.campaign?.tone || ''}
          onValueChange={(value) => handleParameterChange('tone', value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {tones.map((tone) => (
            <Card
              key={tone.value}
              className={`p-4 cursor-pointer transition-all border-2 ${
                state.campaign?.tone === tone.value
                  ? 'border-primary bg-accent/10'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={tone.value} id={`tone-${tone.value}`} />
                <Label htmlFor={`tone-${tone.value}`}>{tone.label}</Label>
              </div>
            </Card>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};

export default CampaignParameters;