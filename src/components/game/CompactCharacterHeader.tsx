import React, { useState } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Heart, Shield, Zap, Sword, ChevronDown } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

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
  const character = characterState.character;

  const [skillsExpanded, setSkillsExpanded] = useState(false);

  if (!character) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <p>No character loaded</p>
      </Card>
    );
  }

  // Calculate HP (max HP formula from character sheet)
  const maxHp = Math.max(1, 
    character.level * (character.class?.hitDie || 8) + 
    character.abilityScores.constitution.modifier * character.level
  );

  // Calculate AC with unarmored defense support
  const armorClass = (() => {
    let ac = 10 + character.abilityScores.dexterity.modifier;
    const hasUnarmoredDefense = character.class && 
      (character.class.name.toLowerCase() === 'barbarian' || 
       character.class.name.toLowerCase() === 'monk');
    const isWearingArmor = character.equippedArmor !== undefined && character.equippedArmor !== '';
    
    if (hasUnarmoredDefense && !isWearingArmor) {
      switch (character.class!.name.toLowerCase()) {
        case 'barbarian':
          ac = 10 + character.abilityScores.dexterity.modifier + character.abilityScores.constitution.modifier;
          break;
        case 'monk':
          ac = 10 + character.abilityScores.dexterity.modifier + character.abilityScores.wisdom.modifier;
          break;
      }
    }
    return ac;
  })();

  // Proficiency bonus
  const proficiency = Math.floor((character.level - 1) / 4) + 2;

  // Initiative (DEX mod)
  const initiative = character.abilityScores.dexterity.modifier;

  // Key skills (top 3: Perception, Stealth, Arcana - with proficiency check)
  const getSkillMod = (skill: string, abilityMod: number, isProficient: boolean) => {
    return abilityMod + (isProficient ? proficiency : 0);
  };

  const isSkillProficient = (skill: string) => {
    return character.skills?.includes(skill) || false;
  };

  const keySkills = [
    {
      name: 'Perception',
      mod: getSkillMod('Perception', character.abilityScores.wisdom.modifier, isSkillProficient('Perception')),
      ability: 'WIS'
    },
    {
      name: 'Stealth',
      mod: getSkillMod('Stealth', character.abilityScores.dexterity.modifier, isSkillProficient('Stealth')),
      ability: 'DEX'
    },
    {
      name: 'Arcana',
      mod: getSkillMod('Arcana', character.abilityScores.intelligence.modifier, isSkillProficient('Arcana')),
      ability: 'INT'
    }
  ];

  const handleShortRest = () => {
    // Placeholder for short rest logic - integrate with combat/context later
    console.log('Short rest initiated');
  };

  const handleLongRest = () => {
    // Placeholder for long rest logic
    console.log('Long rest initiated');
  };

  return (
    <Card className="p-4 space-y-4 bg-card">
      {/* Portrait and Basic Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={`${character.name} portrait`}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xl font-bold border-2 border-border">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{character.name}</h3>
          <p className="text-sm text-muted-foreground">
            Level {character.level} {character.race?.name} {character.class?.name}
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
            <Heart className="w-4 h-4" />
            <span className="font-bold text-lg">{maxHp}</span>
          </div>
          <div className="text-xs text-muted-foreground">Max HP</div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
            <Shield className="w-4 h-4" />
            <span className="font-bold text-lg">{armorClass}</span>
          </div>
          <div className="text-xs text-muted-foreground">AC</div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
            <Zap className="w-4 h-4" />
            <span className="font-bold text-lg">+{proficiency}</span>
          </div>
          <div className="text-xs text-muted-foreground">PROF</div>
        </div>
        
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
            <Sword className="w-4 h-4" />
            <span className="font-bold text-lg">
              {initiative >= 0 ? '+' : ''}{initiative}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">INIT</div>
        </div>
      </div>

      {/* Key Skills (Accordion) */}
      <div className="space-y-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start h-auto p-2"
          onClick={() => setSkillsExpanded(!skillsExpanded)}
        >
          <span className="mr-2">Key Skills</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${skillsExpanded ? 'rotate-180' : ''}`} />
        </Button>
        {skillsExpanded && (
          <div className="space-y-1 pl-4 text-sm bg-muted/30 p-2 rounded">
            {keySkills.map((skill) => (
              <div key={skill.name} className="flex justify-between">
                <span>{skill.name} ({skill.ability})</span>
                <span className="font-medium">
                  {skill.mod >= 0 ? '+' : ''}{skill.mod}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t">
        <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={handleShortRest}>
            Short Rest
          </Button>
          <Button size="sm" variant="outline" onClick={handleLongRest}>
            Long Rest
          </Button>
        </div>
      </div>
    </Card>
  );
};
