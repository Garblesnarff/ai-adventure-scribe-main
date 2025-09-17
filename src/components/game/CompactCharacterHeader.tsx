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
              className="w-16 h-16 rounded-full object-cover border-2 border-border transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xl font-bold border-2 border-border transition-transform duration-300 hover:scale-105">
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

      {/* Quick Stats - Circular Badges */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-200 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <Heart className="w-5 h-5 text-red-600" />
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-background text-foreground px-2 py-1 rounded-md text-xs shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                Max Hit Points: {maxHp}
              </div>
            </div>
            <div className="text-center mt-1 text-xs text-muted-foreground">HP</div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <Shield className="w-5 h-5 text-blue-600" />
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-background text-foreground px-2 py-1 rounded-md text-xs shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                Armor Class: {armorClass}
              </div>
            </div>
            <div className="text-center mt-1 text-xs text-muted-foreground">AC</div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-200 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <Zap className="w-5 h-5 text-green-600" />
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-background text-foreground px-2 py-1 rounded-md text-xs shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                Proficiency: +{proficiency}
              </div>
            </div>
            <div className="text-center mt-1 text-xs text-muted-foreground">PROF</div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-12 h-12 rounded-full bg-purple-100 border-2 border-purple-200 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <Sword className="w-5 h-5 text-purple-600" />
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-background text-foreground px-2 py-1 rounded-md text-xs shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                Initiative: {initiative >= 0 ? '+' : ''}{initiative}
              </div>
            </div>
            <div className="text-center mt-1 text-xs text-muted-foreground">INIT</div>
          </div>
        </div>
      </div>

      {/* Key Skills (Accordion) */}
      <div className="space-y-2 overflow-hidden">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start h-auto p-2 transition-all duration-200 hover:bg-muted/50"
          onClick={() => setSkillsExpanded(!skillsExpanded)}
        >
          <span className="mr-2">Key Skills</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${skillsExpanded ? 'rotate-180' : ''}`} />
        </Button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${skillsExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-1 pl-4 text-sm bg-muted/30 p-2 rounded transition-colors duration-200">
            {keySkills.map((skill) => (
              <div key={skill.name} className="flex justify-between items-center py-1">
                <span className="relative group cursor-help">
                  {skill.name} ({skill.ability})
                  <div className="absolute bottom-full left-0 mb-2 bg-background text-foreground px-2 py-1 rounded-md text-xs shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    {skill.name} ({skill.ability}) modifier
                  </div>
                </span>
                <span className="font-medium text-infinite-purple">
                  {skill.mod >= 0 ? '+' : ''}{skill.mod}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t">
        <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={handleShortRest} className="hover:bg-red-50 transition-colors duration-200">
            Short Rest
          </Button>
          <Button size="sm" variant="outline" onClick={handleLongRest} className="hover:bg-blue-50 transition-colors duration-200">
            Long Rest
          </Button>
        </div>
      </div>
    </Card>
  );
};
