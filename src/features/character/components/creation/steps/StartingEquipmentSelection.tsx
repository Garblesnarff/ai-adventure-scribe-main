import { Package, Coins, Dice1, TrendingUp, Shield, Sword, Shirt } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { Equipment } from '@/data/equipmentOptions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { startingGoldByClass, allEquipment, calculateArmorClass } from '@/data/equipmentOptions';

/**
 * Starting Equipment Selection component for character creation
 * Allows choosing between equipment packages or starting gold
 */
const StartingEquipmentSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const character = state.character;
  const characterClass = character?.class;

  const [method, setMethod] = useState<'package' | 'gold'>('package');
  const [rolledGold, setRolledGold] = useState<number>(0);
  const [hasRolledGold, setHasRolledGold] = useState(false);

  if (!characterClass) {
    return (
      <div className="text-center space-y-4">
        <Package className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">Class Required</h2>
        <p className="text-muted-foreground">
          Please select a class first to determine starting equipment.
        </p>
      </div>
    );
  }

  const goldData = startingGoldByClass[characterClass.id];

  /**
   * Class-based starting equipment packages
   */
  const getStartingEquipmentPackage = (classId: string): Equipment[] => {
    const packages: Record<string, string[]> = {
      fighter: [
        'chain-mail',
        'shield',
        'longsword',
        'handaxe',
        'handaxe',
        'light-crossbow',
        'explorers-pack',
      ],
      wizard: ['dagger', 'quarterstaff', 'component-pouch', 'scholars-pack', 'spellbook'],
      rogue: [
        'leather-armor',
        'shortsword',
        'shortsword',
        'thieves-tools',
        'shortbow',
        'burglars-pack',
      ],
      cleric: ['chain-shirt', 'shield', 'mace', 'light-crossbow', 'priests-pack', 'holy-symbol'],
      barbarian: [
        'leather-armor',
        'shield',
        'handaxe',
        'handaxe',
        'javelin',
        'javelin',
        'explorers-pack',
      ],
      bard: ['leather-armor', 'dagger', 'rapier', 'lute', 'entertainers-pack'],
      druid: [
        'leather-armor',
        'shield',
        'scimitar',
        'shield',
        'explorers-pack',
        'druidcraft-focus',
      ],
      monk: [
        'shortsword',
        'dart',
        'dart',
        'dart',
        'dart',
        'dart',
        'dart',
        'dart',
        'dart',
        'dart',
        'dart',
        'explorers-pack',
      ],
      paladin: [
        'chain-mail',
        'shield',
        'longsword',
        'javelin',
        'javelin',
        'javelin',
        'javelin',
        'javelin',
        'priests-pack',
        'holy-symbol',
      ],
      ranger: ['leather-armor', 'shortsword', 'shortsword', 'longbow', 'explorers-pack'],
      sorcerer: ['dagger', 'dagger', 'component-pouch', 'light-crossbow', 'dungeoneer-pack'],
      warlock: ['leather-armor', 'dagger', 'simple-weapon', 'light-crossbow', 'scholars-pack'],
    };

    const equipmentIds = packages[classId] || [];
    return equipmentIds.map((id) => {
      const item = allEquipment.find((eq) => eq.id === id);
      return (
        item || {
          id,
          name: id.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          category: 'gear' as const,
          cost: { amount: 0, currency: 'gp' as const },
          description: `Starting ${classId} equipment`,
        }
      );
    });
  };

  /**
   * Roll for starting gold
   */
  const rollStartingGold = () => {
    if (!goldData) return;

    // Simple dice roll simulation - in a real app you'd use proper dice rolling
    const numDice = parseInt(goldData.dice.split('d')[0]);
    const dieSize = parseInt(goldData.dice.split('d')[1]);

    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * dieSize) + 1;
    }

    const finalAmount = total * goldData.multiplier;
    setRolledGold(finalAmount);
    setHasRolledGold(true);

    toast({
      title: 'Starting Gold Rolled',
      description: `Rolled ${total} × ${goldData.multiplier} = ${finalAmount} gp`,
    });
  };

  /**
   * Apply equipment selection
   */
  const applyEquipment = () => {
    if (method === 'package') {
      const startingEquipment = getStartingEquipmentPackage(characterClass.id);
      const inventory = startingEquipment.map((equipment, index) => ({
        itemId: equipment.id,
        quantity: 1,
        equipped: false,
      }));

      // Auto-equip appropriate items
      const equippedInventory = inventory.map((item) => {
        const equipment = allEquipment.find((eq) => eq.id === item.itemId);
        const shouldEquip =
          equipment &&
          (equipment.category === 'armor' ||
            equipment.category === 'shield' ||
            (equipment.category === 'weapon' &&
              inventory
                .filter((i) => {
                  const eq = allEquipment.find((e) => e.id === i.itemId);
                  return eq?.category === 'weapon';
                })
                .indexOf(item) < 2)); // Equip first 2 weapons

        return { ...item, equipped: shouldEquip || false };
      });

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          inventory: equippedInventory,
          currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        },
      });

      toast({
        title: 'Equipment Package Applied',
        description: `Received ${characterClass.name} starting equipment.`,
      });
    } else {
      if (!hasRolledGold) {
        toast({
          title: 'Roll for Gold First',
          description: 'Please roll for starting gold before proceeding.',
          variant: 'destructive',
        });
        return;
      }

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          inventory: [],
          currency: { cp: 0, sp: 0, ep: 0, gp: rolledGold, pp: 0 },
        },
      });

      toast({
        title: 'Starting Gold Applied',
        description: `Started with ${rolledGold} gp to purchase equipment.`,
      });
    }
  };

  const startingEquipment = getStartingEquipmentPackage(characterClass.id);

  // Calculate estimated AC from starting equipment with unarmored defense support
  const estimatedAC = () => {
    const armor = startingEquipment.find((eq) => eq.category === 'armor');
    const shield = startingEquipment.find((eq) => eq.category === 'shield');
    const dexMod = character?.abilityScores?.dexterity?.modifier || 0;
    const conMod = character?.abilityScores?.constitution?.modifier || 0;
    const wisMod = character?.abilityScores?.wisdom?.modifier || 0;

    return calculateArmorClass(
      armor || null,
      shield || null,
      dexMod,
      0, // otherBonuses
      characterClass.name,
      conMod,
      wisMod,
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Starting Equipment</h2>
        <p className="text-muted-foreground">
          Choose how to determine your {characterClass.name}'s starting equipment
        </p>
      </div>

      {/* Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={method}
            onValueChange={(value: 'package' | 'gold') => setMethod(value)}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-4 border rounded hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem value="package" id="package" />
                <div className="flex-1">
                  <Label htmlFor="package" className="flex items-center gap-2 cursor-pointer">
                    <Package className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Equipment Package</div>
                      <div className="text-sm text-muted-foreground">
                        Receive the standard {characterClass.name} equipment package
                      </div>
                    </div>
                  </Label>
                </div>
                <Badge variant="secondary">Recommended</Badge>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem value="gold" id="gold" />
                <div className="flex-1">
                  <Label htmlFor="gold" className="flex items-center gap-2 cursor-pointer">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Starting Gold</div>
                      <div className="text-sm text-muted-foreground">
                        Roll {goldData?.dice} × {goldData?.multiplier} gp and buy your own equipment
                      </div>
                    </div>
                  </Label>
                </div>
                <Badge variant="outline">Advanced</Badge>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Equipment Package Preview */}
      {method === 'package' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              {characterClass.name} Equipment Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-blue-600">{estimatedAC()}</div>
                <div className="text-xs text-muted-foreground">Estimated AC</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">{startingEquipment.length}</div>
                <div className="text-xs text-muted-foreground">Items Included</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">Starting Gold</div>
              </div>
            </div>

            <Separator className="mb-4" />

            <div className="space-y-3">
              <h4 className="font-medium">Equipment Included:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {startingEquipment.map((equipment, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded text-sm">
                    {equipment.category === 'weapon' && <Sword className="w-4 h-4 text-red-500" />}
                    {equipment.category === 'armor' && <Shirt className="w-4 h-4 text-blue-500" />}
                    {equipment.category === 'shield' && (
                      <Shield className="w-4 h-4 text-gray-500" />
                    )}
                    {!['weapon', 'armor', 'shield'].includes(equipment.category) && (
                      <Package className="w-4 h-4 text-green-500" />
                    )}
                    <span>{equipment.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Starting Gold Option */}
      {method === 'gold' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Starting Gold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="p-6 border-2 border-dashed rounded-lg">
                <Dice1 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-lg font-medium mb-2">
                  Roll {goldData?.dice} × {goldData?.multiplier}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Average: {goldData?.average} gp
                </div>

                {hasRolledGold ? (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-yellow-600">{rolledGold} gp</div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setHasRolledGold(false);
                        setRolledGold(0);
                      }}
                    >
                      Roll Again
                    </Button>
                  </div>
                ) : (
                  <Button onClick={rollStartingGold} size="lg">
                    <Dice1 className="w-4 h-4 mr-2" />
                    Roll for Gold
                  </Button>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                With starting gold, you'll need to purchase all equipment from the shop. This allows
                for complete customization but requires more planning.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apply Button */}
      <div className="flex justify-center">
        <Button onClick={applyEquipment} size="lg" disabled={method === 'gold' && !hasRolledGold}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Apply {method === 'package' ? 'Equipment Package' : 'Starting Gold'}
        </Button>
      </div>
    </div>
  );
};

export default StartingEquipmentSelection;
