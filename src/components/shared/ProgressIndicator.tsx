import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

/**
 * @interface Step
 * Defines the structure for a single step in the wizard.
 */
interface Step {
  label: string;
}

/**
 * @interface ProgressIndicatorTheme
 * Optional theme object to customize the appearance of the progress indicator.
 * This allows for different visual styles for various wizards (e.g., campaign vs. character creation).
 * For AI developers: Pass this prop to override the default styling.
 */
interface ProgressIndicatorTheme {
  title?: string;
  badge?: string;
  progressBarGradient?: string;
  stepPreviewCard?: string;
  currentStepText?: string;
  currentStepDot?: string;
  currentStepLabel?: string;
}

/**
 * @interface ProgressIndicatorProps
 * Defines the props for the ProgressIndicator component.
 */
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
  title: string;
  /**
   * An object containing custom CSS classes to theme the component.
   * @see ProgressIndicatorTheme for available options.
   */
  theme?: ProgressIndicatorTheme;
  /**
   * A function to render custom icons for each step.
   * If not provided, it will use default icons.
   * For AI developers: This allows for unique icons per wizard.
   * @param stepIndex - The index of the step.
   * @param isCompleted - Whether the step is completed.
   * @param isCurrent - Whether this is the current step.
   * @returns A React.ReactNode representing the icon.
   */
  renderStepIcon?: (stepIndex: number, isCompleted: boolean, isCurrent: boolean) => React.ReactNode;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps,
  title,
  theme = {},
  renderStepIcon,
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const defaultTheme: Required<ProgressIndicatorTheme> = {
    title: 'text-lg font-semibold',
    badge: 'text-sm',
    progressBarGradient: 'from-blue-500 to-purple-600',
    stepPreviewCard:
      'p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 border-blue-200 dark:border-blue-800',
    currentStepText: 'font-medium text-foreground',
    currentStepDot: 'bg-primary',
    currentStepLabel: 'text-primary font-semibold',
  };

  const getStepPreview = () => {
    return steps.map((step, index) => {
      const isCompleted = index < currentStep;
      const isCurrent = index === currentStep;

      const stepLabelStyle = isCurrent
        ? theme.currentStepLabel || defaultTheme.currentStepLabel
        : isCompleted
          ? 'text-success'
          : 'text-muted-foreground';

      return (
        <div
          key={index}
          className={`flex items-center space-x-2 text-xs transition-all duration-300 ${stepLabelStyle}`}
        >
          {renderStepIcon ? (
            renderStepIcon(index, isCompleted, isCurrent)
          ) : (
            <>
              {isCompleted ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : isCurrent ? (
                <Circle
                  className={`w-4 h-4 ${theme.currentStepLabel || defaultTheme.currentStepLabel}`}
                />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </>
          )}
          <span className="hidden sm:inline">{step.label}</span>
          {index < steps.length - 1 && <ArrowRight className="w-3 h-3 hidden md:inline" />}
        </div>
      );
    });
  };

  return (
    <div className="w-full mb-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className={theme.title || defaultTheme.title}>{title}</h3>
          <Badge variant="outline" className={theme.badge || defaultTheme.badge}>
            {currentStep + 1} of {totalSteps}
          </Badge>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-3 transition-all duration-500 ease-out" />
          <div
            className={`absolute top-0 left-0 h-3 bg-gradient-to-r ${theme.progressBarGradient || defaultTheme.progressBarGradient} rounded-full transition-all duration-500 ease-out opacity-20`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <Card className={theme.stepPreviewCard || defaultTheme.stepPreviewCard}>
          <div className="flex justify-between items-center overflow-x-auto">
            {getStepPreview()}
          </div>
        </Card>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Currently:{' '}
            <span className={theme.currentStepText || defaultTheme.currentStepText}>
              {steps[currentStep]?.label || 'Unknown Step'}
            </span>
          </p>
          <div className="flex justify-center mt-2">
            <div className="flex space-x-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i <= currentStep
                      ? theme.currentStepDot || defaultTheme.currentStepDot
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
