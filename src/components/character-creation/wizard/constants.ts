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
    label: 'Subrace',
    skipCondition: (character) => {
      // Skip if no race selected, race has no subraces, or subrace already selected
      if (!character?.race) return true;
      if (!character.race.subraces || character.race.subraces.length === 0) return true;
      if (character.subrace) return true;
      return false;
    }
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
    label: 'Advanced Spellcasting',
    skipCondition: (character) => {
      // Skip if no spellcasting ability
      if (!character?.class?.spellcasting) return true;

      const classId = character.class.id?.toLowerCase() || '';
      const level = character.level || 1;

      // Skip if class doesn't have advanced spellcasting features
      const needsPreparation = ['cleric', 'druid', 'paladin', 'wizard'].includes(classId);
      const needsPactMagic = classId === 'warlock';
      const needsMetamagic = classId === 'sorcerer' && level >= 3;
      const needsRituals = ['bard', 'cleric', 'druid', 'wizard', 'warlock'].includes(classId);

      // Skip if none of the advanced features are needed
      return !(needsPreparation || needsPactMagic || needsMetamagic || needsRituals);
    }
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
