/**
 * Logger Utility Tests
 *
 * These tests demonstrate usage patterns and verify backward compatibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { logger } from './logger';

import type { LogMetadata } from './logger';

describe('Logger Utility', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
  });

  describe('Basic logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Structured logging with metadata', () => {
    it('should log with object metadata', () => {
      const metadata: LogMetadata = {
        userId: '123',
        action: 'login',
        timestamp: Date.now(),
      };

      logger.info('User action', metadata);
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should handle error objects in metadata', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', { operation: 'test', error });
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle complex nested metadata', () => {
      logger.info('Complex operation', {
        component: 'GameChat',
        props: {
          sessionId: 'abc123',
          characterId: 'def456',
        },
        performance: {
          duration: 150,
          cached: true,
        },
      });
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('Backward compatibility', () => {
    it('should handle old-style single argument calls', () => {
      logger.info('Old style message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should handle old-style multiple argument calls', () => {
      logger.info('Message with', 'multiple', 'arguments');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should handle error-only calls', () => {
      const error = new Error('Test error');
      logger.error(error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle old-style error with message', () => {
      const error = new Error('Test error');
      logger.error('Error occurred:', error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Usage patterns', () => {
    it('should support component logging pattern', () => {
      // Component initialization
      logger.debug('Component mounted', {
        component: 'GameChat',
        props: { sessionId: '123' },
      });

      // User action
      logger.info('User action', {
        component: 'GameChat',
        action: 'sendMessage',
        userId: '456',
      });

      // Warning
      logger.warn('Rate limit approaching', {
        component: 'GameChat',
        remaining: 5,
        limit: 100,
      });

      // Error
      logger.error('API call failed', {
        component: 'GameChat',
        endpoint: '/api/messages',
        status: 500,
      });

      expect(consoleSpy.debug).toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should support service logging pattern', () => {
      // Service operation
      logger.info('Database query executed', {
        service: 'DatabaseService',
        query: 'SELECT * FROM users',
        duration: 45,
      });

      // Service error
      const error = new Error('Connection timeout');
      logger.error('Service operation failed', {
        service: 'DatabaseService',
        operation: 'query',
        error,
      });

      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});
