import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Character } from '@/types/character';
import DiceRoller from '@/components/ui/dice-roller';
import { 
  Package, 
  Coins, 
  Sword, 
  Shield, 
  Weight,
  Plus,
  Minus,
  Star
} from 'lucide-react';

interface InventoryTabProps {
  character: Character;
  onUpdate: () => void;
}

interface Item {
  name: string;
  quantity: number;
  weight: number;
  value: number; // in copper pieces
  type: 'weapon' | 'armor' | 'gear' | 'magic' | 'consumable';
  equipped?: boolean;
  attuned?: boolean;
  description?: string;
  damage?: string;
  properties?: string[];
}

interface Currency {
  cp: number; // copper
  sp: number; // silver
  ep: number; // electrum
  gp: number; // gold
  pp: number; // platinum
}

/**
 * Inventory & Equipment tab with weight tracking and currency management
 */
const InventoryTab: React.FC<InventoryTabProps> = ({ character, onUpdate }) => {
  const [currency, setCurrency] = useState<Currency>({
    cp: 23,
    sp: 15,
    ep: 2,
    gp: 47,
    pp: 3,
  });

  const [inventory, setInventory] = useState<Item[]>([
    {
      name: 'Longsword',
      quantity: 1,
      weight: 3,
      value: 1500, // 15 gp in cp
      type: 'weapon',
      equipped: true,
      damage: '1d8',
      properties: ['Versatile (1d10)'],
      description: 'A well-balanced sword with a sharp edge.',
    },
    {
      name: 'Chain Mail',
      quantity: 1,
      weight: 55,
      value: 7500, // 75 gp in cp
      type: 'armor',
      equipped: true,
      description: 'Made of interlocking metal rings.',
    },
    {
      name: 'Shield',
      quantity: 1,
      weight: 6,
      value: 1000, // 10 gp in cp
      type: 'armor',
      equipped: true,
      description: 'A sturdy wooden shield reinforced with metal.',
    },
    {
      name: 'Health Potion',
      quantity: 3,
      weight: 0.5,
      value: 5000, // 50 gp in cp
      type: 'consumable',
      description: 'Restores 2d4+2 hit points when consumed.',
    },
    {
      name: 'Ring of Protection',
      quantity: 1,
      weight: 0,
      value: 10000, // 100 gp in cp (magic item)
      type: 'magic',
      equipped: true,
      attuned: true,
      description: 'Grants +1 bonus to AC and saving throws.',
    },
  ]);

  // Calculate carrying capacity
  const strengthScore = character.abilityScores.strength.score;
  const carryingCapacity = strengthScore * 15; // Standard 5e rule
  const encumbered = strengthScore * 5;
  const heavilyEncumbered = strengthScore * 10;

  // Calculate current weight
  const currentWeight = inventory.reduce((total, item) => 
    total + (item.weight * item.quantity), 0
  );

  // Calculate total currency weight (50 coins = 1 lb)
  const totalCoins = currency.cp + currency.sp + currency.ep + currency.gp + currency.pp;
  const currencyWeight = Math.floor(totalCoins / 50);
  const totalWeight = currentWeight + currencyWeight;

  // Determine encumbrance status
  const getEncumbranceStatus = () => {
    if (totalWeight >= carryingCapacity) return 'overloaded';
    if (totalWeight >= heavilyEncumbered) return 'heavily-encumbered';
    if (totalWeight >= encumbered) return 'encumbered';
    return 'normal';
  };

  const encumbranceStatus = getEncumbranceStatus();

  // Convert currency to total value in gold pieces
  const totalValueInGold = (
    currency.pp * 10 + 
    currency.gp + 
    currency.ep * 0.5 + 
    currency.sp * 0.1 + 
    currency.cp * 0.01
  ).toFixed(2);

  const toggleEquipped = (index: number) => {
    const newInventory = [...inventory];
    newInventory[index].equipped = !newInventory[index].equipped;
    setInventory(newInventory);
  };

  const toggleAttuned = (index: number) => {
    const newInventory = [...inventory];
    newInventory[index].attuned = !newInventory[index].attuned;
    setInventory(newInventory);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword className="w-4 h-4" />;
      case 'armor': return <Shield className="w-4 h-4" />;
      case 'magic': return <Star className="w-4 h-4 text-purple-500" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getEncumbranceColor = (status: string) => {
    switch (status) {
      case 'overloaded': return 'text-red-600';
      case 'heavily-encumbered': return 'text-orange-600';
      case 'encumbered': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Currency & Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Currency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-orange-600">{currency.pp}</div>
                  <div className="text-xs">PP</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600">{currency.gp}</div>
                  <div className="text-xs">GP</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-600">{currency.ep}</div>
                  <div className="text-xs">EP</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-400">{currency.sp}</div>
                  <div className="text-xs">SP</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-800">{currency.cp}</div>
                  <div className="text-xs">CP</div>
                </div>
              </div>
              <div className="text-center pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Total Value: {totalValueInGold} gp
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weight className="w-5 h-5 text-blue-500" />
              Carrying Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Current Weight</span>
                <span className={`font-bold ${getEncumbranceColor(encumbranceStatus)}`}>
                  {totalWeight} lbs
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Encumbered: {encumbered}</span>
                  <span>Heavy: {heavilyEncumbered}</span>
                  <span>Max: {carryingCapacity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      encumbranceStatus === 'overloaded' ? 'bg-red-500' :
                      encumbranceStatus === 'heavily-encumbered' ? 'bg-orange-500' :
                      encumbranceStatus === 'encumbered' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (totalWeight / carryingCapacity) * 100)}%` }}
                  />
                </div>
              </div>
              
              {encumbranceStatus !== 'normal' && (
                <Badge variant="outline" className="capitalize">
                  {encumbranceStatus.replace('-', ' ')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inventory.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {getItemIcon(item.type)}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.equipped && (
                        <Badge variant="secondary" className="text-xs">Equipped</Badge>
                      )}
                      {item.attuned && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                          Attuned
                        </Badge>
                      )}
                      {item.properties && item.properties.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {item.properties[0]}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Qty: {item.quantity} • Weight: {item.weight * item.quantity} lbs • 
                      Value: {(item.value / 100).toFixed(2)} gp
                    </div>
                    
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {item.damage && (
                    <DiceRoller
                      dice={item.damage}
                      modifier={character.abilityScores.strength.modifier}
                      label="Attack"
                    />
                  )}
                  
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant={item.equipped ? "default" : "outline"}
                      onClick={() => toggleEquipped(index)}
                    >
                      {item.equipped ? 'Equipped' : 'Equip'}
                    </Button>
                    
                    {item.type === 'magic' && (
                      <Button
                        size="sm"
                        variant={item.attuned ? "secondary" : "outline"}
                        onClick={() => toggleAttuned(index)}
                        className="text-xs"
                      >
                        {item.attuned ? 'Attuned' : 'Attune'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attunement Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Attunement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm">Attuned Items:</span>
            <div className="flex gap-2">
              {[1, 2, 3].map((slot) => {
                const attunedItems = inventory.filter(item => item.attuned);
                const isOccupied = slot <= attunedItems.length;
                
                return (
                  <div
                    key={slot}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center ${
                      isOccupied 
                        ? 'bg-purple-500 border-purple-600 text-white' 
                        : 'border-gray-300'
                    }`}
                  >
                    {isOccupied && <Star className="w-4 h-4" />}
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">
              {inventory.filter(item => item.attuned).length} / 3 slots used
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryTab;