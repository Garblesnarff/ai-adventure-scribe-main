import React from 'react';

import { wizardSteps } from '../wizard/constants';

import SharedProgressIndicator from '@/components/shared/ProgressIndicator';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <SharedProgressIndicator
      currentStep={currentStep}
      totalSteps={totalSteps}
      steps={wizardSteps}
      title="Character Creation Progress"
    />
  );
};

export default ProgressIndicator;
