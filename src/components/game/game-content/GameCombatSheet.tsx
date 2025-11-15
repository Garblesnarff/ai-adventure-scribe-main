import React from 'react';

import CombatInterface from '@/components/combat/CombatInterface';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

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
  const overlayMode =
    (import.meta.env.VITE_COMBAT_SHEET_OVERLAY as 'light' | 'none' | undefined) ?? 'dark';

  const overlayClassName = overlayMode === 'light' ? 'bg-black/40 backdrop-blur-sm' : undefined;
  const hideOverlay = overlayMode === 'none';

  return (
    <Sheet open={showTracker} onOpenChange={setShowTracker}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden border-l border-border/40 bg-background/95 !p-0 sm:w-[420px] sm:max-w-[480px] lg:w-[520px]"
        overlayClassName={overlayClassName}
        hideOverlay={hideOverlay}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Combat Tracker</SheetTitle>
          <SheetDescription>Manage initiative and encounter flow.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
          <CombatInterface isDM={isDM} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
