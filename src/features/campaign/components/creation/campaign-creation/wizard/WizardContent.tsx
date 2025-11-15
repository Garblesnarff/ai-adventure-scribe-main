import React from 'react';
import { useNavigate } from 'react-router-dom';

import { wizardSteps } from './constants';
import { useCampaignSave } from './useCampaignSave';
import {
  validateBasicDetails,
  validateGenreSelection,
  validateCampaignParameters,
  validateCampaignEnhancements,
  validateCompleteCampaign,
} from './validation';
import WizardHeader from './WizardHeader';
import CampaignPreview from '../shared/CampaignPreview';
import ProgressIndicator from '../shared/ProgressIndicator';
import StepNavigation from '../shared/StepNavigation';

import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCampaign } from '@/contexts/CampaignContext';
import { useAutosave } from '@/hooks/useAutosave';
import logger from '@/lib/logger';

/**
 * Main content component for the campaign creation wizard
 * Handles step navigation, validation, and campaign saving
 */
const WizardContent: React.FC = () => {
  const { state, dispatch } = useCampaign();
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
          title: 'Campaign Created Successfully!',
          description:
            'Your new campaign is ready. Select or create a character to begin your adventure.',
        });
        navigate(`/app/campaigns/${campaignId}`);
      } catch (error) {
        logger.error('Error saving campaign:', error);
        toast({
          title: 'Error',
          description:
            error instanceof Error ? error.message : 'Failed to create campaign. Please try again.',
          variant: 'destructive',
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

  const storageKey = 'campaign-wizard-draft-v1';
  const { status, restore, clear } = useAutosave(storageKey, state.campaign || {}, { delay: 900 });

  const hasDraft = !!restore();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Campaign Creation Area */}
        <div className="xl:col-span-2">
          <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <WizardHeader
              step={currentStep + 1}
              totalSteps={wizardSteps.length}
              autosaveKey={storageKey}
              formSnapshot={state.campaign}
            />
            <ProgressIndicator currentStep={currentStep} totalSteps={wizardSteps.length} />
            {hasDraft && (
              <div className="flex justify-end mb-3">
                <button
                  className="btn btn-sm mr-2"
                  onClick={() => {
                    const draft = restore();
                    if (draft) {
                      dispatch({ type: 'UPDATE_CAMPAIGN', payload: draft });
                    }
                  }}
                >
                  Restore draft
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => clear()}>
                  Clear draft
                </button>
              </div>
            )}
            <div className="min-h-[600px]">
              <CurrentStepComponent isLoading={isSaving} />
            </div>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={wizardSteps.length}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isLoading={isSaving}
            />
          </Card>
        </div>

        {/* Campaign Preview Sidebar */}
        <div className="xl:col-span-1">
          <div className="sticky top-8">
            <CampaignPreview />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardContent;
