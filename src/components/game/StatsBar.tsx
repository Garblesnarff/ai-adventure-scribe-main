import { Heart, Shield, Zap, Sword } from 'lucide-react';
import React from 'react';

import { useCharacter } from '@/contexts/CharacterContext';

/**
 * StatsBar - Floating quick stats header for game interface
 * Shows essential character stats (HP, AC, PROF, INIT) in compact badges
 * Updates live from CharacterContext
 *
 * Dependencies:
 * - CharacterContext for live data
 * - lucide-react for icons
 *
 * Usage: Render below campaign title in GameContent header
 */
export const StatsBar: React.FC = () => {
  const { state: characterState } = useCharacter();
  const character = characterState.character;

  if (!character) {
    return null;
  }

  // Calculate stats (same logic as CompactCharacterHeader)
  const maxHp = Math.max(
    1,
    character.level * (character.class?.hitDie || 8) +
      character.abilityScores.constitution.modifier * character.level,
  );

  const armorClass = (() => {
    let ac = 10 + character.abilityScores.dexterity.modifier;
    const hasUnarmoredDefense =
      character.class &&
      (character.class.name.toLowerCase() === 'barbarian' ||
        character.class.name.toLowerCase() === 'monk');
    const isWearingArmor = character.equippedArmor !== undefined && character.equippedArmor !== '';

    if (hasUnarmoredDefense && !isWearingArmor) {
      switch (character.class!.name.toLowerCase()) {
        case 'barbarian':
          ac =
            10 +
            character.abilityScores.dexterity.modifier +
            character.abilityScores.constitution.modifier;
          break;
        case 'monk':
          ac =
            10 +
            character.abilityScores.dexterity.modifier +
            character.abilityScores.wisdom.modifier;
          break;
      }
    }
    return ac;
  })();

  const proficiency = Math.floor((character.level - 1) / 4) + 2;
  const initiative = character.abilityScores.dexterity.modifier;

  const StatBadge = ({
    icon: Icon,
    value,
    label,
    color,
  }: {
    icon: React.ElementType;
    value: number | string;
    label: string;
    color: string;
  }) => (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-bold">{value}</span>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <div className="flex items-center gap-4 mt-2 mb-4 p-2 bg-muted/50 rounded-lg">
      <StatBadge icon={Heart} value={maxHp} label="HP" color="text-red-600" />
      <StatBadge icon={Shield} value={armorClass} label="AC" color="text-blue-600" />
      <StatBadge icon={Zap} value={`+${proficiency}`} label="PROF" color="text-green-600" />
      <StatBadge
        icon={Sword}
        value={initiative >= 0 ? `+${initiative}` : initiative}
        label="INIT"
        color="text-purple-600"
      />
    </div>
  );
};
