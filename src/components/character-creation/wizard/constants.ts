import { WizardStep } from './types';
import BasicInfo from '../steps/BasicInfo';
import RaceSelection from '../steps/RaceSelection';
import SubraceSelection from '../steps/SubraceSelection';
import ClassSelection from '../steps/ClassSelection';
import ClassFeatureSelection from '../steps/ClassFeatureSelection';
import AbilityScoresSelection from '../steps/AbilityScoresSelection';
import BackgroundSelection from '../steps/BackgroundSelection';
import ProficienciesSelection from '../steps/ProficienciesSelection';
import SpellSelection from '../steps/SpellSelection';
import AdvancedSpellcastingSelection from '../steps/AdvancedSpellcastingSelection';
import EquipmentSelection from '../steps/EquipmentSelection';
import CharacterEnhancements from '../steps/CharacterEnhancements';
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
    component: SubraceSelection,
    label: 'Subrace'
  },
  {
    component: ClassSelection,
    label: 'Class'
  },
  {
    component: ClassFeatureSelection,
    label: 'Class Features'
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
    component: ProficienciesSelection,
    label: 'Proficiencies & Languages'
  },
  {
    component: SpellSelection,
    label: 'Spells'
  },
  {
    component: AdvancedSpellcastingSelection,
    label: 'Advanced Spellcasting'
  },
  {
    component: EquipmentSelection,
    label: 'Equipment'
  },
  {
    component: CharacterEnhancements,
    label: 'Enhancements'
  },
  {
    component: CharacterFinalization,
    label: 'Finalization'
  }
];
