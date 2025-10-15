import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import OpenAI, { toFile } from 'openai';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';
import { supabaseService } from '../../lib/supabase.js';

/**
 * Generate image using OpenAI's gpt-image-1-mini model
 */
async function generateWithOpenAI(
  prompt: string,
  referenceImage?: string,
  quality: 'low' | 'medium' | 'high' = 'low',
  size: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024',
  res?: Response
): Promise<void> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const imageQuality = (quality === 'low' || quality === 'medium' || quality === 'high') ? quality : 'medium';
  const imageSize: '1024x1024' | '1536x1024' | '1024x1536' = (size === '1536x1024' || size === '1024x1536') ? size : '1024x1024';

  try {
    let imageData: string | null = null;

    if (referenceImage) {
      const file = await toFile(Buffer.from(referenceImage, 'base64'), 'reference.png', { type: 'image/png' });
      const resp = await openai.images.edit({
        model: 'gpt-image-1-mini',
        image: [file],
        prompt,
        size: imageSize,
        ...(imageQuality && { quality: imageQuality as any }),
      } as any);
      if (!resp.data?.length) {
        throw new Error('No image data returned from OpenAI edits');
      }
      const first = resp.data[0] as any;
      if (first.b64_json) {
        imageData = first.b64_json;
      } else if (first.url) {
        const r = await fetch(first.url);
        const buf = Buffer.from(await r.arrayBuffer());
        imageData = buf.toString('base64');
      } else {
        throw new Error('No image data returned from OpenAI edits');
      }
    } else {
      const resp = await openai.images.generate({
        model: 'gpt-image-1-mini',
        prompt: prompt,
        n: 1,
        size: imageSize,
        ...(imageQuality && { quality: imageQuality as any }),
      } as any);
      if (!resp.data?.length) {
        throw new Error('No image data returned from OpenAI generate');
      }
      const first = resp.data[0] as any;
      if (first.b64_json) {
        imageData = first.b64_json;
      } else if (first.url) {
        const r = await fetch(first.url);
        const buf = Buffer.from(await r.arrayBuffer());
        imageData = buf.toString('base64');
      } else {
        throw new Error('No image data returned from OpenAI generate');
      }
    }
    
    if (res) {
      res.json({ 
        image: imageData,
        model: 'gpt-image-1-mini',
        quality: imageQuality,
        cost: calculateImageCost(imageQuality, imageSize)
      });
    }
    return;

  } catch (error: any) {
    console.error('[Images] OpenAI generation error:', error);
    const msg = String(error?.message || '');
    const isValidation = (error?.status === 400) || /size|quality|parameter|invalid/i.test(msg);
    if (isValidation) {
      try {
        const resp = await openai.images.generate({
          model: 'gpt-image-1-mini',
          prompt,
          n: 1,
          size: '1024x1024',
        } as any);
        const first = resp.data?.[0] as any;
        let b64: string | null = null;
        if (first?.b64_json) {
          b64 = first.b64_json;
        } else if (first?.url) {
          const r = await fetch(first.url);
          const buf = Buffer.from(await r.arrayBuffer());
          b64 = buf.toString('base64');
        }
        if (b64 && res) {
          return void res.json({ image: b64, model: 'gpt-image-1-mini', quality: 'auto', cost: calculateImageCost('medium', '1024x1024') });
        }
      } catch (e) {
        // ignore
      }
    }
    throw error;
  }
}

/**
 * Calculate cost for OpenAI image generation
 */
function calculateImageCost(quality: string, size: string): number {
  // gpt-image-1-mini pricing (in USD)
  const baseCosts = {
    'low': 0.005,
    'medium': 0.011,
    'high': 0.036
  };
  
  const baseCost = baseCosts[quality as keyof typeof baseCosts] || baseCosts.medium;
  
  // Size modifiers (1024x1024 is base)
  if (size === '1024x1536' || size === '1536x1024') {
    return baseCost * 1.2; // 20% more for taller/wider images
  }
  
  return baseCost;
}

export default function imagesRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(createRateLimiter({ windowMs: 60_000, max: 15, key: 'images' })); // 15 req/min per IP

  router.post('/generate', async (req: Request, res: Response) => {
    const { prompt, referenceImage, model, quality, size }: { prompt: string; referenceImage?: string; model?: string; quality?: 'low' | 'medium' | 'high'; size?: string } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    try {
      // Try OpenAI first if the model is gpt-image-1-mini
      if (!model || model === 'gpt-image-1-mini') {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey) {
          try {
            const allowedSizes = new Set(['1024x1024', '1536x1024', '1024x1536']);
            const reqSize = (typeof size === 'string' && allowedSizes.has(size))
              ? (size as '1024x1024' | '1536x1024' | '1024x1536')
              : '1024x1024';
            await generateWithOpenAI(prompt, referenceImage, quality, reqSize, res);
            return; // Response already sent
          } catch (openaiError) {
            console.warn('[Images] OpenAI generation failed, falling back to OpenRouter:', openaiError);
            // Fall through to OpenRouter
          }
        }
      }

      // Fallback to OpenRouter
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
        return res.status(status).json({ error: 'Image request failed', details: errText });
      }

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
        console.warn('[Images] OpenRouter parsing found no image fields; attempting OpenAI fallback if configured');
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey) {
          try {
            const allowedSizes = new Set(['1024x1024', '1536x1024', '1024x1536']);
            const reqSize = (typeof size === 'string' && allowedSizes.has(size))
              ? (size as '1024x1024' | '1536x1024' | '1024x1536')
              : '1024x1024';
            await generateWithOpenAI(prompt, referenceImage, quality, reqSize, res);
            return; // response sent
          } catch (e) {
            console.warn('[Images] OpenAI fallback failed after OpenRouter parse miss', e);
          }
        }
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
      return res.status(500).json({ error: 'Image generation failed' });
    }
  });

  // Append a generated image record to a dialogue_history message
  router.patch('/message/:id/images', async (req: Request, res: Response) => {
    const { id } = req.params;
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
      // Fetch existing images
      const { data: existing, error: selErr } = await supabaseService
        .from('dialogue_history')
        .select('images')
        .eq('id', id)
        .single();
      if (selErr) {
        return res.status(404).json({ error: 'Message not found' });
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
