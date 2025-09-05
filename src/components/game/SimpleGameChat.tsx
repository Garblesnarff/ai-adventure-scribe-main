import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, LogOut } from 'lucide-react';
import { AIService, ChatMessage, GameContext } from '@/services/ai-service';
import { useSimpleGameSession } from '@/hooks/use-simple-game-session';
import { toast } from 'sonner';

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
      
      console.log('Opening message generated and saved');
    } catch (error) {
      console.error('Failed to generate opening message:', error);
      toast.error('Failed to generate opening message');
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
      console.error('Failed to load conversation history:', error);
      toast.error('Failed to load conversation history');
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
      const conversationSummary = messages.length > 0 
        ? `Session concluded with ${messages.length} messages exchanged.` 
        : 'Session ended without gameplay.';

      await endSession(session.id, conversationSummary);
      
      toast.success('Session ended successfully!', {
        description: 'Your progress has been saved.',
      });

      // Navigate back to campaign page
      navigate(`/campaign/${campaignId}`);
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session properly');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentMessage.trim() || !session?.id || isSending) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
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
          setStreamingMessage(prev => prev + chunk);
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

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Rate limit exceeded')) {
        toast.error('Rate limit exceeded. Please wait before sending another message.', {
          description: 'You\'ve hit the daily or per-minute API limit. Check the API Stats for details.',
          duration: 5000,
        });
      } else if (errorMessage.includes('all AI services unavailable')) {
        toast.error('AI services are currently unavailable', {
          description: 'Both Edge Functions and local API failed. Please try again later.',
          duration: 5000,
        });
      } else {
        toast.error('Failed to send message. Please try again.');
      }
      
      // Remove the user message from UI on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setStreamingMessage(''); // Clear streaming message
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
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
    <Card className="h-full flex flex-col">
      <CardHeader>
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
                console.log('API Stats:', stats);
                
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
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEndSession}
              disabled={isSending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              End Session
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
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
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-muted mr-4'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {message.role === 'user' ? 'You' : 'Dungeon Master'}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 mr-4 max-w-[80%]">
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
        
        <div className="border-t p-4">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="What do you do next?"
              disabled={isSending || !session}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!currentMessage.trim() || isSending || !session}
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};