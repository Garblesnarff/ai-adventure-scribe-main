import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCampaign } from '@/contexts/CampaignContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge, Clock, Theater, Zap, Skull } from 'lucide-react';

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
      <div className="space-y-8 parchment animate-fade-in-up">
        {[1, 2, 3].map((section) => (
          <div key={section}>
            <div className="text-center mb-4">
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="choice-btn p-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10 parchment animate-fade-in-up">
      <div>
        <div className="text-center mb-6">
          <Label className="text-xl font-serif font-semibold flex items-center justify-center">
            <Gauge className="h-5 w-5 mr-2 text-infinite-gold" />
            Difficulty Level
          </Label>
          <p className="text-sm text-muted-foreground mt-2">Choose the challenge level for your adventurers</p>
        </div>
        <RadioGroup
          value={state.campaign?.difficulty_level || ''}
          onValueChange={(value) => handleParameterChange('difficulty_level', value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {difficultyLevels.map((level) => {
            const isSelected = state.campaign?.difficulty_level === level.value;
            let colorClass: string;
            switch (level.value) {
              case 'easy':
                colorClass = 'text-green-600';
                break;
              case 'medium':
                colorClass = 'text-amber-600';
                break;
              case 'hard':
                colorClass = 'text-destructive';
                break;
              default:
                colorClass = 'text-foreground';
            }
            return (
              <div
                key={level.value}
                className={`choice-btn p-4 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg border-2 relative overflow-hidden ${
                  isSelected
                    ? 'border-infinite-gold bg-gradient-to-r from-green-50 to-emerald-50 ring-2 ring-infinite-gold/20 animate-pulse'
                    : 'border-amber-200 hover:border-green-500/50 bg-white/60 backdrop-blur-sm'
                }`}
              >
                <div className="flex items-center space-x-3 relative z-10">
                  <RadioGroupItem 
                    value={level.value} 
                    id={`difficulty-${level.value}`} 
                    className="text-infinite-purple"
                  />
                  <div className={`flex items-center ${colorClass}`}>
                    <Gauge className="h-5 w-5" />
                    <Label 
                      htmlFor={`difficulty-${level.value}`} 
                      className="font-medium cursor-pointer leading-tight"
                    >
                      {level.label}
                    </Label>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-infinite-gold/10 to-transparent pointer-events-none"></div>
                )}
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div>
        <div className="text-center mb-6">
          <Label className="text-xl font-serif font-semibold flex items-center justify-center">
            <Clock className="h-5 w-5 mr-2 text-infinite-teal" />
            Campaign Length
          </Label>
          <p className="text-sm text-muted-foreground mt-2">How long will your epic story unfold?</p>
        </div>
        <RadioGroup
          value={state.campaign?.campaign_length || ''}
          onValueChange={(value) => handleParameterChange('campaign_length', value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {campaignLengths.map((length) => {
            const isSelected = state.campaign?.campaign_length === length.value;
            let colorClass: string;
            switch (length.value) {
              case 'one-shot':
                colorClass = 'text-blue-600';
                break;
              case 'short':
                colorClass = 'text-purple-600';
                break;
              case 'full':
                colorClass = 'text-infinite-purple';
                break;
              default:
                colorClass = 'text-foreground';
            }
            return (
              <div
                key={length.value}
                className={`choice-btn p-4 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg border-2 relative overflow-hidden ${
                  isSelected
                    ? 'border-infinite-gold bg-gradient-to-r from-blue-50 to-indigo-50 ring-2 ring-infinite-gold/20 animate-pulse'
                    : 'border-amber-200 hover:border-blue-500/50 bg-white/60 backdrop-blur-sm'
                }`}
              >
                <div className="flex items-center space-x-3 relative z-10">
                  <RadioGroupItem 
                    value={length.value} 
                    id={`length-${length.value}`} 
                    className="text-infinite-purple"
                  />
                  <div className={`flex items-center ${colorClass}`}>
                    <Clock className="h-5 w-5" />
                    <Label 
                      htmlFor={`length-${length.value}`} 
                      className="font-medium cursor-pointer leading-tight"
                    >
                      {length.label}
                    </Label>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-infinite-gold/10 to-transparent pointer-events-none"></div>
                )}
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div>
        <div className="text-center mb-6">
          <Label className="text-xl font-serif font-semibold flex items-center justify-center">
            <Theater className="h-5 w-5 mr-2 text-destructive" />
            Campaign Tone
          </Label>
          <p className="text-sm text-muted-foreground mt-2">What mood will define your adventure?</p>
        </div>
        <RadioGroup
          value={state.campaign?.tone || ''}
          onValueChange={(value) => handleParameterChange('tone', value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {tones.map((tone) => {
            const isSelected = state.campaign?.tone === tone.value;
            let colorClass: string;
            let icon: React.ReactNode;
            switch (tone.value) {
              case 'serious':
                colorClass = 'text-gray-700';
                icon = <Theater className="h-5 w-5" />;
                break;
              case 'humorous':
                colorClass = 'text-yellow-600';
                icon = <Zap className="h-5 w-5" />;
                break;
              case 'gritty':
                colorClass = 'text-destructive';
                icon = <Skull className="h-5 w-5" />;
                break;
              default:
                colorClass = 'text-foreground';
                icon = <Theater className="h-5 w-5" />;
            }
            return (
              <div
                key={tone.value}
                className={`choice-btn p-4 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg border-2 relative overflow-hidden ${
                  isSelected
                    ? 'border-infinite-gold bg-gradient-to-r from-gray-50 to-slate-50 ring-2 ring-infinite-gold/20 animate-pulse'
                    : 'border-amber-200 hover:border-destructive/50 bg-white/60 backdrop-blur-sm'
                }`}
              >
                <div className="flex items-center space-x-3 relative z-10">
                  <RadioGroupItem 
                    value={tone.value} 
                    id={`tone-${tone.value}`} 
                    className="text-infinite-purple"
                  />
                  <div className={`flex items-center ${colorClass}`}>
                    {icon}
                    <Label 
                      htmlFor={`tone-${tone.value}`} 
                      className="font-medium cursor-pointer leading-tight"
                    >
                      {tone.label}
                    </Label>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-infinite-gold/10 to-transparent pointer-events-none"></div>
                )}
              </div>
            );
          })}
        </RadioGroup>
      </div>
    </div>
  );
};

export default CampaignParameters;
