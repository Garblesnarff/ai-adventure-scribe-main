/**
 * Logger Usage Examples
 *
 * This file demonstrates various usage patterns for the logger utility.
 * These are practical examples from common use cases in the application.
 */

import { logger } from './logger';

/**
 * EXAMPLE 1: Basic Logging
 * Simple log messages without additional context
 */
export function basicLoggingExamples() {
  // Debug: Detailed diagnostic info (disabled in production)
  logger.debug('Component mounted');

  // Info: General informational messages
  logger.info('User logged in');

  // Warn: Potentially harmful situations
  logger.warn('API rate limit approaching');

  // Error: Error events
  logger.error('Database connection failed');
}

/**
 * EXAMPLE 2: Structured Logging with Metadata
 * Add context and structured data to logs for better debugging
 */
export function structuredLoggingExamples() {
  // Component lifecycle with context
  logger.debug('Component rendering', {
    component: 'GameChat',
    props: { sessionId: 'abc123', characterId: 'def456' },
    state: { isLoading: false, messageCount: 42 },
  });

  // User actions with identifiers
  logger.info('User action performed', {
    userId: 'user-123',
    action: 'purchase',
    itemId: 'item-456',
    amount: 99.99,
  });

  // API calls with timing
  logger.info('API call completed', {
    endpoint: '/api/v1/campaigns',
    method: 'POST',
    status: 201,
    duration: 145,
    cached: false,
  });

  // Performance metrics
  logger.info('Memory query completed', {
    operation: 'semanticSearch',
    resultsCount: 15,
    durationMs: 42,
    cacheHit: true,
  });
}

/**
 * EXAMPLE 3: Error Logging with Error Objects
 * Properly handle and log error objects with context
 */
export function errorLoggingExamples() {
  // Catching and logging errors
  try {
    // Some risky operation
    throw new Error('Database query timeout');
  } catch (error) {
    // Error with context (error objects are automatically processed)
    logger.error('Database operation failed', {
      operation: 'fetchUserData',
      userId: '123',
      query: 'SELECT * FROM users WHERE id = ?',
      error, // Error object included in metadata
    });
  }

  // API errors with full context
  try {
    // API call that fails
    throw new Error('Connection refused');
  } catch (error) {
    logger.error('API call failed', {
      service: 'gemini-api',
      endpoint: '/v1/generate',
      method: 'POST',
      retryCount: 3,
      error,
    });
  }
}

/**
 * EXAMPLE 4: Service Layer Logging
 * Logging patterns for service classes
 */
export class ExampleService {
  async fetchData(userId: string) {
    logger.debug('Service method called', {
      service: 'ExampleService',
      method: 'fetchData',
      userId,
    });

    try {
      // Simulate operation
      const startTime = Date.now();
      const data = await this.performFetch(userId);
      const duration = Date.now() - startTime;

      logger.info('Data fetched successfully', {
        service: 'ExampleService',
        method: 'fetchData',
        userId,
        recordCount: data.length,
        durationMs: duration,
      });

      return data;
    } catch (error) {
      logger.error('Data fetch failed', {
        service: 'ExampleService',
        method: 'fetchData',
        userId,
        error,
      });
      throw error;
    }
  }

  private async performFetch(userId: string) {
    // Simulate fetch
    return [{ id: userId, name: 'Test' }];
  }
}

/**
 * EXAMPLE 5: Component Logging Pattern
 * React component lifecycle and event logging
 */
export function componentLoggingExample() {
  // Component mount
  logger.debug('Component mounted', {
    component: 'CampaignHub',
    props: { campaignId: '123' },
  });

  // User interaction
  logger.info('Button clicked', {
    component: 'CampaignHub',
    button: 'startSession',
    campaignId: '123',
  });

  // State change
  logger.debug('State updated', {
    component: 'CampaignHub',
    field: 'isLoading',
    value: true,
  });

  // Component unmount
  logger.debug('Component unmounted', {
    component: 'CampaignHub',
    sessionDuration: 145000,
  });
}

/**
 * EXAMPLE 6: AI Agent Logging
 * Logging for AI agent operations and messaging
 */
