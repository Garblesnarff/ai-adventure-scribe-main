Dashboards

This directory contains example dashboard JSONs and references for setting up observability across services. Import into your metrics platform of choice (Grafana, DataDog, New Relic, etc.) and adapt queries to your log/metrics schema.

Key Charts
- HTTP Latency (p50/p95/p99) by route
- Error Rate (5xx ratio) by service
- WebSocket connections and disconnects
- AI Provider usage/cost (requests, errors)

Variables
- environment (development, staging, production)
- service (frontend, backend, edge, crewai)
- route/function
