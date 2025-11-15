import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { AIUsageService } from '../../services/ai-usage-service.js';
import { getCircuitBreaker, CircuitOpenError } from '../../utils/circuit-breaker.js';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

const GEMINI_MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
let geminiModelCache: { ids: Set<string>; fetchedAt: number } | null = null;

const isModelUnavailableError = (status: number, message: string) => {
  if (status === 404) return true;
  if (status === 400) {
    return /model\s+(id\s+)?['"]?[^'"\s]+['"]?\s+is\s+not\s+valid/i.test(message)
      || /unsupported\s+model/i.test(message)
      || /could\s+not\s+be\s+resolved/i.test(message);
  }
  return false;
};

const parseModelName = (name: string | undefined): string | null => {
  if (!name) return null;
  const cleaned = name.trim();
  if (!cleaned) return null;
  const lastSlash = cleaned.lastIndexOf('/');
  return lastSlash >= 0 ? cleaned.slice(lastSlash + 1) : cleaned;
};

const dedupeModels = (values: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
};

const buildModelCandidates = (preferred: string, variants: string[], fallback: string) => {
  const extras: string[] = [];
  if (/^gemini-2\.5-flash-lite$/i.test(preferred)) {
    extras.push('gemini-2.5-flash-lite-001', 'gemini-2.5-flash-lite-preview');
  }
  return dedupeModels([preferred, ...variants, ...extras, fallback]);
};

