import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { planRateLimit } from '../src/middleware/rate-limit';

let base: request.SuperTest<request.Test>;

beforeAll(() => {
  const app = express();
  app.use(express.json());
  // Attach a fake user for per-user limits
  app.use((req, _res, next) => {
    // @ts-ignore
    req.user = { userId: req.headers['x-user-id'] || 'test-user' };
    next();
  });
  app.use(planRateLimit('llm'));
  app.post('/test', (_req, res) => res.json({ ok: true }));
  base = request(app);
});

describe('Rate limiting by plan', () => {
  it('applies stricter limits to free plan and returns 429 with Retry-After', async () => {
    // Free plan has per-user limit of 10/min for LLM in our defaults. Fire 11 requests.
    let got429 = false;
    for (let i = 0; i < 11; i++) {
      const resp = await base
        .post('/test')
        .set('X-Plan', 'free')
        .send({});
      if (resp.status === 429) {
        got429 = true;
        expect(resp.headers['retry-after']).toBeDefined();
        break;
      }
    }
    expect(got429).toBe(true);
  });

  it('allows more requests for paid plans', async () => {
    // Pro plan per-user limit is higher (60/min). 11 requests should not hit 429.
    let got429 = false;
    for (let i = 0; i < 11; i++) {
      const resp = await base
        .post('/test')
        .set('X-Plan', 'pro')
        .send({});
      if (resp.status === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(false);
  });
});
