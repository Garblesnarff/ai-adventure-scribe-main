import React, { useState } from 'react';

import { DMChatBubble } from '../features/game-session/components/chat/chat/DMChatBubble';
import { DiceRollEmbed } from '../features/game-session/components/dice/DiceRollEmbed';
import { logger } from '../lib/logger';
import { type ChatMessage } from '../services/ai-service';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DiceTest() {
  const [customExpression, setCustomExpression] = useState('1d20+5');
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content:
        'You enter a dark dungeon. The ancient stones seem to whisper secrets. [DICE: 1d20+2 Perception] to notice any hidden details.',
      role: 'assistant',
      timestamp: Date.now() - 30000,
    },
    {
      id: '2',
      content:
        'A goblin leaps from the shadows, attacking with its rusty sword! [DICE: 1d20+4 attack] and [DICE: 1d6+2 damage] if it hits.',
      role: 'assistant',
      timestamp: Date.now() - 20000,
    },
    {
      id: '3',
      content:
        'Make a Constitution saving throw [DICE: 1d20+3 Constitution save] against the poison.',
      role: 'assistant',
      timestamp: Date.now() - 10000,
    },
  ]);

  const addTestMessage = () => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `The DM asks you to make a test roll: [DICE: ${customExpression}] for your action.`,
      role: 'assistant',
      timestamp: Date.now(),
    };
    setTestMessages([...testMessages, newMessage]);
  };

  const addAdvantageMessage = () => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `You have advantage on this roll! [DICE: 2d20kh1+5 attack with advantage] Strike with confidence!`,
      role: 'assistant',
      timestamp: Date.now(),
    };
    setTestMessages([...testMessages, newMessage]);
  };

  const addMultipleDiceMessage = () => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Critical hit! Roll damage: [DICE: 2d6+3 weapon damage] plus [DICE: 1d6 elemental damage]. The enemy staggers!`,
      role: 'assistant',
      timestamp: Date.now(),
    };
    setTestMessages([...testMessages, newMessage]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🎲 Dice Rolling Integration Test</CardTitle>
          <CardDescription>
            Testing the new inline dice rolling system integrated into DM chat messages. Dice
            expressions use the format: [DICE: expression purpose]
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <Input
                placeholder="1d20+5"
                value={customExpression}
                onChange={(e) => setCustomExpression(e.target.value)}
              />
              <Button onClick={addTestMessage} size="sm">
                Add Custom Roll
              </Button>
            </div>
            <Button onClick={addAdvantageMessage} variant="outline" size="sm">
              Add Advantage Roll
            </Button>
            <Button onClick={addMultipleDiceMessage} variant="outline" size="sm">
              Add Multiple Dice
            </Button>
            <Button onClick={() => setTestMessages([])} variant="destructive" size="sm">
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DM Messages with Integrated Dice */}
        <Card>
          <CardHeader>
            <CardTitle>DM Chat Messages</CardTitle>
            <CardDescription>
              Messages with embedded dice expressions that auto-roll when displayed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {testMessages.map((message) => (
                <DMChatBubble
                  key={message.id}
                  message={message}
                  onOptionSelect={(option) => logger.info('Option selected:', option)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Standalone Dice Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Standalone Dice Components</CardTitle>
            <CardDescription>
              Individual dice components for different types of rolls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DiceRollEmbed
                expression="1d20"
                purpose="Basic d20 roll"
                autoRoll={false}
                showAnimation={true}
              />

              <DiceRollEmbed
                expression="2d6+3"
                purpose="Sword damage"
                autoRoll={false}
                showAnimation={true}
              />

              <DiceRollEmbed
                expression="1d20kh1"
                purpose="Advantage roll"
                autoRoll={false}
                showAnimation={true}
              />

              <DiceRollEmbed
                expression="4d6kh3"
                purpose="Ability score"
                autoRoll={false}
                showAnimation={true}
              />

              <DiceRollEmbed
                expression="1d100"
                purpose="Percentile roll"
                autoRoll={false}
                showAnimation={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Features Implemented</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">✅ Core Features:</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Inline dice parsing from DM messages</li>
                <li>• 3D dice visualization with Three.js</li>
                <li>• Auto-rolling with animation</li>
                <li>• Manual roll button</li>
                <li>• Multiple dice types (d4, d6, d8, d10, d12, d20, d100)</li>
                <li>• Advantage/disadvantage support</li>
                <li>• Critical hit/miss detection</li>
                <li>• Audio effects (with fallback)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Dice Expression Format:</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>
                  • <code>[DICE: 1d20+5]</code> - Basic roll with modifier
                </li>
                <li>
                  • <code>[DICE: 1d20+5 attack]</code> - Roll with purpose
                </li>
                <li>
                  • <code>[DICE: 2d20kh1+3 advantage]</code> - Advantage roll
                </li>
                <li>
                  • <code>[DICE: 2d20kl1+3 disadvantage]</code> - Disadvantage roll
                </li>
                <li>
                  • <code>[DICE: 2d6+3 damage]</code> - Damage roll
                </li>
                <li>
                  • <code>[DICE: 4d6kh3 ability]</code> - Ability score generation
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
