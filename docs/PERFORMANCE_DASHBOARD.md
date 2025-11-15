# Performance Dashboard

This document describes the performance monitoring system for AI Adventure Scribe's D&D mechanics.

## Overview

The application exposes Prometheus-compatible metrics and structured logging for monitoring performance, errors, and system health.

## Endpoints

### `/metrics`

Prometheus metrics endpoint exposing performance data.

**Access:** `http://localhost:5000/metrics`

**Content-Type:** `text/plain; version=0.0.4; charset=utf-8`

### `/health`

Health check endpoint for monitoring system status and database connectivity.

**Access:** `http://localhost:5000/health`

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T16:00:00.000Z",
  "uptime": 1234.567,
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321,
    "external": 12345678,
    "arrayBuffers": 1234567
  }
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "error": "Connection timeout"
}
```

## Metrics Exposed

### HTTP Metrics

#### `http_request_duration_seconds`
- **Type:** Histogram
- **Description:** Duration of HTTP requests in seconds
- **Labels:** `method`, `route`, `status_code`
- **Buckets:** 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s, 5s

#### `http_requests_total`
- **Type:** Counter
- **Description:** Total number of HTTP requests
- **Labels:** `method`, `route`, `status_code`

### Database Metrics

#### `db_query_duration_seconds`
- **Type:** Histogram
- **Description:** Duration of database queries in seconds
- **Labels:** `operation`, `table`
- **Buckets:** 0.001s, 0.01s, 0.05s, 0.1s, 0.5s, 1s

#### `db_queries_total`
- **Type:** Counter
- **Description:** Total number of database queries
- **Labels:** `operation`, `table`, `success`

### Combat Metrics

#### `combat_encounters_active`
- **Type:** Gauge
- **Description:** Number of active combat encounters
- **Labels:** None

#### `combat_attacks_total`
- **Type:** Counter
- **Description:** Total number of combat attacks
- **Labels:** `hit`, `critical`

### Service Metrics

#### `service_method_duration_seconds`
- **Type:** Histogram
- **Description:** Duration of service method calls
- **Labels:** `service`, `method`
- **Buckets:** 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s

#### `service_errors_total`
- **Type:** Counter
- **Description:** Total number of service errors
- **Labels:** `service`, `error_type`

## Prometheus Query Examples

### Average Request Duration by Endpoint
```promql
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

### 95th Percentile Request Duration
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Slow Queries (> 100ms)
```promql
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.1
```

### Request Rate by Status Code
```promql
sum(rate(http_requests_total[5m])) by (status_code)
```

