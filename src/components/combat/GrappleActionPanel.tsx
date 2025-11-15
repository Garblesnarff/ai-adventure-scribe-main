/**
 * Grapple Action Panel Component
 *
 * Allows players to attempt to grapple targets during combat
 */

import { Users, Zap } from 'lucide-react';
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
import {
  rollGrappleCheck,
  createGrappledCondition,
  getGrappleActionDescription,
} from '@/utils/grappleUtils';

interface GrappleActionPanelProps {
  participantId: string;
  targets: Array<{ id: string; name: string }>;
}

const GrappleActionPanel: React.FC<GrappleActionPanelProps> = ({ participantId, targets }) => {
  const { state, takeAction, applyCondition, updateParticipant } = useCombat();
  const { activeEncounter } = state;

  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [grappleResult, setGrappleResult] = useState<{
    success: boolean;
    description: string;
  } | null>(null);

  const handleGrapple = async () => {
    if (!selectedTarget || !activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    const target = activeEncounter.participants.find((p) => p.id === selectedTarget);

    if (!participant || !target) return;

    try {
      // Roll grapple check
      const grappleCheck = rollGrappleCheck(participant, target);

      if (grappleCheck.success) {
        // Apply grappled condition to target
        const grappledCondition = createGrappledCondition(participantId, grappleCheck.dc);
        await applyCondition(selectedTarget, grappledCondition);

        // Mark participant as having taken action
        await updateParticipant(participantId, { actionTaken: true });
      }

      // Create action for combat log
      const action = {
        participantId,
        targetParticipantId: selectedTarget,
        actionType: 'grapple' as const,
        description: getGrappleActionDescription(participant, target, grappleCheck.success),
        attackRoll: grappleCheck.roll,
        hit: grappleCheck.success,
      };

      await takeAction(action);

      setGrappleResult({
        success: grappleCheck.success,
        description: action.description,
      });

      // Clear selection after a delay
      setTimeout(() => {
        setSelectedTarget('');
        setGrappleResult(null);
      }, 3000);
    } catch (error) {
      logger.error('Error processing grapple action:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Grapple
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Target</label>
            <Select value={selectedTarget} onValueChange={setSelectedTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGrapple} disabled={!selectedTarget}>
            Grapple
          </Button>
        </div>

        {grappleResult && (
          <div
            className={`p-2 rounded ${grappleResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{grappleResult.description}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            Make a Strength (Athletics) check contested by the target's Strength (Athletics) or
            Dexterity (Acrobatics) check.
          </p>
          <p className="mt-1">
            On a success, the target is grappled until they escape or you let them go.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GrappleActionPanel;
