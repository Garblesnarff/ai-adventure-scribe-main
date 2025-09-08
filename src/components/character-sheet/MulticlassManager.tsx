import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Character } from '@/types/character';
import { 
  getProficiencyBonus,
  getAllClassFeaturesUpToLevel,
  getMulticlassProficiencies 
} from '@/data/levelProgression';
import { 
  Users, 
  Star, 
  Shield, 
  Sword, 
  BookOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface MulticlassManagerProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

interface ClassLevel {
  classId: string;
  className: string;
  level: number;
  hitDie: number;
}

/**
 * MulticlassManager component for managing multiclass characters
 * Shows class levels, combined features, and progression tracking
 */
const MulticlassManager: React.FC<MulticlassManagerProps> = ({ character, onUpdate }) => {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Mock multiclass data - in full implementation, this would come from character data
  const classLevels: ClassLevel[] = [
    {
      classId: 'fighter',
      className: 'Fighter',
      level: 6,
      hitDie: 10
    },
    {
      classId: 'wizard',
      className: 'Wizard',
      level: 4,
      hitDie: 6
    }
  ];

  const totalLevel = classLevels.reduce((sum, cls) => sum + cls.level, 0);
  const proficiencyBonus = getProficiencyBonus(totalLevel);

  /**
   * Toggle expanded state for a class
   */
  const toggleClassExpansion = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  /**
   * Calculate spell slot progression for multiclass spellcasters
   */
  const calculateSpellSlots = (classes: ClassLevel[]): number[] => {
    // Simplified spell slot calculation for multiclass spellcasters
    // Full casters contribute their level
    // Half casters contribute half their level (rounded down)
    // Third casters contribute one-third their level (rounded down)
    
    let spellcasterLevel = 0;
    
    classes.forEach(cls => {
      switch (cls.classId) {
        case 'wizard':
        case 'cleric':
        case 'druid':
        case 'bard':
        case 'sorcerer':
          spellcasterLevel += cls.level; // Full caster
          break;
        case 'paladin':
        case 'ranger':
          spellcasterLevel += Math.floor(cls.level / 2); // Half caster
          break;
        case 'warlock':
          // Pact Magic doesn't combine with other spellcasting
          break;
        case 'fighter': // Eldritch Knight
        case 'rogue': // Arcane Trickster
          if (cls.level >= 3) {
            spellcasterLevel += Math.floor(cls.level / 3); // Third caster
          }
          break;
      }
    });

    // Return spell slots based on combined caster level
    // This is a simplified version - full implementation would use the official table
    if (spellcasterLevel === 0) return [];
    if (spellcasterLevel === 1) return [2];
    if (spellcasterLevel === 2) return [3];
    if (spellcasterLevel === 3) return [4, 2];
    if (spellcasterLevel === 4) return [4, 3];
    // ... continue for all levels
    
    return [4, 3, 3, 3, 2]; // Example for higher levels
  };

  const spellSlots = calculateSpellSlots(classLevels);
  const isSpellcaster = spellSlots.length > 0;

  return (
    <div className="space-y-6">
      {/* Multiclass Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Multiclass Character
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">{totalLevel}</div>
              <div className="text-xs text-muted-foreground">Total Level</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">{classLevels.length}</div>
              <div className="text-xs text-muted-foreground">Classes</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">+{proficiencyBonus}</div>
              <div className="text-xs text-muted-foreground">Proficiency Bonus</div>
            </div>
          </div>

          {/* Class Level Breakdown */}
          <div className="mt-4">
            <h4 className="font-medium mb-3">Class Levels</h4>
            <div className="flex flex-wrap gap-2">
              {classLevels.map((cls) => (
                <Badge key={cls.classId} variant="outline" className="px-3 py-1">
                  {cls.className} {cls.level}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spell Slot Progression (if applicable) */}
      {isSpellcaster && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Multiclass Spellcasting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Combined spell slot progression from multiple spellcasting classes
            </p>
            <div className="grid grid-cols-5 gap-2">
              {spellSlots.map((slots, level) => (
                <div key={level} className="text-center p-2 border rounded">
                  <div className="text-sm font-medium">{level + 1}</div>
                  <div className="text-lg font-bold">{slots}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Class Details */}
      <div className="space-y-4">
        {classLevels.map((cls) => {
          const isExpanded = expandedClasses.has(cls.classId);
          const classFeatures = getAllClassFeaturesUpToLevel(cls.classId, cls.level);
          const multiclassProfs = getMulticlassProficiencies(cls.classId);

          return (
            <Card key={cls.classId}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleClassExpansion(cls.classId)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {cls.classId === 'fighter' && <Sword className="w-5 h-5 text-red-500" />}
                      {cls.classId === 'wizard' && <BookOpen className="w-5 h-5 text-blue-500" />}
                      {cls.classId === 'cleric' && <Star className="w-5 h-5 text-yellow-500" />}
                      {cls.classId === 'rogue' && <Shield className="w-5 h-5 text-gray-500" />}
                      <span>{cls.className}</span>
                      <Badge variant="outline">Level {cls.level}</Badge>
                    </div>
                  </CardTitle>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Class Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-2 border rounded">
                        <div className="text-lg font-bold">d{cls.hitDie}</div>
                        <div className="text-xs text-muted-foreground">Hit Die</div>
                      </div>
                      <div className="text-center p-2 border rounded">
                        <div className="text-lg font-bold">{cls.level}</div>
                        <div className="text-xs text-muted-foreground">Class Level</div>
                      </div>
                      <div className="text-center p-2 border rounded">
                        <div className="text-lg font-bold">{classFeatures.length}</div>
                        <div className="text-xs text-muted-foreground">Features</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Multiclass Proficiencies Gained */}
                    {Object.keys(multiclassProfs).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Proficiencies Gained from Multiclassing</h4>
                        <div className="space-y-2 text-sm">
                          {multiclassProfs.armor && (
                            <div>
                              <span className="font-medium">Armor:</span> {multiclassProfs.armor.join(', ')}
                            </div>
                          )}
                          {multiclassProfs.weapons && (
                            <div>
                              <span className="font-medium">Weapons:</span> {multiclassProfs.weapons.join(', ')}
                            </div>
                          )}
                          {multiclassProfs.tools && (
                            <div>
                              <span className="font-medium">Tools:</span> {multiclassProfs.tools.join(', ')}
                            </div>
                          )}
                          {multiclassProfs.skillChoices && (
                            <div>
                              <span className="font-medium">Skills:</span> Choose {multiclassProfs.numSkillChoices} from {multiclassProfs.skillChoices.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Class Features */}
                    <div>
                      <h4 className="font-medium mb-3">Class Features</h4>
                      <div className="space-y-2">
                        {classFeatures.map((feature, index) => (
                          <div key={index} className="flex items-start gap-3 p-2 border rounded">
                            <Badge variant="outline" className="text-xs mt-1">
                              {cls.level >= feature.level ? '✓' : '○'} L{feature.level}
                            </Badge>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{feature.featureName}</div>
                              <div className="text-xs text-muted-foreground">
                                {feature.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Hit Dice Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Hit Dice Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {classLevels.map((cls) => (
              <div key={cls.classId} className="text-center p-3 border rounded">
                <div className="text-lg font-bold">{cls.level}d{cls.hitDie}</div>
                <div className="text-xs text-muted-foreground">{cls.className}</div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Hit Dice Available</div>
            <div className="font-medium">
              {classLevels.map(cls => `${cls.level}d${cls.hitDie}`).join(' + ')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MulticlassManager;