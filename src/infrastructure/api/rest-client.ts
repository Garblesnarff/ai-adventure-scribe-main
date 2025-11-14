import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';

export interface LLMHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateTextParams {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  history?: LLMHistoryMessage[];
  provider?: 'openrouter' | 'gemini';
}

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  referenceImage?: string; // base64 without data URL prefix
  quality?: 'low' | 'medium' | 'high';
}

export interface AppendMessageImageParams {
  messageId: string;
  image: { url: string; prompt?: string; model?: string; quality?: 'low' | 'medium' | 'high' };
}

class LlmApiClient {
  private useOfflineFallback = false;

  private async fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
    if (this.useOfflineFallback) {
      throw new Error('API unavailable');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${text || res.statusText}`);
      }
      return res;
    } catch (err: any) {
      if (err instanceof TypeError && String(err.message || '').includes('fetch')) {
        this.useOfflineFallback = true;
      }
      throw err;
    }
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const preferredProvider =
      params.provider ||
      (import.meta.env.VITE_LLM_PROVIDER as 'openrouter' | 'gemini' | undefined) ||
      'openrouter';

    const makeReq = async (provider: 'openrouter' | 'gemini') =>
      this.fetchWithAuth('/v1/llm/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: params.prompt,
          model: params.model,
          maxTokens: params.maxTokens,
          temperature: params.temperature,
          history: params.history,
          provider,
        }),
      });

    try {
      const res = await makeReq(preferredProvider);
      const data = await res.json();
      return data?.text ?? '';
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isConfigErr = /Server not configured for OpenRouter/i.test(msg);
      const isGeminiConfigErr = /Server not configured for Gemini/i.test(msg);

      if (preferredProvider === 'openrouter' && isConfigErr) {
        const res = await makeReq('gemini');
        const data = await res.json();
        return data?.text ?? '';
      }
      if (preferredProvider === 'gemini' && isGeminiConfigErr) {
        const res = await makeReq('openrouter');
        const data = await res.json();
        return data?.text ?? '';
      }
      throw err;
    }
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const res = await this.fetchWithAuth('/v1/images/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: params.prompt,
        model: params.model,
        referenceImage: params.referenceImage,
        quality: params.quality,
      }),
    });
    const data = await res.json();
    return data?.image ?? '';
  }

  async appendMessageImage(params: AppendMessageImageParams): Promise<void> {
    const res = await this.fetchWithAuth(
      `/v1/images/message/${encodeURIComponent(params.messageId)}/images`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          url: params.image.url,
          prompt: params.image.prompt,
          model: params.image.model,
          quality: params.image.quality,
        }),
      },
    );
    await res.json().catch(() => ({}));
  }
}

export const llmApiClient = new LlmApiClient();
