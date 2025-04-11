import { FC } from 'react';

/**
 * Interface defining the structure of a wizard step
 */
export interface WizardStep {
  component: FC;
  label: string;
}