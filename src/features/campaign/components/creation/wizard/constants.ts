import BasicDetails from '../steps/basic-details';
import GenreSelection from '../steps/GenreSelection';
import CampaignParameters from '../steps/CampaignParameters';
import CampaignEnhancements from '../steps/CampaignEnhancements';
import { WizardStep } from './types';

/**
 * Array of steps in the campaign creation process
 * Each step has a component and label for navigation
 */
export const wizardSteps: WizardStep[] = [
  { component: GenreSelection, label: 'Genre' },
  { component: CampaignParameters, label: 'Parameters' },
  { component: CampaignEnhancements, label: 'Enhancements' },
  { component: BasicDetails, label: 'Details' },
];
