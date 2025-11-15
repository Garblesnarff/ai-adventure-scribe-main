import { Shuffle, Heart, Crown, Shield, Zap } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import logger from '@/lib/logger';
import { personalityService } from '@/services/personalityService';

/**
 * PersonalitySelection component for character creation
 * Handles input of personality traits, ideals, bonds, and flaws with randomization
 */
const PersonalitySelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();

  /**
   * Updates personality traits (first and second)
   * @param traits - Array of two trait strings
   */
  const handlePersonalityTraitsChange = (traits: string[]) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { personalityTraits: traits },
    });
  };

  /**
   * Updates ideals (single string as array)
   * @param ideal - Ideal string
   */
  const handleIdealChange = (ideal: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { ideals: [ideal] },
    });
  };

  /**
   * Updates bonds (single string as array)
   * @param bond - Bond string
   */
  const handleBondChange = (bond: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { bonds: [bond] },
    });
  };

  /**
   * Updates flaws (single string as array)
   * @param flaw - Flaw string
   */
  const handleFlawChange = (flaw: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { flaws: [flaw] },
    });
  };

  /**
   * Randomizes a specific personality field
   * @param fieldType - Type of field to randomize
   * @param index - Index for traits (0 or 1)
   */
  const handleRandomize = async (
    fieldType: 'traits' | 'ideals' | 'bonds' | 'flaws',
    index?: number,
  ) => {
    try {
      const options = {
        background: selectedBackground?.id,
        alignment: state.character?.alignment,
      };

      const element = await personalityService.getRandomPersonalityElement(fieldType, options);

      // Extract the text based on the field type
      let randomText: string;
      switch (fieldType) {
        case 'traits':
          randomText = element.text;
          break;
        case 'ideals':
          randomText = element.ideal;
          break;
        case 'bonds':
          randomText = element.bond;
          break;
        case 'flaws':
          randomText = element.flaw;
          break;
        default:
          randomText = element.text;
      }

      switch (fieldType) {
        case 'traits':
          if (index !== undefined) {
            const currentTraits = state.character?.personalityTraits || ['', ''];
            const newTraits = [...currentTraits];
            newTraits[index] = randomText;
            handlePersonalityTraitsChange(newTraits);
          }
          break;
        case 'ideals':
          handleIdealChange(randomText);
          break;
        case 'bonds':
          handleBondChange(randomText);
          break;
        case 'flaws':
          handleFlawChange(randomText);
          break;
      }

      toast({
        title: 'Randomized!',
        description: `Generated a random ${fieldType.slice(0, -1)} for your character.`,
        duration: 1500,
      });
    } catch (error) {
      logger.error('Error randomizing personality element:', error);
      toast({
        title: 'Error',
        description: 'Failed to randomize. Please try again.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Randomizes all personality fields at once
   */
  const handleRandomizeAll = async () => {
    try {
      const options = {
        background: selectedBackground?.id,
        alignment: state.character?.alignment,
      };

      const batchData = await personalityService.getBatchRandomPersonality(options);

      // Update all personality fields with the batch results
      if (batchData.traits && batchData.traits2) {
        handlePersonalityTraitsChange([batchData.traits.text, batchData.traits2.text]);
      } else if (batchData.traits) {
        // Fallback if only one trait is returned
        const currentTraits = state.character?.personalityTraits || ['', ''];
        handlePersonalityTraitsChange([batchData.traits.text, currentTraits[1]]);
      }

      if (batchData.ideals) {
        handleIdealChange(batchData.ideals.ideal);
      }

      if (batchData.bonds) {
        handleBondChange(batchData.bonds.bond);
      }

      if (batchData.flaws) {
        handleFlawChange(batchData.flaws.flaw);
      }

      toast({
        title: 'All Randomized!',
        description: 'Generated a complete personality for your character.',
        duration: 2000,
      });
    } catch (error) {
      logger.error('Error randomizing all personality elements:', error);
      toast({
        title: 'Error',
        description: 'Failed to randomize all fields. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedBackground = state.character?.background;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-infinite-purple to-infinite-gold rounded-full shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-infinite-purple to-infinite-gold bg-clip-text text-transparent">
              Define Your Character
            </h2>
            <p className="text-muted-foreground">
              {selectedBackground
                ? `Shape your ${selectedBackground.name}'s personality with traits, ideals, bonds, and flaws`
                : "Shape your character's personality with traits, ideals, bonds, and flaws"}
            </p>
          </div>
        </div>
      </div>

      {/* Background Info */}
      {selectedBackground && (
        <Card className="glass rounded-2xl border-2 border-infinite-teal/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-4 h-4 text-infinite-teal" />
              <h3 className="font-semibold">{selectedBackground.name} Background</h3>
            </div>
            <p className="text-sm text-muted-foreground">{selectedBackground.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personality Traits */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-purple/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-infinite-purple" />
                <h3 className="text-lg font-semibold">Personality Traits</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRandomizeAll()}
                className="flex items-center space-x-1 text-xs"
              >
                <Shuffle className="w-3 h-3" />
                <span>Randomize All</span>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Choose 2 personality traits that define how your character acts and speaks.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="trait-1" className="text-xs text-muted-foreground">
                    Trait 1
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRandomize('traits', 0)}
                    className="h-6 px-2 text-xs"
                  >
                    <Shuffle className="w-3 h-3 mr-1" />
                    Random
                  </Button>
                </div>
                <Textarea
                  id="trait-1"
                  placeholder="e.g., I idolize a particular hero of my faith..."
                  value={state.character?.personalityTraits?.[0] || ''}
                  onChange={(e) =>
                    handlePersonalityTraitsChange([
                      e.target.value,
                      state.character?.personalityTraits?.[1] || '',
                    ])
                  }
                  className="min-h-[60px] transition-all duration-200 focus:ring-2 focus:ring-infinite-purple focus:border-infinite-purple"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="trait-2" className="text-xs text-muted-foreground">
                    Trait 2
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRandomize('traits', 1)}
                    className="h-6 px-2 text-xs"
                  >
                    <Shuffle className="w-3 h-3 mr-1" />
                    Random
                  </Button>
                </div>
                <Textarea
                  id="trait-2"
                  placeholder="e.g., I can find common ground between enemies..."
                  value={state.character?.personalityTraits?.[1] || ''}
                  onChange={(e) =>
                    handlePersonalityTraitsChange([
                      state.character?.personalityTraits?.[0] || '',
                      e.target.value,
                    ])
                  }
                  className="min-h-[60px] transition-all duration-200 focus:ring-2 focus:ring-infinite-purple focus:border-infinite-purple"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ideal */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-gold/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-infinite-gold" />
                <h3 className="text-lg font-semibold">Ideal</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRandomize('ideals')}
                className="h-6 px-2 text-xs"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Random
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Choose 1 ideal that drives your character's goals and motivations.
            </p>

            <Textarea
              id="ideal"
              placeholder="e.g., Freedom. Tyrants must not be allowed to oppress people."
              value={state.character?.ideals?.[0] || ''}
              onChange={(e) => handleIdealChange(e.target.value)}
              className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-infinite-gold focus:border-infinite-gold"
            />
          </CardContent>
        </Card>

        {/* Bond */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-teal/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-infinite-teal" />
                <h3 className="text-lg font-semibold">Bond</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRandomize('bonds')}
                className="h-6 px-2 text-xs"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Random
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Choose 1 bond that connects your character to people, places, or events.
            </p>

            <Textarea
              id="bond"
              placeholder="e.g., I owe my life to the priest who took me in..."
              value={state.character?.bonds?.[0] || ''}
              onChange={(e) => handleBondChange(e.target.value)}
              className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-infinite-teal focus:border-infinite-teal"
            />
          </CardContent>
        </Card>

        {/* Flaw */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-purple/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-infinite-teal" />
                <h3 className="text-lg font-semibold">Flaw</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRandomize('flaws')}
                className="h-6 px-2 text-xs"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Random
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Choose 1 flaw that could be exploited or cause your character trouble.
            </p>

            <Textarea
              id="flaw"
              placeholder="e.g., I judge others harshly, and myself even more severely."
              value={state.character?.flaws?.[0] || ''}
              onChange={(e) => handleFlawChange(e.target.value)}
              className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-infinite-purple focus:border-infinite-purple"
            />
          </CardContent>
        </Card>
      </div>

      {/* Help Text */}
      <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-amber-600 dark:text-amber-400 text-sm">💡</span>
          </div>
          <div className="space-y-1">
            <h4 className="font-medium text-amber-900 dark:text-amber-100">Personality Tips</h4>
            <p className="text-sm text-amber-700 dark:text-amber-200">
              Use the randomize buttons to get inspiration from official D&D backgrounds, or write
              your own unique personality elements. These will shape how your character interacts
              with the world and other players.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PersonalitySelection;
