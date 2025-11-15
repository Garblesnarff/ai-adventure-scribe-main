import { Loader2, Sparkles, Image as ImageIcon, Wand2, CheckCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCampaign } from '@/contexts/CampaignContext';
import { useCharacter } from '@/contexts/CharacterContext';
import logger from '@/lib/logger';
import { analytics } from '@/services/analytics';
import { characterDescriptionGenerator } from '@/services/character-description-generator';
import { characterImageGenerator } from '@/services/character-image-generator';
import { openRouterService } from '@/services/openrouter-service';
import { toCharacterPromptData } from '@/services/prompts/characterPrompts';

/**
 * CharacterFinalization component for character creation
 * Final step to review character, generate AI description and detailed design sheet
 */
const CharacterFinalization: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { state: campaignState } = useCampaign();
  const { toast } = useToast();
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('fantasy');
  const [generationStep, setGenerationStep] = useState<'idle' | 'avatar' | 'sheet' | 'background'>(
    'idle',
  );
  const [searchParams] = useSearchParams();

  // Initialize theme from campaign defaults when available
  useEffect(() => {
    if (campaignState.campaign?.defaultArtStyle && !state.character?.theme) {
      setSelectedTheme(campaignState.campaign.defaultArtStyle);
    }
  }, [campaignState.campaign?.defaultArtStyle, state.character?.theme]);

  /**
   * Updates character description in context
   * @param description - New character description
   */
  const handleDescriptionChange = (description: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { description },
    });
  };

  /**
   * Generate enhanced character description using AI with full character context
   */
  const handleGenerateDescription = async () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: 'Character Incomplete',
        description: 'Character name is required for description generation.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const campaignId = searchParams.get('campaign') || undefined;
      const artStyle = analytics.detectArtStyle({ characterTheme: state.character?.theme });
      analytics.aiRegenerateClicked('description', { campaignId, artStyle });
    } catch (e) {
      // ignore analytics errors
    }

    setIsGeneratingDescription(true);
    try {
      const characterData = toCharacterPromptData(state.character);

      const enhancedDescription = await characterDescriptionGenerator.generateDescription(
        characterData,
        {
          enhanceExisting: Boolean(state.character.description?.trim()),
          includeBackstory: true,
          includePersonality: true,
          includeAppearance: true,
          tone: 'heroic',
        },
      );

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          description: enhancedDescription.description,
          appearance: enhancedDescription.appearance,
          personality_traits: enhancedDescription.personality_traits,
          backstory_elements: enhancedDescription.backstory_elements,
        },
      });

      toast({
        title: 'Description Generated',
        description:
          "Your character's description has been enhanced with AI using all your character choices!",
      });
    } catch (error) {
      logger.error('Failed to generate description:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate character description. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  /**
   * Generate character avatar portrait
   */
  const handleGenerateAvatar = async () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: 'Character Incomplete',
        description: 'Character name is required for avatar generation.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const campaignId = searchParams.get('campaign') || undefined;
      const artStyle = analytics.detectArtStyle({ characterTheme: state.character?.theme });
      analytics.aiRegenerateClicked('avatar', { campaignId, artStyle });
    } catch (e) {
      // ignore analytics errors
    }

    setIsGeneratingAvatar(true);
    setGenerationStep('avatar');
    try {
      const characterData = {
        ...toCharacterPromptData(state.character),
        theme: selectedTheme,
      };

      logger.info('Generating avatar with theme:', selectedTheme);

      const avatarBase64 = await characterImageGenerator.generateAvatarImage(characterData, {
        artStyle: 'fantasy-art',
        theme: selectedTheme,
      });

      // Upload avatar to get URL
      const avatarUrl = await openRouterService.uploadImage(avatarBase64, { label: 'avatar' });

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          avatar_url: avatarUrl,
          theme: selectedTheme,
        },
      });

      toast({
        title: 'Avatar Generated',
        description: 'Your character avatar portrait has been created!',
      });

      setGenerationStep('idle');
    } catch (error) {
      logger.error('Failed to generate avatar:', error);
      toast({
        title: 'Avatar Generation Failed',
        description: 'Failed to generate character avatar. Please try again.',
        variant: 'destructive',
      });
      setGenerationStep('idle');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  /**
   * Generate detailed character design sheet using AI with full character context
   */
  const handleGenerateImage = async () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: 'Character Incomplete',
        description: 'Character name is required for image generation.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const campaignId = searchParams.get('campaign') || undefined;
      const artStyle = analytics.detectArtStyle({ characterTheme: state.character?.theme });
      analytics.aiRegenerateClicked('design_sheet', { campaignId, artStyle });
    } catch (e) {
      // ignore analytics errors
    }

    setIsGeneratingImage(true);
    setGenerationStep('sheet');
    try {
      const characterData = {
        ...toCharacterPromptData(state.character),
        theme: selectedTheme,
      };

      logger.info('Generating design sheet with theme:', selectedTheme);
      logger.info('Character data for generation:', characterData);

      // Get avatar base64 if it exists for reference
      let avatarReference: string | undefined;
      if (state.character.avatar_url) {
        try {
          const response = await fetch(state.character.avatar_url);
          const blob = await response.blob();
          const reader = new FileReader();
          avatarReference = await new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve(base64.split(',')[1]); // Remove data:image/png;base64, prefix
            };
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          logger.warn('Could not fetch avatar for reference:', error);
        }
      }

      const imageUrl = await characterImageGenerator.generateCharacterImage(
        characterData,
        {
          style: 'character-sheet',
          artStyle: 'fantasy-art',
          theme: selectedTheme,
          storage: { label: 'design-sheet' },
        },
        avatarReference,
      );

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          image_url: imageUrl,
          theme: selectedTheme,
        },
      });

      toast({
        title: 'Character Design Sheet Generated',
        description: `Your detailed character design sheet in ${selectedTheme} theme has been created${avatarReference ? ' using your avatar as reference' : ''}!`,
      });

      setGenerationStep('idle');
    } catch (error) {
      logger.error('Failed to generate character design sheet:', error);
      toast({
        title: 'Design Sheet Generation Failed',
        description: 'Failed to generate character design sheet. Please try again.',
        variant: 'destructive',
      });
      setGenerationStep('idle');
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
          <div>
            <strong>Name:</strong> {state.character?.name || 'Not set'}
          </div>
          <div>
            <strong>Race:</strong> {state.character?.race?.name || 'Not selected'}
          </div>
          <div>
            <strong>Class:</strong> {state.character?.class?.name || 'Not selected'}
          </div>
          <div>
            <strong>Background:</strong> {state.character?.background?.name || 'Not selected'}
          </div>
          <div>
            <strong>Alignment:</strong> {state.character?.alignment || 'Not set'}
          </div>
          <div>
            <strong>Level:</strong> {state.character?.level || 1}
          </div>
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
              <strong>Skills:</strong>{' '}
              {(state.character.skillProficiencies?.length || 0) > 0
                ? state.character.skillProficiencies?.join(', ') || 'None'
                : 'None'}
            </div>
            <div>
              <strong>Tools:</strong>{' '}
              {(state.character.toolProficiencies?.length || 0) > 0
                ? state.character.toolProficiencies?.join(', ') || 'None'
                : 'None'}
            </div>
            <div>
              <strong>Saving Throws:</strong>{' '}
              {(state.character.savingThrowProficiencies?.length || 0) > 0
                ? (state.character.savingThrowProficiencies || [])
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(', ')
                : 'None'}
            </div>
            <div>
              <strong>Languages:</strong>{' '}
              {(state.character.languages?.length || 0) > 0
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
              <Label className="text-sm text-muted-foreground">
                AI-Generated Backstory Elements
              </Label>
              <p className="text-sm p-3 bg-muted/50 rounded-md border">
                {state.character.backstory_elements}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Character Images */}
        <div className="space-y-4">
          {/* Theme Selector */}
          <div className="space-y-2">
            <Label>Design Sheet Theme</Label>
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fantasy">Fantasy (Default)</SelectItem>
                <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                <SelectItem value="steampunk">Steampunk</SelectItem>
                <SelectItem value="dystopian">Dystopian</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Avatar Portrait */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Character Avatar</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAvatar}
                disabled={isGeneratingAvatar || !state.character?.name?.trim()}
              >
                {isGeneratingAvatar ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {state.character?.avatar_url ? 'Regenerate' : 'Generate'} Avatar
                  </>
                )}
              </Button>
            </div>

            {/* Avatar Preview */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 h-64 flex items-center justify-center bg-muted/20">
              {state.character?.avatar_url ? (
                <img
                  src={state.character.avatar_url}
                  alt={`Avatar of ${state.character.name}`}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto h-10 w-10 mb-2" />
                  <p className="text-xs">Generate avatar first (portrait style)</p>
                </div>
              )}
            </div>
          </div>

          {/* Character Design Sheet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Character Design Sheet</Label>
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
                    {generationStep === 'sheet' && 'Creating Sheet...'}
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {state.character?.image_url ? 'Regenerate' : 'Generate'} Design Sheet
                  </>
                )}
              </Button>
            </div>

            {/* Image Preview */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 h-64 flex items-center justify-center bg-muted/20">
              {state.character?.image_url ? (
                <img
                  src={state.character.image_url}
                  alt={`Design sheet of ${state.character.name}`}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto h-10 w-10 mb-2" />
                  <p className="text-xs">Generate character sheet with multiple views</p>
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
            <p className="font-medium text-green-900 dark:text-green-100 mb-1">
              Enhanced AI Generation
            </p>
            <p className="text-green-800 dark:text-green-200">
              Generate in order: First create a portrait <strong>Avatar</strong>, then the{' '}
              <strong>Character Sheet</strong> will use it as reference for consistency! The avatar
              will be used throughout the app for character identification in chats, character
              lists, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterFinalization;