export function agentLoggingExamples() {
  // Agent task execution
  logger.info('Agent task started', {
    agent: 'DungeonMasterAgent',
    taskId: 'task-123',
    taskType: 'generateResponse',
    context: { sessionId: 'abc', campaignId: 'def' },
  });

  // Agent reasoning
  logger.debug('Agent reasoning', {
    agent: 'RulesInterpreterAgent',
    rule: 'combatAdvantage',
    conditions: ['attacker_hidden', 'target_prone'],
    result: 'advantage_granted',
  });

  // Agent message sent
  logger.info('Agent message sent', {
    agent: 'DungeonMasterAgent',
    messageId: 'msg-456',
    recipientAgent: 'RulesInterpreterAgent',
    messageType: 'VALIDATE_ACTION',
  });

  // Agent error with retry
  logger.warn('Agent operation failed, retrying', {
    agent: 'DungeonMasterAgent',
    operation: 'generateNarrative',
    attempt: 2,
    maxAttempts: 3,
    error: new Error('Rate limit exceeded'),
  });
}

/**
 * EXAMPLE 7: Performance Monitoring
 * Track performance metrics and optimization opportunities
 */
export function performanceLoggingExamples() {
  // Slow operation warning
  logger.warn('Slow operation detected', {
    operation: 'memoryRetrieval',
    durationMs: 850,
    threshold: 500,
    recommendations: ['add_caching', 'optimize_query'],
  });

  // Cache metrics
  logger.debug('Cache statistics', {
    component: 'MemoryService',
    hits: 142,
    misses: 8,
    hitRate: 94.67,
    cacheSize: 250,
  });

  // Resource usage
  logger.info('Resource usage snapshot', {
    component: 'MessageQueue',
    queueSize: 23,
    processingRate: 15.5,
    averageProcessTime: 65,
  });
}

/**
 * EXAMPLE 8: Backward Compatible Usage
 * Old-style logging still works for gradual migration
 */
export function backwardCompatibleExamples() {
  // Old style: multiple arguments
  logger.info('User', 'logged in', 'successfully');

  // Old style: error only
  const error = new Error('Something went wrong');
  logger.error(error);

  // Old style: message with error
  logger.error('Error occurred:', error);

  // Mixed: gradually migrating to new style
  logger.info('Old call with', 'multiple args'); // Old style
  logger.info('New call', { component: 'Example' }); // New style
}

/**
 * EXAMPLE 9: Database Operation Logging
 * Track database queries and operations
 */
export function databaseLoggingExamples() {
  // Query execution
  logger.debug('Executing database query', {
    service: 'DatabaseService',
    table: 'campaigns',
    operation: 'SELECT',
    filters: { userId: '123', active: true },
  });

  // Query completed
  logger.info('Query completed', {
    service: 'DatabaseService',
    table: 'campaigns',
    operation: 'SELECT',
    rowCount: 5,
    durationMs: 23,
  });

  // Migration
  logger.info('Database migration applied', {
    service: 'DatabaseService',
    migrationName: 'add_character_notes',
    version: '20240115',
    durationMs: 156,
  });

  // Connection pool warning
  logger.warn('Connection pool nearly exhausted', {
    service: 'DatabaseService',
    activeConnections: 18,
    maxConnections: 20,
    waitingQueries: 3,
  });
}

/**
 * EXAMPLE 10: Real-time/WebSocket Logging
 * Track WebSocket connections and real-time events
 */
export function realtimeLoggingExamples() {
  // Connection established
  logger.info('WebSocket connected', {
    service: 'RealtimeService',
    channel: 'campaign:123',
    userId: 'user-456',
  });

  // Message received
  logger.debug('WebSocket message received', {
    service: 'RealtimeService',
    channel: 'campaign:123',
    messageType: 'GAME_STATE_UPDATE',
    payloadSize: 1024,
  });

  // Connection error
  logger.error('WebSocket connection failed', {
    service: 'RealtimeService',
    channel: 'campaign:123',
    error: new Error('Connection timeout'),
    reconnectAttempt: 2,
  });

  // Subscription change
  logger.info('Channel subscription updated', {
    service: 'RealtimeService',
    action: 'subscribe',
    channels: ['campaign:123', 'user:456'],
  });
}
