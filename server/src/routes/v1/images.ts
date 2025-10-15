import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import OpenAI, { toFile } from 'openai';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';

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

      // OpenRouter image-capable chat completion response (minimal shapes)
      type ORImageMsg = {
        content?: unknown;
        images?: any[];
        image?: string;
        image_url?: string | { url: string };
      };
      type ORImageResp = { choices?: { message?: ORImageMsg }[] };
      const data = (await response.json()) as ORImageResp;

      // Try to extract image data from various possible locations
      const choice = data.choices?.[0];
      let imageData: string | null = null;
      const toUrl = (val: any): string | null => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && typeof val.url === 'string') return val.url;
        return null;
      };

      if (choice?.message?.images?.length) {
        const img = choice.message.images[0];
        imageData = toUrl(img?.image_url) || toUrl(img?.url);
      }

      if (!imageData && Array.isArray(choice?.message?.content)) {
        const imgPart = choice.message.content.find((p: any) => p.type === 'image');
        imageData = toUrl(imgPart?.image) || toUrl(imgPart?.image_url) || toUrl(imgPart?.data);
      }

      if (!imageData && typeof choice?.message?.content === 'string' && choice.message.content.startsWith('data:image/')) {
        imageData = choice.message.content;
      }

      if (!imageData) imageData = toUrl(choice?.message?.image);
      if (!imageData) imageData = toUrl(choice?.message?.image_url);

      if (!imageData) {
        return res.status(502).json({ error: 'No image data in provider response' });
      }

      // Strip data URL prefix if present
      if (imageData && imageData.startsWith('data:image/')) {
        const idx = imageData.indexOf('base64,');
        if (idx !== -1) imageData = imageData.substring(idx + 7);
      }

      return res.json({ image: imageData });
    } catch (e) {
      console.error('[Images] Error', e);
      return res.status(500).json({ error: 'Image generation failed' });
    }
  });

  return router;
}
