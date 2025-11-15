import type { FC } from 'react';

/**
 * Interface defining the structure of a wizard step component props
 */
export interface WizardStepProps {
  isLoading?: boolean;
}

/**
 * Interface defining the structure of a wizard step
 */
export interface WizardStep {
  component: FC<WizardStepProps>;
  label: string;
}
