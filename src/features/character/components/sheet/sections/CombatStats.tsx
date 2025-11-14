import { Swords } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';

import { Card } from '@/components/ui/card';

interface CombatStatsProps {
  character: Character;
}

/**
 * CombatStats component displays combat-related statistics
 * Including hit points and armor class calculations
 * @param character - The character data to display
 */
const CombatStats = ({ character }: CombatStatsProps) => {
  // Armor Class calculation with unarmored defense support
  let armorClass = 10 + character.abilityScores.dexterity.modifier;

  // Check for unarmored defense (Barbarian/monk without armor)
  const hasUnarmoredDefense =
    character.class &&
    (character.class.name.toLowerCase() === 'barbarian' ||
      character.class.name.toLowerCase() === 'monk');

  const isWearingArmor = character.equippedArmor !== undefined && character.equippedArmor !== '';

  // If character has unarmored defense and is not wearing armor, use unarmored AC
  if (hasUnarmoredDefense && !isWearingArmor) {
    switch (character.class!.name.toLowerCase()) {
      case 'barbarian':
        armorClass =
          10 +
          character.abilityScores.dexterity.modifier +
          character.abilityScores.constitution.modifier;
        break;
      case 'monk':
        armorClass =
          10 + character.abilityScores.dexterity.modifier + character.abilityScores.wisdom.modifier;
        break;
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Combat Statistics</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-medium">Hit Points</p>
          <p>{character.abilityScores.constitution.modifier + 8}</p>
        </div>
        <div>
          <p className="font-medium">Armor Class</p>
          <p>{armorClass}</p>
        </div>
      </div>
    </Card>
  );
};

export default CombatStats;
