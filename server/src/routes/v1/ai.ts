import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { AIUsageService } from '../../services/ai-usage-service.js';
import { getCircuitBreaker, CircuitOpenError } from '../../utils/circuit-breaker.js';

export default function aiRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('llm'));

  // Initialize clients only if API keys are provided
  const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
  const anthropic = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here'
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  router.post('/respond', async (req: Request, res: Response) => {
    const { provider, messages, systemPrompt } = req.body as {
      provider?: 'openai' | 'anthropic';
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      systemPrompt?: string;
    };

    // Quota check
    const userId = (req as any).user?.userId as string;
    const plan = (req as any).user?.plan as string || 'free';
    const quota = await AIUsageService.checkQuotaAndConsume({ userId, plan, type: 'llm', units: 1 });
    if (!quota.allowed) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000))));
      return res.status(402).json({ error: 'AI quota exceeded', remaining: quota.remaining, resetAt: quota.resetAt });
    }

    try {
      if (provider === 'anthropic') {
        if (!anthropic) {
          return res.status(400).json({ error: 'Anthropic API key not configured' });
        }
        const breaker = getCircuitBreaker('llm:anthropic');
        try {
          breaker.allowOrThrow();
        } catch (e) {
          if (e instanceof CircuitOpenError) {
            res.setHeader('Retry-After', String(Math.max(1, e.retryAfterSec)));
            return res.status(503).json({ error: 'Provider temporarily unavailable' });
          }
          throw e;
        }
        try {
          const response = await anthropic.messages.create({
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          });
          breaker.onSuccess();
          const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
          return res.json({ response: content });
        } catch (e) {
          breaker.onFailure();
          throw e;
        }
      }

      // default to openai
      if (!openai) {
        return res.status(400).json({ error: 'OpenAI API key not configured' });
      }
      const breaker = getCircuitBreaker('llm:openai');
      try {
        breaker.allowOrThrow();
      } catch (e) {
        if (e instanceof CircuitOpenError) {
          res.setHeader('Retry-After', String(Math.max(1, e.retryAfterSec)));
          return res.status(503).json({ error: 'Provider temporarily unavailable' });
        }
        throw e;
      }
      try {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
            ...messages,
          ],
          temperature: 0.9,
        });
        breaker.onSuccess();
        const text = completion.choices[0]?.message?.content || '';
        return res.json({ response: text });
      } catch (e) {
        breaker.onFailure();
        throw e;
      }
    } catch (e) {
      console.error('AI error', e);
      if (e instanceof CircuitOpenError) {
        res.setHeader('Retry-After', String(Math.max(1, e.retryAfterSec)));
        return res.status(503).json({ error: 'Provider temporarily unavailable' });
      }
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  return router;
}

