import { test, expect, request } from '@playwright/test';
import jwt from 'jsonwebtoken';

const SECRET = 'testsecret';

function makeToken(sub: string, email: string) {
  return jwt.sign({ sub, email }, SECRET, { expiresIn: '1h' });
}

test.describe('Auth/Role E2E - admin user', () => {
  test('passes blog admin middleware (then fails validation)', async ({ baseURL }) => {
    const api = await request.newContext({ baseURL });
    const token = makeToken('admin-123', 'admin@example.com');

    const res = await api.post('/v1/blog/categories', {
      data: {},
      headers: { Authorization: `Bearer ${token}` },
    });

    // When admin override is enabled, the middleware passes but the schema validation fails (400)
    expect([400, 422]).toContain(res.status());
    const body = await res.json();
    // Ensure we are past the 403 admin gate
    expect(res.status()).not.toBe(403);
    expect(body.error).toMatch(/invalid request payload|nothing to update|failed to create category/i);
  });
});
