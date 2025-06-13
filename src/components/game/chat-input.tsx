import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isDisabled: boolean;
}

/**
 * ChatInput Component
 * Handles user input for the game chat interface
 * 
 * @param onSendMessage - Callback function to handle message submission
 * @param isDisabled - Boolean to disable input during message processing
 */
export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isDisabled }) => {
  const [input, setInput] = useState('');

  /**
   * Handles message submission and clears input
   */
  const handleSubmit = () => {
    if (!input.trim() || isDisabled) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="What would you like to do?"
        className="w-full p-4 text-lg"
        disabled={isDisabled}
      />
      <Button 
        onClick={handleSubmit}
        disabled={isDisabled}
        className="w-full"
      >
        Send
      </Button>
    </div>
  );
};