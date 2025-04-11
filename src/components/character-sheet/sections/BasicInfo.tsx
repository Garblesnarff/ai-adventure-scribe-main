import { Card } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';
import { Character } from '@/types/character';

interface BasicInfoProps {
  character: Character;
}

/**
 * BasicInfo component displays the fundamental character information
 * Including race, class, level, and background
 * @param character - The character data to display
 */
const BasicInfo = ({ character }: BasicInfoProps) => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Basic Information</h2>
      </div>
      <div className="space-y-2">
        <p><span className="font-medium">Race:</span> {character.race.name}</p>
        <p><span className="font-medium">Class:</span> {character.class.name}</p>
        <p><span className="font-medium">Level:</span> {character.level}</p>
        <p><span className="font-medium">Background:</span> {character.background.name}</p>
      </div>
    </Card>
  );
};

export default BasicInfo;