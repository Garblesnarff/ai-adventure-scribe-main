/**
 * Combat System Test Page
 *
 * A test page to validate combat system functionality end-to-end.
 * Demonstrates all combat components working together in a D&D tabletop style.
 */

import { Swords, Users, Play, Square } from 'lucide-react';
import React, { useState } from 'react';

import CombatActionPanel from './CombatActionPanel';
import HPTracker from './HPTracker';
import InitiativeTracker from './InitiativeTracker';

import type { CombatParticipant } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CombatProvider } from '@/contexts/CombatContext';
import logger from '@/lib/logger';

// ===========================
// Test Component
// ===========================

const CombatTestPageContent: React.FC = () => {
  const [testCombatStarted, setTestCombatStarted] = useState(false);

  // Sample test participants for D&D combat
  const testParticipants: Partial<CombatParticipant>[] = [
    {
      name: 'Thorin Ironforge',
      participantType: 'player',
      initiative: 18,
      armorClass: 16,
      maxHitPoints: 45,
      currentHitPoints: 45,
      temporaryHitPoints: 0,
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
    },
    {
      name: 'Elara Moonwhisper',
      participantType: 'player',
      initiative: 16,
      armorClass: 14,
      maxHitPoints: 32,
      currentHitPoints: 32,
      temporaryHitPoints: 5,
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
    },
    {
      name: 'Orc Warrior',
      participantType: 'monster',
      initiative: 12,
      armorClass: 13,
      maxHitPoints: 15,
      currentHitPoints: 8,
      temporaryHitPoints: 0,
      conditions: [
        {
          name: 'frightened',
          description: "Frightened by Elara's intimidating presence",
          duration: 2,
        },
      ],
      deathSaves: { successes: 0, failures: 0 },
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
      monsterData: {
        challengeRating: '1/2',
        attacks: [
          {
            name: 'Greataxe',
            attackBonus: 5,
            damageRoll: '1d12+3',
            damageType: 'slashing',
            reach: 5,
            description: 'Melee weapon attack',
          },
        ],
        specialAbilities: ['Aggressive'],
      },
    },
    {
      name: 'Goblin Scout',
      participantType: 'monster',
      initiative: 15,
      armorClass: 15,
      maxHitPoints: 7,
      currentHitPoints: 0,
      temporaryHitPoints: 0,
      conditions: [],
      deathSaves: { successes: 1, failures: 2 },
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
      monsterData: {
        challengeRating: '1/4',
        attacks: [
          {
            name: 'Scimitar',
            attackBonus: 4,
            damageRoll: '1d6+2',
            damageType: 'slashing',
            reach: 5,
            description: 'Melee weapon attack',
          },
        ],
        specialAbilities: ['Nimble Escape'],
      },
    },
  ];

  const handleStartTestCombat = async () => {
    // This would normally be provided by the session/campaign context
    const testSessionId = 'test-session-123';

    try {
      // Start combat with test participants
      // Note: This would normally use the useCombat hook, but since we're in a test,
      // we'll need to implement the start combat logic here or use a mock
      setTestCombatStarted(true);
    } catch (error) {
      logger.error('Failed to start test combat:', error);
    }
  };

  const handleStopTestCombat = () => {
    setTestCombatStarted(false);
  };

  const handleActionSubmit = (actionType: string, description: string) => {
    logger.info(`Action submitted: ${actionType} - ${description}`);
    // This would normally integrate with the AI DM system
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Swords className="w-8 h-8 text-red-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">D&D 5e Combat System Test</h1>
                  <p className="text-gray-600">Testing tabletop-style combat mechanics</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {!testCombatStarted ? (
                  <Button onClick={handleStartTestCombat} size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Start Test Combat
                  </Button>
                ) : (
                  <Button onClick={handleStopTestCombat} variant="destructive" size="lg">
                    <Square className="w-4 h-4 mr-2" />
                    End Test Combat
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Combat Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Combat Status</p>
                  <p className="text-2xl font-bold">{testCombatStarted ? 'ACTIVE' : 'INACTIVE'}</p>
                </div>
                <Swords
                  className={`w-8 h-8 ${testCombatStarted ? 'text-red-500' : 'text-gray-400'}`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-2xl font-bold">{testParticipants.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-100">
                  2 Players
                </Badge>
                <Badge variant="outline" className="bg-red-100">
                  2 Monsters
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {testCombatStarted ? (
          /* Combat Interface */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Initiative Tracker */}
            <div className="space-y-4">
              <InitiativeTracker className="sticky top-4" />
            </div>

            {/* Center Column - Action Panel */}
            <div className="space-y-4">
              <CombatActionPanel onActionSubmit={handleActionSubmit} />
            </div>

            {/* Right Column - HP Tracker */}
            <div className="space-y-4">
              <HPTracker />
            </div>
          </div>
        ) : (
          /* Setup Instructions */
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Combat System Components</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  This test page demonstrates the D&D 5e combat system with the following
                  components:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2">Initiative Tracker</h3>
                      <ul className="text-sm space-y-1">
                        <li>• Turn order display</li>
                        <li>• HP bars and status</li>
                        <li>• Condition indicators</li>
                        <li>• Death save tracking</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2">Action Panel</h3>
                      <ul className="text-sm space-y-1">
                        <li>• D&D 5e actions</li>
                        <li>• Quick vs detailed actions</li>
                        <li>• Action economy tracking</li>
                        <li>• AI DM integration</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2">HP & Conditions</h3>
                      <ul className="text-sm space-y-1">
                        <li>• HP management</li>
                        <li>• Temporary HP</li>
                        <li>• Condition tracking</li>
                        <li>• Visual health status</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="bg-amber-50 p-4 rounded-lg border-amber-200 border">
                  <h4 className="font-semibold mb-2">Test Scenario</h4>
                  <p className="text-sm text-gray-700">
                    Two adventurers (Thorin the Dwarf Fighter and Elara the Elf Wizard) face off
                    against an Orc Warrior and a critically wounded Goblin Scout. The combat
                    demonstrates initiative tracking, HP management, conditions (frightened), and
                    death saves.
                  </p>
                </div>

                <div className="text-center">
                  <Button onClick={handleStartTestCombat} size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Start Combat Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// ===========================
// Main Component with Provider
// ===========================

const CombatTestPage: React.FC = () => {
  return (
    <CombatProvider>
      <CombatTestPageContent />
    </CombatProvider>
  );
};

export default CombatTestPage;
