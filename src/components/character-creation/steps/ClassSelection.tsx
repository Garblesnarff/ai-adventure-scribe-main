import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card } from '@/components/ui/card';
import { classes } from '@/data/classOptions';
import { CharacterClass } from '@/types/character';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';

const ClassSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();

  const handleClassSelect = (characterClass: CharacterClass) => {
    console.log('🎯 handleClassSelect called with:', characterClass);
    console.log('🎯 Current character state before dispatch:', state.character);
    console.log('🎯 Character class before update:', state.character?.class);

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { class: characterClass }
    });

    console.log('🎯 Dispatched UPDATE_CHARACTER with payload:', { class: characterClass });

    // Add a small delay to check if state updated
    setTimeout(() => {
      console.log('🎯 Character state after dispatch (with delay):', state.character);
      console.log('🎯 Character class after update:', state.character?.class);
    }, 100);

    toast({
      title: "Class Selected",
      description: `You have chosen the ${characterClass.name} class.`,
      duration: 1000,
    });

    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">Choose Your Class</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((characterClass) => {
          const isSelected = state.character?.class?.id === characterClass.id;
          console.log(`Class ${characterClass.id} selected:`, isSelected);
          
          return (
            <Card 
              key={characterClass.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                isSelected ? 'border-primary bg-accent/10' : 'border-transparent'
              }`}
              onClick={() => handleClassSelect(characterClass)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClassSelect(characterClass);
                }
              }}
            >
              <h3 className="text-xl font-semibold mb-2">{characterClass.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{characterClass.description}</p>
              <div className="text-sm">
                <p><span className="font-medium">Hit Die:</span> d{characterClass.hitDie}</p>
                <p><span className="font-medium">Primary Ability:</span> {String(characterClass.primaryAbility).charAt(0).toUpperCase() + String(characterClass.primaryAbility).slice(1)}</p>
                <p className="font-medium mt-2">Saving Throw Proficiencies:</p>
                <ul className="list-disc list-inside">
                  {characterClass.savingThrowProficiencies.map((save, index) => (
                    <li key={index} className="capitalize">{String(save)}</li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ClassSelection;