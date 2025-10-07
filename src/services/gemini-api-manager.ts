import { llmApiClient, type GenerateTextParams } from './llm-api-client';

type GoogleGenerativeAI = any;

export interface RateLimitStats {
  dailyUsage: number;
  dailyLimit: number;
  recentRequests: number;
  minutelyLimit: number;
  remainingDaily: number;
  remainingMinutely: number;
  resetTime: number;
}

export class GeminiApiManager {
  private isDevelopment(): boolean {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  constructor() {
    if (this.isDevelopment()) {
      console.log('GeminiApiManager initialized (server-proxy mode)');
    }
  }

  private buildPromptFromInput(input: any): { prompt: string; history?: { role: 'user'|'assistant'|'system'; content: string }[] } {
    if (typeof input === 'string') return { prompt: input };

    if (input && Array.isArray(input.contents)) {
      const parts = input.contents as Array<{ role?: string; parts?: Array<{ text?: string }> }>;
      const texts: string[] = [];
      const history: { role: 'user'|'assistant'|'system'; content: string }[] = [];

      for (const item of parts) {
        const t = (item.parts || [])
          .map(p => p?.text)
          .filter((v): v is string => !!v)
          .join('\n');
        if (t) {
          const role = (item as any).role as string | undefined;
          if (role && (role === 'user' || role === 'model' || role === 'assistant' || role === 'system')) {
            history.push({ role: role === 'model' ? 'assistant' : (role as any), content: t });
          } else {
            texts.push(t);
          }
        }
      }

      return { prompt: texts.join('\n\n'), history };
    }

    try {
      return { prompt: JSON.stringify(input) };
    } catch {
      return { prompt: String(input) };
    }
  }

  private createGenAIStub() {
    const manager = this;
    return {
      getGenerativeModel({ model, generationConfig }: { model: string; generationConfig?: any }) {
        const defaultMax = generationConfig?.maxOutputTokens ?? generationConfig?.maxTokens ?? 1000;
        const defaultTemp = generationConfig?.temperature ?? 0.7;

        const callText = async (params: GenerateTextParams) => {
          return llmApiClient.generateText({
            ...params,
            model,
            maxTokens: params.maxTokens ?? defaultMax,
            temperature: params.temperature ?? defaultTemp,
          });
        };

        return {
          async generateContent(input: any) {
            const { prompt, history } = manager.buildPromptFromInput(input);
            const text = await callText({ prompt, history });
            return { response: { text: () => text } } as any;
          },

          startChat({ history, generationConfig: chatGen }: { history?: any[]; generationConfig?: any }) {
            const hist: { role: 'user'|'assistant'|'system'; content: string }[] = [];
            if (Array.isArray(history)) {
              for (const h of history) {
                const role = h.role === 'model' ? 'assistant' : (h.role || 'user');
                const content = Array.isArray(h.parts)
                  ? (h.parts.map((p: any) => p?.text).filter(Boolean).join('\n') || '')
                  : String(h.content || '');
                if (content) hist.push({ role, content });
              }
            }

            const effMax = chatGen?.maxOutputTokens ?? defaultMax;
            const effTemp = chatGen?.temperature ?? defaultTemp;

            return {
              async sendMessage(message: string) {
                const text = await callText({ prompt: message, history: hist, maxTokens: effMax, temperature: effTemp });
                return { response: { text: () => text } } as any;
              },

              async sendMessageStream(message: string) {
                const fullText = await callText({ prompt: message, history: hist, maxTokens: effMax, temperature: effTemp });
                const stream = {
                  async *[Symbol.asyncIterator]() {
                    yield { text: () => fullText } as any;
                  },
                } as any;
                return { stream } as any;
              },
            };
          },
        };
      },
    } as GoogleGenerativeAI;
  }

  async executeWithRotation<T>(operation: (genAI: GoogleGenerativeAI) => Promise<T>, _maxRetries: number = 1): Promise<T> {
    const genAIStub = this.createGenAIStub();
    return operation(genAIStub);
  }

  getStats(): any[] { return []; }
  getRateLimitStats(): any {
    return { dailyUsage: 0, dailyLimit: 0, recentRequests: 0, minutelyLimit: 0, remainingDaily: 0, remainingMinutely: 0, resetTime: 0 };
  }
  getCurrentKeyInfo(): { index: number; truncatedKey: string; stats: any } {
    return { index: 0, truncatedKey: 'server-proxy', stats: undefined };
  }
}
