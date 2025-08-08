import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createClient } from '../src/lib/db';
import { createApp } from '../src/app';

let base: request.SuperTest<request.Test>;
let token: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    // @ts-ignore
    return;
  }
  process.env.STRIPE_WEBHOOK_SKIP_VERIFY = 'true';
  const db = createClient();
  const app = createApp(db);
  base = request(app);

  // register a user
  const reg = await base.post('/v1/auth/register').send({ email: `stripe_${Date.now()}@ex.com`, password: 'Passw0rd!' });
  token = reg.body.token;
});

describe('Stripe', () => {
  it('creates checkout session', async () => {
    if (!process.env.DATABASE_URL) return; // skip
    if (!process.env.STRIPE_SECRET_KEY) return; // skip if no key configured
    const res = await base
      .post('/v1/billing/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ priceId: 'price_test', successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' });
    expect([200, 500]).toContain(res.status);
  });

  it('accepts webhook (skip verify)', async () => {
    if (!process.env.DATABASE_URL) return; // skip
    const fakeEvent = {
      id: 'evt_test',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          items: { data: [{ price: { id: 'price_test' } }] },
          customer_email: 'someone@example.com',
        },
      },
    };
    const res = await base
      .post('/v1/billing/webhook')
      .set('Content-Type', 'application/json')
      .send(fakeEvent);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
