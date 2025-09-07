import React, { useState } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { characterDescriptionGenerator } from '@/services/character-description-generator';
import { characterImageGenerator } from '@/services/character-image-generator';
import { Loader2, Sparkles, Image as ImageIcon, Wand2, CheckCircle } from 'lucide-react';

/**
 * CharacterFinalization component for character creation
 * Final step to review character, generate AI description and portrait
 */
const CharacterFinalization: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
   * Generate enhanced character description using AI with full character context
   */
  const handleGenerateDescription = async () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: "Character Incomplete",
        description: "Character name is required for description generation.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const characterData = {
        name: state.character.name,
        description: state.character.description,
        race: state.character.race?.name || null,
        class: state.character.class?.name || null,
        background: state.character.background?.name || null,
        alignment: state.character.alignment || null,
        personality_notes: state.character.personality_notes || null,
        abilityScores: state.character.abilityScores || null,
      };

      const enhancedDescription = await characterDescriptionGenerator.generateDescription(
        characterData,
        {
          enhanceExisting: Boolean(state.character.description?.trim()),
          includeBackstory: true,
          includePersonality: true,
          includeAppearance: true,
          tone: 'heroic'
        }
      );

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          description: enhancedDescription.description,
          appearance: enhancedDescription.appearance,
          personality_traits: enhancedDescription.personality_traits,
          backstory_elements: enhancedDescription.backstory_elements
        }
      });

      toast({
        title: "Description Generated",
        description: "Your character's description has been enhanced with AI using all your character choices!",
      });

    } catch (error) {
      console.error('Failed to generate description:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate character description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  /**
   * Generate character portrait using AI with full character context
   */
  const handleGenerateImage = async () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: "Character Incomplete",
        description: "Character name is required for image generation.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const characterData = {
        name: state.character.name,
        description: state.character.description,
        race: state.character.race?.name || null,
        class: state.character.class?.name || null,
        background: state.character.background?.name || null,
        alignment: state.character.alignment || null,
        appearance: state.character.appearance,
        personality_traits: state.character.personality_traits,
        personality_notes: state.character.personality_notes,
      };

      const imageUrl = await characterImageGenerator.generateCharacterImage(
        characterData,
        { style: 'portrait' }
      );

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { image_url: imageUrl }
      });

      toast({
        title: "Character Portrait Generated",
        description: "Your character portrait has been created using all your character details!",
      });

    } catch (error) {
      console.error('Failed to generate character image:', error);
      toast({
        title: "Image Generation Failed",
        description: "Failed to generate character portrait. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-6">Finalize Your Character</h2>
      
      {/* Character Summary */}
      <div className="bg-muted/50 p-4 rounded-lg border">
        <h3 className="font-semibold mb-3 flex items-center">
          <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
          Character Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><strong>Name:</strong> {state.character?.name || 'Not set'}</div>
          <div><strong>Race:</strong> {state.character?.race?.name || 'Not selected'}</div>
          <div><strong>Class:</strong> {state.character?.class?.name || 'Not selected'}</div>
          <div><strong>Background:</strong> {state.character?.background?.name || 'Not selected'}</div>
          <div><strong>Alignment:</strong> {state.character?.alignment || 'Not set'}</div>
          <div><strong>Level:</strong> {state.character?.level || 1}</div>
        </div>
      </div>

      {/* Proficiencies Summary */}
      {state.character && (
        <div className="bg-muted/50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-3 flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
            Proficiencies & Languages
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm space-y-2">
            <div>
              <strong>Skills:</strong> {(state.character.skillProficiencies?.length || 0) > 0 
                ? state.character.skillProficiencies?.join(', ') || 'None'
                : 'None'}
            </div>
            <div>
              <strong>Tools:</strong> {(state.character.toolProficiencies?.length || 0) > 0 
                ? state.character.toolProficiencies?.join(', ') || 'None'
                : 'None'}
            </div>
            <div>
              <strong>Saving Throws:</strong> {(state.character.savingThrowProficiencies?.length || 0) > 0 
                ? (state.character.savingThrowProficiencies || []).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
                : 'None'}
            </div>
            <div>
              <strong>Languages:</strong> {(state.character.languages?.length || 0) > 0 
                ? state.character.languages?.join(', ') || 'None'
                : 'None'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Description */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="character-description">Character Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={isGeneratingDescription || !state.character?.name?.trim()}
                className="ml-2"
              >
                {isGeneratingDescription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {state.character?.description?.trim() ? 'Regenerate' : 'Generate'} with AI
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="character-description"
              placeholder="Generate an AI description using all your character choices, or write your own..."
              value={state.character?.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="min-h-[200px] w-full"
            />
          </div>

          {/* Additional AI-generated fields display */}
          {state.character?.appearance && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">AI-Generated Appearance</Label>
              <p className="text-sm p-3 bg-muted/50 rounded-md border">
                {state.character.appearance}
              </p>
            </div>
          )}

          {state.character?.personality_traits && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">AI-Generated Personality</Label>
              <p className="text-sm p-3 bg-muted/50 rounded-md border">
                {state.character.personality_traits}
              </p>
            </div>
          )}

          {state.character?.backstory_elements && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">AI-Generated Backstory Elements</Label>
              <p className="text-sm p-3 bg-muted/50 rounded-md border">
                {state.character.backstory_elements}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Character Image */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Character Portrait</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !state.character?.name?.trim()}
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {state.character?.image_url ? 'Regenerate' : 'Generate'} Portrait
                  </>
                )}
              </Button>
            </div>
            
            {/* Image Preview */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 h-80 flex items-center justify-center bg-muted/20">
              {state.character?.image_url ? (
                <img
                  src={state.character.image_url}
                  alt={`Portrait of ${state.character.name}`}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto h-12 w-12 mb-4" />
                  <p className="text-sm">
                    Click "Generate Portrait" to create an AI image using your complete character profile
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Generation Tip */}
      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-3">
          <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-green-900 dark:text-green-100 mb-1">Enhanced AI Generation</p>
            <p className="text-green-800 dark:text-green-200">
              The AI now has access to your complete character profile (race, class, background, abilities) and can generate much more accurate and detailed descriptions and portraits!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterFinalization;
