import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { getStartingEquipment } from '@/data/equipmentOptions';

/**
 * Equipment Selection component for character creation
 * Allows users to select their starting equipment based on class and background
 */
const EquipmentSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const characterClass = state.character?.class;

  // Get starting equipment options based on character class
  const startingEquipment = characterClass ? getStartingEquipment(characterClass.name) : [];

  /**
   * Handles equipment selection and updates character state
   * @param equipment Array of selected equipment items
   */
  const handleEquipmentSelect = (equipment: string[]) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { equipment }
    });
    
    toast({
      title: "Equipment Selected",
      description: "Your starting equipment has been added to your inventory.",
      duration: 1000,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">Choose Your Equipment</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {startingEquipment.map((option, index) => {
          const isSelected = JSON.stringify(state.character?.equipment) === JSON.stringify(option.items);
          
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
              <h3 className="text-xl font-semibold mb-2">Option {index + 1}</h3>
              <ul className="list-disc list-inside space-y-1">
                {option.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-sm text-gray-600">{item}</li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EquipmentSelection;