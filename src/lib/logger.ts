/**
 * Logger Utility
 *
 * Centralized logging with support for log levels, structured metadata,
 * and environment-aware behavior.
 *
 * @example
 * // Basic usage
 * logger.info('User logged in');
 * logger.warn('API rate limit approaching');
 * logger.error('Database connection failed');
 *
 * @example
 * // With context/metadata
 * logger.info('User action', { userId: '123', action: 'purchase' });
 * logger.error('API call failed', { endpoint: '/api/v1/users', status: 500 });
 *
 * @example
 * // With component context
 * logger.debug('Rendering component', { component: 'GameChat', props: { sessionId } });
 *
 * @example
 * // Error logging with stack traces
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logger.error('Operation failed', { operation: 'riskyOperation', error });
 * }
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Metadata that can be attached to log entries for structured logging
 */
export type LogMetadata = Record<string, unknown>;

/**
 * Configuration for which log levels are enabled
 * Debug logs are disabled in production by default
 */
const enabledLevels: Record<LogLevel, boolean> = {
  debug: import.meta.env.MODE !== 'production',
  info: true,
  warn: true,
  error: true,
};

/**
 * Check if we're in development mode
 */
const isDevelopment = import.meta.env.MODE !== 'production';

/**
 * Formats a log message with timestamp, level prefix, and optional metadata
 */
function format(level: LogLevel, args: unknown[]): unknown[] {
  const timestamp = isDevelopment ? new Date().toISOString() : '';
  const prefix = `[${level.toUpperCase()}]`;

  if (isDevelopment && timestamp) {
    return [timestamp, prefix, ...args];
  }

  return [prefix, ...args];
}

/**
 * Creates a replacer function for JSON.stringify that handles circular references
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * Formats metadata for better console readability with circular reference handling
 */
