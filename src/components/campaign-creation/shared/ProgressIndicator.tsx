import React from 'react';
import SharedProgressIndicator from '@/components/shared/ProgressIndicator';
import { wizardSteps } from '../wizard/constants';
import { CheckCircle, Circle, Wand2, Map, Settings, Sparkles } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const campaignTheme = {
  title: 'text-lg font-semibold text-infinite-purple',
  badge: 'px-3 py-1 border-infinite-gold text-infinite-gold',
  progressBarGradient: 'from-infinite-purple to-infinite-teal',
  stepPreviewCard: 'p-4 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800',
  currentStepText: 'font-medium text-infinite-purple',
  currentStepDot: 'bg-infinite-purple',
  currentStepLabel: 'text-infinite-purple font-semibold',
};

const renderCampaignStepIcon = (stepIndex: number, isCompleted: boolean, isCurrent: boolean) => {
  if (isCompleted) {
    return <CheckCircle className="w-4 h-4 text-success" />;
  }
  if (isCurrent) {
    // Return the specific icon for the current step
    switch (stepIndex) {
      case 0: return <Wand2 className="w-4 h-4 text-infinite-purple" />;
      case 1: return <Map className="w-4 h-4 text-infinite-purple" />;
      case 2: return <Settings className="w-4 h-4 text-infinite-purple" />;
      case 3: return <Sparkles className="w-4 h-4 text-infinite-purple" />;
      default: return <Circle className="w-4 h-4 text-infinite-purple fill-infinite-purple" />;
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