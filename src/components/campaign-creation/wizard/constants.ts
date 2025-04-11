import BasicDetails from '../steps/basic-details';
import GenreSelection from '../steps/GenreSelection';
import CampaignParameters from '../steps/CampaignParameters';
import { WizardStep } from './types';

/**
 * Array of steps in the campaign creation process
 * Each step has a component and label for navigation
 */
export const wizardSteps: WizardStep[] = [
  { component: GenreSelection, label: 'Genre' },
  { component: CampaignParameters, label: 'Parameters' },
  { component: BasicDetails, label: 'Details' },
];