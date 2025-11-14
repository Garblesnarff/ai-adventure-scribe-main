import { useEffect, useCallback } from 'react';

import { logger } from '../lib/logger';

import { checkSafetyCommands, processSafetyCommand } from '@/utils/safetyCommands';

export interface UseKeyboardShortcutsOptions {
  sessionId: string;
  onSafetyCommand?: (command: ChatMessage) => Promise<void>;
  onGameStateUpdate?: (update: any) => Promise<void>;
  disabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts for safety commands
 */
export const useKeyboardShortcuts = ({
  sessionId,
  onSafetyCommand,
  onGameStateUpdate,
  disabled = false,
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      if (disabled) return;

      // Only handle shortcuts when not in an input field (unless specifically intended)
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true';

      // Allow shortcuts anywhere for emergency safety commands
      const isEmergencyShortcut = event.ctrlKey && (event.key === 'x' || event.key === 'X');

      // For non-emergency shortcuts, require not being in an input field
      if (!isEmergencyShortcut && isInputField) return;

      let commandText = '';
      let isSafetyCommand = false;

      // Check for keyboard shortcuts
      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'x':
            commandText = '/x';
            isSafetyCommand = true;
            break;
          case 'v':
            commandText = '/veil';
            isSafetyCommand = true;
            break;
          case 'p':
            commandText = '/pause';
            isSafetyCommand = true;
            break;
          case 'r':
            commandText = '/resume';
            isSafetyCommand = true;
            break;
        }
      }

      if (isSafetyCommand) {
        event.preventDefault();
        event.stopPropagation();

        try {
          const safetyCheck = checkSafetyCommands(commandText, sessionId);
          if (safetyCheck.isSafetyCommand && safetyCheck.command) {
            let response: ChatMessage;

            if (safetyCheck.response) {
              response = safetyCheck.response;
            } else {
              response = await processSafetyCommand(safetyCheck.command, sessionId);
            }

            if (onSafetyCommand) {
              await onSafetyCommand(response);
            }

            // Handle pause/resume state changes
            if (onGameStateUpdate) {
              if (safetyCheck.shouldPause) {
                await onGameStateUpdate({ is_paused: true });
              } else if (safetyCheck.shouldResume) {
                await onGameStateUpdate({ is_paused: false });
              }
            }
          }
        } catch (error) {
          logger.error('Error handling safety keyboard shortcut:', error);
        }
      }
    },
    [sessionId, onSafetyCommand, onGameStateUpdate, disabled],
  );

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, disabled]);
};
