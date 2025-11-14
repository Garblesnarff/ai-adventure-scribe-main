/**
 * ElevenLabs Client
 *
 * Client for ElevenLabs Text-to-Speech API.
 * Used for generating immersive voice narration for DM responses.
 *
 * Environment variables:
 * - VITE_ELEVENLABS_API_KEY: ElevenLabs API key
 */

import type { TTSRequest, VoiceSettings } from './types';

import logger from '@/lib/logger';

export class ElevenLabsClient {
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private readonly defaultModel = 'eleven_turbo_v2_5';

  /**
   * Get API key from environment
   */
  private getApiKey(): string {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
    return apiKey;
  }

  /**
   * Generate speech audio from text
   */
  async generateSpeech(request: TTSRequest): Promise<Blob> {
    try {
      const apiKey = this.getApiKey();

      logger.debug(
        `[ElevenLabsClient] Generating speech for voice ${request.voiceId} (${request.text.length} chars)`,
      );

      const response = await fetch(`${this.baseUrl}/text-to-speech/${request.voiceId}`, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.modelId || this.defaultModel,
          voice_settings: request.voiceSettings || this.getDefaultVoiceSettings(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });

      logger.debug(`[ElevenLabsClient] Generated audio blob (${audioBlob.size} bytes)`);

      return audioBlob;
    } catch (error) {
      logger.error('[ElevenLabsClient] Failed to generate speech:', error);
      throw error;
    }
  }

  /**
   * Stream speech audio (for progressive playback)
   */
  async generateSpeechStream(request: TTSRequest): Promise<ReadableStream<Uint8Array>> {
    try {
      const apiKey = this.getApiKey();

      logger.debug(`[ElevenLabsClient] Streaming speech for voice ${request.voiceId}`);

      const response = await fetch(`${this.baseUrl}/text-to-speech/${request.voiceId}/stream`, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.modelId || this.defaultModel,
          voice_settings: request.voiceSettings || this.getDefaultVoiceSettings(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      return response.body;
    } catch (error) {
      logger.error('[ElevenLabsClient] Failed to stream speech:', error);
      throw error;
    }
  }

  /**
   * Get default voice settings
   */
  private getDefaultVoiceSettings(): VoiceSettings {
    return {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.2,
      use_speaker_boost: true,
    };
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<any[]> {
    try {
      const apiKey = this.getApiKey();

      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      logger.error('[ElevenLabsClient] Failed to list voices:', error);
      throw error;
    }
  }

  /**
   * Get voice details by ID
   */
  async getVoice(voiceId: string): Promise<any> {
    try {
      const apiKey = this.getApiKey();

      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      logger.error('[ElevenLabsClient] Failed to get voice:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of ElevenLabs client
 */
export const elevenlabsClient = new ElevenLabsClient();
