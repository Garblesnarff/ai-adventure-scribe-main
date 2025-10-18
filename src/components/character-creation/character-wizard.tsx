import React, { useEffect } from 'react';
import { CharacterProvider } from '@/contexts/CharacterContext';
import WizardContent from './wizard/WizardContent';
import { useSearchParams } from 'react-router-dom';
import { analytics } from '@/services/analytics';

/**
 * Wrapper component that provides character context to the wizard
 * Ensures all child components have access to character state
 * @returns {JSX.Element} The complete character creation wizard
 */
const CharacterWizard: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const campaignId = searchParams.get('campaign') || undefined;
    analytics.characterCreationStarted({ campaignId });
  }, [searchParams]);

  return (
    <CharacterProvider>
      <WizardContent />
    </CharacterProvider>
  );
};

export default CharacterWizard;