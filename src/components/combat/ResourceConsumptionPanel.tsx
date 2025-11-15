import { Zap, Heart, Shield } from 'lucide-react';
import React, { useState } from 'react';

import type { CombatParticipant } from '@/types/combat';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCombat } from '@/contexts/CombatContext';
import logger from '@/lib/logger';

interface ResourceConsumptionPanelProps {
  participant: CombatParticipant;
  onClose: () => void;
}

/**
 * ResourceConsumptionPanel component allows players to consume class resources
 * during combat, such as spell slots, ki points, rages, etc.
 */
const ResourceConsumptionPanel: React.FC<ResourceConsumptionPanelProps> = ({
  participant,
  onClose,
}) => {
  const { takeAction } = useCombat();
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [resourceAmount, setResourceAmount] = useState<string>('1');

  // Available resources for the participant
  const availableResources = [
    ...(participant.spellSlots ? [{ id: 'spell-slot', name: 'Spell Slot' }] : []),
    ...(participant.resources?.kiPoints ? [{ id: 'ki-points', name: 'Ki Points' }] : []),
    ...(participant.resources?.sorceryPoints
      ? [{ id: 'sorcery-points', name: 'Sorcery Points' }]
      : []),
    ...(participant.resources?.rages ? [{ id: 'rage', name: 'Rage' }] : []),
    ...(participant.resources?.bardic_inspiration
      ? [{ id: 'bardic-inspiration', name: 'Bardic Inspiration' }]
      : []),
    ...(participant.resources?.channelDivinity
      ? [{ id: 'channel-divinity', name: 'Channel Divinity' }]
      : []),
    ...(participant.resources?.actionSurge ? [{ id: 'action-surge', name: 'Action Surge' }] : []),
    ...(participant.resources?.layOnHands ? [{ id: 'lay-on-hands', name: 'Lay on Hands' }] : []),
  ];

  const handleConsumeResource = async () => {
    if (!selectedResource) return;

    let actionType = 'use_class_feature';
    let description = `${participant.name} uses ${selectedResource}`;
    const resourceCost = parseInt(resourceAmount) || 1;

    switch (selectedResource) {
      case 'spell-slot':
        actionType = 'cast_spell';
        description = `${participant.name} casts a spell using a spell slot`;
        break;
      case 'ki-points':
        actionType = 'use_class_feature';
        description = `${participant.name} spends ${resourceCost} ki point${resourceCost > 1 ? 's' : ''}`;
        break;
      case 'sorcery-points':
        actionType = 'use_class_feature';
        description = `${participant.name} spends ${resourceCost} sorcery point${resourceCost > 1 ? 's' : ''}`;
        break;
      case 'rage':
        actionType = 'use_class_feature';
        description = `${participant.name} enters a rage`;
        break;
      case 'bardic-inspiration':
        actionType = 'use_class_feature';
        description = `${participant.name} uses Bardic Inspiration`;
        break;
      case 'channel-divinity':
        actionType = 'use_class_feature';
        description = `${participant.name} uses Channel Divinity`;
        break;
      case 'action-surge':
        actionType = 'action_surge';
        description = `${participant.name} uses Action Surge`;
        break;
      case 'lay-on-hands':
        actionType = 'use_class_feature';
        description = `${participant.name} uses Lay on Hands to heal`;
        break;
    }

    const action = {
      participantId: participant.id,
      actionType,
      description,
      resourceUsed: selectedResource,
      resourceAmount: resourceCost,
    };

    try {
      await takeAction(action);
      onClose();
    } catch (error) {
      logger.error('Error consuming resource:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Consume Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="resource-select">Select Resource</Label>
          <Select value={selectedResource} onValueChange={setSelectedResource}>
            <SelectTrigger id="resource-select">
              <SelectValue placeholder="Choose a resource" />
            </SelectTrigger>
            <SelectContent>
              {availableResources.map((resource) => (
                <SelectItem key={resource.id} value={resource.id}>
                  {resource.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedResource &&
          selectedResource !== 'rage' &&
          selectedResource !== 'bardic-inspiration' &&
          selectedResource !== 'channel-divinity' &&
          selectedResource !== 'action-surge' && (
            <div>
              <Label htmlFor="resource-amount">Amount</Label>
              <Input
                id="resource-amount"
                type="number"
                min="1"
                value={resourceAmount}
                onChange={(e) => setResourceAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          )}

        <div className="flex gap-2">
          <Button onClick={handleConsumeResource} disabled={!selectedResource} className="flex-1">
            <Zap className="w-4 h-4 mr-2" />
            Consume
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>

        {/* Resource Summary */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Current Resources</h4>
          <div className="space-y-2 text-sm">
            {participant.spellSlots && (
              <div className="flex justify-between">
                <span>Spell Slots:</span>
                <span>
                  {Object.entries(participant.spellSlots).map(([level, slots]) => (
                    <span key={level} className="ml-2">
                      L{level}: {slots.current}/{slots.max}
                    </span>
                  ))}
                </span>
              </div>
            )}
            {participant.resources?.kiPoints && (
              <div className="flex justify-between">
                <span>Ki Points:</span>
                <span>
                  {participant.resources.kiPoints.current}/{participant.resources.kiPoints.max}
                </span>
              </div>
            )}
            {participant.resources?.sorceryPoints && (
              <div className="flex justify-between">
                <span>Sorcery Points:</span>
                <span>
                  {participant.resources.sorceryPoints.current}/
                  {participant.resources.sorceryPoints.max}
                </span>
              </div>
            )}
            {participant.resources?.rages && (
              <div className="flex justify-between">
                <span>Rages:</span>
                <span>
                  {participant.resources.rages.current}/{participant.resources.rages.max}
                </span>
              </div>
            )}
            {participant.resources?.bardic_inspiration && (
              <div className="flex justify-between">
                <span>Bardic Inspiration:</span>
                <span>
                  {participant.resources.bardic_inspiration.current}/
                  {participant.resources.bardic_inspiration.max}
                </span>
              </div>
            )}
            {participant.resources?.channelDivinity && (
              <div className="flex justify-between">
                <span>Channel Divinity:</span>
                <span>
                  {participant.resources.channelDivinity.current}/
                  {participant.resources.channelDivinity.max}
                </span>
              </div>
            )}
            {participant.resources?.actionSurge && (
              <div className="flex justify-between">
                <span>Action Surge:</span>
                <span>
                  {participant.resources.actionSurge.current}/
                  {participant.resources.actionSurge.max}
                </span>
              </div>
            )}
            {participant.resources?.layOnHands && (
              <div className="flex justify-between">
                <span>Lay on Hands:</span>
                <span>
                  {participant.resources.layOnHands.current}/{participant.resources.layOnHands.max}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceConsumptionPanel;
