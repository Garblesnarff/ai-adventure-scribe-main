import { Heart, Shield, Zap } from 'lucide-react';
import React, { useEffect } from 'react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';

import { useCharacter } from '@/contexts/CharacterContext';
import logger from '@/lib/logger';

/**
 * CompactCharacterHeader - Quick view of character essentials for game sidebar
 * Extracts core stats from CharacterContext for at-a-glance access during gameplay
 *
 * Dependencies:
 * - CharacterContext for live character data
 * - lucide-react for icons
 * - ui/card, ui/button for styling
 *
 * Usage: Render in sidebar tabs; updates automatically on character changes
 */
export const CompactCharacterHeader: React.FC = () => {
  const { state: characterState } = useCharacter();
  const character = characterState.character || ({} as any);

  // Debug logging
  useEffect(() => {
    logger.debug('[CompactCharacterHeader] Character data:', {
      name: character?.name,
      avatar_url: character?.avatar_url,
      image_url: character?.image_url,
      background_image: character?.background_image,
    });
  }, [character]);

  if (!character) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <p>No character loaded</p>
      </Card>
    );
  }

  // Calculate HP (max HP formula from character sheet)
  const lvl = character.level ?? 1;
  const hitDie = character.class?.hitDie ?? 8;
  const conMod = character?.abilityScores?.constitution?.modifier ?? 0;
  const maxHp = Math.max(1, lvl * hitDie + conMod * lvl);

  // Calculate AC with unarmored defense support
  const armorClass = (() => {
    const dexMod = character?.abilityScores?.dexterity?.modifier ?? 0;
    let ac = 10 + dexMod;
    const className = (character.class?.name ?? '').toString().toLowerCase();
    const hasUnarmoredDefense = className === 'barbarian' || className === 'monk';
    const isWearingArmor = !!character.equippedArmor;

    if (hasUnarmoredDefense && !isWearingArmor) {
      switch (character.class!.name.toLowerCase()) {
        case 'barbarian':
          ac =
            10 +
            (character?.abilityScores?.dexterity?.modifier ?? 0) +
            (character?.abilityScores?.constitution?.modifier ?? 0);
          break;
        case 'monk':
          ac =
            10 +
            (character?.abilityScores?.dexterity?.modifier ?? 0) +
            (character?.abilityScores?.wisdom?.modifier ?? 0);
          break;
      }
    }
    return ac;
  })();

  // Proficiency bonus
  const proficiency = Math.floor((lvl - 1) / 4) + 2;

  const handleShortRest = () => {
    logger.info('Short rest initiated');
  };

  const handleLongRest = () => {
    logger.info('Long rest initiated');
  };

  // Resolve background image
  const backgroundImage =
    character.background_image || new URL('/card-background.jpeg', import.meta.url).href;

  // Helper function to calculate ability modifier
  const getModifier = (score?: number) => {
    if (!score) return '+0';
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <Card
      className="group overflow-hidden border-2 border-border/30 hover:border-infinite-gold/70 relative transition-all duration-500 bg-cover bg-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      {/* Glow effect on hover */}
      <div className="absolute inset-0 z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(168,85,247,0.3)]" />
      </div>

      {/* Avatar */}
      {character.avatar_url && (
        <div className="relative z-10 flex justify-center pt-4">
          <img
            src={character.avatar_url}
            alt={`${character.name} avatar`}
            className="w-16 h-16 rounded-full object-cover border-4 border-infinite-gold/80 shadow-lg shadow-infinite-gold/50 transition-all duration-300 hover:scale-110 hover:border-infinite-purple hover:shadow-infinite-purple/70"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 pt-3 space-y-3 relative z-10">
        <div className="text-center">
          <h3 className="font-semibold text-lg text-white">{character.name}</h3>
          <p className="text-sm text-gray-300">
            Level {character.level} {character.race?.name} {character.class?.name}
          </p>
        </div>

        {/* HP and AC */}
        <div className="flex gap-4 text-sm justify-center text-white">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="font-semibold">HP:</span>
            <span>{maxHp}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">AC:</span>
            <span>{armorClass}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="font-semibold">PROF:</span>
            <span>+{proficiency}</span>
          </div>
        </div>

        {/* Ability Scores Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center p-2 bg-black/30 backdrop-blur-sm rounded border border-white/10">
            <span className="font-semibold text-gray-400">STR</span>
            <span className="text-lg font-bold text-white">
              {getModifier(character.abilityScores?.strength?.score)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-black/30 backdrop-blur-sm rounded border border-white/10">
            <span className="font-semibold text-gray-400">DEX</span>
            <span className="text-lg font-bold text-white">
              {getModifier(character.abilityScores?.dexterity?.score)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-black/30 backdrop-blur-sm rounded border border-white/10">
            <span className="font-semibold text-gray-400">CON</span>
            <span className="text-lg font-bold text-white">
              {getModifier(character.abilityScores?.constitution?.score)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-black/30 backdrop-blur-sm rounded border border-white/10">
            <span className="font-semibold text-gray-400">INT</span>
            <span className="text-lg font-bold text-white">
              {getModifier(character.abilityScores?.intelligence?.score)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-black/30 backdrop-blur-sm rounded border border-white/10">
            <span className="font-semibold text-gray-400">WIS</span>
            <span className="text-lg font-bold text-white">
              {getModifier(character.abilityScores?.wisdom?.score)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-black/30 backdrop-blur-sm rounded border border-white/10">
            <span className="font-semibold text-gray-400">CHA</span>
            <span className="text-lg font-bold text-white">
              {getModifier(character.abilityScores?.charisma?.score)}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={handleShortRest} className="text-xs">
            Short Rest
          </Button>
          <Button size="sm" variant="outline" onClick={handleLongRest} className="text-xs">
            Long Rest
          </Button>
        </div>
      </div>
    </Card>
  );
};
