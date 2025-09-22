import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth.js';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export default function aiRouter(_db: Pool) {
  const router = Router();
  router.use(requireAuth);

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

    try {
      if (provider === 'anthropic') {
        if (!anthropic) {
          return res.status(400).json({ error: 'Anthropic API key not configured' });
        }
        const response = await anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        });
        const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        return res.json({ response: content });
      }

      // default to openai
      if (!openai) {
        return res.status(400).json({ error: 'OpenAI API key not configured' });
      }
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          ...messages,
        ],
        temperature: 0.9,
      });
      const text = completion.choices[0]?.message?.content || '';
      return res.json({ response: text });
    } catch (e) {
      console.error('AI error', e);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  return router;
}