### Error Rate
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
```

### Service Error Rate
```promql
sum(rate(service_errors_total[5m])) by (service, error_type)
```

### Database Query Success Rate
```promql
sum(rate(db_queries_total{success="true"}[5m])) / sum(rate(db_queries_total[5m]))
```

### Active Combat Encounters
```promql
combat_encounters_active
```

### Combat Attack Rate
```promql
sum(rate(combat_attacks_total[5m])) by (hit, critical)
```

## Alert Thresholds

### Critical Alerts

- **High Error Rate:** > 5% of requests returning 5xx status codes
  ```promql
  sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
  ```

- **Slow Requests:** 95th percentile > 2 seconds
  ```promql
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  ```

- **Database Connectivity:** Health check returning unhealthy
  ```promql
  up{job="ai-adventure-scribe"} == 0
  ```

### Warning Alerts

- **Elevated Response Time:** 95th percentile > 1 second
  ```promql
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
  ```

- **Slow Database Queries:** 95th percentile > 100ms
  ```promql
  histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.1
  ```

- **High Memory Usage:** > 1GB heap used
  ```promql
  process_heap_bytes > 1073741824
  ```

- **Service Method Errors:** > 1% error rate
  ```promql
  sum(rate(service_errors_total[5m])) / sum(rate(service_method_duration_seconds_count[5m])) > 0.01
  ```

## Grafana Dashboard

### Basic Dashboard JSON

```json
{
  "dashboard": {
    "title": "AI Adventure Scribe - D&D Mechanics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (status_code)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Request Duration (95th percentile)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Database Query Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) by (operation, table)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Combat Encounters",
        "targets": [
          {
            "expr": "combat_encounters_active"
          }
        ],
        "type": "gauge"
      }
    ]
  }
}
```

## Logging

### Log Locations

- **Error Logs:** `logs/error.log`
- **Combined Logs:** `logs/combined.log`
- **Console:** stdout/stderr (development)

### Log Levels

- `error`: Error conditions
- `warn`: Warning conditions (e.g., slow queries)
- `info`: Informational messages
- `debug`: Debug-level messages (development only)

### Structured Log Format

All logs are output in JSON format with the following structure:

```json
{
  "level": "error",
  "message": "Database query failed",
  "timestamp": "2025-11-14T16:00:00.000Z",
  "service": "ai-adventure-scribe",
  "operation": "select",
  "table": "character_progression",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\n    at ..."
}
```

### Module-Specific Loggers

- `combatLogger`: Combat system logs
- `spellLogger`: Spell system logs
- `progressionLogger`: Character progression logs

## Performance Baselines

### Expected Performance

- **Request Duration (median):** < 50ms
- **Request Duration (95th percentile):** < 500ms
- **Database Query Duration (median):** < 10ms
- **Database Query Duration (95th percentile):** < 100ms

### Slow Query Threshold

Queries taking longer than **100ms** are automatically logged as warnings.

### Slow Service Method Threshold

Service methods taking longer than **500ms** are automatically logged as warnings.

## Usage Examples

### Instrumenting a Service Method

#### Using the Decorator (requires experimentalDecorators)

```typescript
import { instrument } from '../lib/instrument.js';

export class CombatService {
  @instrument('combat', 'startEncounter')
  static async startEncounter(encounterId: number) {
    // Method implementation
  }
}
```

#### Using the Wrapper Function

```typescript
import { instrumentAsync } from '../lib/instrument.js';

export const startEncounter = instrumentAsync(
  'combat',
  'startEncounter',
  async (encounterId: number) => {
    // Method implementation
  }
);
```

### Wrapping Database Queries

```typescript
import { wrapQueryWithMetrics } from '../lib/db-with-metrics.js';
import { db } from '../lib/db-with-metrics.js';
import { characterProgression } from '../../../db/schema.js';

const result = await wrapQueryWithMetrics('select', 'character_progression')(
  async () => {
    return await db.select().from(characterProgression).where(...);
  }
);
```

### Using Module Loggers

```typescript
import { combatLogger } from '../lib/logger.js';

combatLogger.info('Combat encounter started', {
  encounterId: 123,
  participantCount: 5,
});

combatLogger.warn('Combat took longer than expected', {
  encounterId: 123,
  duration: '5.234s',
});
```

## Integration with Prometheus

### Prometheus Configuration

Add the following to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'ai-adventure-scribe'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Running Prometheus Locally

```bash
# Download and extract Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64

# Run Prometheus
./prometheus --config.file=prometheus.yml
```

Access Prometheus at: `http://localhost:9090`

## Integration with Grafana

### Running Grafana Locally

```bash
# Using Docker
docker run -d -p 3000:3000 --name grafana grafana/grafana-oss

# Or install from package
sudo apt-get install -y grafana
sudo systemctl start grafana-server
```

Access Grafana at: `http://localhost:3000` (default credentials: admin/admin)

### Adding Prometheus as Data Source

1. Navigate to Configuration > Data Sources
2. Click "Add data source"
3. Select "Prometheus"
4. Set URL to `http://localhost:9090`
5. Click "Save & Test"

## Next Steps

1. **Set up Prometheus:** Configure Prometheus to scrape the `/metrics` endpoint
2. **Create Grafana Dashboards:** Build custom dashboards for your specific needs
3. **Configure Alerts:** Set up alerting rules in Prometheus or Grafana
4. **Optimize Slow Queries:** Review slow query logs and optimize database indexes
5. **Profile Services:** Use service method metrics to identify bottlenecks
6. **Monitor in Production:** Deploy monitoring stack to production environment

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [prom-client](https://github.com/siimon/prom-client)
