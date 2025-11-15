import React from 'react';
import { useParams } from 'react-router-dom';

import CharacterSheetTabs from './character-sheet-tabs';

import { Card } from '@/components/ui/card';
import { useCharacterData } from '@/hooks/use-character-data';

/**
 * CharacterSheet component displays all character information
 * Now uses the new tabbed layout for better organization and Roll20-style functionality
 * Uses useCharacterData hook for data fetching and state management
 */
const CharacterSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { character, loading, refetch } = useCharacterData(id);

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex justify-center items-center min-h-[200px]">
            Loading character data...
          </div>
        </Card>
      </div>
    );
  }

  // Early return if no character data is available
  if (!character) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <CharacterSheetTabs character={character} onCharacterUpdate={refetch} />
      </Card>
    </div>
  );
};

export default CharacterSheet;
