import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';

let base: request.SuperTest<request.Test>;
let token: string;

let callCount = 0;

vi.mock('node-fetch', async (orig) => {
  const actual = await (orig() as any);
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...actual,
    default: async (..._args: any[]) => {
      callCount++;
      return {
        ok: false,
        status: 500,
        text: async () => 'mock failure',
      } as any;
    },
  };
});

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = 'testsecret';
  process.env.CB_FAILURE_THRESHOLD = '2'; // open after 2 failures
  process.env.CB_COOLDOWN_MS = '30000';
  const app = createApp();
  base = request(app);
  token = jwt.sign({ sub: 'cb-user', email: 'cb@example.com' }, process.env.SUPABASE_JWT_SECRET!);
});

afterEach(() => {
  callCount = 0;
});

describe('Circuit breaker for external AI providers', () => {
  it('opens after consecutive failures and returns 503 with Retry-After without calling provider again', async () => {
    // First failure
    const r1 = await base
      .post('/v1/llm/generate')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Plan', 'pro')
      .send({ prompt: 'Hello', provider: 'openrouter' });
    expect(r1.status).toBe(500); // underlying handler propagates provider status

    // Second failure (should trip the breaker after this call)
    const r2 = await base
      .post('/v1/llm/generate')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Plan', 'pro')
      .send({ prompt: 'Hello again', provider: 'openrouter' });
    expect(r2.status).toBe(500);

    // Third call should not even hit fetch and return 503 quickly
    const r3 = await base
      .post('/v1/llm/generate')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Plan', 'pro')
      .send({ prompt: 'Another', provider: 'openrouter' });
    expect(r3.status).toBe(503);
    expect(r3.headers['retry-after']).toBeDefined();

    // Fetch should have been called only twice (before breaker opened)
    expect(callCount).toBe(2);
  });
});
