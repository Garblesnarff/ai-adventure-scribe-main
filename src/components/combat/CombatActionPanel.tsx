/**
 * Combat Action Panel Component
 *
 * Replaces the normal chat input during combat with D&D 5e action buttons.
 * Provides quick access to standard actions while maintaining tabletop feel.
 * Actions are sent to the AI DM for narrative resolution.
 */

import {
  Sword,
  Shield,
  Zap,
  Wind,
  Eye,
  Heart,
  Search,
  Package,
  Clock,
  MessageSquare,
  Dice6,
  RotateCcw,
  Moon,
  Coffee,
  UserX,
  Skull,
  Plus,
} from 'lucide-react';
import React, { useState } from 'react';

import AttackRollVisualization, { type AttackResult } from './AttackRollVisualization';

import type { Equipment } from '@/data/equipmentOptions';
import type { ActionType, ConditionName, Condition } from '@/types/combat';

import SpellSlotPanel from '@/components/spellcasting/SpellSlotPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCombat } from '@/contexts/CombatContext';
import { allEquipment } from '@/data/equipmentOptions';
import logger from '@/lib/logger';
import { performAttack, canUseSneakAttack } from '@/utils/attackUtils';

// ===========================
// Condition Management Components
// ===========================

// Condition Icons & Colors
const CONDITION_ICONS: Record<
  ConditionName,
  { icon: React.ComponentType<any>; color: string; bgColor: string }
> = {
  blinded: { icon: UserX, color: 'text-white', bgColor: 'bg-gray-500' },
  charmed: { icon: Heart, color: 'text-white', bgColor: 'bg-pink-500' },
  deafened: { icon: UserX, color: 'text-white', bgColor: 'bg-slate-500' },
  frightened: { icon: Skull, color: 'text-white', bgColor: 'bg-yellow-600' },
  grappled: { icon: UserX, color: 'text-white', bgColor: 'bg-orange-500' },
  incapacitated: { icon: UserX, color: 'text-white', bgColor: 'bg-red-500' },
  invisible: { icon: UserX, color: 'text-blue-600', bgColor: 'bg-blue-200' },
  paralyzed: { icon: UserX, color: 'text-white', bgColor: 'bg-purple-600' },
  petrified: { icon: UserX, color: 'text-white', bgColor: 'bg-stone-500' },
  poisoned: { icon: UserX, color: 'text-white', bgColor: 'bg-green-600' },
  prone: { icon: UserX, color: 'text-amber-900', bgColor: 'bg-amber-400' },
  restrained: { icon: UserX, color: 'text-white', bgColor: 'bg-red-600' },
  stunned: { icon: UserX, color: 'text-white', bgColor: 'bg-yellow-600' },
  unconscious: { icon: UserX, color: 'text-white', bgColor: 'bg-black' },
  exhaustion: { icon: Clock, color: 'text-white', bgColor: 'bg-gray-600' },
  surprised: { icon: Skull, color: 'text-white', bgColor: 'bg-yellow-400' },
};

// Common D&D conditions with descriptions
const CONDITION_TEMPLATES: Record<
  ConditionName,
  { name: string; description: string; defaultDuration: number }
