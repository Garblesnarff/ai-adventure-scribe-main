import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Observability - request id propagation', () => {
  it('injects an X-Request-Id header when missing', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    const rid = res.headers['x-request-id'];
    expect(rid).toBeTruthy();
    expect(typeof rid).toBe('string');
  });

  it('echoes provided X-Request-Id header', async () => {
    const app = createApp();
    const custom = 'test-fixed-rid-123';
    const res = await request(app).get('/health').set('x-request-id', custom);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(custom);
  });
});
