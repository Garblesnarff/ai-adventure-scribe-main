import {
  Package,
  Coins,
  Sword,
  Shield,
  Weight,
  Plus,
  Minus,
  Star,
  Zap,
  Heart,
  ZapIcon,
  Info,
} from 'lucide-react';
import React, { useState } from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';
import { Input } from '@/components/ui/input';
import { useMagicItemAttunement } from '@/hooks/use-magic-item-attunement';
import { validateAttunementRequirements } from '@/utils/magicItemEffects';

interface InventoryTabProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
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
  // Extract currency from character or use defaults
  const currency: Currency = {
    cp: character.currency?.cp || 0,
    sp: character.currency?.sp || 0,
    ep: character.currency?.ep || 0,
    gp: character.currency?.gp || 0,
    pp: character.currency?.pp || 0,
  };

  const { attuneToItem, removeAttunement, getItemAttunementStatus, getAttunementSummary } =
    useMagicItemAttunement(character, onUpdate);

  // Calculate carrying capacity
  const strengthScore = character.abilityScores?.strength?.score || 10;
  const carryingCapacity = strengthScore * 15; // Standard 5e rule
  const encumbered = strengthScore * 5;
  const heavilyEncumbered = strengthScore * 10;

  // Calculate current weight (simplified - would need actual item weights)
  const currentWeight =
    character.inventory?.reduce((total, item) => total + (item.quantity || 1), 0) || 0;

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

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon':
        return <Sword className="w-4 h-4" />;
      case 'armor':
        return <Shield className="w-4 h-4" />;
      case 'magic':
        return <Star className="w-4 h-4 text-purple-500" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getEncumbranceColor = (status: string) => {
    switch (status) {
      case 'overloaded':
        return 'text-red-600';
      case 'heavily-encumbered':
        return 'text-orange-600';
      case 'encumbered':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  const toggleEquipped = (itemId: string) => {
    const updatedCharacter = {
      ...character,
      inventory:
        character.inventory?.map((item) =>
          item.itemId === itemId ? { ...item, equipped: !item.equipped } : item,
        ) || [],
    };

    onUpdate(updatedCharacter);
  };

  const handleAttuneToggle = async (itemId: string) => {
    const item = character.inventory?.find((invItem) => invItem.itemId === itemId);
    if (!item) return;

    if (item.isAttuned) {
      await removeAttunement(itemId);
    } else {
      await attuneToItem(itemId);
    }
  };

  // Get attunement summary
  const attunementSummary = getAttunementSummary();

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
                      encumbranceStatus === 'overloaded'
                        ? 'bg-red-500'
                        : encumbranceStatus === 'heavily-encumbered'
                          ? 'bg-orange-500'
                          : encumbranceStatus === 'encumbered'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
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
            {character.inventory && character.inventory.length > 0 ? (
              character.inventory.map((item) => {
                // Simplified attunement status - check if already attuned
                const attunementStatus = {
                  canAttune: !item.isAttuned && item.requiresAttunement,
                  isAttuned: item.isAttuned || false,
                };

                return (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getItemIcon(item.isMagic ? 'magic' : 'default')}

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.itemId}</span>
                          {item.equipped && (
                            <Badge variant="secondary" className="text-xs">
                              Equipped
                            </Badge>
                          )}
                          {item.isAttuned && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-purple-100 text-purple-800"
                            >
                              Attuned
                            </Badge>
                          )}
                          {item.isMagic && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-50 text-purple-700 border-purple-300"
                            >
                              Magic
                            </Badge>
                          )}
                          {item.magicItemRarity && item.magicItemRarity !== 'common' && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.magicItemRarity.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Qty: {item.quantity || 1}
                        </div>

                        {/* Magic item details */}
                        {item.isMagic && (
                          <div className="mt-2 text-xs">
                            {item.magicBonus !== 0 && (
                              <div className="text-purple-600 font-medium">
                                Bonus: +{item.magicBonus}
                              </div>
                            )}
                            {item.magicProperties && item.magicProperties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.magicProperties.map((prop, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                  >
                                    {prop}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {item.attunementRequirements && (
                              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                <Info className="w-3 h-3" />
                                <span>Requires attunement: {item.attunementRequirements}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant={item.equipped ? 'default' : 'outline'}
                          onClick={() => toggleEquipped(item.itemId)}
                        >
                          {item.equipped ? 'Unequip' : 'Equip'}
                        </Button>

                        {item.isMagic && item.requiresAttunement && (
                          <Button
                            size="sm"
                            variant={item.isAttuned ? 'secondary' : 'outline'}
                            onClick={() => handleAttuneToggle(item.itemId)}
                            className="text-xs"
                            disabled={!item.equipped || !attunementStatus.canAttune}
                          >
                            {item.isAttuned ? 'Unattune' : 'Attune'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">No equipment found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attunement Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-500" />
            Attunement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm">Attuned Items:</span>
            <div className="flex gap-2">
              {[1, 2, 3].map((slot) => {
                const attunedItems = character.inventory?.filter((item) => item.isAttuned) || [];
                const isOccupied = slot <= attunedItems.length;

                return (
                  <div
                    key={slot}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center ${
                      isOccupied ? 'bg-purple-500 border-purple-600 text-white' : 'border-gray-300'
                    }`}
                  >
                    {isOccupied && <Star className="w-4 h-4" />}
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">
              {attunementSummary.attunedCount} / {attunementSummary.maxAttunementSlots} slots used
            </span>
          </div>

          {attunementSummary.isAtCapacity && (
            <div className="mt-3 text-sm text-orange-600">
              Attunement capacity reached. Remove attunement from an item to attune to a new one.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryTab;
