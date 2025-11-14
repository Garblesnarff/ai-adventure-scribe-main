/**
 * Spell Slot Panel Component
 *
 * Displays current spell slots for the active combat participant and allows selection
 * for casting. Integrates with CombatContext to show real-time slot usage.
 *
 * Dependencies:
 * - useCombat from '@/contexts/CombatContext'
 * - shadcn/ui components for UI
 *
 * Usage: Used within CombatActionPanel when 'cast_spell' is selected
 *
 * @author Cline
 */

import { Zap } from 'lucide-react';
import React from 'react';

import type { SpellSlotLevel } from '@/utils/spell-management';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCombat } from '@/contexts/CombatContext';

// ===========================
// Type Imports
// ===========================

// ===========================
// Props Interface
// ===========================
interface SpellSlotPanelProps {
  onSpellSelect: (spellName: string, level: SpellSlotLevel) => void;
  availableSpells: string[]; // Known/prepared spells for selection
  className?: string;
}

// ===========================
// Main Component
// ===========================
const SpellSlotPanel: React.FC<SpellSlotPanelProps> = ({
  onSpellSelect,
  availableSpells,
  className = '',
}) => {
  const { state } = useCombat();
  const { activeEncounter } = state;

  if (!activeEncounter) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-700">Spell Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No active combat encounter</p>
        </CardContent>
      </Card>
    );
  }

  const currentParticipant = activeEncounter.participants.find(
    (p) => p.id === activeEncounter.currentTurnParticipantId,
  );

  if (!currentParticipant || !currentParticipant.spellSlots) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-700">Spell Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No spellcasting character active</p>
        </CardContent>
      </Card>
    );
  }

  const { spellSlots } = currentParticipant;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-red-500" />
          <CardTitle className="text-red-700">Spell Slots</CardTitle>
        </div>
        <p className="text-sm text-gray-600">{currentParticipant.name}'s Spell Slots</p>
      </CardHeader>

      <CardContent>
        {/* Spell Slot Levels Display */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
            const slot = spellSlots[level as SpellSlotLevel];
            const isAvailable = slot && slot.current > 0;

            return (
              <div key={level} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-semibold">Level {level}</span>
                  <Badge variant={isAvailable ? 'default' : 'outline'} className="ml-2">
                    {slot ? `${slot.current}/${slot.max}` : '0/0'}
                  </Badge>
                </div>
                {isAvailable && (
                  <div className="space-x-2">
                    {availableSpells.map((spell) => (
                      <Button
                        key={spell}
                        variant="outline"
                        size="sm"
                        onClick={() => onSpellSelect(spell, level as SpellSlotLevel)}
                        className="mr-2 text-xs"
                      >
                        {spell}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {availableSpells.length === 0 && (
          <div className="text-center text-gray-500">No spells prepared for this character</div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpellSlotPanel;
