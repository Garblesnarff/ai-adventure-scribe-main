import { WizardStep } from './types';
import NameDescription from '../steps/NameDescription';
import RaceSelection from '../steps/RaceSelection';
import ClassSelection from '../steps/ClassSelection';
import AbilityScoresSelection from '../steps/AbilityScoresSelection';
import BackgroundSelection from '../steps/BackgroundSelection';
import EquipmentSelection from '../steps/EquipmentSelection';

/**
 * Array of steps for the character creation wizard
 * Order determines the sequence of steps in the creation process
 */
export const wizardSteps: WizardStep[] = [
  {
    component: NameDescription,
    label: 'Name & Description'
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
  }
];