const getGeminiModelIds = async (apiKey: string): Promise<Set<string>> => {
  const now = Date.now();
  if (geminiModelCache && (now - geminiModelCache.fetchedAt) < GEMINI_MODEL_CACHE_TTL_MS) {
    return geminiModelCache.ids;
  }

  const ids = new Set<string>();
  const versions: Array<'v1' | 'v1beta'> = ['v1', 'v1beta'];

  for (const version of versions) {
    let pageToken: string | undefined;
    let safety = 0;
    do {
      const url = new URL(`https://generativelanguage.googleapis.com/${version}/models`);
      url.searchParams.set('key', apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const resp = await fetch(url.toString());
      if (!resp.ok) break;
      const data = await resp.json() as { models?: Array<{ name?: string }>; nextPageToken?: string };
      for (const model of data.models || []) {
        const parsed = parseModelName(model.name);
        if (parsed) ids.add(parsed);
      }
      pageToken = data.nextPageToken;
      safety += 1;
    } while (pageToken && safety < 5);
  }

  geminiModelCache = { ids, fetchedAt: now };
  return ids;
};

const pickGeminiApiVersion = (modelId: string): 'v1' | 'v1beta' => {
  return /^gemini-2\.5-/i.test(modelId) ? 'v1' : 'v1beta';
};

export default function llmRouter() {
  const router = Router();
  router.use(requireAuth);
  // Plan-aware per-IP and per-user limiter
  router.use(planRateLimit('llm'));

  router.get('/quota', async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId as string;
    const plan = (req as any).user?.plan as string || 'free';

    try {
      const quotaStatus = await AIUsageService.getQuotaStatus({ userId, plan, type: 'llm' });
      return res.json(quotaStatus);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch quota status' });
    }
  });

  router.post('/generate', async (req: Request, res: Response) => {
    const {
      prompt,
      model,
      maxTokens = 1000,
      temperature = 0.8,
      history,
      provider = 'openrouter'
    }: {
      prompt: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
      history?: ChatMessage[];
      provider?: 'openrouter' | 'gemini';
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Quota check (per user/org per day)
    const userId = (req as any).user?.userId as string;
    const plan = (req as any).user?.plan as string || 'free';
    const quota = await AIUsageService.checkQuotaAndConsume({ userId, plan, type: 'llm', units: 1 });
    if (!quota.allowed) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000))));
      return res.status(402).json({ error: 'AI quota exceeded', remaining: quota.remaining, resetAt: quota.resetAt });
    }

    try {
      if (provider === 'openrouter') {
        const breaker = getCircuitBreaker('llm:openrouter');
        try {
          breaker.allowOrThrow();
        } catch (e) {
          if (e instanceof CircuitOpenError) {
            res.setHeader('Retry-After', String(Math.max(1, e.retryAfterSec)));
            return res.status(503).json({ error: 'Provider temporarily unavailable' });
          }
          throw e;
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ error: 'Server not configured for OpenRouter' });
        }

        const textModel = model || process.env.OPENROUTER_TEXT_MODEL || 'google/gemini-2.0-flash-exp:free';
        const messages: ChatMessage[] = [];

        if (Array.isArray(history)) {
          for (const m of history) {
            if (m && m.role && typeof m.content === 'string') messages.push(m);
          }
        }
        messages.push({ role: 'user', content: prompt });

        const body = {
          model: textModel,
          messages,
          max_tokens: maxTokens,
          temperature,
        } as any;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_ORIGIN || 'http://localhost:5173',
            'X-Title': 'AI Adventure Scribe',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errText = await response.text();
          const status = response.status;
          console.error('[LLM] OpenRouter error', status, errText);
          breaker.onFailure();
          return res.status(status).json({ error: 'LLM request failed', details: errText });
        }

        breaker.onSuccess();
        type ORChatResp = { choices?: { message?: { content?: string } }[] };
        const data = (await response.json()) as ORChatResp;
        const text: string = data.choices?.[0]?.message?.content ?? '';
        return res.json({ text });
      }

      if (provider === 'gemini') {
        const breaker = getCircuitBreaker('llm:gemini');
        try {
          breaker.allowOrThrow();
        } catch (e) {
          if (e instanceof CircuitOpenError) {
            res.setHeader('Retry-After', String(Math.max(1, e.retryAfterSec)));
            return res.status(503).json({ error: 'Provider temporarily unavailable' });
          }
          throw e;
        }

        const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ error: 'Server not configured for Gemini' });
        }

        const preferredModel = (typeof model === 'string' && model.trim())
          ? model.trim()
          : (process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite');
        const fallbackModel = (process.env.GEMINI_TEXT_FALLBACK || 'gemini-2.0-flash-lite').trim() || 'gemini-2.0-flash-lite';
        const variantEnv = (process.env.GEMINI_MODEL_VARIANTS || '')
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);
        const candidateModels = buildModelCandidates(preferredModel, variantEnv, fallbackModel);

        const toGeminiRole = (role: ChatMessage['role']): 'user' | 'model' => {
          if (role === 'assistant') return 'model';
          return 'user';
        };

        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
        if (Array.isArray(history)) {
          for (const m of history) {
            if (m?.content && m.role) {
              contents.push({ role: toGeminiRole(m.role), parts: [{ text: m.content }] });
            }
          }
        }
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        const body: any = {
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
        };

        const attempts: string[] = [];
        let successPayload: any = null;
        let successModel: string | null = null;
        let lastFailure: { status: number; details: string } | null = null;
        let availableModels: Set<string> | null = null;

        for (const candidate of candidateModels) {
          const version = pickGeminiApiVersion(candidate);
          attempts.push(`${candidate} [${version}]`);

          const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${encodeURIComponent(candidate)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          );

          if (response.ok) {
            successPayload = await response.json();
            successModel = candidate;
            break;
          }

          const errText = await response.text();
          lastFailure = { status: response.status, details: errText };

          if (isModelUnavailableError(response.status, errText)) {
            if (!availableModels) {
              try {
                availableModels = await getGeminiModelIds(apiKey);
              } catch (fetchErr) {
                console.warn('[LLM] Failed to refresh Gemini model list', fetchErr);
              }
            }
            if (availableModels && !availableModels.has(candidate)) {
              console.warn(`[LLM] Gemini model "${candidate}" unavailable for current API key. Available: ${Array.from(availableModels).join(', ')}`);
            } else {
              console.warn(`[LLM] Gemini rejected model "${candidate}": ${errText}`);
            }
            continue;
          }

          console.warn(`[LLM] Gemini request failed for model "${candidate}" with status ${response.status}: ${errText}`);
        }

        if (!successPayload || !successModel) {
          breaker.onFailure();
          const status = lastFailure?.status ?? 400;
          const details = lastFailure?.details || `All Gemini model attempts failed. Tried: ${attempts.join(', ')}`;
          return res.status(status).json({ error: 'LLM request failed', details, attempts });
        }

        if (successModel !== preferredModel) {
          console.warn(`[LLM] Gemini model fallback engaged. Requested "${preferredModel}", using "${successModel}". Attempts: ${attempts.join(', ')}`);
        }

        breaker.onSuccess();
        const data = successPayload as any;
        const candidates = data?.candidates || [];
        const first = candidates[0];
        const parts: Array<{ text?: string }> = first?.content?.parts || [];
        const text = parts.map(p => p?.text).filter(Boolean).join('\n');
        return res.json({ text: text || '' });
      }

      return res.status(400).json({ error: 'Unsupported provider' });
    } catch (e) {
      console.error('[LLM] Error', e);
      if (e instanceof CircuitOpenError) {
        res.setHeader('Retry-After', String(Math.max(1, e.retryAfterSec)));
        return res.status(503).json({ error: 'Provider temporarily unavailable' });
      }
      return res.status(500).json({ error: 'LLM request failed' });
    }
  });

  return router;
}
