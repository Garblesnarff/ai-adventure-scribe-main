import { Book } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';

import { Card } from '@/components/ui/card';

interface EquipmentProps {
  character: Character;
}

/**
 * Equipment component displays the character's inventory
 * @param character - The character data to display
 */
const Equipment = ({ character }: EquipmentProps) => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Book className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Equipment</h2>
      </div>
      <ul className="list-disc list-inside space-y-1">
        {character.equipment.map((item, index) => (
          <li key={index} className="text-gray-700">
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default Equipment;
