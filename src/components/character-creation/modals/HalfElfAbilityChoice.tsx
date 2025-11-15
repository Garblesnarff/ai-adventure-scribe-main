import { CheckCircle2, Circle } from 'lucide-react';
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

interface HalfElfAbilityChoiceProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (abilities: [AbilityScoreName, AbilityScoreName]) => void;
  currentChoices?: [AbilityScoreName, AbilityScoreName];
}

const ABILITY_OPTIONS: { name: AbilityScoreName; label: string; description: string }[] = [
  { name: 'strength', label: 'Strength', description: 'Physical power and athletic ability' },
  { name: 'dexterity', label: 'Dexterity', description: 'Agility, reflexes, and finesse' },
  { name: 'constitution', label: 'Constitution', description: 'Endurance and health' },
  { name: 'intelligence', label: 'Intelligence', description: 'Reasoning and memory' },
  { name: 'wisdom', label: 'Wisdom', description: 'Awareness and insight' },
];

/**
 * Modal for Half-Elf players to choose two abilities for +1 bonus
 * Per D&D 5E: Half-Elves get +2 CHA and +1 to two other abilities of choice
 */
export const HalfElfAbilityChoice: React.FC<HalfElfAbilityChoiceProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentChoices,
}) => {
  const [selectedAbilities, setSelectedAbilities] = useState<AbilityScoreName[]>(
    currentChoices ? [...currentChoices] : [],
  );

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
    if (selectedAbilities.length === 2) {
      onConfirm(selectedAbilities as [AbilityScoreName, AbilityScoreName]);
      onClose();
    }
  };

  const isSelected = (ability: AbilityScoreName) => selectedAbilities.includes(ability);
  const canConfirm = selectedAbilities.length === 2;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Half-Elf Ability Score Increase</DialogTitle>
          <DialogDescription className="text-base">
            Your Half-Elf heritage grants you +2 to Charisma and +1 to two other abilities of your
            choice.
            <br />
            <span className="font-semibold text-foreground">
              Choose two abilities to increase by +1:
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fixed Charisma Bonus Display */}
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">Charisma</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Your natural charm and presence
                </p>
              </div>
              <Badge className="bg-purple-600 text-white">+2 (Fixed)</Badge>
            </div>
          </Card>

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
        </div>

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
