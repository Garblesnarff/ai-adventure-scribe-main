import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CharacterWizard from '@/components/character-creation/character-wizard';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CreateCharacterPanel: React.FC<Props> = ({ open, onClose }) => {
  return (
    <Sheet open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
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
