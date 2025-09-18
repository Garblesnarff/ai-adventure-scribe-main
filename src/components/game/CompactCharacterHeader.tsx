import React, { useState, useEffect } from 'react';
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
      {/* Enhanced Portrait and Basic Info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-shrink-0 relative">
          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gradient-to-r from-infinite-purple to-infinite-teal bg-gradient-to-br from-infinite-purple/20 to-infinite-teal/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            {character.image_url ? (
              <img
                src={character.image_url}
                alt={`${character.name} portrait`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-infinite-purple to-infinite-teal flex items-center justify-center text-2xl font-bold text-white">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-infinite-gold rounded-full flex items-center justify-center text-xs font-bold text-infinite-dark border-2 border-background">
            {character.level}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-card-foreground mb-1">{character.name}</h3>
          <p className="text-sm text-muted-foreground mb-1">
            {character.race?.name} {character.class?.name}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-infinite-gold rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground/80">Active Adventurer</span>
          </div>
        </div>
      </div>

      {/* Enhanced Stats - Animated Rings */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatRing
          icon={<Heart className="w-6 h-6 text-red-400" />}
          label="HP"
          value={maxHp}
          maxValue={maxHp}
          color="red"
          tooltipText={`Max Hit Points: ${maxHp}`}
        />

        <StatRing
          icon={<Shield className="w-6 h-6 text-blue-400" />}
          label="AC"
          value={armorClass}
          maxValue={25}
          color="blue"
          tooltipText={`Armor Class: ${armorClass}`}
        />

        <StatRing
          icon={<Zap className="w-6 h-6 text-green-400" />}
          label="PROF"
          value={proficiency}
          maxValue={6}
          color="green"
          tooltipText={`Proficiency: +${proficiency}`}
        />

        <StatRing
          icon={<Sword className="w-6 h-6 text-purple-400" />}
          label="INIT"
          value={Math.max(0, initiative + 10)}
          maxValue={20}
          color="purple"
          tooltipText={`Initiative: ${initiative >= 0 ? '+' : ''}${initiative}`}
        />
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

// StatRing Component for Enhanced Character Stats
interface StatRingProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  maxValue: number;
  color: 'red' | 'blue' | 'green' | 'purple';
  tooltipText: string;
}

const StatRing: React.FC<StatRingProps> = ({ icon, label, value, maxValue, color, tooltipText }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min((animatedValue / maxValue) * 100, 100);
  const strokeDasharray = `${percentage} ${100 - percentage}`;

  const colorClasses = {
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className="flex justify-center">
      <div className="relative group cursor-help">
        {/* Animated SVG Ring */}
        <div className="w-16 h-16 relative">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <path
              className="stroke-muted/30"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray="100 0"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {/* Progress circle */}
            <path
              className={`stroke-current transition-all duration-1000 ease-out`}
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              style={{
                stroke: `url(#gradient-${color})`,
              }}
            />
            {/* Gradient definitions */}
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={`text-${color}-500`} stopColor="currentColor" />
                <stop offset="100%" className={`text-${color}-400`} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-card/80 backdrop-blur-sm rounded-full p-2 shadow-lg border border-border/50">
              {icon}
            </div>
          </div>
        </div>

        {/* Label and value */}
        <div className="text-center mt-2">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="text-sm font-bold text-card-foreground">{value}</div>
        </div>

        {/* Enhanced tooltip */}
        <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-2 rounded-lg text-xs shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 border border-border/50">
          {tooltipText}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-card rotate-45 border-l border-t border-border/50"></div>
        </div>
      </div>
    </div>
  );
};
