import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowRight, Wand2, Map, Settings, Sparkles } from 'lucide-react';
import { wizardSteps } from '../wizard/constants';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Get step labels for preview
  const getStepPreview = () => {
    const steps = wizardSteps.slice(0, 4); // Show all 4 steps for campaign creation
    return steps.map((step, index) => {
      const isCompleted = index < currentStep;
      const isCurrent = index === currentStep;
      const isUpcoming = index > currentStep;

      return (
        <div
          key={index}
          className={`flex items-center space-x-2 text-xs transition-all duration-300 ${
            isCurrent ? 'text-infinite-purple font-semibold' :
            isCompleted ? 'text-green-600' :
            'text-muted-foreground'
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : isCurrent ? (
            <Circle className="w-4 h-4 text-infinite-purple fill-infinite-purple" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{step.label}</span>
          {index < steps.length - 1 && (
            <ArrowRight className="w-3 h-3 hidden md:inline" />
          )}
        </div>
      );
    });
  };

  const getStepIcon = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: return <Wand2 className="w-4 h-4" />;
      case 1: return <Map className="w-4 h-4" />;
      case 2: return <Settings className="w-4 h-4" />;
      case 3: return <Sparkles className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full mb-8">
      {/* Main Progress Bar */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-infinite-purple">Campaign Creation Progress</h3>
          <Badge variant="outline" className="px-3 py-1 border-infinite-gold text-infinite-gold">
            {currentStep + 1} of {totalSteps}
          </Badge>
        </div>

        {/* Animated Progress Bar */}
        <div className="relative">
          <Progress
            value={progress}
            className="h-3 transition-all duration-500 ease-out"
          />
          <div
            className="absolute top-0 left-0 h-3 bg-gradient-to-r from-infinite-purple to-infinite-teal rounded-full transition-all duration-500 ease-out opacity-20"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Preview */}
        <Card className="p-4 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex justify-between items-center overflow-x-auto">
            {getStepPreview()}
          </div>
        </Card>

        {/* Current Step Info */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Currently: <span className="font-medium text-infinite-purple">
              {wizardSteps[currentStep]?.label || 'Unknown Step'}
            </span>
          </p>
          <div className="flex justify-center mt-2">
            <div className="flex space-x-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i <= currentStep
                      ? 'bg-infinite-purple'
                      : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
