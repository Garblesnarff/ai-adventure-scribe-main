import type { Character } from '@/types/character';
import type { FC } from 'react';

/**
 * Interface defining the structure of a wizard step
 */
export interface WizardStep {
  component: FC;
  label: string;
  skipCondition?: (character: Character | null) => boolean;
}
