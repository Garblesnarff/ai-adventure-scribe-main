/**
 * Spell Casting Panel Component
 *
 * Displays spell component information during combat spell casting.
 * Shows verbal, somatic, and material components with descriptions.
 * Integrates with CombatContext to show real-time spell casting information.
 *
 * Dependencies:
 * - useCombat from '@/contexts/CombatContext'
 * - shadcn/ui components for UI
 * - Spell types from '@/types/character'
 * - Spell utilities from '@/utils/spellComponents'
 *
 * @author AI Dungeon Master Team
 */

import { Volume2, Hand, Package, Zap, BookOpen, Clock } from 'lucide-react';
import React from 'react';

import type { Spell } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCombat } from '@/contexts/CombatContext';
import logger from '@/lib/logger';
import { spellApi } from '@/services/spellApi';
import { consumeMaterialComponents } from '@/utils/spellComponents';

// ===========================
// Props Interface
// ===========================
interface SpellCastingPanelProps {
  selectedSpellName?: string;
  selectedSpellLevel?: number;
  className?: string;
}

// ===========================
// Main Component
// ===========================
const SpellCastingPanel: React.FC<SpellCastingPanelProps> = ({
  selectedSpellName,
  selectedSpellLevel,
  className = '',
}) => {
  const { state } = useCombat();
  const { activeEncounter } = state;
  const [selectedSpell, setSelectedSpell] = React.useState<Spell | null>(null);
  const [isLoadingSpell, setIsLoadingSpell] = React.useState(false);

  // Fetch the selected spell from API
  React.useEffect(() => {
    if (selectedSpellName) {
      setIsLoadingSpell(true);
      spellApi
        .getSpellByName(selectedSpellName)
        .then((spell) => setSelectedSpell(spell))
        .catch((error) => {
          logger.error('Failed to fetch spell:', error);
          setSelectedSpell(null);
        })
        .finally(() => setIsLoadingSpell(false));
    } else {
      setSelectedSpell(null);
    }
  }, [selectedSpellName]);

  if (!activeEncounter) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-700">Spell Casting</CardTitle>
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

  if (!currentParticipant) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-700">Spell Casting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No active participant</p>
        </CardContent>
      </Card>
    );
  }

  // Get component icons
  const getComponentIcon = (componentType: 'verbal' | 'somatic' | 'material') => {
    switch (componentType) {
      case 'verbal':
        return <Volume2 className="w-4 h-4" />;
      case 'somatic':
        return <Hand className="w-4 h-4" />;
      case 'material':
        return <Package className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-purple-500" />
          <CardTitle className="text-purple-700">Spell Casting</CardTitle>
        </div>
        <p className="text-sm text-gray-600">{currentParticipant.name}'s Spell Casting</p>
      </CardHeader>

      <CardContent>
        {isLoadingSpell ? (
          <div className="text-center text-gray-500 py-8">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2 animate-pulse" />
            <p>Loading spell...</p>
          </div>
        ) : selectedSpell ? (
          <div className="space-y-4">
            {/* Spell Info */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{selectedSpell.name}</h3>
                <Badge variant="outline">Level {selectedSpell.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedSpell.school} • {selectedSpell.casting_time} • {selectedSpell.range}
              </p>
              {selectedSpellLevel && selectedSpellLevel !== selectedSpell.level && (
                <Badge variant="secondary" className="mt-2">
                  Cast at Level {selectedSpellLevel}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Component Requirements */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Components Required
              </h4>

              <div className="space-y-3">
                {/* Verbal Component */}
                {selectedSpell.components_verbal !== undefined && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                        {getComponentIcon('verbal')}
                      </div>
                      <span>Verbal (V)</span>
                    </div>
                    <Badge variant={selectedSpell.components_verbal ? 'default' : 'secondary'}>
                      {selectedSpell.components_verbal ? 'Required' : 'Not Required'}
                    </Badge>
                  </div>
                )}

                {/* Somatic Component */}
                {selectedSpell.components_somatic !== undefined && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                        {getComponentIcon('somatic')}
                      </div>
                      <span>Somatic (S)</span>
                    </div>
                    <Badge variant={selectedSpell.components_somatic ? 'default' : 'secondary'}>
                      {selectedSpell.components_somatic ? 'Required' : 'Not Required'}
                    </Badge>
                  </div>
                )}

                {/* Material Component */}
                {selectedSpell.components_material !== undefined && (
                  <div className="p-2 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                          {getComponentIcon('material')}
                        </div>
                        <span>Material (M)</span>
                      </div>
                      <Badge variant={selectedSpell.components_material ? 'default' : 'secondary'}>
                        {selectedSpell.components_material ? 'Required' : 'Not Required'}
                      </Badge>
                    </div>

                    {selectedSpell.components_material && selectedSpell.material_components && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <p className="font-medium mb-1">Material Required:</p>
                        <p>{selectedSpell.material_components}</p>
                        {selectedSpell.material_cost && (
                          <p className="mt-1 text-xs">
                            Cost: {selectedSpell.material_cost} gp
                            {selectedSpell.material_consumed && ' (consumed)'}
                          </p>
                        )}
                        {selectedSpell.material_consumed && (
                          <p className="mt-1 text-xs text-red-500 font-medium">
                            ⚠️ This component is consumed when cast
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Spell Description */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Description
              </h4>
              <p className="text-sm">{selectedSpell.description}</p>
            </div>

            {selectedSpell.damage && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Damage
                  </h4>
                  <p className="text-sm font-mono">{selectedSpell.damage}</p>
                </div>
              </>
            )}

            {(selectedSpell.ritual || selectedSpell.concentration) && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {selectedSpell.ritual && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Ritual
                    </Badge>
                  )}
                  {selectedSpell.concentration && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Concentration
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>Select a spell to view casting details</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpellCastingPanel;
