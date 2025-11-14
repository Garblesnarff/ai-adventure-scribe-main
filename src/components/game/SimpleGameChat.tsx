import { Send, Loader2, LogOut } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { ChatMessage, GameContext } from '@/services/ai-service';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSimpleGameSession } from '@/hooks/use-simple-game-session';
import logger from '@/lib/logger';
import { AIService } from '@/services/ai-service';
import { handleAsyncError } from '@/utils/error-handler';

interface SimpleGameChatProps {
  campaignId: string;
  characterId: string;
  campaignDetails?: any;
  characterDetails?: any;
}

export const SimpleGameChat: React.FC<SimpleGameChatProps> = ({
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Generate an opening message for a new session
   */
  const generateOpeningMessage = useCallback(async () => {
    if (!session?.id) return;

    try {
      const context: GameContext = {
        campaignId,
        characterId,
        sessionId: session.id,
        campaignDetails,
        characterDetails,
      };

      // Generate the opening message
      const openingContent = await AIService.generateOpeningMessage({ context });

      // Create the DM message
      const dmMessage: ChatMessage = {
        id: `dm-opening-${Date.now()}`,
        role: 'assistant',
        content: openingContent,
        timestamp: new Date(),
      };

      // Save to database
      await AIService.saveChatMessage({
        sessionId: session.id,
        role: 'assistant',
        content: openingContent,
      });

      // Add to UI
      setMessages([dmMessage]);

      logger.info('Opening message generated and saved');
    } catch (error) {
      handleAsyncError(error, {
        userMessage: 'Failed to generate opening message',
        context: { location: 'SimpleGameChat.generateOpeningMessage', sessionId: session.id },
      });
    }
  }, [session?.id, campaignId, characterId, campaignDetails, characterDetails]);

  const loadConversationHistory = useCallback(async () => {
    if (!session?.id) return;

    setIsLoadingHistory(true);
    try {
      const history = await AIService.getConversationHistory(session.id);
      setMessages(history);

      // If this is a new session with no messages, generate an opening message
      if (history.length === 0) {
        await generateOpeningMessage();
      }
    } catch (error) {
      handleAsyncError(error, {
        userMessage: 'Failed to load conversation history',
        context: { location: 'SimpleGameChat.loadConversationHistory', sessionId: session.id },
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session?.id, generateOpeningMessage]);

  // Load conversation history when session is available
  useEffect(() => {
    if (session?.id) {
      loadConversationHistory();
    }
  }, [session?.id, loadConversationHistory]);

  /**
   * Handle ending the current session
   */
  const handleEndSession = async () => {
    if (!session?.id) return;

    try {
      // Generate a session summary based on the conversation
      const conversationSummary =
        messages.length > 0
          ? `Session concluded with ${messages.length} messages exchanged.`
          : 'Session ended without gameplay.';

      await endSession(session.id, conversationSummary);

      toast.success('Session ended successfully!', {
        description: 'Your progress has been saved.',
      });

      // Navigate back to campaign page
      navigate(`/campaign/${campaignId}`);
    } catch (error) {
      handleAsyncError(error, {
        userMessage: 'Failed to end session properly',
        context: { location: 'SimpleGameChat.handleEndSession', sessionId: session.id, campaignId },
      });
    }
  };

  const sendMessage = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!currentMessage.trim() || !session?.id || isSending) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsSending(true);

    try {
      // Save user message to database
      await AIService.saveChatMessage({
        sessionId: session.id,
        role: 'user',
        content: userMessage.content,
        speakerId: characterId,
      });

      // Get AI response with streaming
      const context: GameContext = {
        campaignId,
        characterId,
        sessionId: session.id,
        campaignDetails,
        characterDetails,
      };

      setStreamingMessage(''); // Reset streaming message

      const aiResponse = await AIService.chatWithDM({
        message: userMessage.content,
        context,
        conversationHistory: messages,
        onStream: (chunk: string) => {
          setStreamingMessage((prev) => prev + chunk);
        },
      });

      // Save AI response to database
      await AIService.saveChatMessage({
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse,
      });

      // Add AI response to UI
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Determine user-friendly message based on error type
      let userMessage = 'Failed to send message. Please try again.';
      let description: string | undefined;

      if (errorMessage.includes('Rate limit exceeded')) {
        userMessage = 'Rate limit exceeded. Please wait before sending another message.';
        description =
          "You've hit the daily or per-minute API limit. Check the API Stats for details.";
      } else if (errorMessage.includes('all AI services unavailable')) {
        userMessage = 'AI services are currently unavailable';
        description = 'Both Edge Functions and local API failed. Please try again later.';
      }

      handleAsyncError(error, {
        userMessage,
        context: {
          location: 'SimpleGameChat.sendMessage',
          sessionId: session.id,
          messageContent: userMessage.content.substring(0, 50),
        },
        onError: () => {
          // Show custom description if needed
          if (description) {
            toast.error(userMessage, { description, duration: 5000 });
          }
        },
      });

      // Remove the user message from UI on error
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
    } finally {
      setStreamingMessage(''); // Clear streaming message
      setIsSending(false);
    }
  };

  // Helper: extract short choices from DM message text (lines starting with A. B. C. or 1.)
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const stats = AIService.getApiStats();
                logger.info('API Stats:', stats);

                const rateLimits = stats.rateLimits;
                if (rateLimits) {
                  toast.success('API Stats', {
                    description: `Daily: ${rateLimits.remainingDaily}/${rateLimits.dailyLimit} | Minute: ${rateLimits.remainingMinutely}/${rateLimits.minutelyLimit}`,
                    duration: 4000,
                  });
                } else {
                  toast.success('API stats logged to console');
                }
              }}
            >
              API Stats
            </Button>
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

                          {/* Render choices if present */}
                          {choices.length > 0 && (
                            <div className="choice-list" role="list">
                              {choices.map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className={`choice-btn`}
                                  onClick={() => setCurrentMessage(c)}
                                  onDoubleClick={async () => {
                                    setCurrentMessage(c);
                                    setTimeout(() => {
                                      const fakeEvent = {
                                        preventDefault() {},
                                      } as unknown as React.FormEvent;
                                      sendMessage(fakeEvent);
                                    }, 80);
                                  }}
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
