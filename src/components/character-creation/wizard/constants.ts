import { WizardStep } from './types';
import BasicInfo from '../steps/BasicInfo';
import RaceSelection from '../steps/RaceSelection';
import ClassSelection from '../steps/ClassSelection';
import AbilityScoresSelection from '../steps/AbilityScoresSelection';
import BackgroundSelection from '../steps/BackgroundSelection';
import EquipmentSelection from '../steps/EquipmentSelection';
import CharacterFinalization from '../steps/CharacterFinalization';

/**
 * Array of steps for the character creation wizard
 * Order determines the sequence of steps in the creation process
 */
export const wizardSteps: WizardStep[] = [
  {
    component: BasicInfo,
    label: 'Basic Info'
  },
  {
    component: RaceSelection,
    label: 'Race'
  },
  {
    component: ClassSelection,
    label: 'Class'
  },
  {
    component: AbilityScoresSelection,
    label: 'Ability Scores'
  },
  {
    component: BackgroundSelection,
    label: 'Background'
  },
  {
    component: EquipmentSelection,
    label: 'Equipment'
  },
  {
    component: CharacterFinalization,
    label: 'Finalization'
  }
];