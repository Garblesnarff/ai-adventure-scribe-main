import { test, expect, request } from '@playwright/test';
import jwt from 'jsonwebtoken';

const SECRET = 'testsecret';

function makeToken(sub: string, email: string) {
  return jwt.sign({ sub, email }, SECRET, { expiresIn: '1h' });
}

test.describe('Auth/Role E2E - non-admin user', () => {
  test('returns 401 when no token is provided', async ({ baseURL }) => {
    const api = await request.newContext({ baseURL });
    const res = await api.post('/v1/blog/categories', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('returns 403 for non-admin user on admin-only route', async ({ baseURL }) => {
    const api = await request.newContext({ baseURL });
    const token = makeToken('user-123', 'user@example.com');
    const res = await api.post('/v1/blog/categories', {
      data: {},
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/admin access required/i);
  });
});
