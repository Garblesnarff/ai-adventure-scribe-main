/**
 * Movement Action Panel Component
 *
 * Allows players to move their characters and handles opportunity attacks
 */

import { ArrowRight } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCombat } from '@/contexts/CombatContext';
import logger from '@/lib/logger';

interface MovementActionPanelProps {
  participantId: string;
  currentPosition: string;
  availableMovement: number;
}

const MovementActionPanel: React.FC<MovementActionPanelProps> = ({
  participantId,
  currentPosition,
  availableMovement,
}) => {
  const { state, moveParticipant } = useCombat();
  const { activeEncounter } = state;

  const [targetPosition, setTargetPosition] = useState<string>('');

  const positionOptions = [
    { value: 'melee', label: 'Melee Range (5 ft)' },
    { value: 'adjacent', label: 'Adjacent (10 ft)' },
    { value: 'ranged', label: 'Ranged (30 ft)' },
    { value: 'distant', label: 'Distant (60+ ft)' },
  ];

  const handleMove = async () => {
    if (!targetPosition || !activeEncounter) return;

    try {
      await moveParticipant(participantId, currentPosition, targetPosition);
    } catch (error) {
      logger.error('Error moving participant:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          Movement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Current Position: {currentPosition || 'Unknown'}
        </div>
        <div className="text-sm text-muted-foreground">
          Available Movement: {availableMovement} feet
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Move To</label>
            <Select value={targetPosition} onValueChange={setTargetPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positionOptions
                  .filter((option) => option.value !== currentPosition)
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleMove} disabled={!targetPosition || availableMovement <= 0}>
            Move
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MovementActionPanel;
