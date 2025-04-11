import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card } from '@/components/ui/card';
import { backgrounds } from '@/data/backgroundOptions';
import { CharacterBackground } from '@/types/character';
import { useToast } from '@/components/ui/use-toast';

/**
 * Component for selecting character background during character creation
 * Displays available backgrounds with their features and handles selection
 */
const BackgroundSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();

  /**
   * Handles the selection of a background
   * Updates character state and shows confirmation toast
   */
  const handleBackgroundSelect = (background: CharacterBackground) => {
    console.log('Selecting background:', background);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { background }
    });
    
    toast({
      title: "Background Selected",
      description: `You have chosen the ${background.name} background.`,
      duration: 1000,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">Choose Your Background</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {backgrounds.map((background) => {
          const isSelected = state.character?.background?.id === background.id;
          
          return (
            <Card 
              key={background.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                isSelected ? 'border-primary bg-accent/10' : 'border-transparent'
              }`}
              onClick={() => handleBackgroundSelect(background)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackgroundSelect(background);
                }
              }}
            >
              <h3 className="text-xl font-semibold mb-2">{background.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{background.description}</p>
              <div className="text-sm space-y-2">
                <div>
                  <p className="font-medium">Skill Proficiencies:</p>
                  <p>{background.skillProficiencies.join(', ')}</p>
                </div>
                {background.toolProficiencies.length > 0 && (
                  <div>
                    <p className="font-medium">Tool Proficiencies:</p>
                    <p>{background.toolProficiencies.join(', ')}</p>
                  </div>
                )}
                {background.languages > 0 && (
                  <div>
                    <p className="font-medium">Languages:</p>
                    <p>Choose {background.languages} additional language{background.languages > 1 ? 's' : ''}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium">Feature: {background.feature.name}</p>
                  <p className="text-sm text-gray-600">{background.feature.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BackgroundSelection;