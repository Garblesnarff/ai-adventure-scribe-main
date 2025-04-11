import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Progress indicator component for the campaign creation wizard
 * Shows current step and overall progress
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full mb-6">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-center mt-2 text-muted-foreground">
        Step {currentStep + 1} of {totalSteps}
      </p>
    </div>
  );
};

export default ProgressIndicator;