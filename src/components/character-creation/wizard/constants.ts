import AbilityScoresSelection from '../steps/AbilityScoresSelection';
import AdvancedSpellcastingSelection from '../steps/AdvancedSpellcastingSelection';
import BackgroundSelection from '../steps/BackgroundSelection';
import BasicInfo from '../steps/BasicInfo';
import CharacterEnhancements from '../steps/CharacterEnhancements';
import CharacterFinalization from '../steps/CharacterFinalization';
import ClassFeatureSelection from '../steps/ClassFeatureSelection';
import ClassSelection from '../steps/ClassSelection';
import EquipmentSelection from '../steps/EquipmentSelection';
import PersonalitySelection from '../steps/PersonalitySelection';
import PhysicalStep from '../steps/PhysicalStep';
import RaceSelection from '../steps/RaceSelection';
import SpellSelection from '../steps/SpellSelection';
import SubraceSelection from '../steps/SubraceSelection';
import ProficienciesSelection from '../steps/ProficienciesSelection';

import type { WizardStep } from './types';

/**
 * Array of steps for the character creation wizard
 * Order determines the sequence of steps in the creation process
 */
/**
 * D&D 5E Character Creation Flow:
 * 1. Choose Race (determines racial traits and ability bonuses)
 * 2. Choose Class (determines class features and proficiencies)
 * 3. Determine Ability Scores (point buy, standard array, or rolling)
 * 4. Describe Your Character (background, personality, appearance)
 * 5. Choose Equipment (starting gear from class and background)
 */
export const wizardSteps: WizardStep[] = [
  {
    component: BasicInfo,
    label: 'Basic Info',
  },
  {
    component: RaceSelection,
    label: 'Race',
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
    },
  },
  {
    component: PhysicalStep,
    label: 'Physical',
  },
  {
    component: ClassSelection,
    label: 'Class',
  },
  {
    component: ClassFeatureSelection,
    label: 'Class Features',
  },
  {
    component: AbilityScoresSelection,
    label: 'Ability Scores',
  },
  {
    component: BackgroundSelection,
    label: 'Background',
  },
  {
    component: PersonalitySelection,
    label: 'Personality',
    skipCondition: (character) => {
      // Skip if no background selected yet
      return !character?.background;
    },
  },
  {
    component: ProficienciesSelection,
    label: 'Proficiencies & Languages',
  },
  {
    component: SpellSelection,
    label: 'Spells',
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
    },
  },
  {
    component: EquipmentSelection,
    label: 'Equipment',
  },
  {
    component: CharacterEnhancements,
    label: 'Enhancements',
  },
  {
    component: CharacterFinalization,
    label: 'Finalization',
  },
];
