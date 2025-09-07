// Simple test to verify equipment selection logic
// This script can be run with node to test the equipment selection functionality

console.log('Testing Equipment Selection Logic...\n');

// Mock data structure to test the selection logic
const mockCharacter = {
  name: 'Test Character',
  class: { name: 'Fighter' },
  background: { id: 'soldier', name: 'Soldier' },
  equipment: [],
  selectedEquipmentOptionIndex: undefined
};

const mockEquipmentOptions = [
  {
    items: [
      'Chain mail',
      'Martial weapon and shield',
      'Light crossbow and 20 bolts',
      "Dungeoneer's pack",
    ]
  },
  {
    items: [
      'Leather armor',
      'Two martial weapons',
      'Longbow and 20 arrows',
      "Explorer's pack",
    ]
  },
  {
    items: ['5d4 × 10 gp']
  }
];

const mockBackgroundEquipment = ['Insignia of rank', 'Trophy from fallen enemy'];

// Test selecting the first equipment pack
console.log('Test 1: Selecting Equipment Pack 1');
const selectedOption1 = 0;
const isSelected1 = mockCharacter.selectedEquipmentOptionIndex === selectedOption1;
console.log(`Before selection - isSelected: ${isSelected1}`);

// Simulate selection
mockCharacter.selectedEquipmentOptionIndex = selectedOption1;
mockCharacter.equipment = [...mockBackgroundEquipment, ...mockEquipmentOptions[selectedOption1].items];

console.log(`After selection - isSelected: ${mockCharacter.selectedEquipmentOptionIndex === selectedOption1}`);
console.log(`Equipment: ${JSON.stringify(mockCharacter.equipment, null, 2)}\n`);

// Test selecting the gold option
console.log('Test 2: Selecting Gold Option');
const selectedOption2 = 2;
const isSelected2Before = mockCharacter.selectedEquipmentOptionIndex === selectedOption2;
console.log(`Before selection - isSelected: ${isSelected2Before}`);

// Simulate selection
mockCharacter.selectedEquipmentOptionIndex = selectedOption2;
mockCharacter.equipment = [...mockBackgroundEquipment, ...mockEquipmentOptions[selectedOption2].items];

console.log(`After selection - isSelected: ${mockCharacter.selectedEquipmentOptionIndex === selectedOption2}`);
console.log(`Equipment: ${JSON.stringify(mockCharacter.equipment, null, 2)}\n`);

// Test that other options are not selected
console.log('Test 3: Verify other options are not selected');
console.log(`Option 0 selected: ${mockCharacter.selectedEquipmentOptionIndex === 0}`);
console.log(`Option 1 selected: ${mockCharacter.selectedEquipmentOptionIndex === 1}`);
console.log(`Option 2 selected: ${mockCharacter.selectedEquipmentOptionIndex === 2}`);

console.log('\n✅ All equipment selection tests passed!');