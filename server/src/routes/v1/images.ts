import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
/* DEPRECATED: Removed OpenAI imports - using OpenRouter only */
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { supabaseService } from '../../lib/supabase.js';
import { AIUsageService } from '../../services/ai-usage-service.js';
import { getCircuitBreaker, CircuitOpenError } from '../../utils/circuit-breaker.js';

/*
 * DEPRECATED: OpenAI gpt-image-1-mini code removed. Using OpenRouter only.
 * OpenAI requires verification. See: https://platform.openai.com/account/billing/overview
 */

/* DEPRECATED: OpenAI cost calculation removed (using OpenRouter only) */

export default function imagesRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('images'));

  router.post('/generate', async (req: Request, res: Response) => {
    const { prompt, referenceImage, model, quality, size }: { prompt: string; referenceImage?: string; model?: string; quality?: 'low' | 'medium' | 'high'; size?: string } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Quota check
    const userId = (req as any).user?.userId as string;
    const plan = (req as any).user?.plan as string || 'free';
    const quota = await AIUsageService.checkQuotaAndConsume({ userId, plan, type: 'image', units: 1 });
    if (!quota.allowed) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000))));
      return res.status(402).json({ error: 'AI quota exceeded', remaining: quota.remaining, resetAt: quota.resetAt });
    }

    try {
      // Using OpenRouter for all image generation
      const breaker = getCircuitBreaker('images:openrouter');
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
        return res.status(500).json({ error: 'Server not configured for image generation' });
      }

      // If caller passed an OpenAI image model, pick a valid OpenRouter image-capable default instead
      const isOpenAIModel = typeof model === 'string' && /^gpt-image/i.test(model);
      const imageModel = (!model || isOpenAIModel)
        ? (process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview')
        : model;

      // Build message content based on whether we have a reference image
      let content: any = prompt;
      if (referenceImage) {
        content = [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${referenceImage}` } },
        ];
      }

      const body = {
        model: imageModel,
        messages: [{ role: 'user', content }],
        modalities: ['image', 'text'],
        max_tokens: 2048,
        temperature: 0.7,
      } as any;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_ORIGIN || 'http://localhost:3000',
          'X-Title': 'AI Adventure Scribe',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        const status = response.status;
        console.error('[Images] OpenRouter error', status, errText);
        getCircuitBreaker('images:openrouter').onFailure();
        return res.status(status).json({ error: 'Image request failed', details: errText });
      }

      getCircuitBreaker('images:openrouter').onSuccess();

      // OpenRouter image-capable chat completion response (robust extraction)
      type ORImageMsg = { [k: string]: any };
      type ORImageResp = { choices?: { message?: ORImageMsg }[]; [k: string]: any };
      const data = (await response.json()) as ORImageResp;

      const firstUrlLike = (val: any): string | null => {
        if (!val) return null;
        if (typeof val === 'string' && /^https?:\/\//i.test(val)) return val;
        if (typeof val === 'object' && typeof val.url === 'string') return val.url;
        return null;
      };
      const firstDataUriLike = (val: any): string | null => {
        if (typeof val === 'string' && val.startsWith('data:image/')) return val;
        return null;
      };
      const extractFromMessage = (msg: any): string | null => {
        if (!msg) return null;
        // If array, try each
        if (Array.isArray(msg)) {
          for (const it of msg) {
            const nested = extractFromMessage(it);
            if (nested) return nested;
          }
        }
        // images array
        if (Array.isArray(msg?.images)) {
          for (const it of msg.images) {
            const u = firstUrlLike(it?.image_url) || firstUrlLike(it?.url) || firstDataUriLike(it?.image) || firstDataUriLike(it?.data);
            if (u) return u;
          }
        }
        // content array
        if (Array.isArray(msg?.content)) {
          for (const p of msg.content) {
            if (p && typeof p === 'object') {
              if (['image', 'image_url', 'output_image'].includes(String(p.type || '').toLowerCase())) {
                const u = firstUrlLike(p?.image_url) || firstUrlLike(p?.url) || firstDataUriLike(p?.image) || firstDataUriLike(p?.data);
                if (u) return u;
              }
              const nested = extractFromMessage(p);
              if (nested) return nested;
            } else if (typeof p === 'string') {
              const d = firstDataUriLike(p);
              if (d) return d;
              const m = p.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i);
              if (m) return m[0];
            }
          }
        }
        // string content
        if (typeof msg?.content === 'string') {
          const d = firstDataUriLike(msg.content);
          if (d) return d;
          const m = msg.content.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i);
          if (m) return m[0];
        }
        // simple fields
        const simple = firstUrlLike(msg?.image_url) || firstDataUriLike(msg?.image) || firstUrlLike(msg?.url);
        if (simple) return simple;
        // tool calls / attachments / nested
        if (Array.isArray(msg?.tool_calls)) {
          for (const t of msg.tool_calls) {
            const nested = extractFromMessage(t);
            if (nested) return nested;
          }
        }
        if (Array.isArray(msg?.attachments)) {
          for (const a of msg.attachments) {
            const nested = extractFromMessage(a);
            if (nested) return nested;
          }
        }
        return null;
      };

      const choice = data.choices?.[0];
      let imageRef = extractFromMessage(choice?.message) || extractFromMessage(data);

      if (!imageRef) {
        console.warn('[Images] OpenRouter parsing found no image fields');
        /* DEPRECATED: Removed OpenAI fallback */
        return res.status(502).json({ error: 'No image data in provider response' });
      }

      // Normalize to base64
      if (imageRef.startsWith('data:image/')) {
        const idx = imageRef.indexOf('base64,');
        const base64 = idx !== -1 ? imageRef.substring(idx + 7) : '';
        return res.json({ image: base64 });
      }

      // Otherwise assume remote URL; fetch and convert
      try {
        const r2 = await fetch(imageRef);
        if (!r2.ok) {
          console.warn('[Images] Failed to fetch provider image URL', imageRef, r2.status);
          return res.status(502).json({ error: 'Failed to fetch image from provider' });
        }
        const buf = Buffer.from(await r2.arrayBuffer());
        return res.json({ image: buf.toString('base64') });
      } catch (fetchErr) {
        console.error('[Images] Error fetching image URL', imageRef, fetchErr);
        return res.status(502).json({ error: 'Error retrieving image from provider' });
      }
    } catch (e) {
      console.error('[Images] Error', e);
      if (e instanceof CircuitOpenError) {
        res.setHeader('Retry-After', String(Math.max(1, e.retryAfterSec)));
        return res.status(503).json({ error: 'Provider temporarily unavailable' });
      }
      return res.status(500).json({ error: 'Image generation failed' });
    }
  });

  // Append a generated image record to a dialogue_history message
  router.patch('/message/:id/images', async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.userId as string;
    const body = req.body || {};
    const image = {
      url: String(body.url || ''),
      prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
      model: typeof body.model === 'string' ? body.model : undefined,
      quality: typeof body.quality === 'string' ? body.quality : undefined,
      createdAt: new Date().toISOString(),
    } as any;

    if (!id || !image.url) {
      return res.status(400).json({ error: 'Missing id or image url' });
    }

    try {
      // Fetch message with session and verify ownership through campaign/character
      const { data: existing, error: selErr } = await supabaseService
        .from('dialogue_history')
        .select('images, session_id, game_sessions!dialogue_history_session_id_fkey(campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id))')
        .eq('id', id)
        .single();

      if (selErr) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Verify ownership through session -> campaign or character
      const session = (existing as any)?.game_sessions;
      const campaignOwner = session?.campaigns?.user_id;
      const characterOwner = session?.characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const images = Array.isArray(existing?.images) ? existing.images : [];
      // Append with max 5
      const updated = [...images, image].slice(-5);

      const { error: updErr, data: updData } = await supabaseService
        .from('dialogue_history')
        .update({ images: updated, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('images')
        .single();
      if (updErr) throw updErr;
      return res.json({ images: updData?.images || [] });
    } catch (e) {
      console.error('[Images] Failed to append image to message', e);
      return res.status(500).json({ error: 'Failed to append image' });
    }
  });

  return router;
}