> = {
  blinded: {
    name: 'Blinded',
    description: "Can't see, attacks against target have advantage, auto-miss on own attacks",
    defaultDuration: 3,
  },
  charmed: {
    name: 'Charmed',
    description: 'Cannot attack charmer, regards charmer as friendly',
    defaultDuration: 10,
  },
  deafened: {
    name: 'Deafened',
    description: 'Cannot hear sounds, fails audio-dependent saves',
    defaultDuration: 5,
  },
  frightened: {
    name: 'Frightened',
    description: 'Cannot approach source of fear, disadvantage on attacks and checks',
    defaultDuration: 5,
  },
  grappled: {
    name: 'Grappled',
    description: 'Speed becomes 0, can break free with Athletics or Acrobatics',
    defaultDuration: 0, // Indeterminate until broken
  },
  incapacitated: {
    name: 'Incapacitated',
    description: 'Cannot take actions or speak, no reactions',
    defaultDuration: 3,
  },
  invisible: {
    name: 'Invisible',
    description:
      'Cannot be detected by sight, attacks have advantage, disadvantage to being targeted',
    defaultDuration: 10,
  },
  paralyzed: {
    name: 'Paralyzed',
    description: 'Cannot move, speak, or take actions, auto-fails STR and DEX saves',
    defaultDuration: 3,
  },
  petrified: {
    name: 'Petrified',
    description: 'Turned to stone, unconscious and cannot take actions',
    defaultDuration: 10,
  },
  poisoned: {
    name: 'Poisoned',
    description: 'Disadvantage on attack rolls and ability checks',
    defaultDuration: 10,
  },
  prone: {
    name: 'Prone',
    description:
      'Lying down, melee attacks vs prone have advantage, ranged attacks have disadvantage',
    defaultDuration: 0, // Indeterminate until standing
  },
  restrained: {
    name: 'Restrained',
    description: 'Speed 0, disadvantage on DEX saves, advantage on attacks against target',
    defaultDuration: 5,
  },
  stunned: {
    name: 'Stunned',
    description: 'Cannot take actions, auto-fails STR and DEX saves',
    defaultDuration: 1,
  },
  unconscious: {
    name: 'Unconscious',
    description: 'Completely unaware, defense has disadvantage, criticals automatically hit',
    defaultDuration: 10,
  },
  exhaustion: {
    name: 'Exhaustion',
    description: 'Various penalties based on level (1-6), can lead to death at level 6',
    defaultDuration: -1, // Persistent
  },
  surprised: {
    name: 'Surprised',
    description: 'Cannot take an action this turn',
    defaultDuration: 0, // Until end of turn
  },
};

// ===========================
// Condition Application Component
// ===========================

interface ConditionApplicationPanelProps {
  onApplyCondition: (condition: Condition, targetId: string) => void;
  onRemoveCondition: (conditionName: ConditionName, targetId: string) => void;
  participants: any[];
  currentParticipantId: string | undefined;
}

