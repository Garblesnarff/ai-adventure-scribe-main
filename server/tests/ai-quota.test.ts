import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';

let base: request.SuperTest<request.Test>;
let tokenFree: string;

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = 'testsecret';
  const app = createApp();
  base = request(app);
  tokenFree = jwt.sign({ sub: 'quota-user', email: 'q@example.com' }, process.env.SUPABASE_JWT_SECRET!);
});

describe('AI quota enforcement', () => {
  it('refuses LLM requests after daily quota exhausted for free plan', async () => {
    // Default daily free quota for llm is 3. Perform 4 calls.
    for (let i = 0; i < 3; i++) {
      const resp = await base
        .post('/v1/llm/generate')
        .set('Authorization', `Bearer ${tokenFree}`)
        .set('X-Plan', 'free')
        .send({ prompt: 'Hello', provider: 'openrouter' });
      // First 3 should not be 402 quota errors
      expect(resp.status).not.toBe(402);
    }

    const fourth = await base
      .post('/v1/llm/generate')
      .set('Authorization', `Bearer ${tokenFree}`)
      .set('X-Plan', 'free')
      .send({ prompt: 'Hello again', provider: 'openrouter' });

    expect(fourth.status).toBe(402);
    expect(fourth.body.error).toMatch(/quota/i);
    expect(fourth.headers['retry-after']).toBeDefined();
  });
});
