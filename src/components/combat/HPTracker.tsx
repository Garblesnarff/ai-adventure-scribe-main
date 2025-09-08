/**
 * HP & Conditions Tracker Component
 * 
 * Provides detailed HP management and condition tracking for D&D 5e combat.
 * Allows DMs to quickly adjust HP, temporary HP, and apply/remove conditions.
 * Maintains the tabletop feel with clear visual indicators.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, 
  Shield, 
  Plus, 
  Minus,
  UserX,
  Clock,
  Skull,
  AlertTriangle,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { useCombat } from '@/contexts/CombatContext';
import { CombatParticipant, ConditionName, Condition } from '@/types/combat';

// ===========================
// Component Props
// ===========================

interface HPTrackerProps {
  className?: string;
}

// ===========================
// Condition Management Component
// ===========================

interface ConditionManagerProps {
  participant: CombatParticipant;
  onAddCondition: (condition: Condition) => void;
  onRemoveCondition: (conditionName: ConditionName) => void;
}

const ConditionManager: React.FC<ConditionManagerProps> = ({
  participant,
  onAddCondition,
  onRemoveCondition
}) => {
  const [isAddingCondition, setIsAddingCondition] = useState(false);
  const [newConditionName, setNewConditionName] = useState<ConditionName>('blinded');
  const [newConditionDuration, setNewConditionDuration] = useState(1);
  const [newConditionDescription, setNewConditionDescription] = useState('');

  const CONDITION_OPTIONS: ConditionName[] = [
    'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
    'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
    'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion'
  ];

  const handleAddCondition = () => {
    const condition: Condition = {
      name: newConditionName,
      description: newConditionDescription || getDefaultDescription(newConditionName),
      duration: newConditionDuration
    };
    
    onAddCondition(condition);
    setIsAddingCondition(false);
    setNewConditionDescription('');
    setNewConditionDuration(1);
  };

  const getDefaultDescription = (conditionName: ConditionName): string => {
    const descriptions: Record<ConditionName, string> = {
      blinded: 'Cannot see; attacks have disadvantage',
      charmed: 'Cannot attack the charmer; charmer has advantage on social interactions',
      deafened: 'Cannot hear; automatically fail hearing-based ability checks',
      frightened: 'Disadvantage on ability checks and attacks while source is in sight',
      grappled: 'Speed becomes 0; cannot benefit from bonuses to speed',
      incapacitated: 'Cannot take actions or reactions',
      invisible: 'Considered heavily obscured; attack rolls have advantage',
      paralyzed: 'Incapacitated and cannot move or speak; attacks have advantage',
      petrified: 'Transformed to stone; incapacitated and unaware',
      poisoned: 'Disadvantage on attack rolls and ability checks',
      prone: 'Disadvantage on attack rolls; attacks against have advantage if within 5ft',
      restrained: 'Speed 0; disadvantage on attacks and Dex saves; attacks have advantage',
      stunned: 'Incapacitated, cannot move, and can speak only falteringly',
      unconscious: 'Incapacitated, cannot move or speak, and unaware of surroundings',
      exhaustion: 'Multiple levels of fatigue with stacking penalties'
    };
    return descriptions[conditionName] || 'Custom condition effect';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Conditions</h4>
        {!isAddingCondition && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingCondition(true)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Existing Conditions */}
      {participant.conditions.length > 0 && (
        <div className="space-y-1">
          {participant.conditions.map((condition, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div>
                <div className="font-medium text-sm capitalize">{condition.name}</div>
                {condition.duration > 0 && (
                  <div className="text-xs text-gray-500">
                    {condition.duration} rounds remaining
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveCondition(condition.name)}
              >
                <X className="w-3 h-3 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Condition Form */}
      {isAddingCondition && (
        <div className="space-y-3 p-3 border rounded">
          <select
            value={newConditionName}
            onChange={(e) => setNewConditionName(e.target.value as ConditionName)}
            className="w-full p-2 border rounded"
          >
            {CONDITION_OPTIONS.map(condition => (
              <option key={condition} value={condition} className="capitalize">
                {condition}
              </option>
            ))}
          </select>

          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Duration (rounds)"
              value={newConditionDuration}
              onChange={(e) => setNewConditionDuration(parseInt(e.target.value) || 1)}
              min={-1}
              className="w-32"
            />
            <span className="text-xs text-gray-500 flex items-center">
              -1 = permanent
            </span>
          </div>

          <Textarea
            placeholder="Custom description (optional)"
            value={newConditionDescription}
            onChange={(e) => setNewConditionDescription(e.target.value)}
            className="min-h-[60px]"
          />

          <div className="flex space-x-2">
            <Button size="sm" onClick={handleAddCondition}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAddingCondition(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {participant.conditions.length === 0 && !isAddingCondition && (
        <div className="text-xs text-gray-500 text-center py-2">
          No conditions
        </div>
      )}
    </div>
  );
};

// ===========================
// Participant HP Row Component
// ===========================

interface ParticipantHPRowProps {
  participant: CombatParticipant;
}

const ParticipantHPRow: React.FC<ParticipantHPRowProps> = ({ participant }) => {
  const { dealDamage, healDamage, applyCondition, removeCondition } = useCombat();
  const [isEditing, setIsEditing] = useState(false);
  const [hpAdjustment, setHpAdjustment] = useState('');
  const [tempHpAdjustment, setTempHpAdjustment] = useState('');

  const hpPercent = (participant.currentHitPoints / participant.maxHitPoints) * 100;
  const isDead = participant.currentHitPoints === 0 && participant.deathSaves.failures >= 3;
  const isUnconscious = participant.currentHitPoints === 0 && participant.deathSaves.failures < 3;
  const needsDeathSave = participant.currentHitPoints === 0 && !isDead;

  const getHPColor = () => {
    if (isDead) return 'bg-black';
    if (isUnconscious) return 'bg-red-600';
    if (hpPercent <= 25) return 'bg-red-500';
    if (hpPercent <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleDamage = async () => {
    const amount = parseInt(hpAdjustment);
    if (!isNaN(amount) && amount > 0) {
      await dealDamage(participant.id, amount);
      setHpAdjustment('');
    }
  };

  const handleHealing = async () => {
    const amount = parseInt(hpAdjustment);
    if (!isNaN(amount) && amount > 0) {
      await healDamage(participant.id, amount);
      setHpAdjustment('');
    }
  };

  const handleTempHP = async () => {
    const amount = parseInt(tempHpAdjustment);
    if (!isNaN(amount) && amount >= 0) {
      // Temporary HP logic would need to be implemented in context
      setTempHpAdjustment('');
    }
  };

  const getParticipantTypeColor = () => {
    switch (participant.participantType) {
      case 'player': return 'border-blue-400 bg-blue-50';
      case 'npc': return 'border-green-400 bg-green-50';
      case 'monster': return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  return (
    <Card className={`${getParticipantTypeColor()} ${isDead ? 'opacity-60 grayscale' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold ${isDead ? 'line-through' : ''}`}>
              {participant.name}
            </h3>
            <Badge variant="outline" className="mt-1 capitalize">
              {participant.participantType}
            </Badge>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="font-medium">AC {participant.armorClass}</span>
            </div>
            <div className="text-sm text-gray-600">
              Init: {participant.initiative}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HP Management */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="font-medium">Hit Points</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          </div>

          <Progress 
            value={hpPercent} 
            className="h-3"
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${isUnconscious ? 'text-red-600' : ''}`}>
              {participant.currentHitPoints}/{participant.maxHitPoints}
              {participant.temporaryHitPoints > 0 && (
                <span className="text-blue-500"> +{participant.temporaryHitPoints}</span>
              )}
            </span>
            
            {needsDeathSave && (
              <div className="flex items-center space-x-1">
                <Skull className="w-4 h-4 text-red-600" />
                <span className="text-red-600 font-medium">
                  Death Saves: {participant.deathSaves.successes}/3 - {participant.deathSaves.failures}/3
                </span>
              </div>
            )}
          </div>

          {/* HP Adjustment Controls */}
          {isEditing && (
            <div className="space-y-2 p-3 bg-white border rounded">
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={hpAdjustment}
                  onChange={(e) => setHpAdjustment(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDamage}
                  disabled={!hpAdjustment}
                >
                  <Minus className="w-3 h-3 mr-1" />
                  Damage
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleHealing}
                  disabled={!hpAdjustment}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Heal
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Temp HP"
                  value={tempHpAdjustment}
                  onChange={(e) => setTempHpAdjustment(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTempHP}
                  disabled={!tempHpAdjustment}
                >
                  Set Temp
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Conditions Management */}
        <ConditionManager
          participant={participant}
          onAddCondition={(condition) => applyCondition(participant.id, condition)}
          onRemoveCondition={(conditionName) => removeCondition(participant.id, conditionName)}
        />
      </CardContent>
    </Card>
  );
};

// ===========================
// Main HP Tracker Component
// ===========================

const HPTracker: React.FC<HPTrackerProps> = ({ className = '' }) => {
  const { state } = useCombat();
  const { activeEncounter, isInCombat } = state;

  if (!isInCombat || !activeEncounter) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <h3 className="font-semibold">HP & Conditions Tracker</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No active combat
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Heart className="w-5 h-5 text-red-500" />
        <h2 className="font-semibold text-lg">HP & Conditions Tracker</h2>
        <Badge variant="outline">
          Round {activeEncounter.currentRound}
        </Badge>
      </div>
      
      {activeEncounter.participants.map((participant) => (
        <ParticipantHPRow
          key={participant.id}
          participant={participant}
        />
      ))}
    </div>
  );
};

export default HPTracker;