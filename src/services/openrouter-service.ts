/**
 * OpenRouter Service (client-side wrapper)
 * Proxies to server endpoints to avoid exposing API keys.
 */

import { llmApiClient } from './llm-api-client';
import { modelUsageTracker } from './model-usage-tracker';
import { logger } from '../lib/logger';

import { supabase } from '@/integrations/supabase/client';

interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  referenceImage?: string;
  quality?: 'low' | 'medium' | 'high';
}
interface TextGenerationRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
interface ModelConfig {
  id: string;
  dailyLimit?: number;
  isFree: boolean;
}

// Upload options to support entity-scoped storage paths
export interface UploadOptions {
  bucket?: string; // default: 'campaign-images'
  entityType?: 'campaign' | 'character';
  entityId?: string;
  label?: string; // default: 'generated'
}

export class OpenRouterService {
  private imageModels: ModelConfig[] = [
    // DEPRECATED: Removed gpt-image-1-mini (requires OpenAI verification)
    { id: 'google/gemini-2.5-flash-image-preview', isFree: false },
  ];

  private textModels: ModelConfig[] = [
    {
      id: import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
      isFree: true,
      dailyLimit: 1000,
    },
    { id: 'anthropic/claude-3.5-sonnet', isFree: false },
  ];

  private get models(): ModelConfig[] {
    return [...this.imageModels, ...this.textModels];
  }

  async hasPositiveBalance(): Promise<boolean> {
    // Balance/quotas are enforced server-side now
    return true;
  }

  private selectAvailableModel(
    hasBalance: boolean = true,
    modelType: 'text' | 'image' = 'image',
  ): ModelConfig {
    const available = modelType === 'text' ? this.textModels : this.imageModels;

    // DEPRECATED: Removed gpt-image-1-mini prioritization
    if (hasBalance) {
      for (const m of available.filter((m) => m.isFree)) {
        if (m.dailyLimit && modelUsageTracker.canUseModel(m.id, m.dailyLimit)) {
          return m;
        }
      }
    }
    return available.find((m) => !m.isFree) || available[0];
  }

  getUsageStats(): { [modelId: string]: { used: number; limit: number; remaining: number } } {
    const stats: Record<string, { used: number; limit: number; remaining: number }> = {};
    for (const m of this.models.filter((m) => m.isFree && m.dailyLimit)) {
      stats[m.id] = modelUsageTracker.getUsageStats(m.id, m.dailyLimit!);
    }
    return stats;
  }

  async generateImage(request: ImageGenerationRequest): Promise<string> {
    const hasBalance = await this.hasPositiveBalance();
    const selected = this.selectAvailableModel(hasBalance, 'image');
    const modelId = request.model || selected.id;
    const base64 = await llmApiClient.generateImage({
      prompt: request.prompt,
      model: modelId,
      referenceImage: request.referenceImage,
      quality: request.quality,
    });
    const cfg = this.models.find((m) => m.id === modelId);
    if (cfg?.isFree && cfg.dailyLimit) {
      modelUsageTracker.recordUsage(cfg.id, cfg.dailyLimit);
    }
    return base64;
  }

  async generateText(request: TextGenerationRequest): Promise<string> {
    const hasBalance = await this.hasPositiveBalance();
    const selected = this.selectAvailableModel(hasBalance, 'text');
    const modelId = request.model || selected.id;
    const text = await llmApiClient.generateText({
      prompt: request.prompt,
      model: modelId,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });
    const cfg = this.models.find((m) => m.id === modelId);
    if (cfg?.isFree && cfg.dailyLimit) {
      modelUsageTracker.recordUsage(cfg.id, cfg.dailyLimit);
    }
    return text.trim();
  }

  convertBase64ToBlobUrl(base64Data: string): string {
    const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    return URL.createObjectURL(blob);
  }

  async uploadImage(base64Data: string, options?: UploadOptions): Promise<string> {
    try {
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      const bucket = options?.bucket || 'campaign-images';
      const label = (options?.label || 'generated').replace(/[^a-z0-9-]/gi, '-');
      const ts = Date.now();
      let path: string;
      if (options?.entityType && options?.entityId) {
        const prefix = options.entityType === 'campaign' ? 'campaigns' : 'characters';
        path = `${prefix}/${options.entityId}/${ts}-${label}.png`;
      } else {
        // Backward compatible default path
        path = `misc/${ts}-${Math.random().toString(36).substr(2, 9)}.png`;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/png' });
      if (error) {
        logger.error('Error uploading to Supabase storage:', error);
        return `data:image/png;base64,${cleanBase64}`;
      }
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return publicUrlData.publicUrl;
    } catch (e) {
      logger.error('Error in uploadImage:', e);
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      return `data:image/png;base64,${cleanBase64}`;
    }
  }
}

export const openRouterService = new OpenRouterService();
