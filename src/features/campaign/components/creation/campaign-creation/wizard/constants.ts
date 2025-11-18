import BasicDetails from '../steps/basic-details';
import CampaignEnhancements from '../steps/CampaignEnhancements';
import CampaignParameters from '../steps/CampaignParameters';
import GameSystemSelection from '../steps/GameSystemSelection';
import GenreSelection from '../steps/GenreSelection';

import type { WizardStep } from './types';

/**
 * Array of steps in the campaign creation process
 * Each step has a component and label for navigation
 */
export const wizardSteps: WizardStep[] = [
  { component: GameSystemSelection, label: 'Game System' },
  { component: GenreSelection, label: 'Genre' },
  { component: CampaignParameters, label: 'Parameters' },
  { component: CampaignEnhancements, label: 'Enhancements' },
  { component: BasicDetails, label: 'Details' },
];
