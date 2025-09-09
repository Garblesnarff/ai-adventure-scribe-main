import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCharacterSave } from '@/hooks/use-character-save';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import StepNavigation from '../shared/StepNavigation';
import ProgressIndicator from '../shared/ProgressIndicator';
import { WizardStep } from './types';
import { wizardSteps } from './constants';

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

  // Scroll to top whenever the step changes
  React.useEffect(() => {
    scrollToTop();
  }, [currentStep, scrollToTop]);

  /**
   * Validates the current character state
   * Checks if all required fields are present and properly set
   * @returns {boolean} True if character data is valid, false otherwise
   */
  const validateCharacter = () => {
    if (!state.character) return false;
    const { race, class: characterClass, abilityScores, background, skillProficiencies, languages } = state.character;
    
    // Basic required fields
    const hasBasicFields = !!(race && characterClass && abilityScores && background && skillProficiencies?.length && languages?.length);
    
    // If race has subraces, subrace must be selected
    const hasValidSubrace = !race?.subraces?.length || !!state.character.subrace;
    
    // If class is spellcaster, spells must be selected
    const spellcasting = characterClass?.spellcasting;
    const hasValidSpells = !spellcasting || (
      (spellcasting.cantripsKnown === 0 || (state.character.cantrips?.length || 0) >= spellcasting.cantripsKnown) &&
      (!spellcasting.spellsKnown || (state.character.knownSpells?.length || 0) >= spellcasting.spellsKnown)
    );
    
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
   * On final step, validates and saves the complete character
   * @returns {Promise<void>}
   */
  const handleNext = async () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (state.character) {
        if (!validateCharacter()) {
          toast({
            title: "Incomplete Character",
            description: "Please complete all required fields before saving.",
            variant: "destructive",
          });
          return;
        }

        try {
          const savedCharacter = await saveCharacter(state.character);
          if (savedCharacter?.id) {
            toast({
              title: "Success",
              description: "Character created successfully!",
            });
            navigate('/characters');
          }
        } catch (error) {
          console.error('Error saving character:', error);
          toast({
            title: "Error",
            description: "Failed to save character data",
            variant: "destructive",
          });
        }
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
  const CurrentStepComponent = wizardSteps[currentStep].component;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <h1 className="text-3xl font-bold text-center mb-8">Create Your Character</h1>
        <ProgressIndicator currentStep={currentStep} totalSteps={wizardSteps.length} />
        <CurrentStepComponent />
        <StepNavigation
          currentStep={currentStep}
          totalSteps={wizardSteps.length}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isLoading={isSaving}
        />
      </Card>
    </div>
  );
};

export default WizardContent;
