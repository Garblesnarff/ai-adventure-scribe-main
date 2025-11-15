import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Adventure Scribe API',
      version: '1.1.0',
      description: `
        D&D 5E Mechanics API - Complete REST API for D&D 5th Edition game mechanics including:
        - **Combat System**: Initiative, turn order, attacks, damage, conditions
        - **Resource Management**: Spell slots, hit dice, inventory
        - **Character Progression**: Experience, leveling, class features
        - **Rest System**: Short and long rests with resource recovery
        - **Class Features**: Feature library, usage tracking, subclasses
      `,
      contact: {
        name: 'API Support',
        email: 'support@aiadventurescribe.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8888',
        description: 'Development server',
      },
      {
        url: 'https://api.aiadventurescribe.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      responses: {
        ValidationError: {
          description: 'Validation error - Request data is invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Validation failed: name is required',
                  },
                  details: {
                    type: 'object',
                    additionalProperties: true,
                  },
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Character not found',
                  },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Authentication required',
                  },
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Access denied - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Access denied',
                  },
                },
              },
            },
          },
        },
        RateLimitExceeded: {
          description: 'Too many requests - Rate limit exceeded',
          headers: {
            'Retry-After': {
              description: 'Seconds to wait before retrying',
              schema: {
                type: 'integer',
                example: 60,
              },
            },
          },
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'RateLimitError',
                      },
                      message: {
                        type: 'string',
                        example: 'Too many requests from this IP, please try again later',
                      },
                      code: {
                        type: 'string',
                        example: 'RATE_LIMIT_EXCEEDED',
                      },
                      statusCode: {
                        type: 'integer',
                        example: 429,
                      },
                      details: {
                        type: 'object',
                        properties: {
                          scope: {
                            type: 'string',
                            enum: ['ip', 'user'],
                            example: 'ip',
                            description: 'Whether the limit is per-IP or per-user',
                          },
                          limit: {
                            type: 'integer',
                            example: 60,
                            description: 'Maximum requests allowed in the time window',
                          },
                          window: {
                            type: 'integer',
                            example: 60,
                            description: 'Time window in seconds',
                          },
                          retryAfter: {
                            type: 'integer',
                            example: 45,
                            description: 'Seconds to wait before retrying',
                          },
                        },
                      },
                    },
                  },
                },
              },
              example: {
                error: {
                  name: 'RateLimitError',
                  message: 'Too many requests from this IP, please try again later',
                  code: 'RATE_LIMIT_EXCEEDED',
                  statusCode: 429,
                  details: {
                    scope: 'ip',
                    limit: 60,
                    window: 60,
                    retryAfter: 45,
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Internal server error',
                  },
                  details: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      schemas: {
        // Common schemas will be added via JSDoc in type files
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Combat',
        description: 'Combat initiative, attacks, damage, and conditions',
      },
      {
        name: 'Rest',
        description: 'Short rests, long rests, and hit dice management',
      },
      {
        name: 'Spell Slots',
        description: 'Spell slot tracking and management',
      },
      {
        name: 'Inventory',
        description: 'Item management, equipment, and encumbrance',
      },
      {
        name: 'Progression',
        description: 'Experience points, leveling, and character advancement',
      },
      {
        name: 'Class Features',
        description: 'Class feature library, usage tracking, and subclasses',
      },
      {
        name: 'Characters',
        description: 'Character creation, management, and spells',
      },
      {
        name: 'Campaigns',
        description: 'Campaign creation and management',
      },
      {
        name: 'Sessions',
        description: 'Game session tracking and management',
      },
      {
        name: 'Spells',
        description: 'Spell library and progression tables',
      },
      {
        name: 'AI',
        description: 'AI-powered narrative generation',
      },
      {
        name: 'Images',
        description: 'AI image generation',
      },
      {
        name: 'LLM',
        description: 'Large language model chat interactions',
      },
      {
        name: 'Personality',
        description: 'Random personality traits, ideals, bonds, and flaws',
      },
      {
        name: 'Encounters',
        description: 'Encounter difficulty tracking and telemetry',
      },
      {
        name: 'Admin',
        description: 'Administrative operations (admin only)',
      },
      {
        name: 'Billing',
        description: 'Stripe payment and subscription management',
      },
      {
        name: 'Observability',
        description: 'Frontend error and metric reporting',
      },
      {
        name: 'Blog',
        description: 'Blog post management and publishing',
      },
    ],
  },
  apis: [
    './server/src/routes/v1/*.ts',
    './server/src/types/*.ts',
  ],
};

export const specs = swaggerJsdoc(options);
