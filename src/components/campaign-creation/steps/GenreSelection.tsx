import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCampaign } from '@/contexts/CampaignContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Sword, Skull, Zap, Gavel, Anchor } from 'lucide-react';

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
      <div className="space-y-8 parchment animate-fade-in-up">
        <div className="text-center mb-6">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="choice-btn p-4">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 parchment animate-fade-in-up">
      <div className="text-center mb-6">
        <Label className="text-xl font-serif font-semibold flex items-center justify-center">
          <BookOpen className="h-5 w-5 mr-2 text-infinite-purple" />
          Choose Your Campaign Genre
        </Label>
        <p className="text-sm text-muted-foreground mt-2">Select the world and tone for your epic adventure</p>
      </div>
      <RadioGroup
        value={state.campaign?.genre || ''}
        onValueChange={handleGenreChange}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {genres.map((genre) => {
          const isSelected = state.campaign?.genre === genre.value;
          let icon: React.ReactNode;
          let colorClass: string;

          switch (genre.value) {
            case 'traditional-fantasy':
              icon = <Sword className="h-5 w-5" />;
              colorClass = 'text-infinite-gold';
              break;
            case 'dark-fantasy':
              icon = <Skull className="h-5 w-5" />;
              colorClass = 'text-destructive';
              break;
            case 'high-fantasy':
              icon = <Zap className="h-5 w-5" />;
              colorClass = 'text-infinite-purple';
              break;
            case 'science-fantasy':
              icon = <Gavel className="h-5 w-5" />;
              colorClass = 'text-infinite-teal';
              break;
            case 'steampunk':
              icon = <Anchor className="h-5 w-5" />;
              colorClass = 'text-amber-600';
              break;
            case 'horror':
              icon = <BookOpen className="h-5 w-5" />;
              colorClass = 'text-gray-600';
              break;
            default:
              icon = <BookOpen className="h-5 w-5" />;
              colorClass = 'text-foreground';
          }

          return (
            <div
              key={genre.value}
              className={`choice-btn p-4 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg border-2 relative overflow-hidden ${
                isSelected
                  ? 'border-infinite-gold bg-gradient-to-r from-amber-50 to-yellow-50 ring-2 ring-infinite-gold/20 animate-pulse'
                  : 'border-amber-200 hover:border-infinite-gold/50 bg-white/60 backdrop-blur-sm'
              }`}
            >
              <div className="flex items-center space-x-3 relative z-10">
                <RadioGroupItem 
                  value={genre.value} 
                  id={genre.value} 
                  className="text-infinite-purple"
                />
                <div className={`flex items-center ${colorClass}`}>
                  {icon}
                  <Label 
                    htmlFor={genre.value} 
                    className="font-medium cursor-pointer leading-tight"
                  >
                    {genre.label}
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
  );
};

export default GenreSelection;
