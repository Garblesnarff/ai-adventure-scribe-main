/**
 * SimpleGameChatWithVoice Component
 *
 * Wrapper that provides voice capabilities to SimpleGameChat
 * by providing a MessageContext and integrating VoiceHandler
 */

import { Send, Loader2, LogOut } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DMChatBubble } from './chat/DMChatBubble';

import type { ChatMessage, GameContext } from '@/services/ai-service';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleMessageProvider } from '@/contexts/SimpleMessageContext';
import { NarrationSegment } from '@/hooks/use-ai-response';
import { useSimpleGameSession } from '@/hooks/use-simple-game-session';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { AIService } from '@/services/ai-service';
import { handleAsyncError } from '@/utils/error-handler';

interface SimpleGameChatWithVoiceProps {
  campaignId: string;
  characterId: string;
  campaignDetails?: any;
  characterDetails?: any;
}

export const SimpleGameChatWithVoice: React.FC<SimpleGameChatWithVoiceProps> = ({
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
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
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
        sessionId: session.id,
        campaignId,
        characterId,
        campaignDetails,
        characterDetails,
      };

      logger.info('🎭 Generating opening message for new session...');
      const response = await AIService.chatWithDM({
        message: '',
        context,
        conversationHistory: [],
      });

      if (response) {
        // Validate response structure and ensure proper display text
        let displayText = '';
        let segments = undefined;

        if (typeof response === 'string') {
          displayText = response;
        } else if (response && typeof response === 'object') {
          // Cast to any to handle the dynamic AI service response structure
          const aiResponse = response as any;
          displayText = aiResponse.text || aiResponse.content || '';
          // AI service returns 'narration_segments' (snake_case)
          segments = aiResponse.narration_segments || aiResponse.narrationSegments;
        }

        // Fallback if no valid text found
        if (!displayText.trim()) {
          displayText = 'The DM begins your adventure...';
          logger.warn('⚠️ Empty response text, using fallback');
        }

        const dmMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: displayText,
          timestamp: new Date(),
          narrationSegments: segments as any[],
        };

        setMessages([dmMessage]);

        // Save opening message to database
        await saveMessageToDatabase(dmMessage, session.id);
      }
    } catch (error) {
      handleAsyncError(error, {
        userMessage: 'Failed to start adventure. Please try again.',
        context: {
          location: 'SimpleGameChatWithVoice.generateOpeningMessage',
          sessionId: session.id,
        },
      });
    }
  }, [session?.id, campaignId, characterId, campaignDetails, characterDetails]);

  /**
   * Load conversation history
   */
  const loadHistory = useCallback(async () => {
    if (!session?.id || hasLoadedHistory) return;

    setIsLoadingHistory(true);
    try {
      logger.info('📚 Loading conversation history for session:', session.id);

      // Load message history from dialogue_history table
      const { data: historyData, error: historyError } = await supabase
        .from('dialogue_history')
        .select('*')
        .eq('session_id', session.id)
        .order('sequence_number', { ascending: true });

      if (historyError) {
        logger.error('Error loading history:', historyError);
        throw historyError;
      }

      if (historyData && historyData.length > 0) {
        logger.info(`📚 Loaded ${historyData.length} messages from history`);

        // Convert database messages to ChatMessage format
        const loadedMessages: ChatMessage[] = historyData.map((msg: any) => ({
          id: msg.id,
          role:
            msg.speaker_type === 'dm'
              ? 'assistant'
              : msg.speaker_type === 'player'
                ? 'user'
                : 'assistant',
          content: msg.message,
          timestamp: new Date(msg.timestamp),
          // Note: Historical messages may not have narrationSegments
          narrationSegments: undefined,
        }));

        setMessages(loadedMessages);
        setHasLoadedHistory(true);
      } else {
        logger.info('📚 No message history found, generating opening message');
        // If no messages exist, generate an opening message
        await generateOpeningMessage();
        setHasLoadedHistory(true);
      }
    } catch (error) {
      handleAsyncError(error, {
        userMessage: 'Failed to load history',
        logLevel: 'warn',
        showToast: false,
        context: { location: 'SimpleGameChatWithVoice.loadHistory', sessionId: session.id },
      });
      // Fallback to generating opening message if history loading fails
      await generateOpeningMessage();
      setHasLoadedHistory(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session?.id, hasLoadedHistory, generateOpeningMessage]);

  // Load history when session is available and we haven't loaded it yet
  useEffect(() => {
    if (session?.id && !sessionLoading && !hasLoadedHistory && !isLoadingHistory) {
      loadHistory();
    }
  }, [session?.id, sessionLoading, hasLoadedHistory, isLoadingHistory, loadHistory]);

  /**
   * Save a message to the database
   */
  const saveMessageToDatabase = useCallback(async (message: ChatMessage, sessionId: string) => {
    try {
      const { error } = await supabase.from('dialogue_history').insert({
        session_id: sessionId,
        speaker_type:
          message.role === 'assistant' ? 'dm' : message.role === 'user' ? 'player' : 'system',
        message: message.content,
        timestamp: message.timestamp.toISOString(),
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      handleAsyncError(error, {
        userMessage: 'Failed to save message',
        logLevel: 'warn',
        showToast: false,
        context: { location: 'SimpleGameChatWithVoice.saveMessageToDatabase', sessionId },
      });
      // Don't throw here to avoid breaking the UI flow
    }
  }, []);

  /**
   * Send message to DM
   */
  const sendMessage = useCallback(
    async (message: ChatMessage): Promise<void> => {
      if (!session?.id || isSending) return;

      const messageContent = typeof message === 'string' ? message : message.content;
      if (!messageContent.trim()) return;

      setIsSending(true);

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageContent,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Save user message to database
      await saveMessageToDatabase(userMessage, session.id);

      try {
        const context: GameContext = {
          sessionId: session.id,
          campaignId,
          characterId,
          campaignDetails,
          characterDetails,
        };

        logger.info('🎭 Sending message to DM:', messageContent);
        const response = await AIService.chatWithDM({
          message: messageContent,
          context,
          conversationHistory: updatedMessages,
        });

        if (response) {
          // Validate response structure and ensure proper display text
          let displayText = '';
          let segments = undefined;

          if (typeof response === 'string') {
            displayText = response;
          } else if (response && typeof response === 'object') {
            // Cast to any to handle the dynamic AI service response structure
            const aiResponse = response as any;
            displayText = aiResponse.text || aiResponse.content || '';
            // AI service returns 'narration_segments' (snake_case)
            segments = aiResponse.narration_segments || aiResponse.narrationSegments;
          }

          // Fallback if no valid text found
          if (!displayText.trim()) {
            displayText = 'The DM responds to your action...';
            logger.warn('⚠️ Empty response text, using fallback');
          }

          const dmMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: displayText,
            timestamp: new Date(),
            narrationSegments: segments as any[],
          };

          setMessages((prev) => [...prev, dmMessage]);

          // Save DM message to database
          await saveMessageToDatabase(dmMessage, session.id);
        }
      } catch (error) {
        handleAsyncError(error, {
          userMessage: 'Failed to send message. Please try again.',
          context: {
            location: 'SimpleGameChatWithVoice.sendMessage',
            sessionId: session.id,
            messageContent: message.content.substring(0, 50),
          },
        });

        // Remove user message on failure
        setMessages(messages);
      } finally {
        setIsSending(false);
      }
    },
    [session?.id, messages, isSending, campaignId, characterId, campaignDetails, characterDetails],
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (currentMessage.trim() && !isSending) {
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: currentMessage.trim(),
          timestamp: new Date(),
        };
        sendMessage(message);
        setCurrentMessage('');
      }
    },
    [currentMessage, isSending, sendMessage],
  );

  /**
   * End game session
   */
  const handleEndSession = useCallback(async () => {
    if (!session) {
      logger.warn('No session to end');
      navigate('/');
      return;
    }

    if (
      window.confirm('Are you sure you want to end this adventure? Your progress will be saved.')
    ) {
      try {
        await endSession(session.id);
        toast.success('Adventure ended. Your progress has been saved.');
        navigate('/');
      } catch (error) {
        handleAsyncError(error, {
          userMessage: 'Failed to end session properly, but navigating home.',
          context: { location: 'SimpleGameChatWithVoice.handleEndSession', sessionId: session.id },
        });
        navigate('/');
      }
    }
  }, [session, endSession, navigate]);

  // Loading state - only show loading if we're actually loading something
  if (sessionLoading || (isLoadingHistory && !hasLoadedHistory)) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-infinite-purple" />
          <p className="text-muted-foreground">
            {sessionLoading ? 'Starting your adventure...' : 'Loading your story...'}
          </p>
        </div>
      </Card>
    );
  }

  // Error state
  if (!session) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to start game session.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <SimpleMessageProvider
      messages={messages}
      isLoading={isSending}
      sendMessage={sendMessage}
      queueStatus={isSending ? 'processing' : 'idle'}
    >
      <div className="space-y-4">
        <Card className="h-[600px] flex flex-col relative">
          <CardHeader className="flex-shrink-0 p-4 pb-0">
            <h3 className="text-lg font-semibold text-foreground opacity-80">
              Adventure Chronicle
            </h3>
          </CardHeader>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndSession}
            className="absolute top-3 right-3 text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" />
          </Button>

          <CardContent className="flex-1 flex flex-col overflow-hidden p-0 pt-2">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4 pb-4">
                {messages.map((message, index) =>
                  message.role === 'assistant' ? (
                    <DMChatBubble
                      key={index}
                      message={message}
                      narrationSegments={message.narrationSegments as any}
                    />
                  ) : (
                    <div key={index} className="flex justify-end">
                      <div className="max-w-[80%] p-4 rounded-lg shadow-sm bg-infinite-purple text-white ml-4">
                        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                        <div className="text-xs mt-2 text-infinite-purple-100">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {/* Loading indicator */}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-4 rounded-lg shadow-sm bg-muted text-foreground mr-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">
                          The DM ponders your actions...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex-shrink-0 p-6 border-t bg-card">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Describe your actions..."
                  disabled={isSending}
                  className="flex-1"
                  maxLength={500}
                />
                <Button
                  type="submit"
                  disabled={isSending || !currentMessage.trim()}
                  size="sm"
                  className="px-4"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
                <span>Press Enter to send • Shift+Enter for new line</span>
                <span>{currentMessage.length}/500</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleMessageProvider>
  );
};
