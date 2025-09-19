import { FC } from 'react';
import { Character } from '@/types/character';

/**
 * Interface defining the structure of a wizard step
 */
export interface WizardStep {
  component: FC;
  label: string;
  skipCondition?: (character: Character | null) => boolean;
}