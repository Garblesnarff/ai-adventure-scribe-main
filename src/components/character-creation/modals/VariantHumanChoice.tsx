import { CheckCircle2, Circle, Zap, Award } from 'lucide-react';
import React, { useState } from 'react';

import type { AbilityScoreName } from '@/utils/racialAbilityBonuses';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VariantHumanChoiceProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (abilities: [AbilityScoreName, AbilityScoreName], feat: string) => void;
  currentChoices?: {
    abilities?: [AbilityScoreName, AbilityScoreName];
    feat?: string;
  };
}

const ABILITY_OPTIONS: { name: AbilityScoreName; label: string; description: string }[] = [
  { name: 'strength', label: 'Strength', description: 'Physical power and athletic ability' },
  { name: 'dexterity', label: 'Dexterity', description: 'Agility, reflexes, and finesse' },
  { name: 'constitution', label: 'Constitution', description: 'Endurance and health' },
  { name: 'intelligence', label: 'Intelligence', description: 'Reasoning and memory' },
  { name: 'wisdom', label: 'Wisdom', description: 'Awareness and insight' },
  { name: 'charisma', label: 'Charisma', description: 'Force of personality' },
];

// Common 1st level feats for Variant Human
const FEAT_OPTIONS = [
  {
    id: 'alert',
    name: 'Alert',
    description:
      "+5 to initiative, can't be surprised while conscious, enemies don't gain advantage from being hidden.",
    category: 'combat',
  },
  {
    id: 'athlete',
    name: 'Athlete',
    description:
      "+1 STR or DEX, stand from prone with 5ft movement, climbing doesn't cost extra, running jumps with 5ft start.",
    category: 'utility',
  },
  {
    id: 'lucky',
    name: 'Lucky',
    description:
      '3 luck points. Spend to roll extra d20 for attack, ability check, or saving throw (or when attacked).',
    category: 'utility',
  },
  {
    id: 'magic-initiate',
    name: 'Magic Initiate',
    description:
      'Learn 2 cantrips and one 1st-level spell from a chosen class. Cast the 1st-level spell once per long rest.',
    category: 'magic',
  },
  {
    id: 'martial-adept',
    name: 'Martial Adept',
    description:
      'Learn 2 maneuvers from Battle Master. Gain one d6 superiority die (regain on short/long rest).',
    category: 'combat',
  },
  {
    id: 'observant',
    name: 'Observant',
    description: '+1 INT or WIS. Read lips. +5 to passive Perception and Investigation.',
    category: 'utility',
  },
  {
    id: 'resilient',
    name: 'Resilient',
    description:
      '+1 to chosen ability score. Gain proficiency in saving throws using that ability.',
    category: 'defense',
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description:
      'Ignore half/three-quarters cover. No disadvantage at long range. -5 attack for +10 damage.',
    category: 'combat',
  },
  {
    id: 'tough',
    name: 'Tough',
    description: '+2 HP per level (including current and future levels).',
    category: 'defense',
  },
  {
    id: 'war-caster',
    name: 'War Caster',
    description:
      'Advantage on Concentration checks. Cast spells as opportunity attacks. Cast with hands full.',
    category: 'magic',
  },
];

const FEAT_CATEGORIES = [
  { id: 'all', label: 'All Feats' },
  { id: 'combat', label: 'Combat' },
  { id: 'magic', label: 'Magic' },
  { id: 'defense', label: 'Defense' },
  { id: 'utility', label: 'Utility' },
];

/**
 * Modal for Variant Human players to choose two abilities and one feat
 * Per D&D 5E: Variant Humans get +1 to two different abilities and one feat
 */
export const VariantHumanChoice: React.FC<VariantHumanChoiceProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentChoices,
}) => {
  const [selectedAbilities, setSelectedAbilities] = useState<AbilityScoreName[]>(
    currentChoices?.abilities ? [...currentChoices.abilities] : [],
  );
  const [selectedFeat, setSelectedFeat] = useState<string | null>(currentChoices?.feat || null);
  const [featCategory, setFeatCategory] = useState('all');

  const toggleAbility = (ability: AbilityScoreName) => {
    if (selectedAbilities.includes(ability)) {
      // Deselect
      setSelectedAbilities(selectedAbilities.filter((a) => a !== ability));
    } else if (selectedAbilities.length < 2) {
      // Select (only if less than 2 selected)
      setSelectedAbilities([...selectedAbilities, ability]);
    }
  };

  const handleConfirm = () => {
    if (selectedAbilities.length === 2 && selectedFeat) {
      onConfirm(selectedAbilities as [AbilityScoreName, AbilityScoreName], selectedFeat);
      onClose();
    }
  };

  const isSelected = (ability: AbilityScoreName) => selectedAbilities.includes(ability);
  const canConfirm = selectedAbilities.length === 2 && selectedFeat !== null;

  const filteredFeats =
    featCategory === 'all'
      ? FEAT_OPTIONS
      : FEAT_OPTIONS.filter((feat) => feat.category === featCategory);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Variant Human Customization</DialogTitle>
          <DialogDescription className="text-base">
            Your human adaptability grants you +1 to two abilities of your choice and one feat.
            <br />
            <span className="font-semibold text-foreground">
              Choose two abilities and one feat:
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="abilities" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="abilities" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Ability Scores ({selectedAbilities.length}/2)
            </TabsTrigger>
            <TabsTrigger value="feat" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Feat {selectedFeat && '✓'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="abilities" className="space-y-4 mt-4">
            {/* Ability Choice Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ABILITY_OPTIONS.map((ability) => {
                const selected = isSelected(ability.name);
                const disabled = !selected && selectedAbilities.length >= 2;

                return (
                  <Card
                    key={ability.name}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      selected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                        : disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                    }`}
                    onClick={() => !disabled && toggleAbility(ability.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {selected ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                          <h4 className="font-semibold capitalize">{ability.label}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground ml-7">{ability.description}</p>
                      </div>
                      {selected && (
                        <Badge
                          variant="outline"
                          className="ml-2 bg-blue-100 text-blue-700 border-blue-300"
                        >
                          +1
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Selection Status */}
            <div className="text-center text-sm text-muted-foreground">
              {selectedAbilities.length === 0 && 'Select two abilities to receive +1 bonus'}
              {selectedAbilities.length === 1 && 'Select one more ability'}
              {selectedAbilities.length === 2 && (
                <span className="text-green-600 font-medium">✓ Both abilities selected</span>
              )}
            </div>
          </TabsContent>

          <TabsContent value="feat" className="space-y-4 mt-4">
            {/* Feat Category Filters */}
            <div className="flex flex-wrap gap-2">
              {FEAT_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={featCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFeatCategory(category.id)}
                >
                  {category.label}
                </Button>
              ))}
            </div>

            {/* Feat Selection Grid */}
            <div className="grid grid-cols-1 gap-3">
              {filteredFeats.map((feat) => {
                const selected = selectedFeat === feat.id;

                return (
                  <Card
                    key={feat.id}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      selected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50'
                        : 'hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20'
                    }`}
                    onClick={() => setSelectedFeat(feat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {selected ? (
                            <CheckCircle2 className="w-5 h-5 text-purple-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                          <h4 className="font-semibold">{feat.name}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {feat.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground ml-7">{feat.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Feat Selection Status */}
            <div className="text-center text-sm text-muted-foreground">
              {!selectedFeat && 'Select one feat to gain at 1st level'}
              {selectedFeat && (
                <span className="text-green-600 font-medium">
                  ✓ {FEAT_OPTIONS.find((f) => f.id === selectedFeat)?.name} selected
                </span>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Confirm Choices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
