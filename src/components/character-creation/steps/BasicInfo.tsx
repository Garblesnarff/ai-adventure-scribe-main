import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

/**
 * BasicInfo component for character creation
 * Handles input of character name and optional personality notes
 */
const BasicInfo: React.FC = () => {
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
   * Updates character personality notes in context
   * @param personalityNotes - Basic personality notes from user
   */
  const handlePersonalityNotesChange = (personalityNotes: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { personality_notes: personalityNotes }
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
      <h2 className="text-2xl font-bold text-center mb-6">Create Your Character</h2>
      
      <div className="max-w-md mx-auto space-y-4">
        <div className="space-y-2">
          <Label htmlFor="character-name">Character Name *</Label>
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
          <Label htmlFor="personality-notes">Personality Notes (Optional)</Label>
          <Textarea
            id="personality-notes"
            placeholder="Any initial ideas about your character's personality, quirks, or background..."
            value={state.character?.personality_notes || ''}
            onChange={(e) => handlePersonalityNotesChange(e.target.value)}
            className="min-h-[100px] w-full"
          />
          <p className="text-xs text-muted-foreground">
            These notes will help generate a more detailed description later in the process.
          </p>
        </div>
      </div>
      
      {/* Information card */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md mx-auto">
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">What's Next?</p>
          <p className="text-blue-800 dark:text-blue-200">
            After choosing your character's mechanical aspects (race, class, abilities), we'll use AI to generate a detailed description and portrait based on all your choices.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;