const ConditionApplicationPanel: React.FC<ConditionApplicationPanelProps> = ({
  onApplyCondition,
  onRemoveCondition,
  participants,
  currentParticipantId,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<ConditionName | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [conditionDuration, setConditionDuration] = useState<number>(3);

  const applicableConditions = Object.entries(CONDITION_TEMPLATES).filter(
    ([conditionName]) => conditionName !== 'surprised' && conditionName !== 'exhaustion',
  );

  const handleApplyCondition = () => {
    if (!selectedCondition || !selectedTarget) return;

    const template = CONDITION_TEMPLATES[selectedCondition];
    const condition: Condition = {
      name: selectedCondition,
      description: template.description,
      duration: conditionDuration === 0 ? template.defaultDuration : conditionDuration,
      saveEndsType: 'end',
      saveDC: 12, // Default DC - can be customized
      saveAbility: conditionDuration === 0 ? undefined : 'con', // Constitution save by default
      concentrationRequired: false,
    };

    onApplyCondition(condition, selectedTarget);
    setSelectedCondition(null);
    setSelectedTarget(null);
    setConditionDuration(3);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Apply Condition</h4>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Condition:</label>
          <Select
            value={selectedCondition || ''}
            onValueChange={(value) => setSelectedCondition(value as ConditionName)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a condition" />
            </SelectTrigger>
            <SelectContent>
              {applicableConditions.map(([conditionName, template]) => (
                <SelectItem key={conditionName} value={conditionName}>
                  <div className="flex items-center space-x-2">
                    {React.createElement(
                      CONDITION_ICONS[conditionName as ConditionName]?.icon || UserX,
                      {
                        className: 'w-4 h-4',
                      },
                    )}
                    <span>{template.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCondition && (
          <div>
            <label className="text-sm font-medium">Description:</label>
            <p className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
              {CONDITION_TEMPLATES[selectedCondition].description}
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Target:</label>
          <Select value={selectedTarget || ''} onValueChange={setSelectedTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              {participants.map((participant) => (
                <SelectItem key={participant.id} value={participant.id}>
                  {participant.name}
                  {participant.conditions.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {participant.conditions.length} conditions
                    </Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Duration (rounds, 0 for save-based):</label>
          <Input
            type="number"
            min="0"
            value={conditionDuration}
            onChange={(e) => setConditionDuration(Number(e.target.value))}
            className="mt-1"
            placeholder="Duration in rounds"
          />
        </div>

        <Button
          onClick={handleApplyCondition}
          disabled={!selectedCondition || !selectedTarget}
          className="w-full"
          variant="default"
        >
          Apply {selectedCondition ? CONDITION_TEMPLATES[selectedCondition].name : 'Condition'}
        </Button>
      </div>

      {/* Current Conditions */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Managing Conditions:</label>
        <div className="space-y-1">
          {participants.map((participant) =>
            participant.conditions.map((condition: Condition, index: number) => (
              <div
                key={`${participant.id}-${condition.name}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-2">
                  {React.createElement(CONDITION_ICONS[condition.name]?.icon || UserX, {
                    className: 'w-4 h-4',
                  })}
                  <span className="text-sm">
                    {condition.name} on {participant.name}
                  </span>
                  {condition.duration > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {condition.duration} rounds
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveCondition(condition.name, participant.id)}
                  className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  );
};

// ===========================
// Action Definitions
// ===========================

interface ActionDefinition {
  type: ActionType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  actionRequired: boolean; // Uses action slot
  bonusAction: boolean; // Uses bonus action slot
  quickAction: boolean; // Can be done without detailed input
}

const COMBAT_ACTIONS: ActionDefinition[] = [
  {
    type: 'attack',
    name: 'Attack',
    icon: Sword,
    description: 'Make a weapon or unarmed attack',
    actionRequired: true,
    bonusAction: false,
    quickAction: false,
  },
  {
    type: 'cast_spell',
    name: 'Cast Spell',
    icon: Zap,
    description: 'Cast a spell or use a magical ability',
    actionRequired: true,
    bonusAction: false,
    quickAction: false,
  },
  {
    type: 'dash',
    name: 'Dash',
    icon: Wind,
    description: 'Move up to your speed again',
    actionRequired: true,
    bonusAction: false,
    quickAction: true,
  },
  {
    type: 'dodge',
    name: 'Dodge',
    icon: Shield,
    description: 'Focus entirely on avoiding attacks',
    actionRequired: true,
    bonusAction: false,
    quickAction: true,
  },
  {
    type: 'help',
    name: 'Help',
    icon: Heart,
    description: 'Give an ally advantage on their next ability check or attack',
    actionRequired: true,
    bonusAction: false,
    quickAction: false,
  },
  {
    type: 'hide',
    name: 'Hide',
    icon: Eye,
    description: 'Attempt to hide from enemies',
    actionRequired: true,
    bonusAction: false,
    quickAction: false,
  },
  {
    type: 'ready',
    name: 'Ready',
    icon: Clock,
    description: 'Prepare an action for later',
    actionRequired: true,
    bonusAction: false,
    quickAction: false,
  },
  {
    type: 'search',
    name: 'Search',
    icon: Search,
    description: 'Look for hidden objects, creatures, or other details',
    actionRequired: true,
    bonusAction: false,
    quickAction: false,
  },
  {
    type: 'use_object',
    name: 'Use Object',
    icon: Package,
    description: 'Interact with an object or use an item',
    actionRequired: true,
    bonusAction: false,
    quickAction: false,
  },
];

// Special management panel (not a combat action)
interface ManagementAction {
  type: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const MANAGEMENT_ACTIONS: ManagementAction[] = [
  {
    type: 'manage_conditions',
    name: 'Manage Conditions',
    icon: UserX,
    description: 'Apply, remove, or manage D&D conditions',
  },
];

// ===========================
// Component Props
// ===========================

interface CombatActionPanelProps {
  onActionSubmit: (actionType: ActionType, description: string, additionalData?: any) => void;
  className?: string;
}

// ===========================
// Main Component
// ===========================

const CombatActionPanel: React.FC<CombatActionPanelProps> = ({
  onActionSubmit,
  className = '',
}) => {
  const { state, applyCondition, removeCondition } = useCombat();
  const { activeEncounter } = state;

  const [selectedAction, setSelectedAction] = useState<ActionDefinition | null>(null);
  const [selectedManagement, setSelectedManagement] = useState<string | null>(null);
  const [actionDetails, setActionDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpell, setSelectedSpell] = useState<string | null>(null);
  const [selectedSpellLevel, setSelectedSpellLevel] = useState<number>(1);
  const [hitDiceToRoll, setHitDiceToRoll] = useState<number>(1);

  // Attack-specific state
  const [selectedWeapon, setSelectedWeapon] = useState<Equipment | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<AttackResult | null>(null);

  // Handle management panel selection
  const handleManagementSelect = (managementType: string) => {
    setSelectedManagement(managementType);
  };

  const handleApplyCondition = async (condition: Condition, targetId: string) => {
    await applyCondition(targetId, condition);
  };

  const handleRemoveCondition = async (conditionName: ConditionName, targetId: string) => {
    await removeCondition(targetId, conditionName);
  };

  // Get current participant to check action availability
  const currentParticipant = activeEncounter?.participants.find(
    (p) => p.id === activeEncounter.currentTurnParticipantId,
  );

  const handleQuickAction = async (action: ActionDefinition) => {
    if (!action.quickAction) return;

    setIsSubmitting(true);
    try {
      await onActionSubmit(action.type, `${action.name}: ${action.description}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedAction = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    try {
      // For spell casting, include spell details
      if (selectedAction.type === 'cast_spell') {
        if (!selectedSpell) {
          logger.error('No spell selected');
          return;
        }
        await onActionSubmit(selectedAction.type, actionDetails, {
          spellName: selectedSpell,
          spellLevel: selectedSpellLevel,
        });
      }
      // For rest actions, include hit dice selection
      else if (selectedAction.type === 'short_rest' || selectedAction.type === 'long_rest') {
        await onActionSubmit(selectedAction.type, actionDetails, { hitDiceToRoll });
      } else {
        await onActionSubmit(selectedAction.type, actionDetails);
      }
      setSelectedAction(null);
      setActionDetails('');
      setSelectedSpell(null);
      setSelectedSpellLevel(1);
      setHitDiceToRoll(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAction = () => {
    setSelectedAction(null);
    setActionDetails('');
  };

  // Check if action is available for current participant
  const isActionAvailable = (action: ActionDefinition): boolean => {
    if (!currentParticipant) return false;

    if (action.actionRequired && currentParticipant.actionTaken) {
      return false;
    }

    if (action.bonusAction && currentParticipant.bonusActionTaken) {
      return false;
    }

    return true;
  };

  const getActionStatusText = (action: ActionDefinition): string => {
    if (!currentParticipant) return '';

    if (action.actionRequired && currentParticipant.actionTaken) {
      return 'Action Used';
    }

    if (action.bonusAction && currentParticipant.bonusActionTaken) {
      return 'Bonus Used';
    }

    return '';
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dice6 className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-700">Combat Actions</h3>
          </div>
          {currentParticipant && (
            <div className="text-sm text-gray-600">{currentParticipant.name}'s Turn</div>
          )}
        </div>

        {/* Action Status */}
        {currentParticipant && (
          <div className="flex space-x-2">
            <Badge
              variant={currentParticipant.actionTaken ? 'default' : 'outline'}
              className="text-xs"
            >
              Action {currentParticipant.actionTaken ? 'Used' : 'Available'}
            </Badge>
            <Badge
              variant={currentParticipant.bonusActionTaken ? 'default' : 'outline'}
              className="text-xs"
            >
              Bonus {currentParticipant.bonusActionTaken ? 'Used' : 'Available'}
            </Badge>
            <Badge
              variant={currentParticipant.reactionTaken ? 'default' : 'outline'}
              className="text-xs"
            >
              Reaction {currentParticipant.reactionTaken ? 'Used' : 'Available'}
            </Badge>
          </div>
        )}

        {/* Management Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleManagementSelect('manage_conditions')}
            className="text-purple-600"
          >
            <UserX className="w-4 h-4 mr-1" />
            Conditions
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Selected Management Panel */}
        {selectedManagement ? (
          <div className="space-y-4">
            {selectedManagement === 'manage_conditions' && (
              <ConditionApplicationPanel
                onApplyCondition={handleApplyCondition}
                onRemoveCondition={handleRemoveCondition}
                participants={activeEncounter?.participants || []}
                currentParticipantId={activeEncounter?.currentTurnParticipantId}
              />
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedManagement(null)}>
                Back to Actions
              </Button>
            </div>
          </div>
        ) : selectedAction ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <selectedAction.icon className="w-5 h-5" />
              <h4 className="font-semibold">{selectedAction.name}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAction}
                disabled={isSubmitting}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600">{selectedAction.description}</p>

            {selectedAction.type === 'cast_spell' ? (
              <SpellSlotPanel
                onSpellSelect={(spellName, level) => {
                  setSelectedSpell(spellName);
                  setSelectedSpellLevel(level);
                  setActionDetails(`Cast ${spellName} at level ${level}`);
                }}
                availableSpells={['Fire Bolt', 'Magic Missile', 'Cure Wounds', 'Healing Word']} // From character data
              />
            ) : selectedAction.type === 'short_rest' || selectedAction.type === 'long_rest' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Hit dice to roll:</label>
                  <Input
                    type="number"
                    min="1"
                    value={hitDiceToRoll}
                    onChange={(e) => setHitDiceToRoll(Number(e.target.value))}
                    className="mt-1"
                    placeholder="Number of hit dice"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      setActionDetails(`${selectedAction.name}: Rolling ${hitDiceToRoll} hit dice`);
                      handleDetailedAction();
                    }}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Take {selectedAction.name}
                  </Button>
                </div>
              </div>
            ) : (
              <Textarea
                placeholder={`Describe your ${selectedAction.name.toLowerCase()}...`}
                value={actionDetails}
                onChange={(e) => setActionDetails(e.target.value)}
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
            )}

            {selectedAction.type !== 'cast_spell' &&
              selectedAction.type !== 'short_rest' &&
              selectedAction.type !== 'long_rest' && (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleDetailedAction}
                    disabled={!actionDetails.trim() || isSubmitting}
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : `Take ${selectedAction.name}`}
                  </Button>

                  <Button variant="outline" onClick={handleCancelAction} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              )}
          </div>
        ) : (
          // Integrated SpellSlotPanel for cast_spell actions
          /* Action Selection Grid */
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COMBAT_ACTIONS.map((action) => {
                const available = isActionAvailable(action);
                const statusText = getActionStatusText(action);
                const ActionIcon = action.icon;

                return (
                  <Button
                    key={action.type}
                    variant={available ? 'outline' : 'ghost'}
                    className={`h-auto flex-col space-y-2 p-4 ${
                      !available ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-400'
                    }`}
                    onClick={() => {
                      if (!available) return;

                      if (action.quickAction) {
                        handleQuickAction(action);
                      } else {
                        setSelectedAction(action);
                      }
                    }}
                    disabled={!available || isSubmitting}
                  >
                    <ActionIcon
                      className={`w-6 h-6 ${available ? 'text-gray-700' : 'text-gray-400'}`}
                    />

                    <div className="text-center">
                      <div className="font-medium text-sm">{action.name}</div>
                      {statusText && <div className="text-xs text-red-500 mt-1">{statusText}</div>}
                    </div>
                  </Button>
                );
              })}
            </div>

            <Separator />

            {/* Movement & Free Actions */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Movement: {currentParticipant?.movementUsed || 0} ft used this turn
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Free actions like talking can be done anytime
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CombatActionPanel;
