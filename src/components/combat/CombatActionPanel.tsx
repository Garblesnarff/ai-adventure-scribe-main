/**
 * Combat Action Panel Component
 * 
 * Replaces the normal chat input during combat with D&D 5e action buttons.
 * Provides quick access to standard actions while maintaining tabletop feel.
 * Actions are sent to the AI DM for narrative resolution.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  RotateCcw
} from 'lucide-react';
import { useCombat } from '@/contexts/CombatContext';
import { ActionType } from '@/types/combat';

// ===========================
// Action Definitions
// ===========================

interface ActionDefinition {
  type: ActionType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  actionRequired: boolean;  // Uses action slot
  bonusAction: boolean;     // Uses bonus action slot
  quickAction: boolean;     // Can be done without detailed input
}

const COMBAT_ACTIONS: ActionDefinition[] = [
  {
    type: 'attack',
    name: 'Attack',
    icon: Sword,
    description: 'Make a weapon or unarmed attack',
    actionRequired: true,
    bonusAction: false,
    quickAction: false
  },
  {
    type: 'cast_spell',
    name: 'Cast Spell',
    icon: Zap,
    description: 'Cast a spell or use a magical ability',
    actionRequired: true,
    bonusAction: false,
    quickAction: false
  },
  {
    type: 'dash',
    name: 'Dash',
    icon: Wind,
    description: 'Move up to your speed again',
    actionRequired: true,
    bonusAction: false,
    quickAction: true
  },
  {
    type: 'dodge',
    name: 'Dodge',
    icon: Shield,
    description: 'Focus entirely on avoiding attacks',
    actionRequired: true,
    bonusAction: false,
    quickAction: true
  },
  {
    type: 'help',
    name: 'Help',
    icon: Heart,
    description: 'Give an ally advantage on their next ability check or attack',
    actionRequired: true,
    bonusAction: false,
    quickAction: false
  },
  {
    type: 'hide',
    name: 'Hide',
    icon: Eye,
    description: 'Attempt to hide from enemies',
    actionRequired: true,
    bonusAction: false,
    quickAction: false
  },
  {
    type: 'ready',
    name: 'Ready',
    icon: Clock,
    description: 'Prepare an action for later',
    actionRequired: true,
    bonusAction: false,
    quickAction: false
  },
  {
    type: 'search',
    name: 'Search',
    icon: Search,
    description: 'Look for hidden objects, creatures, or other details',
    actionRequired: true,
    bonusAction: false,
    quickAction: false
  },
  {
    type: 'use_object',
    name: 'Use Object',
    icon: Package,
    description: 'Interact with an object or use an item',
    actionRequired: true,
    bonusAction: false,
    quickAction: false
  }
];

// ===========================
// Component Props
// ===========================

interface CombatActionPanelProps {
  onActionSubmit: (actionType: ActionType, description: string) => void;
  className?: string;
}

// ===========================
// Main Component
// ===========================

const CombatActionPanel: React.FC<CombatActionPanelProps> = ({
  onActionSubmit,
  className = ''
}) => {
  const { state } = useCombat();
  const { activeEncounter } = state;
  
  const [selectedAction, setSelectedAction] = useState<ActionDefinition | null>(null);
  const [actionDetails, setActionDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current participant to check action availability
  const currentParticipant = activeEncounter?.participants.find(
    p => p.id === activeEncounter.currentTurnParticipantId
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
    if (!selectedAction || !actionDetails.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onActionSubmit(selectedAction.type, actionDetails);
      setSelectedAction(null);
      setActionDetails('');
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
            <div className="text-sm text-gray-600">
              {currentParticipant.name}'s Turn
            </div>
          )}
        </div>
        
        {/* Action Status */}
        {currentParticipant && (
          <div className="flex space-x-2">
            <Badge 
              variant={currentParticipant.actionTaken ? "default" : "outline"}
              className="text-xs"
            >
              Action {currentParticipant.actionTaken ? "Used" : "Available"}
            </Badge>
            <Badge 
              variant={currentParticipant.bonusActionTaken ? "default" : "outline"}
              className="text-xs"
            >
              Bonus {currentParticipant.bonusActionTaken ? "Used" : "Available"}
            </Badge>
            <Badge 
              variant={currentParticipant.reactionTaken ? "default" : "outline"}
              className="text-xs"
            >
              Reaction {currentParticipant.reactionTaken ? "Used" : "Available"}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Selected Action Detail Input */}
        {selectedAction ? (
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
            
            <p className="text-sm text-gray-600">
              {selectedAction.description}
            </p>
            
            <Textarea
              placeholder={`Describe your ${selectedAction.name.toLowerCase()}...`}
              value={actionDetails}
              onChange={(e) => setActionDetails(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            
            <div className="flex space-x-2">
              <Button
                onClick={handleDetailedAction}
                disabled={!actionDetails.trim() || isSubmitting}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Submitting...' : `Take ${selectedAction.name}`}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCancelAction}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
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
                    variant={available ? "outline" : "ghost"}
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
                    <ActionIcon className={`w-6 h-6 ${
                      available ? 'text-gray-700' : 'text-gray-400'
                    }`} />
                    
                    <div className="text-center">
                      <div className="font-medium text-sm">{action.name}</div>
                      {statusText && (
                        <div className="text-xs text-red-500 mt-1">
                          {statusText}
                        </div>
                      )}
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