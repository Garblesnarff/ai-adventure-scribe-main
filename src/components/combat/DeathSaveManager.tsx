import { Heart, Shield } from 'lucide-react';
import React from 'react';

import type { CombatParticipant } from '@/types/combat';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeathSaveManagerProps {
  participant: CombatParticipant;
  onDeathSave: (participantId: string) => void;
}

const DeathSaveManager: React.FC<DeathSaveManagerProps> = ({ participant, onDeathSave }) => {
  const { successes = 0, failures = 0 } = participant.deathSaves || {};

  return (
    <Card className="border-red-500 bg-red-950/20">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center justify-between">
          <span>Dying: {participant.name}</span>
          <Heart className="w-5 h-5 animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-around items-center">
          <div className="text-center">
            <p className="font-bold text-lg text-green-400">{successes}</p>
            <p className="text-xs text-muted-foreground">Successes</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-red-400">{failures}</p>
            <p className="text-xs text-muted-foreground">Failures</p>
          </div>
        </div>
        <Button
          onClick={() => onDeathSave(participant.id)}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          <Shield className="w-4 h-4 mr-2" />
          Roll Death Save
        </Button>
      </CardContent>
    </Card>
  );
};

export default DeathSaveManager;
