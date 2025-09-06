/**
 * OpenRouter API Service
 * 
 * Handles communication with OpenRouter API for image generation
 * using Gemini 2.5 Flash Image Preview model.
 * 
 * @author AI Dungeon Master Team
 */

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
}

/**
 * Service class for OpenRouter API integration
 */
export class OpenRouterService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private defaultModel = 'google/gemini-2.5-flash-image-preview';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required. Please set VITE_OPENROUTER_API_KEY in your environment.');
    }
  }

  /**
   * Generate an image using Gemini 2.5 Flash Image Preview
   * @param request - Image generation request parameters
   * @returns Promise resolving to base64 encoded image data
   */
  async generateImage(request: ImageGenerationRequest): Promise<string> {
    const { prompt, model = this.defaultModel } = request;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Adventure Scribe',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt
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

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No image generated in API response');
      }

      const choice = data.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      // Check for image in different possible locations
      let imageData = null;

      // Check if message has an images array (actual format from Gemini)
      if (choice.message.images && choice.message.images.length > 0) {
        const imageObj = choice.message.images[0];
        if (imageObj.image_url?.url) {
          imageData = imageObj.image_url.url;
        }
      }
      // Check if message.content is array with image content
      else if (Array.isArray(choice.message.content)) {
        const imageContent = choice.message.content.find(
          (content) => content.type === 'image' && content.image
        );
        imageData = imageContent?.image;
      }

      if (!imageData) {
        throw new Error('No image data found in API response');
      }

      // Extract base64 data if it's a data URL
      if (imageData.startsWith('data:image/')) {
        const base64Index = imageData.indexOf('base64,');
        if (base64Index !== -1) {
          imageData = imageData.substring(base64Index + 7);
        }
      }

      return imageData;
    } catch (error) {
      console.error('Error generating image with OpenRouter:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Upload base64 image to a storage service and return URL
   * For now, this converts to blob URL. In production, you might want to upload to Supabase storage.
   * @param base64Data - Base64 encoded image data (without data URL prefix)
   * @returns URL for the uploaded image
   */
  async uploadImage(base64Data: string): Promise<string> {
    // For now, just convert to data URL for immediate use
    // In production, you might want to upload to Supabase storage
    
    // Ensure we have clean base64 data
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Return as data URL for immediate use in image src attributes
    return `data:image/png;base64,${cleanBase64}`;
  }
}

// Export singleton instance
export const openRouterService = new OpenRouterService();