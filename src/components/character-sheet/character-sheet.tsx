import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useCharacterData } from '@/hooks/use-character-data';
import BasicInfo from './sections/BasicInfo';
import CombatStats from './sections/CombatStats';
import AbilityScores from './sections/AbilityScores';
import Equipment from './sections/Equipment';

/**
 * CharacterSheet component displays all character information
 * Orchestrates the layout and data flow between character sections
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

  // Transform ability scores into the format expected by AbilityScores component
  const abilityStats = {
    strength: character.abilityScores.strength.score,
    dexterity: character.abilityScores.dexterity.score,
    constitution: character.abilityScores.constitution.score,
    intelligence: character.abilityScores.intelligence.score,
    wisdom: character.abilityScores.wisdom.score,
    charisma: character.abilityScores.charisma.score,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        {/* Character Header with Portrait */}
        <div className="flex flex-col lg:flex-row items-center gap-6 mb-8">
          {/* Character Portrait */}
          <div className="flex-shrink-0">
            {character.image_url ? (
              <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-lg overflow-hidden border-4 border-border shadow-lg">
                <img
                  src={character.image_url}
                  alt={`Portrait of ${character.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to character initial if image fails
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-6xl font-bold text-white bg-gradient-to-br from-purple-600 to-blue-600">${character.name.charAt(0).toUpperCase()}</div>`;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-lg flex items-center justify-center text-6xl font-bold text-white bg-gradient-to-br from-purple-600 to-blue-600 border-4 border-border shadow-lg">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Character Title and Description */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl font-bold mb-2">{character.name}</h1>
            <p className="text-xl text-muted-foreground mb-4">
              Level {character.level} {character.race?.name} {character.class?.name}
            </p>
            {character.description && (
              <p className="text-base leading-relaxed max-w-2xl">
                {character.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BasicInfo character={character} />
          <CombatStats character={character} />
          <AbilityScores 
            characterId={character.id || ''} 
            stats={abilityStats}
            onStatsUpdate={refetch}
          />
          <Equipment character={character} />
        </div>
      </Card>
    </div>
  );
};

export default CharacterSheet;
