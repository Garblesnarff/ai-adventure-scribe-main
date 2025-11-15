import React from 'react';

import CombatInterface from '@/components/combat/CombatInterface';
import { Sheet, SheetContent } from '@/components/ui/sheet';

/**
 * GameCombatSheet Component
 *
 * Displays the combat tracker interface in a side sheet.
 * Only shown when combat is active and user opens the tracker.
 */

interface GameCombatSheetProps {
  showTracker: boolean;
  setShowTracker: (show: boolean) => void;
  isDM: boolean;
}

export const GameCombatSheet: React.FC<GameCombatSheetProps> = ({
  showTracker,
  setShowTracker,
  isDM,
}) => {
  return (
    <Sheet open={showTracker} onOpenChange={setShowTracker}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[480px] overflow-y-auto">
        <CombatInterface isDM={isDM} />
      </SheetContent>
    </Sheet>
  );
};
