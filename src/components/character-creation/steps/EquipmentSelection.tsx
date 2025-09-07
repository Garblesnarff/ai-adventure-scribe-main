import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { getStartingEquipment } from '@/data/equipmentOptions';
import { backgrounds } from '@/data/backgroundOptions';

/**
 * Equipment Selection component for character creation
 * Allows users to select their starting equipment based on class and background
 */
const EquipmentSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const characterClass = state.character?.class;
  const characterBackground = state.character?.background;

  // Get starting equipment options based on character class
  const startingEquipment = characterClass ? getStartingEquipment(characterClass.name) : [];

  /**
   * Handles equipment selection and updates character state
   * Adds background equipment automatically and updates character state
   * @param selectedItems Array of selected class equipment or gold items
   */
  const handleEquipmentSelect = (selectedItems: string[]) => {
    let totalEquipment: string[] = [...selectedItems];

    // Automatically add background equipment if background is selected
    if (characterBackground) {
      const backgroundEquip = backgrounds.find(b => b.id === characterBackground.id)?.equipment || [];
      totalEquipment = [...backgroundEquip, ...selectedItems];
    }

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { equipment: totalEquipment }
    });
    
    // Detect if gold was selected for appropriate toast message
    const isGold = selectedItems.length === 1 && selectedItems[0].includes('gp');
    toast({
      title: isGold ? "Starting Gold Selected" : "Equipment Selected",
      description: `Your ${isGold ? 'starting gold' : 'starting equipment'} has been added to your inventory${characterBackground ? ' along with background items' : ''}.`,
      duration: 1000,
    });
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
        {startingEquipment.map((option, index) => {
          const isSelected = JSON.stringify(state.character?.equipment) === JSON.stringify(option.items);
          const isGoldOption = option.items.length === 1 && option.items[0].includes('gp');
          
          return (
            <Card 
              key={index}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                isSelected ? 'border-primary bg-accent/10' : 'border-transparent'
              }`}
              onClick={() => handleEquipmentSelect(option.items)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleEquipmentSelect(option.items);
                }
              }}
            >
              <h3 className="text-xl font-semibold mb-2">
                {isGoldOption ? 'Starting Gold' : `Equipment Pack ${index + 1}`}
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {option.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-sm text-gray-600">{item}</li>
                ))}
              </ul>
              {isGoldOption && (
                <p className="text-xs text-gray-500 mt-2">
                  Choose this option instead of an equipment pack to receive starting gold.
                </p>
              )}
            </Card>
          );
        })}
      </div>
      {characterBackground && (
        <div className="text-sm text-gray-600">
          <strong>Note:</strong> Background equipment ({characterBackground.name}) will be automatically added to your inventory.
        </div>
      )}
    </div>
  );
};

export default EquipmentSelection;
