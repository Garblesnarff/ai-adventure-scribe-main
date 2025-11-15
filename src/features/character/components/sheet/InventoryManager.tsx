import {
  Package,
  Shield,
  Sword,
  Coins,
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Weight,
  Zap,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { Equipment } from '@/data/equipmentOptions';
import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  allEquipment,
  calculateArmorClass,
  getEquipmentByCategory,
  convertCurrency,
  formatCurrency,
} from '@/data/equipmentOptions';

interface InventoryItem extends Equipment {
  quantity: number;
  equipped: boolean;
}

interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

interface InventoryManagerProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

/**
 * InventoryManager component for character equipment and inventory management
 */
const InventoryManager: React.FC<InventoryManagerProps> = ({ character, onUpdate }) => {
  const { toast } = useToast();

  // State management
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [currency, setCurrency] = useState<Currency>({ cp: 0, sp: 0, ep: 0, gp: 100, pp: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showShop, setShowShop] = useState(false);

  // Equipment filters
  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'weapon', label: 'Weapons' },
    { value: 'armor', label: 'Armor' },
    { value: 'shield', label: 'Shields' },
    { value: 'tool', label: 'Tools' },
    { value: 'gear', label: 'Gear' },
    { value: 'consumable', label: 'Consumables' },
  ];

  // Filter equipment for shop
  const filteredEquipment = allEquipment.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get equipped items
  const equippedArmor = inventory.find((item) => item.equipped && item.category === 'armor');
  const equippedShield = inventory.find((item) => item.equipped && item.category === 'shield');
  const equippedWeapons = inventory.filter((item) => item.equipped && item.category === 'weapon');

  // Calculate AC with unarmored defense support
  const dexModifier = character?.abilityScores?.dexterity?.modifier || 0;
  const conModifier = character?.abilityScores?.constitution?.modifier || 0;
  const wisModifier = character?.abilityScores?.wisdom?.modifier || 0;
  const characterClass = character?.class?.name || '';

  const calculatedAC = calculateArmorClass(
    equippedArmor || null,
    equippedShield || null,
    dexModifier,
    0, // otherBonuses
    characterClass,
    conModifier,
    wisModifier,
  );

  // Calculate total weight
  const totalWeight = inventory.reduce(
    (total, item) => total + (item.weight || 0) * item.quantity,
    0,
  );
  const carryingCapacity = (character?.abilityScores?.strength?.score || 10) * 15; // STR x 15 lbs

  /**
   * Add item to inventory
   */
  const addToInventory = (equipment: Equipment, quantity: number = 1) => {
    const existingItem = inventory.find((item) => item.id === equipment.id);

    if (existingItem) {
      setInventory((prev) =>
        prev.map((item) =>
          item.id === equipment.id ? { ...item, quantity: item.quantity + quantity } : item,
        ),
      );
    } else {
      const newItem: InventoryItem = {
        ...equipment,
        quantity,
        equipped: false,
      };
      setInventory((prev) => [...prev, newItem]);
    }

    toast({
      title: 'Item Added',
      description: `Added ${quantity}x ${equipment.name} to inventory.`,
    });
  };

  /**
   * Remove item from inventory
   */
  const removeFromInventory = (itemId: string, quantity: number = 1) => {
    setInventory(
      (prev) =>
        prev
          .map((item) => {
            if (item.id === itemId) {
              const newQuantity = Math.max(0, item.quantity - quantity);
              return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
            }
            return item;
          })
          .filter(Boolean) as InventoryItem[],
    );

    toast({
      title: 'Item Removed',
      description: `Removed ${quantity}x item from inventory.`,
    });
  };

  /**
   * Toggle equipment status
   */
  const toggleEquipped = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    // Handle armor/shield - only one can be equipped
    if (item.category === 'armor') {
      setInventory((prev) =>
        prev.map((i) => ({
          ...i,
          equipped: i.category === 'armor' ? i.id === itemId && !i.equipped : i.equipped,
        })),
      );
    } else if (item.category === 'shield') {
      setInventory((prev) =>
        prev.map((i) => ({
          ...i,
          equipped: i.category === 'shield' ? i.id === itemId && !i.equipped : i.equipped,
        })),
      );
    } else {
      // Other items can be equipped/unequipped normally
      setInventory((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, equipped: !i.equipped } : i)),
      );
    }

    const action = item.equipped ? 'Unequipped' : 'Equipped';
    toast({
      title: `${action} Item`,
      description: `${action} ${item.name}.`,
    });
  };

  /**
   * Purchase item (subtract cost from currency)
   */
  const purchaseItem = (equipment: Equipment) => {
    const cost = convertCurrency(equipment.cost.amount, equipment.cost.currency, 'gp');

    if (currency.gp >= cost) {
      setCurrency((prev) => ({ ...prev, gp: prev.gp - cost }));
      addToInventory(equipment);

      toast({
        title: 'Item Purchased',
        description: `Purchased ${equipment.name} for ${formatCurrency(equipment.cost)}.`,
      });
    } else {
      toast({
        title: 'Insufficient Funds',
        description: `You need ${cost} gp to purchase this item.`,
        variant: 'destructive',
      });
    }
  };

  /**
   * Sell item (add value to currency)
   */
  const sellItem = (item: InventoryItem) => {
    const sellValue = Math.floor(convertCurrency(item.cost.amount, item.cost.currency, 'gp') / 2);
    setCurrency((prev) => ({ ...prev, gp: prev.gp + sellValue }));
    removeFromInventory(item.id, 1);

    toast({
      title: 'Item Sold',
      description: `Sold ${item.name} for ${sellValue} gp.`,
    });
  };

  /**
   * Update currency
   */
  const updateCurrency = (type: keyof Currency, amount: number) => {
    setCurrency((prev) => ({ ...prev, [type]: Math.max(0, amount) }));
  };

  const getItemIcon = (category: Equipment['category']) => {
    switch (category) {
      case 'weapon':
        return <Sword className="w-4 h-4" />;
      case 'armor':
      case 'shield':
        return <Shield className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Character Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Combat Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold text-blue-600">{calculatedAC}</div>
              <div className="text-xs text-muted-foreground">Armor Class</div>
              <div className="text-xs text-muted-foreground mt-1">
                {equippedArmor && `${equippedArmor.name}`}
                {equippedShield && ` + Shield`}
              </div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">{totalWeight}</div>
              <div className="text-xs text-muted-foreground">Weight (lbs)</div>
              <div className="text-xs text-muted-foreground">Capacity: {carryingCapacity}</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">{equippedWeapons.length}</div>
              <div className="text-xs text-muted-foreground">Equipped Weapons</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Currency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(currency).map(([type, amount]) => (
              <div key={type} className="text-center">
                <Label htmlFor={`currency-${type}`} className="text-xs uppercase">
                  {type}
                </Label>
                <Input
                  id={`currency-${type}`}
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => updateCurrency(type as keyof Currency, Number(e.target.value))}
                  className="text-center"
                />
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-sm text-muted-foreground">
            Total Value:{' '}
            {convertCurrency(
              currency.cp +
                currency.sp * 10 +
                currency.ep * 50 +
                currency.gp * 100 +
                currency.pp * 1000,
              'cp',
              'gp',
            ).toFixed(2)}{' '}
            gp
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="inventory">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="shop">Equipment Shop</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-500" />
                Inventory ({inventory.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventory.length > 0 ? (
                <div className="space-y-3">
                  {inventory.map((item) => (
                    <div
                      key={`${item.id}-${item.quantity}`}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getItemIcon(item.category)}
                          <Checkbox
                            checked={item.equipped}
                            onCheckedChange={() => toggleEquipped(item.id)}
                            disabled={item.category === 'consumable'}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${item.equipped ? 'text-primary' : ''}`}>
                              {item.name}
                            </span>
                            {item.equipped && (
                              <Badge variant="default" className="text-xs">
                                Equipped
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.category}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                          {item.weight && (
                            <div className="text-xs text-muted-foreground">
                              <Weight className="w-3 h-3 inline mr-1" />
                              {item.weight * item.quantity} lbs
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.quantity}x</Badge>
                        <Button variant="outline" size="sm" onClick={() => sellItem(item)}>
                          Sell
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromInventory(item.id)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Empty Inventory</h3>
                  <p className="text-sm">Add items from the Equipment Shop tab.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shop Tab */}
        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-500" />
                Equipment Shop
              </CardTitle>

              {/* Search and Filter */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredEquipment.map((equipment) => (
                  <div
                    key={equipment.id}
                    className="p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getItemIcon(equipment.category)}
                        <div>
                          <h4 className="font-medium">{equipment.name}</h4>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {equipment.category}
                            </Badge>
                            {equipment.weaponType && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {equipment.weaponType}
                              </Badge>
                            )}
                            {equipment.armorType && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {equipment.armorType} armor
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatCurrency(equipment.cost)}
                        </div>
                        {equipment.weight && (
                          <div className="text-xs text-muted-foreground">
                            {equipment.weight} lbs
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{equipment.description}</p>

                    {/* Equipment Stats */}
                    {equipment.damage && (
                      <div className="text-xs mb-2">
                        <span className="font-medium">Damage:</span> {equipment.damage.dice}{' '}
                        {equipment.damage.type}
                      </div>
                    )}
                    {equipment.armorClass && (
                      <div className="text-xs mb-2">
                        <span className="font-medium">AC:</span> {equipment.armorClass.base}
                        {equipment.armorClass.dexModifier && ' + Dex'}
                        {equipment.armorClass.maxDexModifier !== undefined &&
                          ` (max ${equipment.armorClass.maxDexModifier})`}
                      </div>
                    )}
                    {equipment.properties && equipment.properties.length > 0 && (
                      <div className="text-xs mb-3">
                        <span className="font-medium">Properties:</span>{' '}
                        {equipment.properties.join(', ')}
                      </div>
                    )}

                    <Button
                      onClick={() => purchaseItem(equipment)}
                      className="w-full"
                      size="sm"
                      disabled={
                        currency.gp <
                        convertCurrency(equipment.cost.amount, equipment.cost.currency, 'gp')
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Purchase
                    </Button>
                  </div>
                ))}
              </div>

              {filteredEquipment.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Equipment Found</h3>
                  <p className="text-sm">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManager;
