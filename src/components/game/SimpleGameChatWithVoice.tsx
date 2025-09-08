/**
 * SimpleGameChatWithVoice Component
 * 
 * Wrapper that provides voice capabilities to SimpleGameChat
 * by providing a MessageContext and integrating VoiceHandler
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, LogOut } from 'lucide-react';
import { AIService, ChatMessage, GameContext } from '@/services/ai-service';
import { useSimpleGameSession } from '@/hooks/use-simple-game-session';
import { SimpleMessageProvider } from '@/contexts/SimpleMessageContext';
import { VoiceHandler } from './VoiceHandler';
import { toast } from 'sonner';

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
  const { session, loading: sessionLoading, endSession } = useSimpleGameSession(campaignId, characterId);
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
        sessionId: session.id,
        campaignId,
        characterId,
        campaignDetails,
        characterDetails,
      };

      console.log('🎭 Generating opening message for new session...');
      const response = await AIService.chatWithDM({
        message: '',
        context,
        conversationHistory: []
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
          console.warn('⚠️ Empty response text, using fallback');
        }
        
        const dmMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: displayText,
          timestamp: new Date(),
          narrationSegments: segments,
        };
        
        setMessages([dmMessage]);
      }
    } catch (error) {
      console.error('Failed to generate opening message:', error);
      toast.error('Failed to start adventure. Please try again.');
    }
  }, [session?.id, campaignId, characterId, campaignDetails, characterDetails]);

  /**
   * Load conversation history
   */
  const loadHistory = useCallback(async () => {
    if (!session?.id) return;

    setIsLoadingHistory(true);
    try {
      // TODO: Implement history loading from session
      console.log('📚 Loading conversation history for session:', session.id);
      
      // If no messages exist, generate an opening message
      if (messages.length === 0) {
        await generateOpeningMessage();
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session?.id, messages.length, generateOpeningMessage]);

  // Load history when session is available
  useEffect(() => {
    if (session?.id && !isLoadingHistory && messages.length === 0) {
      loadHistory();
    }
  }, [session?.id, loadHistory, isLoadingHistory, messages.length]);

  /**
   * Send message to DM
   */
  const sendMessage = useCallback(async (message: ChatMessage): Promise<void> => {
    if (!session?.id || isSending) return;

    const messageContent = typeof message === 'string' ? message : message.content;
    if (!messageContent.trim()) return;

    setIsSending(true);
    setStreamingMessage('');

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const context: GameContext = {
        sessionId: session.id,
        campaignId,
        characterId,
        campaignDetails,
        characterDetails,
      };

      console.log('🎭 Sending message to DM:', messageContent);
      const response = await AIService.chatWithDM({
        message: messageContent,
        context,
        conversationHistory: updatedMessages
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
          console.warn('⚠️ Empty response text, using fallback');
        }
        
        const dmMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: displayText,
          timestamp: new Date(),
          narrationSegments: segments,
        };

        setMessages(prev => [...prev, dmMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove user message on failure
      setMessages(messages);
    } finally {
      setIsSending(false);
      setStreamingMessage('');
    }
  }, [session?.id, messages, isSending, campaignId, characterId, campaignDetails, characterDetails]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
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
  }, [currentMessage, isSending, sendMessage]);

  /**
   * End game session
   */
  const handleEndSession = useCallback(async () => {
    if (!session) {
      console.warn('No session to end');
      navigate('/');
      return;
    }
    
    if (window.confirm('Are you sure you want to end this adventure? Your progress will be saved.')) {
      try {
        await endSession(session.id);
        toast.success('Adventure ended. Your progress has been saved.');
        navigate('/');
      } catch (error) {
        console.error('Failed to end session:', error);
        toast.error('Failed to end session properly, but navigating home.');
        navigate('/');
      }
    }
  }, [session, endSession, navigate]);

  // Loading state
  if (sessionLoading || isLoadingHistory) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-infinite-purple" />
          <p className="text-muted-foreground">Starting your adventure...</p>
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
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Adventure Chronicle</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndSession}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                End Adventure
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4 pb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-lg shadow-sm ${
                        message.role === 'user'
                          ? 'bg-infinite-purple text-white ml-4'
                          : 'bg-muted text-foreground mr-4'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                      <div
                        className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-infinite-purple-100' : 'text-muted-foreground'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming message */}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-4 rounded-lg shadow-sm bg-muted text-foreground mr-4">
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {streamingMessage}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs text-muted-foreground">DM is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {isSending && !streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-4 rounded-lg shadow-sm bg-muted text-foreground mr-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">The DM ponders your actions...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Voice Handler */}
            <div className="flex-shrink-0 border-t bg-card/50">
              <VoiceHandler />
            </div>

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