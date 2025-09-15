/**
 * OpenRouter API Service
 * 
 * Handles communication with OpenRouter API for image generation
 * using Gemini 2.5 Flash Image Preview model with free tier fallback.
 * 
 * @author AI Dungeon Master Team
 */

import { supabase } from '@/integrations/supabase/client';
import { modelUsageTracker } from './model-usage-tracker';

interface OpenRouterImageResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: Array<{
        type: string;
        image?: string; // base64 encoded image data
        text?: string;
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  referenceImage?: string; // base64 encoded image to use as reference
}

interface ModelConfig {
  id: string;
  dailyLimit?: number;
  isFree: boolean;
}

/**
 * Service class for OpenRouter API integration
 */
export class OpenRouterService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  
  // Model configurations with free tier support (1000 requests/day with $10+ credits)
  private models: ModelConfig[] = [
    {
      id: 'google/gemini-2.5-flash-image-preview:free',
      dailyLimit: 1000, // Free tier: 1000 requests per day with $10+ credits
      isFree: true
    },
    {
      id: 'google/gemini-2.5-flash-image-preview',
      isFree: false // Paid Gemini model as fallback when free tier exhausted
    }
  ];

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required. Please set VITE_OPENROUTER_API_KEY in your environment.');
    }
  }

  /**
   * Select the best available model based on free tier limits
   * @returns Model configuration to use
   */
  private selectAvailableModel(): ModelConfig {
    // Try free models first (1000 requests/day with $10+ credits)
    for (const model of this.models.filter(m => m.isFree)) {
      if (model.dailyLimit && modelUsageTracker.canUseModel(model.id, model.dailyLimit)) {
        const remaining = modelUsageTracker.getRemainingUsage(model.id, model.dailyLimit);
        console.log(`Using free model: ${model.id} (${remaining}/${model.dailyLimit} free requests remaining today)`);
        return model;
      }
    }

    // Fall back to paid models
    const paidModel = this.models.find(m => !m.isFree);
    if (paidModel) {
      console.log(`Free tier exhausted, using paid model: ${paidModel.id}`);
      return paidModel;
    }

    // Fallback to first model if none available
    console.warn('No suitable model found, using first available model');
    return this.models[0];
  }

  /**
   * Get usage statistics for free tier models
   * @returns Object containing usage stats for all free models
   */
  getUsageStats(): { [modelId: string]: { used: number; limit: number; remaining: number } } {
    const stats: { [modelId: string]: { used: number; limit: number; remaining: number } } = {};
    
    for (const model of this.models.filter(m => m.isFree && m.dailyLimit)) {
      stats[model.id] = modelUsageTracker.getUsageStats(model.id, model.dailyLimit!);
    }
    
    return stats;
  }

  /**
   * Generate an image using Gemini 2.5 Flash Image Preview with free tier fallback
   * @param request - Image generation request parameters
   * @returns Promise resolving to base64 encoded image data
   */
  async generateImage(request: ImageGenerationRequest): Promise<string> {
    const { prompt, referenceImage } = request;
    const selectedModel = this.selectAvailableModel();

    try {
      // Build message content based on whether we have a reference image
      let messageContent;

      if (referenceImage) {
        // Multimodal request with reference image and text prompt
        messageContent = [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${referenceImage}`
            }
          }
        ];
      } else {
        // Text-only request
        messageContent = prompt;
      }

      const requestBody = {
        model: selectedModel.id,
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        modalities: ['image', 'text'],
        max_tokens: 2048,
        temperature: 0.7,
      };

      console.log('OpenRouter request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Adventure Scribe',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check if it's a rate limit error for free tier
        if (response.status === 429 && selectedModel.isFree) {
          console.warn(`Free tier rate limit exceeded for ${selectedModel.id}, trying paid Gemini model`);
          
          // Try with paid Gemini model specifically
          const paidGeminiModel = this.models.find(m =>
            m.id === 'google/gemini-2.5-flash-image-preview' && !m.isFree
          );
          if (paidGeminiModel) {
            return this.generateImageWithModel(prompt, paidGeminiModel, referenceImage);
          }
        }
        
        // Check if it's a 404 error (model not found) - try paid Gemini model
        if (response.status === 404) {
          console.warn(`Model ${selectedModel.id} not found (404), trying paid Gemini model`);

          // Try the paid version of the same model
          const paidGeminiModel = this.models.find(m =>
            m.id === 'google/gemini-2.5-flash-image-preview' && !m.isFree
          );

          if (paidGeminiModel && paidGeminiModel.id !== selectedModel.id) {
            console.log(`Trying paid Gemini model: ${paidGeminiModel.id}`);
            return await this.generateImageWithModel(prompt, paidGeminiModel, referenceImage);
          }
        }
        
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data: OpenRouterImageResponse = await response.json();
      
      // Debug: Log the full response structure
      console.log('Full OpenRouter API response:', JSON.stringify(data, null, 2));

      if (!data.choices || data.choices.length === 0) {
        console.error('No choices in response:', data);
        throw new Error('No image generated in API response');
      }

      const choice = data.choices[0];
      console.log('Choice structure:', JSON.stringify(choice, null, 2));
      
      if (!choice.message) {
        console.error('No message in choice:', choice);
        throw new Error('Invalid response format from OpenRouter API - no message');
      }

      // Check for image in different possible locations
      let imageData = null;

      console.log('Looking for image data in response...');
      
      // Method 1: Check if message has an images array (Gemini format)
      if (choice.message.images && choice.message.images.length > 0) {
        console.log('Found images array:', choice.message.images);
        const imageObj = choice.message.images[0];
        if (imageObj.image_url?.url) {
          imageData = imageObj.image_url.url;
          console.log('Found image in image_url.url:', imageData.substring(0, 50) + '...');
        } else if (imageObj.url) {
          imageData = imageObj.url;
          console.log('Found image in url:', imageData.substring(0, 50) + '...');
        }
      }
      
      // Method 2: Check if message.content is array with image content
      else if (Array.isArray(choice.message.content)) {
        console.log('message.content is array:', choice.message.content);
        const imageContent = choice.message.content.find(
          (content) => content.type === 'image'
        );
        if (imageContent) {
          console.log('Found image content:', imageContent);
          if (imageContent.image) {
            imageData = imageContent.image;
          } else if (imageContent.image_url) {
            imageData = imageContent.image_url;
          } else if (imageContent.data) {
            imageData = imageContent.data;
          }
        }
      }
      
      // Method 3: Check if message.content is a string with image data
      else if (typeof choice.message.content === 'string') {
        console.log('message.content is string, checking if it contains image data...');
        if (choice.message.content.startsWith('data:image/')) {
          imageData = choice.message.content;
          console.log('Found image data in content string');
        }
      }
      
      // Method 4: Check direct message properties
      if (!imageData && choice.message.image) {
        console.log('Found image in message.image');
        imageData = choice.message.image;
      }
      
      if (!imageData && choice.message.image_url) {
        console.log('Found image in message.image_url');
        imageData = choice.message.image_url;
      }

      if (!imageData) {
        console.error('No image data found in any expected location');
        console.error('Available message properties:', Object.keys(choice.message));
        throw new Error('No image data found in API response');
      }
      
      console.log('Successfully found image data, type:', typeof imageData);

      // Extract base64 data if it's a data URL
      if (imageData.startsWith('data:image/')) {
        const base64Index = imageData.indexOf('base64,');
        if (base64Index !== -1) {
          imageData = imageData.substring(base64Index + 7);
        }
      }

      // Record successful usage for free tier models
      if (selectedModel.isFree && selectedModel.dailyLimit) {
        modelUsageTracker.recordUsage(selectedModel.id, selectedModel.dailyLimit);
      }

      return imageData;
    } catch (error) {
      console.error('Error generating image with OpenRouter:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image with a specific model (used for fallback)
   * @param prompt - Image generation prompt
   * @param model - Specific model to use
   * @param referenceImage - Optional reference image as base64
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateImageWithModel(prompt: string, model: ModelConfig, referenceImage?: string): Promise<string> {
    try {
      // Build message content based on whether we have a reference image
      let messageContent;

      if (referenceImage) {
        // Multimodal request with reference image and text prompt
        messageContent = [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${referenceImage}`
            }
          }
        ];
      } else {
        // Text-only request
        messageContent = prompt;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Adventure Scribe',
        },
        body: JSON.stringify({
          model: model.id,
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          modalities: ['image', 'text'],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data: OpenRouterImageResponse = await response.json();
      
      // Debug: Log the full response structure
      console.log('Full OpenRouter API response:', JSON.stringify(data, null, 2));

      if (!data.choices || data.choices.length === 0) {
        console.error('No choices in response:', data);
        throw new Error('No image generated in API response');
      }

      const choice = data.choices[0];
      console.log('Choice structure:', JSON.stringify(choice, null, 2));
      
      if (!choice.message) {
        console.error('No message in choice:', choice);
        throw new Error('Invalid response format from OpenRouter API - no message');
      }

      // Check for image in different possible locations
      let imageData = null;

      console.log('Looking for image data in response...');
      
      // Method 1: Check if message has an images array (Gemini format)
      if (choice.message.images && choice.message.images.length > 0) {
        console.log('Found images array:', choice.message.images);
        const imageObj = choice.message.images[0];
        if (imageObj.image_url?.url) {
          imageData = imageObj.image_url.url;
          console.log('Found image in image_url.url:', imageData.substring(0, 50) + '...');
        } else if (imageObj.url) {
          imageData = imageObj.url;
          console.log('Found image in url:', imageData.substring(0, 50) + '...');
        }
      }
      
      // Method 2: Check if message.content is array with image content
      else if (Array.isArray(choice.message.content)) {
        console.log('message.content is array:', choice.message.content);
        const imageContent = choice.message.content.find(
          (content) => content.type === 'image'
        );
        if (imageContent) {
          console.log('Found image content:', imageContent);
          if (imageContent.image) {
            imageData = imageContent.image;
          } else if (imageContent.image_url) {
            imageData = imageContent.image_url;
          } else if (imageContent.data) {
            imageData = imageContent.data;
          }
        }
      }
      
      // Method 3: Check if message.content is a string with image data
      else if (typeof choice.message.content === 'string') {
        console.log('message.content is string, checking if it contains image data...');
        if (choice.message.content.startsWith('data:image/')) {
          imageData = choice.message.content;
          console.log('Found image data in content string');
        }
      }
      
      // Method 4: Check direct message properties
      if (!imageData && choice.message.image) {
        console.log('Found image in message.image');
        imageData = choice.message.image;
      }
      
      if (!imageData && choice.message.image_url) {
        console.log('Found image in message.image_url');
        imageData = choice.message.image_url;
      }

      if (!imageData) {
        console.error('No image data found in any expected location');
        console.error('Available message properties:', Object.keys(choice.message));
        throw new Error('No image data found in API response');
      }
      
      console.log('Successfully found image data, type:', typeof imageData);

      // Extract base64 data if it's a data URL
      if (imageData.startsWith('data:image/')) {
        const base64Index = imageData.indexOf('base64,');
        if (base64Index !== -1) {
          imageData = imageData.substring(base64Index + 7);
        }
      }

      // Record successful usage for free tier models
      if (model.isFree && model.dailyLimit) {
        modelUsageTracker.recordUsage(model.id, model.dailyLimit);
      }

      return imageData;
    } catch (error) {
      console.error('Error generating image with specific model:', error);
      throw error;
    }
  }

  /**
   * Convert base64 image data to a blob URL for display
   * @param base64Data - Base64 encoded image data
   * @returns Blob URL for the image
   */
  convertBase64ToBlobUrl(base64Data: string): string {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to binary
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and return URL
    const blob = new Blob([bytes], { type: 'image/png' });
    return URL.createObjectURL(blob);
  }

  /**
   * Upload base64 image to Supabase storage and return public URL
   * @param base64Data - Base64 encoded image data (without data URL prefix)
   * @returns Public URL for the uploaded image
   */
  async uploadImage(base64Data: string): Promise<string> {
    try {
      // Ensure we have clean base64 data
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Convert base64 to blob
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      
      // Generate unique filename
      const fileName = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('campaign-images')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading to Supabase storage:', error);
        console.log('Falling back to data URL due to storage upload failure');
        // Fallback to data URL if upload fails
        return `data:image/png;base64,${cleanBase64}`;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(data.path);
      
      console.log('Successfully uploaded image to Supabase storage:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      // Fallback to data URL if anything fails
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      return `data:image/png;base64,${cleanBase64}`;
    }
  }
}

// Export singleton instance
export const openRouterService = new OpenRouterService();