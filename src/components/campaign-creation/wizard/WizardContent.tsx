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
   * 3. Basic Details
   * @returns boolean indicating if validation passed
   */
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return validateGenreSelection(state.campaign, toast);
      case 1:
        return validateCampaignParameters(state.campaign, toast);
      case 2:
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
          title: "Success",
          description: "Campaign created successfully!",
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
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
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
      </Card>
    </div>
  );
};

export default WizardContent;