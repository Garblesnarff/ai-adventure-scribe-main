import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

/**
 * Navigation component for the character creation wizard
 * Handles next/previous navigation and displays loading state
 */
const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  isLoading = false,
}) => {
  return (
    <div className="flex justify-between mt-6">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 0 || isLoading}
      >
        Previous
      </Button>
      <Button
        onClick={onNext}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          currentStep === totalSteps - 1 ? 'Finish' : 'Next'
        )}
      </Button>
    </div>
  );
};

export default StepNavigation;