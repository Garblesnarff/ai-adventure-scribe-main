import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCharacterSave } from '@/hooks/use-character-save';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import StepNavigation from '../shared/StepNavigation';
import ProgressIndicator from '../shared/ProgressIndicator';
import CharacterPreview from '../shared/CharacterPreview';
import { WizardStep } from './types';
import { wizardSteps } from './constants';
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
      return { isValid: false, message: "No character data found" };
    }

    const stepLabel = filteredSteps[stepIndex]?.label || '';
    const character = state.character;

    switch (stepLabel) {
      // Basic Info - Require name
      case 'Basic Info':
        if (!character.name?.trim()) {
          return { isValid: false, message: "Please enter a character name before proceeding" };
        }
        break;

      // Race Selection - Require race
      case 'Race':
        if (!character.race) {
          return { isValid: false, message: "Please select a race for your character" };
        }
        break;

      // Subrace Selection - Validate if applicable (auto-skipped if not needed)
      case 'Subrace':
        if (character.race?.subraces?.length && !character.subrace) {
          return { isValid: false, message: "Please select a subrace for your character" };
        }
        break;

      // Class Selection - Require class
      case 'Class':
        if (!character.class) {
          return { isValid: false, message: "Please select a class for your character" };
        }
        break;

      // Class Features - Validate feature choices if applicable
      case 'Class Features': {
        const classFeatures = character.class?.classFeatures?.filter(f => f.choices) || [];
        if (classFeatures.length > 0) {
          const hasAllFeatures = classFeatures.every(feature =>
            character.classFeatures?.[feature.id]
          );
          if (!hasAllFeatures) {
            return { isValid: false, message: "Please complete your class feature selections" };
          }
        }
        break;
      }

      // Ability Scores - Ensure all scores are set
      case 'Ability Scores': {
        if (!character.abilityScores) {
          return { isValid: false, message: "Please set your ability scores" };
        }
        // Check if any ability score is missing or invalid
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        const hasAllScores = abilities.every(ability =>
          character.abilityScores?.[ability as keyof typeof character.abilityScores]?.score >= 8
        );
        if (!hasAllScores) {
          return { isValid: false, message: "Please complete your ability score selection" };
        }
        break;
      }

      // Background Selection - Require background
      case 'Background':
        if (!character.background) {
          return { isValid: false, message: "Please select a background for your character" };
        }
        break;

      // Proficiencies - Validate skill and language selections
      case 'Proficiencies & Languages':
        if (!character.skillProficiencies?.length) {
          return { isValid: false, message: "Please complete your skill proficiency selections" };
        }
        if (!character.languages?.length) {
          return { isValid: false, message: "Please complete your language selections" };
        }
        break;

      // Spells - Validate spell selection for spellcasters
      case 'Spells': {
        if (character.class?.spellcasting) {
          const spellcastingInfo = getSpellcastingInfo(character.class, character.level || 1);
          if (spellcastingInfo) {
            // Get racial spell bonuses
            const racialSpells = getRacialSpells(character.race?.name || '', character.subrace);

            // Check cantrips if class learns them
            if (spellcastingInfo.cantripsKnown > 0) {
              const expectedCantrips = spellcastingInfo.cantripsKnown + racialSpells.cantrips.length + racialSpells.bonusCantrips;
              const cantripCount = character.cantrips?.length || 0;
              if (cantripCount < expectedCantrips) {
                return {
                  isValid: false,
                  message: `Please select ${expectedCantrips} cantrip${expectedCantrips > 1 ? 's' : ''} for your ${character.class?.name}`
                };
              }
            }

            // Check spells if class learns them
            if (spellcastingInfo.spellsKnown && spellcastingInfo.spellsKnown > 0) {
              const spellCount = character.knownSpells?.length || 0;
              if (spellCount < spellcastingInfo.spellsKnown) {
                return {
                  isValid: false,
                  message: `Please select ${spellcastingInfo.spellsKnown} spell${spellcastingInfo.spellsKnown > 1 ? 's' : ''} for your ${character.class?.name}`
                };
              }
            }
          }
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
            const maxPreparedSpells = Math.max(1, level + (character.abilityScores?.[spellcasting.ability]?.modifier || 0));
            const preparedCount = character.preparedSpells?.length || 0;
            if (preparedCount < maxPreparedSpells) {
              return {
                isValid: false,
                message: `Please prepare ${maxPreparedSpells} spells for your ${character.class?.name}`
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
                message: `Please select ${maxMetamagicOptions} metamagic option${maxMetamagicOptions > 1 ? 's' : ''} for your ${character.class?.name}`
              };
            }
          }

          // Check if pact magic spells are required and completed (Warlock)
          const needsPactMagic = classId === 'warlock';
          if (needsPactMagic) {
            const pactProgression = level === 1 ? { spellsKnown: 2 } :
                                   level === 2 ? { spellsKnown: 3 } :
                                   level === 3 ? { spellsKnown: 4 } :
                                   { spellsKnown: Math.min(15, 2 + level) };
            const pactSpellCount = character.pactMagicSpells?.length || 0;
            if (pactSpellCount < pactProgression.spellsKnown) {
              return {
                isValid: false,
                message: `Please select ${pactProgression.spellsKnown} pact magic spell${pactProgression.spellsKnown > 1 ? 's' : ''} for your ${character.class?.name}`
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

    return { isValid: true, message: "" };
  };

  /**
   * Validates the final character state for saving
   * Checks if all required fields are present and properly set
   * @returns {boolean} True if character data is valid, false otherwise
   */
  const validateCharacter = () => {
    if (!state.character) return false;
    const { race, class: characterClass, abilityScores, background, skillProficiencies, languages, name } = state.character;

    // Basic required fields including name
    const hasBasicFields = !!(name?.trim() && race && characterClass && abilityScores && background && skillProficiencies?.length && languages?.length);

    // If race has subraces, subrace must be selected
    const hasValidSubrace = !race?.subraces?.length || !!state.character.subrace;

    // If class is spellcaster, spells must be selected
    const spellcasting = characterClass?.spellcasting;
    let hasValidSpells = true;
    if (spellcasting) {
      const spellcastingInfo = getSpellcastingInfo(characterClass, state.character?.level || 1);
      if (spellcastingInfo) {
        const racialSpells = getRacialSpells(race?.name || '', state.character?.subrace);
        const expectedCantrips = spellcastingInfo.cantripsKnown + racialSpells.cantrips.length + racialSpells.bonusCantrips;
        const expectedSpells = spellcastingInfo.spellsKnown || 0;

        const hasEnoughCantrips = expectedCantrips === 0 || (state.character.cantrips?.length || 0) >= expectedCantrips;
        const hasEnoughSpells = expectedSpells === 0 || (state.character.knownSpells?.length || 0) >= expectedSpells;

        hasValidSpells = hasEnoughCantrips && hasEnoughSpells;
      }
    }

    // If class has features with choices, they must be selected
    const classFeatures = characterClass?.classFeatures?.filter(f => f.choices) || [];
    const hasValidClassFeatures = classFeatures.length === 0 || (
      state.character.classFeatures &&
      classFeatures.every(feature => state.character?.classFeatures?.[feature.id])
    );

    return hasBasicFields && hasValidSubrace && hasValidSpells && hasValidClassFeatures;
  };

  /**
   * Handles navigation to the next step
   * Validates current step before proceeding, on final step validates and saves the complete character
   * @returns {Promise<void>}
   */
  const handleNext = async () => {
    console.log('handleNext called at step:', currentStep);

    if (currentStep < filteredSteps.length - 1) {
      // Validate current step before proceeding
      const validation = validateCurrentStep(currentStep);
      if (!validation.isValid) {
        toast({
          title: "Please Complete This Step",
          description: validation.message,
          variant: "destructive",
        });
        return; // Don't proceed if validation fails
      }

      console.log('Navigating to next step:', currentStep + 1);
      setCurrentStep(currentStep + 1);
    } else {
      console.log('Final step - attempting to save character');
      if (state.character) {
        console.log('Character data for save:', state.character);
        const isValid = validateCharacter();
        console.log('Character validation result:', isValid);
        
        if (!isValid) {
          toast({
            title: "Character Validation Issues",
            description: "Some optional fields are incomplete. You can still save and edit later, or complete the missing sections.",
            variant: "default", // Changed to default instead of destructive to allow save
          });
          // Continue to save even with warnings (relaxed validation)
        }

        try {
          console.log('Calling saveCharacter...');
          const savedCharacter = await saveCharacter(state.character);
          console.log('Save result:', savedCharacter);
          
          if (savedCharacter?.id) {
            console.log('Character saved successfully, navigating to /characters');
            toast({
              title: "Success",
              description: "Character created successfully!",
            });
            navigate('/characters');
          } else {
            console.error('Save succeeded but no ID returned');
            toast({
              title: "Save Warning",
              description: "Character may have saved but couldn't verify. Check your characters list.",
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Error saving character:', error);
          toast({
            title: "Save Error",
            description: `Failed to save character: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive",
          });
        }
      } else {
        console.error('No character data to save');
        toast({
          title: "No Character",
          description: "No character data found to save.",
          variant: "destructive",
        });
      }
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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Character Creation Area */}
        <div className="xl:col-span-2">
          <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <h1 className="text-3xl font-bold text-center mb-8">Create Your Character</h1>
            <ProgressIndicator currentStep={currentStep} totalSteps={filteredSteps.length} />
            <div className="min-h-[600px]">
              <CurrentStepComponent />
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
          <div className="sticky top-8">
            <CharacterPreview />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardContent;
