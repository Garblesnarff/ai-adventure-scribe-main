import {
  Users,
  Star,
  Shield,
  Sword,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUp,
} from 'lucide-react';
import React, { useState } from 'react';

import type { Character, CharacterClass } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  getProficiencyBonus,
  getAllClassFeaturesUpToLevel,
  getMulticlassProficiencies,
} from '@/data/levelProgression';
import { useMulticlassing } from '@/hooks/use-multiclassing';
import logger from '@/lib/logger';

interface MulticlassManagerProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
  availableClasses?: CharacterClass[]; // List of available classes to multiclass into
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
const MulticlassManager: React.FC<MulticlassManagerProps> = ({
  character,
  onUpdate,
  availableClasses = [],
}) => {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const {
    isProcessing,
    validationResult,
    validateNewClass,
    addNewClass,
    levelUpSpecificClass,
    getProficiencies,
    getHitPoints,
    getSpellcasting,
    isMulticlassed,
    getTotalLevel,
  } = useMulticlassing(character, onUpdate);

  // Prepare class levels data
  const classLevels: ClassLevel[] = character.classLevels
    ? character.classLevels.map((cls) => ({
        classId: cls.classId,
        className: cls.className,
        level: cls.level,
        hitDie: cls.hitDie,
      }))
    : character.class
      ? [
          {
            classId: character.class.id,
            className: character.class.name,
            level: character.level || 1,
            hitDie: character.class.hitDie,
          },
        ]
      : [];

  const totalLevel = getTotalLevel();
  const proficiencyBonus = getProficiencyBonus(totalLevel);
  const proficiencies = getProficiencies();
  const hitPoints = getHitPoints();
  const spellcasting = getSpellcasting();
  const isSpellcaster = spellcasting.spellSlots.length > 0;

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
   * Handle adding a new class
   */
  const handleAddClass = async (newClass: CharacterClass) => {
    const result = await addNewClass(newClass, 1);
    if (!result.success) {
      // In a real implementation, you would show an error message to the user
      logger.error(result.message);
    }
  };

  /**
   * Handle leveling up a class
   */
  const handleLevelUpClass = async (classId: string) => {
    const result = await levelUpSpecificClass(classId);
    if (!result.success) {
      // In a real implementation, you would show an error message to the user
      logger.error(result.message);
    }
  };

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
                <Badge
                  key={cls.classId}
                  variant="outline"
                  className="px-3 py-1 flex items-center gap-1"
                >
                  {cls.className} {cls.level}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleLevelUpClass(cls.classId)}
                    disabled={isProcessing}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Class (if not already multiclassed or if there are available classes) */}
      {!isMulticlassed() && availableClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-500" />
              Add New Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Multiclass by adding levels in a different class
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableClasses
                .filter((cls) => !classLevels.some((existing) => existing.className === cls.name))
                .map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleAddClass(cls)}
                  >
                    <div className="font-medium capitalize">{cls.name}</div>
                    <div className="text-sm text-muted-foreground">{cls.hitDie}-sided hit die</div>
                  </div>
                ))}
            </div>

            {validationResult && !validationResult.canMulticlass && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Cannot Multiclass:</strong>{' '}
                {validationResult.missingRequirements.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            <div className="mb-4">
              <div className="text-sm font-medium">
                Combined Caster Level: {spellcasting.combinedCasterLevel}
              </div>
              <div className="text-xs text-muted-foreground">
                {spellcasting.spellcastingClasses
                  .map((cls) => `${cls.className} (${cls.level})`)
                  .join(', ')}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {spellcasting.spellSlots.map((slots, level) => (
                <div key={level} className="text-center p-2 border rounded">
                  <div className="text-sm font-medium">{level + 1}</div>
                  <div className="text-lg font-bold">{slots}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proficiencies Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Combined Proficiencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proficiencies.armor.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Armor</h4>
                <div className="text-sm">{proficiencies.armor.join(', ')}</div>
              </div>
            )}
            {proficiencies.weapons.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Weapons</h4>
                <div className="text-sm">{proficiencies.weapons.join(', ')}</div>
              </div>
            )}
            {proficiencies.tools.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Tools</h4>
                <div className="text-sm">{proficiencies.tools.join(', ')}</div>
              </div>
            )}
            {proficiencies.savingThrows.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Saving Throws</h4>
                <div className="text-sm">
                  {proficiencies.savingThrows
                    .map((st) => st.charAt(0).toUpperCase() + st.slice(1))
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hit Points Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Hit Points Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold">{hitPoints}</div>
            <div className="text-sm text-muted-foreground">Maximum Hit Points</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {classLevels.map((cls) => (
              <div key={cls.classId} className="text-center p-3 border rounded">
                <div className="text-lg font-bold">
                  {cls.level}d{cls.hitDie}
                </div>
                <div className="text-xs text-muted-foreground">{cls.className}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Class Details */}
      <div className="space-y-4">
        {classLevels.map((cls) => {
          const isExpanded = expandedClasses.has(cls.classId);
          const classFeatures = getAllClassFeaturesUpToLevel(cls.className, cls.level);
          const multiclassProfs = getMulticlassProficiencies(cls.className);

          return (
            <Card key={cls.classId}>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleClassExpansion(cls.classId)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    {cls.className} (Level {cls.level})
                  </div>
                  <Badge variant="secondary">d{cls.hitDie}</Badge>
                </CardTitle>
              </CardHeader>
              {isExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Multiclass Proficiencies Gained */}
                    {Object.keys(multiclassProfs).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">
                          Proficiencies Gained from Multiclassing
                        </h4>
                        <div className="space-y-2 text-sm">
                          {multiclassProfs.armor && (
                            <div>
                              <span className="font-medium">Armor:</span>{' '}
                              {multiclassProfs.armor.join(', ')}
                            </div>
                          )}
                          {multiclassProfs.weapons && (
                            <div>
                              <span className="font-medium">Weapons:</span>{' '}
                              {multiclassProfs.weapons.join(', ')}
                            </div>
                          )}
                          {multiclassProfs.tools && (
                            <div>
                              <span className="font-medium">Tools:</span>{' '}
                              {multiclassProfs.tools.join(', ')}
                            </div>
                          )}
                          {multiclassProfs.skillChoices && (
                            <div>
                              <span className="font-medium">Skills:</span> Choose{' '}
                              {multiclassProfs.numSkillChoices} from{' '}
                              {multiclassProfs.skillChoices.join(', ')}
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
    </div>
  );
};

export default MulticlassManager;
