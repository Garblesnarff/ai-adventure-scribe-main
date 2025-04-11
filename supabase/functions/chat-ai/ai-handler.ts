import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { ChatMessage } from './types.ts';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

/**
 * Maps our application roles to Gemini API roles
 */
export function mapRole(role: string): string {
  switch (role) {
    case 'player':
      return 'user';
    case 'dm':
    case 'system':
      return 'model';
    default:
      return 'user';
  }
}

/**
 * Handles the chat request and generates AI responses
 */
export async function generateAIResponse(
  messages: ChatMessage[],
  memoryContext: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    // Prepare chat history with memory context
    const chatHistory = messages.map(msg => ({
      role: mapRole(msg.sender),
      parts: msg.text,
    }));
    
    // Add memory context to the system message
    if (memoryContext) {
      chatHistory.unshift({
        role: 'model',
        parts: `You are a Dungeon Master. Use this context to inform your responses:${memoryContext}`,
      });
    }

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(messages[messages.length - 1].text);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}