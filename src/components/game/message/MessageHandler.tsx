import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';
import { useMemoryContext } from '@/contexts/MemoryContext';
import { useAIResponse } from '@/hooks/use-ai-response';
import { useSessionValidator } from '../session/SessionValidator';

interface MessageHandlerProps {
  sessionId: string; // Should be non-null if we reach here
  campaignId: string | null;
  characterId: string | null;
  turnCount: number;
  updateGameSessionState: (newState: Partial<any>) => Promise<void>; // Replace 'any' with ExtendedGameSession if possible
  children: (props: {
    handleSendMessage: (message: string) => Promise<void>;
    isProcessing: boolean;
  }) => React.ReactNode;
}

export const MessageHandler: React.FC<MessageHandlerProps> = ({
  sessionId,
  campaignId,
  characterId,
  turnCount,
  updateGameSessionState,
  children,
}) => {
  const { messages, sendMessage, queueStatus } = useMessageContext();
  const { extractMemories } = useMemoryContext();
  const { getAIResponse } = useAIResponse(); // getAIResponse returns the AI ChatMessage
  const { toast } = useToast();
  // Assuming validateSession is still relevant or adapted
  const validateSession = useSessionValidator({ sessionId, campaignId, characterId }); 

  const handleSendMessage = async (playerInput: string) => {
    if (queueStatus === 'processing') return; // Or if isProcessing from its own state

    try {
      console.log('[Memory Flow] Starting message handling for:', playerInput);
      
      // Validate session before proceeding (if still needed)
      const isValid = await validateSession();
      if (!isValid) return;

      const newTurnCount = turnCount + 1;

      // Add player message
      const playerMessage: ChatMessage = {
        text: playerInput,
        sender: 'player',
        context: { intent: 'query' }, // Simplified context for MVP
      };
      await sendMessage(playerMessage); // This adds to UI and saves to dialogue_history

      // Update turn count immediately after player message is sent
      await updateGameSessionState({ turn_count: newTurnCount });
      
      console.log('[Memory Flow] Extracting memories from player input');
      await extractMemories(playerInput); // Assuming this is non-critical path for state update
      
      // Optional: System acknowledgment (can be removed if AI response is fast)
      // const systemMessage: ChatMessage = { text: "Processing...", sender: 'system', context: { intent: 'acknowledgment' } };
      // await sendMessage(systemMessage);
      
      console.log('[Memory Flow] Getting AI response for session:', sessionId);
      // Pass necessary context to getAIResponse. It fetches its own campaign/char details if needed.
      const aiResponseMessage = await getAIResponse([...messages, playerMessage], sessionId); 
      
      await sendMessage(aiResponseMessage); // Adds AI message to UI and dialogue_history
      
      // Update current_scene_description with AI response
      if (aiResponseMessage.text) {
        await updateGameSessionState({ current_scene_description: aiResponseMessage.text });
        console.log('[Memory Flow] Extracting memories from AI response:', aiResponseMessage.text);
        await extractMemories(aiResponseMessage.text); // Non-critical path
      }

    } catch (error) {
      console.error('Error in message flow:', error);
      // Revert turn count if AI response failed? For MVP, maybe not critical.
      // await updateGameSessionState({ turn_count: turnCount }); 
      toast({
        title: "Error",
        description: "Failed to process message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return children({
    handleSendMessage,
    isProcessing: queueStatus === 'processing',
  });
};
