import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export default function llmRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(createRateLimiter({ windowMs: 60_000, max: 30, key: 'llm' })); // 30 req/min per IP

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
      provider?: 'openrouter';
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    try {
      if (provider !== 'openrouter') {
        return res.status(400).json({ error: 'Unsupported provider' });
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
          // Optional attribution headers (not security)
          'HTTP-Referer': process.env.APP_ORIGIN || 'http://localhost:5173',
          'X-Title': 'AI Adventure Scribe',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        const status = response.status;
        console.error('[LLM] OpenRouter error', status, errText);
        return res.status(status).json({ error: 'LLM request failed', details: errText });
      }

      // OpenRouter chat completion response (minimal shape)
      type ORChatResp = { choices?: { message?: { content?: string } }[] };
      const data = (await response.json()) as ORChatResp;
      const text: string = data.choices?.[0]?.message?.content ?? '';
      return res.json({ text });
    } catch (e) {
      console.error('[LLM] Error', e);
      return res.status(500).json({ error: 'LLM request failed' });
    }
  });

  return router;
}
