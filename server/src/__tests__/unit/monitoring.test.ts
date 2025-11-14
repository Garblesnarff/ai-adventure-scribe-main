import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  register,
  httpRequestDuration,
  httpRequestTotal,
  dbQueryDuration,
  dbQueryTotal,
  combatEncountersActive,
  combatAttacksTotal,
  serviceMethodDuration,
  serviceErrorsTotal,
} from '../../lib/metrics.js';
import { instrumentAsync } from '../../lib/instrument.js';

// Mock logger to avoid file system operations
vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  combatLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  spellLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  progressionLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Performance Monitoring', () => {
  beforeEach(() => {
    // Reset metrics before each test
    register.resetMetrics();
  });

  describe('Metrics Registry', () => {
    it('should expose all defined metrics', async () => {
      const metrics = await register.metrics();
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('db_query_duration_seconds');
      expect(metrics).toContain('db_queries_total');
      expect(metrics).toContain('combat_encounters_active');
      expect(metrics).toContain('combat_attacks_total');
      expect(metrics).toContain('service_method_duration_seconds');
      expect(metrics).toContain('service_errors_total');
    });

    it('should have correct content type', () => {
      expect(register.contentType).toContain('text/plain');
    });
  });

  describe('HTTP Metrics', () => {
    it('should record HTTP request duration', async () => {
      httpRequestDuration.observe({ method: 'GET', route: '/test', status_code: 200 }, 0.5);

      const metrics = await register.metrics();
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/test"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should count HTTP requests', async () => {
      httpRequestTotal.inc({ method: 'POST', route: '/api/test', status_code: 201 });

      const metrics = await register.metrics();
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('status_code="201"');
    });
  });

  describe('Database Metrics', () => {
    it('should record database query duration', async () => {
      dbQueryDuration.observe({ operation: 'select', table: 'users' }, 0.05);

      const metrics = await register.metrics();
      expect(metrics).toContain('db_query_duration_seconds');
      expect(metrics).toContain('operation="select"');
      expect(metrics).toContain('table="users"');
    });

    it('should count database queries', async () => {
      dbQueryTotal.inc({ operation: 'insert', table: 'characters', success: 'true' });

      const metrics = await register.metrics();
      expect(metrics).toContain('db_queries_total');
      expect(metrics).toContain('success="true"');
    });

    // Note: wrapQueryWithMetrics tests are omitted because they require DATABASE_URL
    // The wrapper function is tested in integration tests
  });

  describe('Combat Metrics', () => {
    it('should track active combat encounters', async () => {
      combatEncountersActive.set(3);

      const metrics = await register.metrics();
      expect(metrics).toContain('combat_encounters_active');
      expect(metrics).toContain('3');
    });

    it('should count combat attacks', async () => {
      combatAttacksTotal.inc({ hit: 'true', critical: 'false' });
      combatAttacksTotal.inc({ hit: 'true', critical: 'true' });

      const metrics = await register.metrics();
      expect(metrics).toContain('combat_attacks_total');
      expect(metrics).toContain('hit="true"');
      expect(metrics).toContain('critical="true"');
    });
  });

  describe('Service Metrics', () => {
    it('should record service method duration', async () => {
      serviceMethodDuration.observe({ service: 'combat', method: 'startEncounter' }, 0.25);

      const metrics = await register.metrics();
      expect(metrics).toContain('service_method_duration_seconds');
      expect(metrics).toContain('service="combat"');
      expect(metrics).toContain('method="startEncounter"');
    });

    it('should count service errors', async () => {
      serviceErrorsTotal.inc({ service: 'progression', error_type: 'ValidationError' });

      const metrics = await register.metrics();
      expect(metrics).toContain('service_errors_total');
      expect(metrics).toContain('error_type="ValidationError"');
    });

    it('should instrument async functions', async () => {
      const testFn = instrumentAsync('test', 'testMethod', async (value: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return value * 2;
      });

      const result = await testFn(5);
      expect(result).toBe(10);

      const metrics = await register.metrics();
      expect(metrics).toContain('service_method_duration_seconds');
      expect(metrics).toContain('service="test"');
      expect(metrics).toContain('method="testMethod"');
    });

    it('should track instrumented function errors', async () => {
      const errorFn = instrumentAsync('test', 'errorMethod', async () => {
        throw new Error('Test error');
      });

      await expect(errorFn()).rejects.toThrow('Test error');

      const metrics = await register.metrics();
      expect(metrics).toContain('service_errors_total');
      expect(metrics).toContain('error_type="Error"');
    });
  });

  describe('Metrics Export Format', () => {
    it('should export metrics in Prometheus format', async () => {
      // Record some sample data
      httpRequestTotal.inc({ method: 'GET', route: '/health', status_code: 200 });
      dbQueryDuration.observe({ operation: 'select', table: 'users' }, 0.025);

      const metrics = await register.metrics();

      // Verify Prometheus text format structure
      expect(metrics).toMatch(/# HELP http_requests_total/);
      expect(metrics).toMatch(/# TYPE http_requests_total counter/);
      expect(metrics).toMatch(/# HELP db_query_duration_seconds/);
      expect(metrics).toMatch(/# TYPE db_query_duration_seconds histogram/);
    });
  });
});

describe('Logger Integration', () => {
  it('should have module-specific loggers', async () => {
    const { combatLogger, spellLogger, progressionLogger } = await import('../../lib/logger.js');

    expect(combatLogger).toBeDefined();
    expect(spellLogger).toBeDefined();
    expect(progressionLogger).toBeDefined();
  });
});
