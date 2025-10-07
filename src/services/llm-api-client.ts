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
}

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  referenceImage?: string; // base64 without data URL prefix
}

class LlmApiClient {
  private useOfflineFallback = false;

  private async fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
    if (this.useOfflineFallback) {
      throw new Error('API unavailable');
    }

    const { data: { session } } = await supabase.auth.getSession();
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
    const res = await this.fetchWithAuth('/v1/llm/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: params.prompt,
        model: params.model,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        history: params.history,
      }),
    });
    const data = await res.json();
    return data?.text ?? '';
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const res = await this.fetchWithAuth('/v1/images/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: params.prompt,
        model: params.model,
        referenceImage: params.referenceImage,
      }),
    });
    const data = await res.json();
    return data?.image ?? '';
  }
}

export const llmApiClient = new LlmApiClient();
