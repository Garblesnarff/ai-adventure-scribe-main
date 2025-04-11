import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

/**
 * NameDescription component for character creation
 * Handles input and validation of character name and description
 */
const NameDescription: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();

  /**
   * Updates character name in context
   * @param name - New character name
   */
  const handleNameChange = (name: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { name }
    });
  };

  /**
   * Updates character description in context
   * @param description - New character description
   */
  const handleDescriptionChange = (description: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { description }
    });
  };

  /**
   * Validates input when focus is lost
   * Shows toast notification if name is empty
   */
  const handleNameBlur = () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your character.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-6">Name Your Character</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="character-name">Character Name</Label>
          <Input
            id="character-name"
            placeholder="Enter character name"
            value={state.character?.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={handleNameBlur}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="character-description">Character Description</Label>
          <Textarea
            id="character-description"
            placeholder="Describe your character's appearance, personality, and background..."
            value={state.character?.description || ''}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="min-h-[150px] w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default NameDescription;