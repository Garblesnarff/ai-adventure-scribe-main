import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

/**
 * Navigation component for the campaign creation wizard
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
    <div className="mt-8 p-4 parchment-panel rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </div>
        <div className="text-sm font-medium text-infinite-gold">
          {currentStep === totalSteps - 1 ? 'Finalizing Your Adventure' : `Configuring Your Quest`}
        </div>
      </div>
      <div className="flex justify-between items-center gap-4">
        <Button
          variant="fantasy"
          size="sm"
          onClick={onPrevious}
          disabled={currentStep === 0 || isLoading}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button
          variant="fantasy"
          size="sm"
          onClick={onNext}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-infinite-purple to-infinite-teal text-white hover:from-infinite-purple/90 hover:to-infinite-teal/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Your Saga...
            </>
          ) : (
            <>
              {currentStep === totalSteps - 1 ? (
                <>
                  Complete Adventure
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue Quest
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StepNavigation;
