import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  registers: [register],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1], // 1ms to 1s
});

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'success'],
  registers: [register],
});

// Combat Metrics
export const combatEncountersActive = new Gauge({
  name: 'combat_encounters_active',
  help: 'Number of active combat encounters',
  registers: [register],
});

export const combatAttacksTotal = new Counter({
  name: 'combat_attacks_total',
  help: 'Total number of combat attacks',
  labelNames: ['hit', 'critical'],
  registers: [register],
});

// Service Metrics
export const serviceMethodDuration = new Histogram({
  name: 'service_method_duration_seconds',
  help: 'Duration of service method calls',
  labelNames: ['service', 'method'],
  registers: [register],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2], // 10ms to 2s
});

export const serviceErrorsTotal = new Counter({
  name: 'service_errors_total',
  help: 'Total number of service errors',
  labelNames: ['service', 'error_type'],
  registers: [register],
});
