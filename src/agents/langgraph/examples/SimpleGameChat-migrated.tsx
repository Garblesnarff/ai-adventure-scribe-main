/**
 * SimpleGameChat - LangGraph Migration Example
 *
 * This is an example of how to migrate SimpleGameChat.tsx from
 * the legacy AIService to the new LangGraph-based DMService.
 *
 * Key changes:
 * 1. Replace AIService.chatWithDM with useDMService hook
 * 2. Remove manual state management (messages handled by DMService)
 * 3. Simplify conversation history loading
 * 4. Better streaming support
 *
 * @module examples
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, LogOut } from 'lucide-react';
import { useSimpleGameSession } from '@/hooks/use-simple-game-session';
import { useDMService } from '@/hooks/use-dm-service';
import { toast } from 'sonner';
import logger from '@/lib/logger';

interface SimpleGameChatProps {
  campaignId: string;
  characterId: string;
  campaignDetails?: any;
  characterDetails?: any;
}

/**
 * Migrated SimpleGameChat using LangGraph DMService
 *
 * CHANGES FROM ORIGINAL:
 * ----------------------
 * 1. Removed: useState for messages (now in useDMService)
 * 2. Removed: Manual conversation history loading
 * 3. Removed: AIService.chatWithDM calls
 * 4. Added: useDMService hook
 * 5. Simplified: Streaming implementation
 * 6. Improved: Error handling via hook
 */
export const SimpleGameChatMigrated: React.FC<SimpleGameChatProps> = ({
  campaignId,
  characterId,
  campaignDetails,
  characterDetails,
}) => {
  const {
    session,
    loading: sessionLoading,
    endSession,
  } = useSimpleGameSession(campaignId, characterId);
  const [currentMessage, setCurrentMessage] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // NEW: Use DMService hook instead of manual state management
  const {
    sendMessage: sendDMMessage,
    isSending,
    messages,
    isLoadingHistory,
  } = useDMService({
    sessionId: session?.id || '',
    context: {
      campaignId,
      characterId,
      sessionId: session?.id || '',
      campaignDetails,
      characterDetails,
    },
    onStream: (chunk: string) => {
      setStreamingMessage((prev) => prev + chunk);
    },
    onError: (error) => {
      // Custom error handling if needed
      if (error.message.includes('Rate limit')) {
        toast.error('Rate limit exceeded', {
          description: 'Please wait before sending another message.',
        });
      }
    },
  });

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  /**
   * Handle ending the current session
   */
  const handleEndSession = async () => {
    if (!session?.id) return;

    try {
      const conversationSummary =
        messages.length > 0
          ? `Session concluded with ${messages.length} messages exchanged.`
          : 'Session ended without gameplay.';

      await endSession(session.id, conversationSummary);

      toast.success('Session ended successfully!', {
        description: 'Your progress has been saved.',
      });

      navigate(`/campaign/${campaignId}`);
    } catch (error) {
      logger.error('[SimpleGameChat] Failed to end session:', error);
      toast.error('Failed to end session properly');
    }
  };

  /**
   * Send message handler - SIMPLIFIED with DMService
   */
  const sendMessage = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!currentMessage.trim() || !session?.id || isSending) return;

    const messageContent = currentMessage.trim();
    setCurrentMessage('');
    setStreamingMessage(''); // Reset streaming

    try {
      // NEW: Single call to DMService - handles everything
      await sendDMMessage(messageContent);

      logger.info('[SimpleGameChat] Message sent successfully');
    } catch (error) {
      // Error already handled by useDMService hook
      logger.error('[SimpleGameChat] Error sending message:', error);
    }
  };

  // Helper: extract short choices from DM message text
  const extractChoices = (text: string) => {
    const lines = text.split('\n');
    const choices: string[] = [];
    lines.forEach((line) => {
      const m = line.trim().match(/^([A-D]|\d+)\.\s*(.+)/);
      if (m) choices.push(m[2].trim());
    });
    return choices;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  if (sessionLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Setting up your adventure...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col parchment">
      <CardHeader className="parchment-panel">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Adventure Chat</span>
            {session && (
              <span className="text-sm font-normal text-muted-foreground">
                Session #{session.session_number}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleEndSession} disabled={isSending}>
              <LogOut className="w-4 h-4 mr-2" />
              End Session
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="parchment-panel flex-1 overflow-hidden">
          <ScrollArea className="flex-1 p-4 chat-scroll">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading conversation...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Welcome to your adventure! What would you like to do?</p>
                  </div>
                )}

                {/* SIMPLIFIED: Messages come from hook, no manual state management */}
                {messages.map((message) => {
                  const choices = message.role !== 'user' ? extractChoices(message.content) : [];

                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}
                      >
                        {message.role !== 'user' && (
                          <div className="flex-shrink-0 mr-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium avatar-dm">
                              DM
                            </div>
                          </div>
                        )}

                        <div
                          className={`rounded-lg px-5 py-3 message-bubble ${message.role === 'user' ? 'player-bubble ml-4' : 'dm-bubble mr-4'}`}
                        >
                          <div className="text-sm font-medium mb-1">
                            {message.role === 'user' ? 'You' : 'Dungeon Master'}
                          </div>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className="text-xs opacity-70 mt-2 message-meta">
                            {message.timestamp.toLocaleTimeString?.()}
                          </div>

                          {choices.length > 0 && (
                            <div className="choice-list" role="list">
                              {choices.map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="choice-btn"
                                  onClick={() => setCurrentMessage(c)}
                                  aria-label={`Choose ${c}`}
                                >
                                  {String.fromCharCode(65 + i)}. {c}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* IMPROVED: Streaming message display */}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-lg px-5 py-3 dm-bubble mr-4 max-w-[80%]">
                      <div className="text-sm font-medium mb-1">Dungeon Master</div>
                      {streamingMessage ? (
                        <div className="whitespace-pre-wrap">
                          {streamingMessage}
                          <span className="animate-pulse">|</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="border-t p-4 chat-composer">
          <form onSubmit={sendMessage} className="flex space-x-2 items-center">
            <Input
              aria-label="Chat input"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your action or intent..."
              disabled={isSending || !session}
              className="flex-1 bg-transparent"
            />
            <Button
              type="submit"
              disabled={!currentMessage.trim() || isSending || !session}
              className="px-3"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
