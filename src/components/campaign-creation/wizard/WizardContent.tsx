import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useCampaign } from '@/contexts/CampaignContext';
import { useToast } from '@/components/ui/use-toast';
import StepNavigation from '../shared/StepNavigation';
import ProgressIndicator from '../shared/ProgressIndicator';
import WizardHeader from './WizardHeader';
import { wizardSteps } from './constants';
import { useCampaignSave } from './useCampaignSave';
import {
  validateBasicDetails,
  validateGenreSelection,
  validateCampaignParameters,
  validateCampaignEnhancements,
  validateCompleteCampaign
} from './validation';

/**
 * Main content component for the campaign creation wizard
 * Handles step navigation, validation, and campaign saving
 */
const WizardContent: React.FC = () => {
  const { state } = useCampaign();
  const [currentStep, setCurrentStep] = React.useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveCampaign, isSaving } = useCampaignSave();

  /**
   * Validates the current step's data based on the new step order:
   * 1. Genre Selection
   * 2. Campaign Parameters
   * 3. Campaign Enhancements
   * 4. Basic Details
   * @returns boolean indicating if validation passed
   */
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return validateGenreSelection(state.campaign, toast);
      case 1:
        return validateCampaignParameters(state.campaign, toast);
      case 2:
        return validateCampaignEnhancements(state.campaign, toast);
      case 3:
        return validateBasicDetails(state.campaign, toast);
      default:
        return true;
    }
  };

  /**
   * Handles navigation to the next step
   * On final step, validates and saves the complete character
   */
  const handleNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (!validateCompleteCampaign(state.campaign, toast)) {
        return;
      }

      try {
        const campaignId = await saveCampaign(state.campaign);
        toast({
          title: "Campaign Created Successfully!",
          description: "Your new campaign is ready. Select or create a character to begin your adventure.",
        });
        navigate(`/campaign/${campaignId}`);
      } catch (error) {
        console.error('Error saving campaign:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create campaign. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  /**
   * Handles navigation to the previous step
   */
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Get the component for the current step
  const CurrentStepComponent = wizardSteps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-8 relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-5 mix-blend-multiply"
        style={{ backgroundImage: "url('/parchment-bg.png')" }}
      />
      <div className="container mx-auto px-4 relative z-10">
        <div className="parchment-panel max-w-2xl mx-auto animate-fade-in-up">
          <Card className="p-0 bg-transparent border-0 shadow-none">
            <div className="p-6">
              <WizardHeader />
              <ProgressIndicator currentStep={currentStep} totalSteps={wizardSteps.length} />
              <CurrentStepComponent isLoading={isSaving} />
              <StepNavigation
                currentStep={currentStep}
                totalSteps={wizardSteps.length}
                onNext={handleNext}
                onPrevious={handlePrevious}
                isLoading={isSaving}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WizardContent;
