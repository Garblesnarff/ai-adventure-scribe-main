/**
 * usePendingRolls Hook
 * Tracks pending dice roll requests in the message list
 */

import { useMemo } from 'react';

import { useMessageContext } from '@/contexts/MessageContext';
import { parseRollRequests } from '@/utils/rollRequestParser';

/**
 * Hook to detect if there are pending dice roll requests
 * Returns true if the last DM message contains unresolved roll requests
 */
export const usePendingRolls = () => {
  const { messages } = useMessageContext();

  const pendingRolls = useMemo(() => {
    if (!messages || messages.length === 0) {
      return {
        hasPendingRolls: false,
        pendingRequests: [],
        lastDMMessage: null,
      };
    }

    // Find the most recent DM message
    const dmMessages = messages.filter((m) => m.sender === 'dm');
    if (dmMessages.length === 0) {
      return {
        hasPendingRolls: false,
        pendingRequests: [],
        lastDMMessage: null,
      };
    }

    const lastDMMessage = dmMessages[dmMessages.length - 1];

    // Check if there have been any player responses after the last DM message
    const lastDMMessageIndex = messages?.findIndex((m) => m === lastDMMessage) ?? -1;
    const playerResponsesAfter =
      lastDMMessageIndex >= 0
        ? (messages?.slice(lastDMMessageIndex + 1) ?? []).filter((m) => m.sender === 'player')
        : [];

    // Parse roll requests from the last DM message
    const rollRequests = parseRollRequests(lastDMMessage.text);

    // If there are roll requests and no player dice roll responses after, they're pending
    const hasPendingRolls =
      rollRequests.length > 0 &&
      !playerResponsesAfter.some(
        (msg) =>
          msg.context?.intent === 'dice_roll' ||
          msg.text.toLowerCase().includes('rolled') ||
          msg.text.toLowerCase().includes('i roll'),
      );

    return {
      hasPendingRolls,
      pendingRequests: hasPendingRolls ? rollRequests : [],
      lastDMMessage: hasPendingRolls ? lastDMMessage : null,
    };
  }, [messages]);

  return pendingRolls;
};

/**
 * Hook to get the most recent pending roll request
 */
export const useLatestPendingRoll = () => {
  const { hasPendingRolls, pendingRequests } = usePendingRolls();

  return {
    hasLatestPendingRoll: hasPendingRolls && pendingRequests.length > 0,
    latestPendingRoll: pendingRequests.length > 0 ? pendingRequests[0] : null,
  };
};
