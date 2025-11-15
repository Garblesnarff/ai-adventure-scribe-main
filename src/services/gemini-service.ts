import { getGeminiApiManager } from './gemini-api-manager-singleton';

import type { GoogleGenerativeAI } from '@google/generative-ai';

import logger from '@/lib/logger';

/**
 * Gemini Service Wrapper
 *
 * Provides a simple interface for text generation using the Gemini API Manager
 * for key rotation and error handling.
 *
 * @author AI Dungeon Master Team
 */

const geminiManager = getGeminiApiManager();

export const geminiService = {
  /**
   * Generate text using Gemini AI
   * @param options - Generation options
   * @returns Generated text
   */
  async generateText(options: {
    prompt: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    try {
      const result = await geminiManager.executeWithRotation(async (genAI: GoogleGenerativeAI) => {
        const model = genAI.getGenerativeModel({
          model: options.model,
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
          },
        });
        const response = await model.generateContent(options.prompt);
        const text = await response.response.text();
        return text;
      });
      return result;
    } catch (error) {
      logger.error('Gemini service generation failed:', error);
      throw error;
    }
  },
};
