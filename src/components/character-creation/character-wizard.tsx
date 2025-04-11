import React from 'react';
import { CharacterProvider } from '@/contexts/CharacterContext';
import WizardContent from './wizard/WizardContent';

/**
 * Wrapper component that provides character context to the wizard
 * Ensures all child components have access to character state
 * @returns {JSX.Element} The complete character creation wizard
 */
const CharacterWizard: React.FC = () => {
  return (
    <CharacterProvider>
      <WizardContent />
    </CharacterProvider>
  );
};

export default CharacterWizard;