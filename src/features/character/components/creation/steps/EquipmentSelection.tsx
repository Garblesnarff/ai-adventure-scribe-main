import { Check } from 'lucide-react';
import React from 'react';

import type { Equipment } from '@/data/equipmentOptions';

import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { backgrounds } from '@/data/backgroundOptions';
import { getStartingEquipment } from '@/data/equipmentOptions';
import { useAutoScroll } from '@/hooks/use-auto-scroll';

/**
 * Equipment Selection component for character creation
 * Allows users to select their starting equipment based on class and background
 */
const EquipmentSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const characterClass = state.character?.class;
  const characterBackground = state.character?.background;

  // Get starting equipment options based on character class
  const startingEquipment = characterClass ? getStartingEquipment(characterClass.name) : [];

  /**
   * Handles equipment selection and updates character state
   * Adds background equipment automatically and updates character state
   * @param selectedEquipment Array of selected equipment
   * @param optionIndex Index of the selected equipment option
   */
  const handleEquipmentSelect = (selectedEquipment: Equipment[], optionIndex: number) => {
    const equipmentNames = selectedEquipment.map((eq) => eq.name);
    let totalEquipment: string[] = [...equipmentNames];

    // Automatically add background equipment if background is selected
    if (characterBackground) {
      const backgroundEquip =
        backgrounds.find((b) => b.id === characterBackground.id)?.equipment || [];
      totalEquipment = [...backgroundEquip, ...equipmentNames];
    }

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        equipment: totalEquipment,
        selectedEquipmentOptionIndex: optionIndex,
      },
    });

    // Check if this is a gold option (would be empty or single gold item)
    const isGold = selectedEquipment.length === 0; // For now, assume no gold options in equipment
    toast({
      title: isGold ? 'Starting Gold Selected' : 'Equipment Selected',
      description: `Your ${isGold ? 'starting gold' : 'starting equipment'} has been added to your inventory${characterBackground ? ' along with background items' : ''}.`,
      duration: 1000,
    });

    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  if (!characterClass) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center mb-4">Choose Your Equipment</h2>
        <div className="text-center text-gray-500">
          Please select a character class first to see available equipment options.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">Choose Your Equipment</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Equipment Package Option */}
        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-lg border-2 relative ${
            state.character?.selectedEquipmentOptionIndex === 0
              ? 'border-primary bg-accent/10'
              : 'border-transparent'
          }`}
          onClick={() => handleEquipmentSelect(startingEquipment, 0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleEquipmentSelect(startingEquipment, 0);
            }
          }}
        >
          {state.character?.selectedEquipmentOptionIndex === 0 && (
            <div className="absolute top-3 right-3">
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            </div>
          )}
          <h3 className="text-xl font-semibold mb-2">{characterClass.name} Equipment Package</h3>
          <ul className="list-disc list-inside space-y-1">
            {startingEquipment.map((equipment, itemIndex) => (
              <li key={itemIndex} className="text-sm text-gray-600">
                {equipment.name}
              </li>
            ))}
          </ul>
        </Card>

        {/* Starting Gold Option */}
        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-lg border-2 relative ${
            state.character?.selectedEquipmentOptionIndex === 1
              ? 'border-primary bg-accent/10'
              : 'border-transparent'
          }`}
          onClick={() => handleEquipmentSelect([], 1)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleEquipmentSelect([], 1);
            }
          }}
        >
          {state.character?.selectedEquipmentOptionIndex === 1 && (
            <div className="absolute top-3 right-3">
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            </div>
          )}
          <h3 className="text-xl font-semibold mb-2">Starting Gold</h3>
          <p className="text-sm text-gray-600 mb-2">
            Roll for starting gold instead of taking the equipment package.
          </p>
          <p className="text-xs text-gray-500">
            You can use the gold to buy equipment during character creation.
          </p>
        </Card>
      </div>
      {characterBackground && (
        <div className="text-sm text-gray-600">
          <strong>Note:</strong> Background equipment ({characterBackground.name}) will be
          automatically added to your inventory.
        </div>
      )}
    </div>
  );
};

export default EquipmentSelection;
