import React from 'react';
import { Card } from '../ui/card';
import { useParams, useSearchParams } from 'react-router-dom';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { VoiceHandler } from './VoiceHandler';
import { MemoryPanel } from './MemoryPanel';
import { MessageHandler } from './message/MessageHandler';
import { MemoryProvider } from '@/contexts/MemoryContext';
import { MessageProvider } from '@/contexts/MessageContext';

/**
 * GameContent Component
 * Main component for the game interface
 * Handles layout and component composition
 */
const GameContent: React.FC = () => {
  const { id: campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const characterId = searchParams.get('character');
  const sessionId = searchParams.get('session');

  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      <Card className="flex-1 bg-white/90 backdrop-blur-sm shadow-xl p-6">
        <h1 className="text-4xl text-center mb-6 text-primary">D&D Adventure</h1>
        <div className="flex flex-col">
          <MessageList />
          <div className="mt-4">
            <VoiceHandler />
            <MessageHandler
              sessionId={sessionId}
              campaignId={campaignId}
              characterId={characterId}
            >
              {({ handleSendMessage, isProcessing }) => (
                <ChatInput 
                  onSendMessage={handleSendMessage}
                  isDisabled={isProcessing}
                />
              )}
            </MessageHandler>
          </div>
        </div>
      </Card>
      <MemoryPanel />
    </div>
  );
};

export default GameContent;