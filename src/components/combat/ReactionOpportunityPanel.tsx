/**
 * Reaction Opportunity Panel Component
 *
 * Displays available reaction opportunities to players during combat.
 * Allows players to select and execute reactions or dismiss opportunities.
 */

import { AlertTriangle } from 'lucide-react';
import React from 'react';

import type { ReactionOpportunity, ActionType } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useCombat } from '@/contexts/CombatContext';

interface ReactionOpportunityPanelProps {
  opportunities: ReactionOpportunity[];
  onReactionSelected: (opportunity: ReactionOpportunity, reaction: ActionType) => void;
  onOpportunityDismissed: (opportunityId: string) => void;
}

const ReactionOpportunityPanel: React.FC<ReactionOpportunityPanelProps> = ({
  opportunities,
  onReactionSelected,
  onOpportunityDismissed,
}) => {
  const { state } = useCombat();
  const { activeEncounter } = state;

  if (opportunities.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Reaction Opportunities
        </CardTitle>
        <p className="text-sm text-amber-700">Choose a reaction or dismiss to continue</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.map((opportunity) => {
          const participant = activeEncounter?.participants.find(
            (p) => p.id === opportunity.participantId,
          );
          if (!participant) return null;

          return (
            <div key={opportunity.id} className="p-3 bg-white rounded-lg border border-amber-200">
              <div className="text-sm font-medium text-amber-900 mb-2">
                {participant.name}: {opportunity.triggerDescription}
              </div>
              <div className="flex gap-2 flex-wrap">
                {opportunity.availableReactions.map((reaction) => (
                  <Button
                    key={reaction}
                    size="sm"
                    onClick={() => onReactionSelected(opportunity, reaction)}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                  >
                    {reaction.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpportunityDismissed(opportunity.id)}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ReactionOpportunityPanel;
