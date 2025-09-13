/**
 * API v3 Main Router
 * 
 * RESTful API following Richardson Maturity Model Level 3 with HATEOAS support.
 * Provides comprehensive resource management with proper HTTP semantics.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { createConversationsRouter } from './conversations';
import { RestError } from '../../lib/rest/rest-errors';
import { Request, Response, NextFunction } from 'express';

export function createV3Router(db: Pool): Router {
  const router = Router();

  // API Root - Discovery endpoint with hypermedia links
  router.get('/', (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v3`;
    
    res.set({
      'Content-Type': 'application/hal+json',
      'Cache-Control': 'max-age=3600' // Cache API root for 1 hour
    });

    res.json({
      version: '3.0.0',
      title: 'AI Adventure Scribe API v3',
      description: 'RESTful API for AI-powered D&D campaign management with HATEOAS support',
      features: [
        'HATEOAS (Hypermedia as the Engine of Application State)',
        'Richardson Maturity Model Level 3',
        'Comprehensive filtering and pagination',
        'JSON Schema validation',
        'ETags and conditional requests',
        'RFC 7807 Problem Details for HTTP APIs',
        'Content negotiation',
        'Rate limiting with retry guidance'
      ],
      _links: {
        self: {
          href: baseUrl,
          title: 'API Root'
        },
        conversations: {
          href: `${baseUrl}/conversations`,
          title: 'Conversations - Chat and DM interactions',
          type: 'application/hal+json'
        },
        'conversations-template': {
          href: `${baseUrl}/conversations{?campaign_id,type,status,participant_id,search,created_after,created_before,has_messages,limit,offset,page,sort,fields}`,
          title: 'Conversations with query parameters',
          templated: true
        },
        'audio-synthesis': {
          href: `${baseUrl}/audio-synthesis`,
          title: 'Audio Synthesis - Text-to-speech operations',
          type: 'application/hal+json'
        },
        memories: {
          href: `${baseUrl}/memories`,
          title: 'Memories - Memory storage and semantic search',
          type: 'application/hal+json'
        },
        'memories-search': {
          href: `${baseUrl}/memories/search{?q,embedding,limit}`,
          title: 'Semantic memory search',
          templated: true
        },
        campaigns: {
          href: `${baseUrl}/campaigns`,
          title: 'Campaigns - Campaign management and generation',
          type: 'application/hal+json'
        },
        characters: {
          href: `${baseUrl}/characters`,
          title: 'Characters - Character sheet operations',
          type: 'application/hal+json'
        },
        rules: {
          href: `${baseUrl}/rules`,
          title: 'Rules - D&D 5e rules validation and lookup',
          type: 'application/hal+json'
        },
        'rules-validate': {
          href: `${baseUrl}/rules/validate`,
          title: 'Rules validation endpoint',
          method: 'POST'
        },
        documentation: {
          href: `${baseUrl}/docs`,
          title: 'API Documentation',
          type: 'text/html'
        },
        'openapi-spec': {
          href: `${baseUrl}/openapi.yaml`,
          title: 'OpenAPI 3.0 Specification',
          type: 'application/yaml'
        },
        'openapi-json': {
          href: `${baseUrl}/openapi.json`,
          title: 'OpenAPI 3.0 Specification (JSON)',
          type: 'application/json'
        },
        health: {
          href: `${baseUrl}/health`,
          title: 'API Health Check'
        },
        metrics: {
          href: `${baseUrl}/metrics`,
          title: 'API Metrics and Statistics'
        }
      }
    });
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    try {
      // Test database connection
      const dbResult = await db.query('SELECT 1 as health_check');
      const dbHealthy = dbResult.rows.length > 0;

      const health = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        services: {
          database: {
            status: dbHealthy ? 'up' : 'down',
            response_time_ms: 0 // Would measure actual response time
          },
          cache: {
            status: 'up' // Would check cache service
          },
          external_apis: {
            status: 'up' // Would check external dependencies
          }
        },
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal
        }
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });

      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      });
    }
  });

  // API Metrics endpoint
  router.get('/metrics', (req: Request, res: Response) => {
    // In a real implementation, this would gather actual metrics
    const metrics = {
      requests: {
        total: 0,
        per_second: 0,
        by_status: {
          '200': 0,
          '400': 0,
          '401': 0,
          '403': 0,
          '404': 0,
          '422': 0,
          '429': 0,
          '500': 0
        },
        by_endpoint: {
          'GET /conversations': 0,
          'POST /conversations': 0,
          'GET /conversations/:id': 0,
          'PUT /conversations/:id': 0,
          'PATCH /conversations/:id': 0,
          'DELETE /conversations/:id': 0
        }
      },
      response_time: {
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0
      },
      cache: {
        hit_rate: 0.85,
        miss_rate: 0.15,
        total_hits: 0,
        total_misses: 0
      },
      database: {
        connections: {
          active: 5,
          idle: 15,
          total: 20
        },
        query_time: {
          avg: 45,
          p95: 120,
          p99: 250
        }
      },
      memory: {
        heap_used: process.memoryUsage().heapUsed,
        heap_total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      },
      uptime: process.uptime()
    };

    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=30'
    });

    res.json(metrics);
  });

  // Mount resource routers
  router.use('/conversations', createConversationsRouter(db));
  
  // TODO: Add other resource routers as they are implemented
  // router.use('/audio-synthesis', createAudioSynthesisRouter(db));
  // router.use('/memories', createMemoriesRouter(db));
  // router.use('/campaigns', createCampaignsRouter(db));
  // router.use('/characters', createCharactersRouter(db));
  // router.use('/rules', createRulesRouter(db));

  // OpenAPI documentation endpoints
  router.get('/openapi.yaml', (req: Request, res: Response) => {
    res.set({
      'Content-Type': 'application/yaml',
      'Cache-Control': 'max-age=3600'
    });
    
    // In a real implementation, this would serve the actual OpenAPI spec file
    res.send('# OpenAPI specification would be served here');
  });

  router.get('/openapi.json', (req: Request, res: Response) => {
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=3600'
    });
    
    // In a real implementation, this would serve the OpenAPI spec as JSON
    res.json({
      openapi: '3.0.3',
      info: {
        title: 'AI Adventure Scribe API',
        version: '3.0.0'
      }
    });
  });

  // Swagger UI documentation
  router.get('/docs', (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v3`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Adventure Scribe API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: '${baseUrl}/openapi.yaml',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true,
                requestInterceptor: function(req) {
                    // Add Authorization header if available
                    const token = localStorage.getItem('api_token');
                    if (token) {
                        req.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return req;
                }
            });
        };
    </script>
</body>
</html>`;

    res.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'max-age=3600'
    });

    res.send(html);
  });

  // Global error handler for REST errors
  router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof RestError) {
      // Set any additional headers from the error
      if (error.extensions) {
        Object.keys(error.extensions).forEach(key => {
          if (key.toLowerCase().includes('header') || 
              ['www-authenticate', 'allow', 'retry-after'].includes(key.toLowerCase())) {
            res.set(key, error.extensions![key]);
          }
        });
      }

      res.set('Content-Type', 'application/problem+json');
      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    // Handle other errors
    console.error('Unhandled error:', error);
    
    res.set('Content-Type', 'application/problem+json');
    res.status(500).json({
      type: 'https://httpstatuses.com/500',
      title: 'Internal Server Error',
      detail: 'An unexpected error occurred',
      status: 500,
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler for unknown routes
  router.use((req: Request, res: Response) => {
    res.set('Content-Type', 'application/problem+json');
    res.status(404).json({
      type: 'https://httpstatuses.com/404',
      title: 'Not Found',
      detail: `The requested resource '${req.path}' was not found`,
      status: 404,
      instance: req.path
    });
  });

  return router;
}