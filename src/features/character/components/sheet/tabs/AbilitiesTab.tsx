import { Zap, Target } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';

interface AbilitiesTabProps {
  character: Character;
  onUpdate: () => void;
}

// D&D 5e Skills with their associated abilities
const SKILLS = {
  Acrobatics: 'dexterity',
  'Animal Handling': 'wisdom',
  Arcana: 'intelligence',
  Athletics: 'strength',
  Deception: 'charisma',
  History: 'intelligence',
  Insight: 'wisdom',
  Intimidation: 'charisma',
  Investigation: 'intelligence',
  Medicine: 'wisdom',
  Nature: 'intelligence',
  Perception: 'wisdom',
  Performance: 'charisma',
  Persuasion: 'charisma',
  Religion: 'intelligence',
  'Sleight of Hand': 'dexterity',
  Stealth: 'dexterity',
  Survival: 'wisdom',
} as const;

type SkillName = keyof typeof SKILLS;
type AbilityName = keyof typeof character.abilityScores;

/**
 * Abilities & Skills tab with clickable rolls
 * Shows ability scores, modifiers, saves, and skills
 */
const AbilitiesTab: React.FC<AbilitiesTabProps> = ({ character, onUpdate }) => {
  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2;

  // For demo purposes, assume some proficiencies based on class
  const getProficiencies = (): { skills: SkillName[]; saves: AbilityName[] } => {
    const classProfs = {
      Fighter: {
        skills: ['Athletics', 'Intimidation'] as SkillName[],
        saves: ['strength', 'constitution'] as AbilityName[],
      },
      Wizard: {
        skills: ['Arcana', 'History'] as SkillName[],
        saves: ['intelligence', 'wisdom'] as AbilityName[],
      },
      Rogue: {
        skills: ['Stealth', 'Sleight of Hand', 'Perception', 'Investigation'] as SkillName[],
        saves: ['dexterity', 'intelligence'] as AbilityName[],
      },
      Cleric: {
        skills: ['Medicine', 'Religion'] as SkillName[],
        saves: ['wisdom', 'charisma'] as AbilityName[],
      },
    };

    return (
      classProfs[character.class?.name as keyof typeof classProfs] || {
        skills: [],
        saves: [],
      }
    );
  };

  const { skills: proficientSkills, saves: proficientSaves } = getProficiencies();

  const getSkillModifier = (skill: SkillName): number => {
    const ability = SKILLS[skill] as AbilityName;
    const abilityMod = character.abilityScores[ability].modifier;
    const isProficient = proficientSkills.includes(skill);

    return abilityMod + (isProficient ? proficiencyBonus : 0);
  };

  const getSaveModifier = (ability: AbilityName): number => {
    const abilityMod = character.abilityScores[ability].modifier;
    const isProficient = proficientSaves.includes(ability);

    return abilityMod + (isProficient ? proficiencyBonus : 0);
  };

  const formatModifier = (modifier: number): string => {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ability Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Ability Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(character.abilityScores).map(([ability, data]) => (
            <div key={ability} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.score}</div>
                  <div className="text-xs text-muted-foreground capitalize">{ability}</div>
                </div>
                <div className="text-lg text-muted-foreground">{formatModifier(data.modifier)}</div>
              </div>
              <DiceRoller
                dice="1d20"
                modifier={data.modifier}
                label={ability.substring(0, 3).toUpperCase()}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Saving Throws */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-500" />
            Saving Throws
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(character.abilityScores).map(([ability, data]) => {
            const isProficient = proficientSaves.includes(ability as AbilityName);
            const modifier = getSaveModifier(ability as AbilityName);

            return (
              <div key={ability} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {isProficient && <div className="w-2 h-2 bg-primary rounded-full" />}
                  <span className="capitalize font-medium">{ability}</span>
                  <Badge variant="outline" className="text-xs">
                    {formatModifier(modifier)}
                  </Badge>
                </div>
                <DiceRoller
                  dice="1d20"
                  modifier={modifier}
                  label={`${ability.substring(0, 3).toUpperCase()} Save`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(SKILLS).map(([skill, ability]) => {
              const isProficient = proficientSkills.includes(skill as SkillName);
              const modifier = getSkillModifier(skill as SkillName);

              return (
                <div key={skill} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2 flex-1">
                    {isProficient && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{skill}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {ability.substring(0, 3)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatModifier(modifier)}
                    </Badge>
                  </div>
                  <div className="ml-2">
                    <DiceRoller dice="1d20" modifier={modifier} label={skill} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Proficiency Legend */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span>Proficient (+{proficiencyBonus})</span>
              </div>
              <div>
                <span>Proficiency Bonus: +{proficiencyBonus}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AbilitiesTab;
