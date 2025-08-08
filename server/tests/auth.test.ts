import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createClient } from '../src/lib/db';
import { createApp } from '../src/app';

const email = `test_${Date.now()}@example.com`;
const password = 'Passw0rd!';

let base: request.SuperTest<request.Test>;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    // skip tests when DB is not configured
    // @ts-ignore
    return;
  }
  const db = createClient();
  const app = createApp(db);
  base = request(app);
});

describe('Auth', () => {
  it('registers and logs in', async () => {
    if (!process.env.DATABASE_URL) return; // skip
    const reg = await base.post('/v1/auth/register').send({ email, password });
    expect(reg.status).toBe(200);
    expect(reg.body.token).toBeTruthy();

    const login = await base.post('/v1/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });
});
