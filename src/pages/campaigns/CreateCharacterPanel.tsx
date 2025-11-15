import React from 'react';

import CharacterWizard from '@/components/character-creation/character-wizard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * CreateCharacterPanel Component
 *
 * Renders character creation wizard in a slide-out panel for campaign-based character creation.
 * The CharacterWizard component is already wrapped with ErrorBoundary, so this component
 * does not need additional error boundary wrapping.
 */
const CreateCharacterPanel: React.FC<Props> = ({ open, onClose }) => {
  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Create Character</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <CharacterWizard />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateCharacterPanel;
