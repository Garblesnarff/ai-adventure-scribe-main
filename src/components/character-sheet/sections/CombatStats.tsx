import React from 'react';
import { Card } from '@/components/ui/card';
import { Swords } from 'lucide-react';
import { Character } from '@/types/character';

interface CombatStatsProps {
  character: Character;
}

/**
 * CombatStats component displays combat-related statistics
 * Including hit points and armor class calculations
 * @param character - The character data to display
 */
const CombatStats = ({ character }: CombatStatsProps) => {
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
          <p>{10 + character.abilityScores.dexterity.modifier}</p>
        </div>
      </div>
    </Card>
  );
};

export default CombatStats;