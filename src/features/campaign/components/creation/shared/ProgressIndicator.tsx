import { CheckCircle, Circle, Wand2, Map, Settings, Sparkles } from 'lucide-react';
import React from 'react';

import { wizardSteps } from '../wizard/constants';

import SharedProgressIndicator from '@/components/shared/ProgressIndicator';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const campaignTheme = {
  title: 'text-lg font-semibold text-blue-700 dark:text-blue-300',
  badge: 'px-3 py-1 border-blue-500 text-blue-600',
  progressBarGradient: 'from-blue-600 to-indigo-600',
  stepPreviewCard:
    'p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800',
  currentStepText: 'font-medium text-blue-600',
  currentStepDot: 'bg-blue-600',
  currentStepLabel: 'text-blue-600 font-semibold',
};

const renderCampaignStepIcon = (stepIndex: number, isCompleted: boolean, isCurrent: boolean) => {
  if (isCompleted) {
    return <CheckCircle className="w-4 h-4 text-success" />;
  }
  if (isCurrent) {
    // Return the specific icon for the current step
    switch (stepIndex) {
      case 0:
        return <Wand2 className="w-4 h-4 text-blue-600" />;
      case 1:
        return <Map className="w-4 h-4 text-blue-600" />;
      case 2:
        return <Settings className="w-4 h-4 text-blue-600" />;
      case 3:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      default:
        return <Circle className="w-4 h-4 text-blue-600 fill-blue-600" />;
    }
  }
  // For upcoming steps, show a simple circle
  return <Circle className="w-4 h-4" />;
};

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <SharedProgressIndicator
      currentStep={currentStep}
      totalSteps={totalSteps}
      steps={wizardSteps}
      title="Campaign Creation Progress"
      theme={campaignTheme}
      renderStepIcon={renderCampaignStepIcon}
    />
  );
};

export default ProgressIndicator;
