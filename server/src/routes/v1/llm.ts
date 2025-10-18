import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { checkQuotaAndConsume } from '../../services/ai-usage-service.js';
import { getCircuitBreaker, CircuitOpenError } from '../../utils/circuit-breaker.js';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export default function llmRouter() {
  const router = Router();
  router.use(requireAuth);
  // Plan-aware per-IP and per-user limiter
  router.use(planRateLimit('llm'));

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
    const quota = await checkQuotaAndConsume({ userId, plan, type: 'llm', units: 1 });
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

        const textModel = model || process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash';

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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(textModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          const status = response.status;
          console.error('[LLM] Gemini error', status, errText);
          breaker.onFailure();
          return res.status(status).json({ error: 'LLM request failed', details: errText });
        }

        breaker.onSuccess();
        const data = await response.json() as any;
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
