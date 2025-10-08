import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';

export default function imagesRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(createRateLimiter({ windowMs: 60_000, max: 15, key: 'images' })); // 15 req/min per IP

  router.post('/generate', async (req: Request, res: Response) => {
    const { prompt, referenceImage, model }: { prompt: string; referenceImage?: string; model?: string } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Server not configured for OpenRouter' });
      }

      const imageModel = model || process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview';

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
          'HTTP-Referer': process.env.APP_ORIGIN || 'http://localhost:5173',
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
