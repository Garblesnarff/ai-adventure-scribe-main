import React, { useState } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { characterDescriptionGenerator } from '@/services/character-description-generator';
import { characterImageGenerator } from '@/services/character-image-generator';
import { Loader2, Sparkles, Image as ImageIcon, Wand2 } from 'lucide-react';

/**
 * NameDescription component for character creation
 * Handles input and validation of character name and description
 */
const NameDescription: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

  /**
   * Generate enhanced character description using AI
   */
  const handleGenerateDescription = async () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a character name first before generating a description.",
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
        description: "Your character's description has been enhanced with AI!",
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
   * Generate character portrait using AI
   */
  const handleGenerateImage = async () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a character name first before generating an image.",
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
        title: "Character Image Generated",
        description: "Your character portrait has been created!",
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
      <h2 className="text-2xl font-bold text-center mb-6">Name Your Character</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form Fields */}
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
                    {state.character?.description?.trim() ? 'Enhance' : 'Generate'} with AI
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="character-description"
              placeholder="Describe your character's appearance, personality, and background... or use AI to generate one!"
              value={state.character?.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="min-h-[150px] w-full"
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
                    Generate Portrait
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
                    {state.character?.name ? 
                      `Click "Generate Portrait" to create an AI image of ${state.character.name}` :
                      'Enter a character name to generate a portrait'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Generation Tip */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">AI-Powered Character Creation</p>
            <p className="text-blue-800 dark:text-blue-200">
              Use AI to generate detailed descriptions and portraits for your character. The more information you provide (name, race, class), the better the results!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NameDescription;