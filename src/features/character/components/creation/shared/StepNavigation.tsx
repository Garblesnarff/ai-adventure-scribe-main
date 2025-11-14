import { Loader2, ArrowLeft, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

/**
 * Enhanced navigation component for the character creation wizard
 * Features smooth animations, better visual feedback, and modern design
 */
const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  isLoading = false,
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="mt-8 space-y-4" data-testid="step-navigation">
      {/* Progress Summary */}
      <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
        <Badge variant="outline" className="px-3 py-1">
          Step {currentStep + 1} of {totalSteps}
        </Badge>
        <div className="flex items-center space-x-2">
          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="font-medium">{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstStep || isLoading}
          className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center space-x-4">
          {/* Step indicators */}
          <div className="hidden sm:flex items-center space-x-2">
            {Array.from({ length: Math.min(totalSteps, 5) }, (_, i) => {
              const stepIndex = i + Math.max(0, currentStep - 2);
              if (stepIndex >= totalSteps) return null;

              const isActive = stepIndex === currentStep;
              const isCompleted = stepIndex < currentStep;

              return (
                <div
                  key={stepIndex}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-primary text-primary-foreground scale-110'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepIndex + 1}
                </div>
              );
            })}
          </div>

          <Button
            onClick={onNext}
            disabled={isLoading}
            className="transition-all duration-200 hover:scale-105 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Character...
              </>
            ) : isLastStep ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Complete Character
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Motivational Message */}
      {isLastStep && !isLoading && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            🎉 Almost there! Your character is ready to come to life.
          </p>
        </div>
      )}
    </div>
  );
};

export default StepNavigation;
