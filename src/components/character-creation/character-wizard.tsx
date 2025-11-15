import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import WizardContent from './wizard/WizardContent';

import { ErrorBoundary } from '@/components/error';
import { CharacterCreationErrorFallback } from '@/components/error/CharacterCreationErrorFallback';
import { CharacterProvider } from '@/contexts/CharacterContext';
import { analytics } from '@/services/analytics';

/**
 * Wrapper component that provides character context to the wizard
 * Ensures all child components have access to character state
 * Protected by ErrorBoundary to gracefully handle any character creation crashes
 * @returns {JSX.Element} The complete character creation wizard
 */
const CharacterWizard: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const campaignId = searchParams.get('campaign') || undefined;
    analytics.characterCreationStarted({ campaignId });
  }, [searchParams]);

  return (
    <ErrorBoundary
      level="feature"
      fallback={<CharacterCreationErrorFallback showReturnToCharacters />}
    >
      <CharacterProvider>
        <WizardContent />
      </CharacterProvider>
    </ErrorBoundary>
  );
};

export default CharacterWizard;