function formatMetadata(metadata?: LogMetadata): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }

  try {
    if (isDevelopment) {
      // In development, pretty print the metadata with circular reference handling
      return '\n' + JSON.stringify(metadata, getCircularReplacer(), 2);
    }

    // In production, compact format with circular reference handling
    return JSON.stringify(metadata, getCircularReplacer());
  } catch (error) {
    // Fallback if JSON.stringify still fails for any reason
    return `[Unable to serialize metadata: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Checks if a value is a DOM node
 */
function isDOMNode(value: unknown): value is Node {
  return typeof Node !== 'undefined' && value instanceof Node;
}

/**
 * Checks if a value is a React element
 */
function isReactElement(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$$typeof' in value &&
    typeof (value as { $$typeof: unknown }).$$typeof === 'symbol'
  );
}

/**
 * Handles error objects, DOM nodes, and React elements in metadata
 */
function processMetadata(metadata?: LogMetadata): LogMetadata | undefined {
  if (!metadata) return undefined;

  const processed = { ...metadata };

  // Convert Error objects, DOM nodes, and React elements to structured data
  Object.keys(processed).forEach((key) => {
    const value = processed[key];

    if (value instanceof Error) {
      // Handle Error objects
      processed[key] = {
        name: value.name,
        message: value.message,
        stack: isDevelopment ? value.stack : undefined,
      };
    } else if (isDOMNode(value)) {
      // Handle DOM nodes
      const element = value as Element;
      processed[key] = {
        __type: 'DOMNode',
        nodeType: value.nodeType,
        nodeName: value.nodeName,
        tagName: element.tagName || undefined,
        id: (element as HTMLElement).id || undefined,
        className: (element as HTMLElement).className || undefined,
      };
    } else if (isReactElement(value)) {
      // Handle React elements
      processed[key] = {
        __type: 'ReactElement',
        type:
          typeof (value as { type?: unknown }).type === 'function'
            ? (value as { type: { name?: string } }).type.name || 'Component'
            : (value as { type?: unknown }).type,
      };
    } else if (typeof value === 'object' && value !== null && 'current' in value) {
      // Handle React refs (objects with 'current' property that might contain DOM nodes)
      const ref = value as { current: unknown };
      if (isDOMNode(ref.current)) {
        const element = ref.current as Element;
        processed[key] = {
          __type: 'ReactRef',
          current: {
            __type: 'DOMNode',
            nodeType: ref.current.nodeType,
            nodeName: ref.current.nodeName,
            tagName: element.tagName || undefined,
            id: (element as HTMLElement).id || undefined,
            className: (element as HTMLElement).className || undefined,
          },
        };
      }
    }
  });

  return processed;
}

/**
 * Logger instance with support for multiple log levels and structured metadata
 */
export const logger = {
  /**
   * Debug level logging (disabled in production)
   * Use for detailed diagnostic information
   *
   * @param message - The log message (or any value for backward compatibility)
   * @param metadata - Optional structured data to include
   *
   * @example
   * logger.debug('Cache hit', { key: 'user:123', ttl: 300 });
   *
   * @example
   * // Backward compatible usage
   * logger.debug('Old style log', 'additional', 'args');
   */
  debug: (message: unknown, ...rest: unknown[]) => {
    if (enabledLevels.debug) {
      // If first arg is a string and second is an object (new signature)
      if (
        typeof message === 'string' &&
        rest.length === 1 &&
        typeof rest[0] === 'object' &&
        rest[0] !== null &&
        !Array.isArray(rest[0])
      ) {
        const processed = processMetadata(rest[0] as LogMetadata);
        const formatted = formatMetadata(processed);
        console.debug(...format('debug', [message, formatted].filter(Boolean)));
      } else {
        // Backward compatible: pass all args as-is
        console.debug(...format('debug', [message, ...rest]));
      }
    }
  },

  /**
   * Info level logging
   * Use for general informational messages
   *
   * @param message - The log message (or any value for backward compatibility)
   * @param metadata - Optional structured data to include
   *
   * @example
   * logger.info('User logged in', { userId: '123', method: 'oauth' });
   *
   * @example
   * // Backward compatible usage
   * logger.info('Old style log', 'additional', 'args');
   */
  info: (message: unknown, ...rest: unknown[]) => {
    if (enabledLevels.info) {
      // If first arg is a string and second is an object (new signature)
      if (
        typeof message === 'string' &&
        rest.length === 1 &&
        typeof rest[0] === 'object' &&
        rest[0] !== null &&
        !Array.isArray(rest[0])
      ) {
        const processed = processMetadata(rest[0] as LogMetadata);
        const formatted = formatMetadata(processed);
        console.info(...format('info', [message, formatted].filter(Boolean)));
      } else {
        // Backward compatible: pass all args as-is
        console.info(...format('info', [message, ...rest]));
      }
    }
  },

  /**
   * Warning level logging
   * Use for potentially harmful situations
   *
   * @param message - The log message (or any value for backward compatibility)
   * @param metadata - Optional structured data to include
   *
   * @example
   * logger.warn('API rate limit approaching', { remaining: 5, limit: 100 });
   *
   * @example
   * // Backward compatible usage
   * logger.warn('Old style log', 'additional', 'args');
   */
  warn: (message: unknown, ...rest: unknown[]) => {
    if (enabledLevels.warn) {
      // If first arg is a string and second is an object (new signature)
      if (
        typeof message === 'string' &&
        rest.length === 1 &&
        typeof rest[0] === 'object' &&
        rest[0] !== null &&
        !Array.isArray(rest[0])
      ) {
        const processed = processMetadata(rest[0] as LogMetadata);
        const formatted = formatMetadata(processed);
        console.warn(...format('warn', [message, formatted].filter(Boolean)));
      } else {
        // Backward compatible: pass all args as-is
        console.warn(...format('warn', [message, ...rest]));
      }
    }
  },

  /**
   * Error level logging
   * Use for error events that might still allow the application to continue
   *
   * @param message - The log message (or any value for backward compatibility)
   * @param metadata - Optional structured data to include (can include Error objects)
   *
   * @example
   * logger.error('Database query failed', { query: 'SELECT ...', error });
   *
   * @example
   * // Backward compatible usage
   * logger.error(error); // Pass error directly
   * logger.error('Error:', error); // Old style
   */
  error: (message: unknown, ...rest: unknown[]) => {
    if (enabledLevels.error) {
      // If first arg is a string and second is an object (new signature)
      if (
        typeof message === 'string' &&
        rest.length === 1 &&
        typeof rest[0] === 'object' &&
        rest[0] !== null &&
        !Array.isArray(rest[0])
      ) {
        const processed = processMetadata(rest[0] as LogMetadata);
        const formatted = formatMetadata(processed);
        console.error(...format('error', [message, formatted].filter(Boolean)));
      } else {
        // Backward compatible: pass all args as-is
        console.error(...format('error', [message, ...rest]));
      }
    }
  },
};

export default logger;
