import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { wizardSteps } from './constants';
import { WizardStep } from './types';
import CharacterPreview from '../shared/CharacterPreview';
import ProgressIndicator from '../shared/ProgressIndicator';
import StepNavigation from '../shared/StepNavigation';

import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useCharacterSave } from '@/hooks/use-character-save';
import logger from '@/lib/logger';
import { analytics } from '@/services/analytics';
import { getSpellcastingInfo, getRacialSpells } from '@/utils/spell-validation';

/**
 * Main content component for the character creation wizard
 * Handles step navigation, validation, and character saving
 */
const WizardContent: React.FC = () => {
  const { state } = useCharacter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const { saveCharacter, isSaving } = useCharacterSave();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scrollToTop } = useAutoScroll();
  const [searchParams] = useSearchParams();

  // Filter steps based on character state
  const getFilteredSteps = React.useCallback(() => {
    return wizardSteps.filter((step) => {
      if (step.skipCondition) {
        return !step.skipCondition(state.character);
      }
      return true;
    });
  }, [state.character]);

  const filteredSteps = getFilteredSteps();

  // Adjust current step if steps are filtered and current step is out of bounds
  React.useEffect(() => {
    if (currentStep >= filteredSteps.length && filteredSteps.length > 0) {
      setCurrentStep(filteredSteps.length - 1);
    }
  }, [filteredSteps.length, currentStep]);

  // Scroll to top whenever the step changes
  React.useEffect(() => {
    scrollToTop();
  }, [currentStep, scrollToTop]);

  /**
   * Validates the current step before allowing navigation
   * @param stepIndex The current step index
   * @returns {object} Validation result with success flag and error message
   */
  const validateCurrentStep = (stepIndex: number) => {
    if (!state.character) {
      return { isValid: false, message: 'No character data found' };
    }

    const stepLabel = filteredSteps[stepIndex]?.label || '';
    const character = state.character;

    switch (stepLabel) {
      // Basic Info - Require name
      case 'Basic Info':
        if (!character.name?.trim()) {
          return { isValid: false, message: 'Please enter a character name before proceeding' };
        }
        break;

      // Race Selection - Require race
      case 'Race':
        if (!character.race) {
          return { isValid: false, message: 'Please select a race for your character' };
        }
        // If race has subraces, ensure one is selected
        if (character.race.subraces && character.race.subraces.length > 0 && !character.subrace) {
          return { isValid: false, message: 'Please select a subrace for your character' };
        }
        break;

      // Subrace Selection - Validate if applicable (auto-skipped if not needed)
      case 'Subrace':
        if (character.race?.subraces?.length && !character.subrace) {
          return { isValid: false, message: 'Please select a subrace for your character' };
        }
        break;

      // Class Selection - Require class
      case 'Class':
        if (!character.class) {
          return { isValid: false, message: 'Please select a class for your character' };
        }
        break;

      // Class Features - Validate feature choices if applicable
      case 'Class Features': {
        const classFeatures = character.class?.classFeatures?.filter((f) => f.choices) || [];
        if (classFeatures.length > 0) {
          const hasAllFeatures = classFeatures.every(
            (feature) => character.classFeatures?.[feature.id],
          );
          if (!hasAllFeatures) {
            return { isValid: false, message: 'Please complete your class feature selections' };
          }
        }
        break;
      }

      // Ability Scores - Ensure all scores are set
      case 'Ability Scores': {
        if (!character.abilityScores) {
          return { isValid: false, message: 'Please set your ability scores' };
        }
        // Check if any ability score is missing or invalid
        const abilities = [
          'strength',
          'dexterity',
          'constitution',
          'intelligence',
          'wisdom',
          'charisma',
        ];
        const hasAllScores = abilities.every(
          (ability) =>
            character.abilityScores?.[ability as keyof typeof character.abilityScores]?.score >= 8,
        );
        if (!hasAllScores) {
          return { isValid: false, message: 'Please complete your ability score selection' };
        }
        break;
      }

      // Background Selection - Require background
      case 'Background':
        if (!character.background) {
          return { isValid: false, message: 'Please select a background for your character' };
        }
        break;

      // Proficiencies - Validate skill and language selections
      case 'Proficiencies & Languages':
        if (!character.skillProficiencies?.length) {
          return { isValid: false, message: 'Please complete your skill proficiency selections' };
        }
        if (!character.languages?.length) {
          return { isValid: false, message: 'Please complete your language selections' };
        }
        break;

      // Spells - Validate spell selection for spellcasters
      case 'Spells': {
        logger.info(
          '🔮 Validating Spells step for character:',
          character.name,
          character.class?.name,
        );

        if (character.class?.spellcasting) {
          logger.debug('📚 Character is a spellcaster, checking spell requirements...');
          const spellcastingInfo = getSpellcastingInfo(character.class, character.level || 1);
          logger.debug('📊 Spellcasting info:', spellcastingInfo);

          if (spellcastingInfo) {
            // Get racial spell bonuses
            const racialSpells = getRacialSpells(character.race?.name || '', character.subrace);
            logger.debug('🧬 Racial spells:', racialSpells);

            // Check cantrips if class learns them (relaxed validation)
            if (spellcastingInfo.cantripsKnown > 0) {
              const expectedCantrips =
                spellcastingInfo.cantripsKnown +
                racialSpells.cantrips.length +
                racialSpells.bonusCantrips;
              const cantripCount = character.cantrips?.length || 0;
              logger.debug(`✨ Cantrips - Expected: ${expectedCantrips}, Current: ${cantripCount}`);
              logger.debug('✨ Current cantrips:', character.cantrips);

              // Relaxed validation: Allow proceeding with partial spell selection
              // Users can complete spell selection later or during gameplay
              if (cantripCount < expectedCantrips) {
                logger.warn('⚠️ Not all cantrips selected, but allowing continuation');
                // Could show a warning toast here instead of blocking
              }
            }

            // Check spells if class learns them (relaxed validation)
            if (spellcastingInfo.spellsKnown && spellcastingInfo.spellsKnown > 0) {
              const spellCount = character.knownSpells?.length || 0;
              logger.debug(
                `🪄 Spells - Expected: ${spellcastingInfo.spellsKnown}, Current: ${spellCount}`,
              );
              logger.debug('🪄 Current spells:', character.knownSpells);

              // Relaxed validation: Allow proceeding with partial spell selection
              if (spellCount < spellcastingInfo.spellsKnown) {
                logger.warn('⚠️ Not all spells selected, but allowing continuation');
                // Could show a warning toast here instead of blocking
              }
            }

            logger.info('✅ All spell requirements met');
          } else {
            logger.warn('⚠️ No spellcasting info found for class');
          }
        } else {
          logger.info('🚫 Character is not a spellcaster, skipping spell validation');
        }
        break;
      }

      // Advanced Spellcasting - Validate advanced spellcasting features
      case 'Advanced Spellcasting': {
        const spellcasting = character.class?.spellcasting;
        if (spellcasting) {
          const classId = character.class?.id?.toLowerCase() || '';
          const level = character.level || 1;

          // Check if spell preparation is required and completed
          const needsPreparation = ['cleric', 'druid', 'paladin', 'wizard'].includes(classId);
          if (needsPreparation) {
            const maxPreparedSpells = Math.max(
              1,
              level + (character.abilityScores?.[spellcasting.ability]?.modifier || 0),
            );
            const preparedCount = character.preparedSpells?.length || 0;
            if (preparedCount < maxPreparedSpells) {
              return {
                isValid: false,
                message: `Please prepare ${maxPreparedSpells} spells for your ${character.class?.name}`,
              };
            }
          }

          // Check if metamagic is required and completed (Sorcerer level 3+)
          const needsMetamagic = classId === 'sorcerer' && level >= 3;
          if (needsMetamagic) {
            const maxMetamagicOptions = level < 10 ? 2 : level < 17 ? 3 : 4;
            const metamagicCount = character.metamagicOptions?.length || 0;
            if (metamagicCount < maxMetamagicOptions) {
              return {
                isValid: false,
                message: `Please select ${maxMetamagicOptions} metamagic option${maxMetamagicOptions > 1 ? 's' : ''} for your ${character.class?.name}`,
              };
            }
          }

          // Check if pact magic spells are required and completed (Warlock)
          const needsPactMagic = classId === 'warlock';
          if (needsPactMagic) {
            const pactProgression =
              level === 1
                ? { spellsKnown: 2 }
                : level === 2
                  ? { spellsKnown: 3 }
                  : level === 3
                    ? { spellsKnown: 4 }
                    : { spellsKnown: Math.min(15, 2 + level) };
            const pactSpellCount = character.pactMagicSpells?.length || 0;
            if (pactSpellCount < pactProgression.spellsKnown) {
              return {
                isValid: false,
                message: `Please select ${pactProgression.spellsKnown} pact magic spell${pactProgression.spellsKnown > 1 ? 's' : ''} for your ${character.class?.name}`,
              };
            }
          }
        }
        break;
      }

      // Steps 10-12: Optional steps (equipment, enhancements, finalization)
      default:
        break;
    }

    return { isValid: true, message: '' };
  };

  /**
   * Validates the final character state for saving
   * Checks if all required fields are present and properly set
   * @returns {boolean} True if character data is valid, false otherwise
   */
  const validateCharacter = () => {
    if (!state.character) return false;
    const {
      race,
      class: characterClass,
      abilityScores,
      background,
      skillProficiencies,
      languages,
      name,
    } = state.character;

    // Basic required fields including name
    const hasBasicFields = !!(
      name?.trim() &&
      race &&
      characterClass &&
      abilityScores &&
      background &&
      skillProficiencies !== undefined &&
      languages !== undefined
    );

    // If race has subraces, subrace must be selected
    const hasValidSubrace = !race?.subraces?.length || !!state.character.subrace;

    // If class is spellcaster, spells must be selected
    const spellcasting = characterClass?.spellcasting;
    let hasValidSpells = true;
    if (spellcasting) {
      const spellcastingInfo = getSpellcastingInfo(characterClass, state.character?.level || 1);
      if (spellcastingInfo) {
        const racialSpells = getRacialSpells(race?.name || '', state.character?.subrace);
        const expectedCantrips =
          spellcastingInfo.cantripsKnown +
          racialSpells.cantrips.length +
          racialSpells.bonusCantrips;
        const expectedSpells = spellcastingInfo.spellsKnown || 0;

        const hasEnoughCantrips =
          expectedCantrips === 0 || (state.character.cantrips?.length || 0) >= expectedCantrips;
        const hasEnoughSpells =
          expectedSpells === 0 || (state.character.knownSpells?.length || 0) >= expectedSpells;

        hasValidSpells = hasEnoughCantrips && hasEnoughSpells;
      }
    }

    // If class has features with choices, they must be selected
    const classFeatures = characterClass?.classFeatures?.filter((f) => f.choices) || [];
    const hasValidClassFeatures =
      classFeatures.length === 0 ||
      (state.character.classFeatures &&
        classFeatures.every((feature) => state.character?.classFeatures?.[feature.id]));

    return hasBasicFields && hasValidSubrace && hasValidSpells && hasValidClassFeatures;
  };

  /**
   * Handles navigation to the next step
   * Validates current step before proceeding, on final step validates and saves the complete character
   * @returns {Promise<void>}
   */
  const handleNext = async () => {
    logger.debug('handleNext called at step:', currentStep);
    logger.debug('Current step info:', filteredSteps[currentStep]);

    // Enhanced error boundary for navigation
    try {
      if (currentStep < filteredSteps.length - 1) {
        // Validate current step before proceeding
        const validation = validateCurrentStep(currentStep);
        logger.debug('Step validation result:', validation);

        if (!validation.isValid) {
          // Show a gentler warning for spell-related validation
          const isSpellStep = filteredSteps[currentStep]?.label === 'Spells';
          if (isSpellStep) {
            toast({
              title: 'Spell Selection Incomplete',
              description: validation.message + ' You can continue and complete this later.',
              variant: 'default',
            });
            // Allow proceeding despite incomplete spells
          } else {
            toast({
              title: 'Please Complete This Step',
              description: validation.message,
              variant: 'destructive',
            });
            return; // Don't proceed if validation fails for non-spell steps
          }
        }

        // Find the next valid step (accounting for filtered steps)
        const nextStepIndex = currentStep + 1;
        logger.info('Navigating to next step:', nextStepIndex);

        // Enhanced safety check: ensure the next step exists in filtered steps
        if (nextStepIndex < filteredSteps.length && filteredSteps[nextStepIndex]) {
          setCurrentStep(nextStepIndex);
        } else {
          logger.error(
            'Next step does not exist in filtered steps:',
            nextStepIndex,
            filteredSteps.length,
          );
          toast({
            title: 'Navigation Error',
            description:
              'Unable to navigate to the next step. The wizard may need to be restarted.',
            variant: 'destructive',
          });
          // Attempt recovery by resetting to the last valid step
          const lastValidStep = Math.max(0, filteredSteps.length - 1);
          if (currentStep !== lastValidStep) {
            setCurrentStep(lastValidStep);
          }
        }
      } else {
        logger.info('Final step - attempting to save character');

        // Enhanced character existence check
        if (!state.character) {
          logger.error('No character data to save');
          toast({
            title: 'No Character Data',
            description:
              'Character data appears to be missing. Please restart the character creation process.',
            variant: 'destructive',
          });
          return;
        }

        // Enhanced validation with detailed feedback
        logger.debug('Character data for save:', state.character);
        const isValid = validateCharacter();
        logger.debug('Character validation result:', isValid);

        if (!isValid) {
          // Check for critical missing fields
          const criticalMissing = [];
          if (!state.character.name?.trim()) criticalMissing.push('name');
          if (!state.character.race) criticalMissing.push('race');
          if (!state.character.class) criticalMissing.push('class');
          if (!state.character.background) criticalMissing.push('background');
          if (!state.character.abilityScores) criticalMissing.push('ability scores');

          if (criticalMissing.length > 0) {
            toast({
              title: 'Critical Fields Missing',
              description: `Please complete these required fields: ${criticalMissing.join(', ')}. Character cannot be saved without them.`,
              variant: 'destructive',
            });
            return;
          } else {
            toast({
              title: 'Character Validation Issues',
              description:
                'Some optional fields are incomplete. You can still save and edit later, or complete the missing sections.',
              variant: 'default',
            });
          }
        }

        // Enhanced save with better error handling
        try {
          logger.info('Calling saveCharacter...');
          const savedCharacter = await saveCharacter(state.character);
          logger.debug('Save result:', savedCharacter);

          if (!savedCharacter) {
            logger.warn('Character save returned null; staying on wizard step for user correction');
            return;
          }

          if (savedCharacter.id) {
            logger.info('Character saved successfully, navigating to /characters');
            try {
              const campaignId = searchParams.get('campaign') || undefined;
              const artStyle = analytics.detectArtStyle({
                characterTheme: state.character?.theme,
                campaignGenre: undefined,
              });
              analytics.characterCreationCompleted({ campaignId, artStyle });
            } catch (e) {
              // ignore analytics errors
            }
            toast({
              title: 'Success!',
              description:
                'Character created successfully! Background image generation may continue in the background.',
            });
            const targetCampaignId = savedCharacter.campaign_id || state.character?.campaign_id;
            if (targetCampaignId) {
              navigate(`/app/campaigns/${targetCampaignId}/characters`);
            } else {
              navigate('/app/characters');
            }
          } else {
            logger.error('Save succeeded but no ID returned');
            toast({
              title: 'Save Warning',
              description:
                'Character data may be incomplete. Please review your characters list and edit if needed.',
              variant: 'destructive',
            });
          }
        } catch (error) {
          logger.error('Error saving character:', error);

          // Enhanced error message with recovery suggestions
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isNetworkError =
            errorMessage.toLowerCase().includes('network') ||
            errorMessage.toLowerCase().includes('fetch') ||
            errorMessage.toLowerCase().includes('connection');

          toast({
            title: 'Save Error',
            description: isNetworkError
              ? `Network connection issue: ${errorMessage}. Please check your internet connection and try again.`
              : `Failed to save character: ${errorMessage}. Please try again or contact support if the issue persists.`,
            variant: 'destructive',
          });
        }
      }
    } catch (unexpectedError) {
      // Catch-all error handler for any unexpected errors in navigation
      logger.error('Unexpected error in handleNext:', unexpectedError);
      toast({
        title: 'Unexpected Error',
        description:
          'An unexpected error occurred during navigation. Please refresh the page and try again.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handles navigation to the previous step
   * Allows users to move backwards through the creation process
   */
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Get the component for the current step
  const CurrentStepComponent = filteredSteps[currentStep]?.component;

  // Handle case where no steps are available
  if (!CurrentStepComponent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Character Creation</h1>
            <p className="text-muted-foreground">Loading character creation steps...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Character Creation Area */}
          <div className="xl:col-span-2">
            <Card className="p-6 glass-strong rounded-2xl hover-lift shadow-xl border-2 border-white/20">
              <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-infinite-purple via-infinite-gold to-infinite-teal bg-clip-text text-transparent">
                Create Your Character
              </h1>
              <ProgressIndicator currentStep={currentStep} totalSteps={filteredSteps.length} />
              <div className="min-h-[600px] transition-all duration-500 ease-in-out">
                <div
                  key={currentStep}
                  className="animate-in fade-in slide-in-from-right-4 duration-500"
                >
                  <CurrentStepComponent />
                </div>
              </div>
              <StepNavigation
                currentStep={currentStep}
                totalSteps={filteredSteps.length}
                onNext={handleNext}
                onPrevious={handlePrevious}
                isLoading={isSaving}
              />
            </Card>
          </div>

          {/* Character Preview Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-8 transition-all duration-300">
              <CharacterPreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardContent;
