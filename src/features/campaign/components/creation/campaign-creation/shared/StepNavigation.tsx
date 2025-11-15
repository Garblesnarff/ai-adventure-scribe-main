import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  Map,
  Wand2,
  Settings,
  Sparkles,
} from 'lucide-react';
import React from 'react';

import { wizardSteps } from '../wizard/constants';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

/**
 * Enhanced navigation component for the campaign creation wizard
 * Features progress tracking, step previews, and fantasy-themed styling
 */
const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  isLoading = false,
}) => {
  const getStepIcon = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return <Wand2 className="w-4 h-4" />;
      case 1:
        return <Map className="w-4 h-4" />;
      case 2:
        return <Settings className="w-4 h-4" />;
      case 3:
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getMotivationalMessage = () => {
    switch (currentStep) {
      case 0:
        return 'Choose your realm and begin your epic tale';
      case 1:
        return 'Define the scope of your legendary campaign';
      case 2:
        return 'Add unique elements to make your world unforgettable';
      case 3:
        return 'Complete your masterpiece and unleash your adventure';
      default:
        return 'Continue your quest';
    }
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Progress Overview */}
      <Card className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Campaign Creation Progress
            </div>
            <Badge variant="outline" className="px-2 py-1 border-blue-500 text-blue-600">
              {currentStep + 1} / {totalSteps}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentStep === totalSteps - 1
              ? 'Almost there!'
              : `${totalSteps - currentStep - 1} steps remaining`}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between items-center">
          {wizardSteps.slice(0, 4).map((step, index) => (
            <div key={index} className="flex flex-col items-center space-y-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {index < currentStep ? <CheckCircle className="w-4 h-4" /> : getStepIcon(index)}
              </div>
              <span
                className={`text-xs text-center transition-all duration-300 ${
                  index === currentStep ? 'text-blue-600 font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Motivational Message */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground italic">{getMotivationalMessage()}</p>
      </div>

      {/* Navigation Buttons */}
      <Card className="p-4 parchment-panel">
        <div className="flex justify-between items-center gap-4">
          <Button
            variant="fantasy"
            size="sm"
            onClick={onPrevious}
            disabled={currentStep === 0 || isLoading}
            className="flex-1 transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="fantasy"
            size="sm"
            onClick={onNext}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105"
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
      </Card>
    </div>
  );
};

export default StepNavigation;
