/**
 * BFF (Backend-for-Frontend) Middleware
 * 
 * Provides React-optimized middleware including:
 * - Request coalescing and deduplication
 * - Response shaping for React components
 * - Frontend-aware caching strategies
 * - Performance optimization for React patterns
 * - Error handling optimized for React error boundaries
 */

import { Request, Response, NextFunction } from 'express';
import { BFFError, BFFCacheConfig, BFFWebSocketData } from '../types';

// Request deduplication cache
const requestCache = new Map<string, Promise<any>>();
const requestTimestamps = new Map<string, number>();

// Performance metrics
interface BFFMetrics {
  requestCount: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  coalescedRequests: number;
}

const metrics: BFFMetrics = {
  requestCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  coalescedRequests: 0
};

/**
 * Request coalescing middleware
 * Merges identical concurrent requests to prevent redundant processing
 */
export const requestCoalescingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const cacheKey = generateRequestCacheKey(req);
  const now = Date.now();
  
  // Clean up old requests (older than 30 seconds)
  for (const [key, timestamp] of requestTimestamps.entries()) {
    if (now - timestamp > 30000) {
      requestCache.delete(key);
      requestTimestamps.delete(key);
    }
  }

  // Check if we have an ongoing request
  if (requestCache.has(cacheKey)) {
    metrics.coalescedRequests++;
    console.log(`🔄 BFF: Coalescing request ${cacheKey}`);
    
    requestCache.get(cacheKey)?.then((data) => {
      res.json(data);
    }).catch((error) => {
      res.status(500).json(createBFFError('COALESCED_REQUEST_ERROR', error.message, req));
    });
    return;
  }

  // Store the request promise
  let resolveRequest: (value: any) => void;
  let rejectRequest: (error: any) => void;
  
  const requestPromise = new Promise((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });
  
  requestCache.set(cacheKey, requestPromise);
  requestTimestamps.set(cacheKey, now);
  
  // Override res.json to capture the response
  const originalJson = res.json;
  res.json = function(data: any) {
    resolveRequest(data);
    requestCache.delete(cacheKey);
    requestTimestamps.delete(cacheKey);
    return originalJson.call(this, data);
  };
  
  // Override error handling
  const originalStatus = res.status;
  res.status = function(code: number) {
    if (code >= 400) {
      rejectRequest(new Error(`Request failed with status ${code}`));
      requestCache.delete(cacheKey);
      requestTimestamps.delete(cacheKey);
    }
    return originalStatus.call(this, code);
  };
  
  next();
};

/**
 * React-optimized response shaping middleware
 * Formats responses to match React component prop expectations
 */
export const reactResponseShapingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Shape response for React components
    const shapedData = shapeResponseForReact(data, req);
    
    // Add React-specific metadata
    const responseWithMetadata = {
      ...shapedData,
      _bff: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || generateRequestId(),
        cacheability: getCacheabilityInfo(req),
        optimizations: getOptimizationHints(req, shapedData)
      }
    };
    
    return originalJson.call(this, responseWithMetadata);
  };
  
  next();
};

/**
 * Frontend-aware caching middleware
 * Implements caching strategies optimized for React patterns
 */
export const bffCachingMiddleware = (config: BFFCacheConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = config.key || generateCacheKey(req);
    
    // Check cache based on strategy
    checkCache(cacheKey, config).then((cachedData) => {
      if (cachedData) {
        metrics.cacheHits++;
        console.log(`💾 BFF Cache Hit: ${cacheKey}`);
        res.json({
          ...cachedData,
          _bff: {
            ...cachedData._bff,
            cacheHit: true,
            cacheAge: Date.now() - cachedData._bff.cachedAt
          }
        });
        return;
      }
      
      metrics.cacheMisses++;
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache the response
        const dataToCache = {
          ...data,
          _bff: {
            ...data._bff,
            cachedAt: Date.now()
          }
        };
        
        setCache(cacheKey, dataToCache, config).catch(console.error);
        return originalJson.call(this, data);
      };
      
      next();
    }).catch((error) => {
      console.error(`❌ BFF Cache Error: ${error.message}`);
      next();
    });
  };
};

/**
 * Performance monitoring middleware
 * Tracks BFF-specific metrics and optimization opportunities
 */
export const bffPerformanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  metrics.requestCount++;
  
  const originalJson = res.json;
  res.json = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Update average response time
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.requestCount - 1) + responseTime) / 
      metrics.requestCount
    );
    
    // Add performance data to response
    const responseWithPerf = {
      ...data,
      _bff: {
        ...data._bff,
        performance: {
          responseTime,
          serverTimestamp: new Date().toISOString(),
          requestCount: metrics.requestCount
        }
      }
    };
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`🐌 BFF Slow Request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    return originalJson.call(this, responseWithPerf);
  };
  
  next();
};

/**
 * Error handling middleware optimized for React error boundaries
 */
export const bffErrorHandlingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`❌ BFF Error: ${error.message}`, error.stack);
  
  const bffError = createBFFError(
    'INTERNAL_SERVER_ERROR',
    error.message,
    req,
    error
  );
  
  // Determine error type for React error boundaries
  const errorType = determineErrorType(error);
  
  const errorResponse = {
    success: false,
    error: bffError,
    _bff: {
      errorType,
      retryable: isRetryableError(error),
      userFriendlyMessage: getUserFriendlyMessage(error),
      debugInfo: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        originalMessage: error.message
      } : undefined
    }
  };
  
  res.status(getStatusCodeFromError(error)).json(errorResponse);
};

/**
 * CORS middleware optimized for React development
 */
export const bffCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Enhanced CORS for React development
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Session-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count, X-Request-ID');
  
  // Preflight handling
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

/**
 * Request batching middleware
 * Handles multiple requests in a single HTTP call
 */
export const requestBatchingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/batch' && req.method === 'POST') {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json(createBFFError('INVALID_BATCH_REQUEST', 'Requests must be an array', req));
    }
    
    // Process batch requests
    processBatchRequests(requests, req).then((results) => {
      res.json({
        success: true,
        results,
        _bff: {
          batchSize: requests.length,
          timestamp: new Date().toISOString()
        }
      });
    }).catch((error) => {
      res.status(500).json(createBFFError('BATCH_PROCESSING_ERROR', error.message, req));
    });
    
    return;
  }
  
  next();
};

// Utility functions
function generateRequestCacheKey(req: Request): string {
  return `${req.method}:${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.body)}`;
}

function generateCacheKey(req: Request): string {
  const userId = (req as any).user?.userId || 'anonymous';
  return `bff:${userId}:${req.path}:${JSON.stringify(req.query)}`;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function shapeResponseForReact(data: any, req: Request): any {
  // Apply React-specific transformations
  if (Array.isArray(data)) {
    return data.map(item => addReactOptimizations(item, req));
  }
  
  if (typeof data === 'object' && data !== null) {
    return addReactOptimizations(data, req);
  }
  
  return data;
}

function addReactOptimizations(data: any, req: Request): any {
  return {
    ...data,
    // Add React keys for lists
    _reactKey: data.id || data._id || generateUniqueKey(),
    // Add loading states
    _loading: false,
    // Add error states
    _error: null,
    // Add timestamp for React Query cache invalidation
    _updatedAt: data.updated_at || data.updatedAt || new Date().toISOString()
  };
}

function generateUniqueKey(): string {
  return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCacheabilityInfo(req: Request) {
  const method = req.method.toLowerCase();
  const isGetRequest = method === 'get';
  const hasQueryParams = Object.keys(req.query).length > 0;
  
  return {
    cacheable: isGetRequest,
    ttl: isGetRequest ? (hasQueryParams ? 300 : 600) : 0, // 5min with params, 10min without
    strategy: 'memory' as const,
    invalidationTriggers: ['session_update', 'character_update']
  };
}

function getOptimizationHints(req: Request, data: any) {
  return {
    prefetchable: true,
    suspendable: true,
    virtualizable: Array.isArray(data) && data.length > 50,
    streamable: req.headers.accept?.includes('text/event-stream'),
    compressible: JSON.stringify(data).length > 1024
  };
}

async function checkCache(key: string, config: BFFCacheConfig): Promise<any> {
  switch (config.strategy) {
    case 'memory':
      // Simple in-memory cache implementation
      const memoryCache = global.__bffMemoryCache || (global.__bffMemoryCache = new Map());
      const cached = memoryCache.get(key);
      if (cached && Date.now() - cached.timestamp < config.ttl * 1000) {
        return cached.data;
      }
      return null;
    
    case 'redis':
      // TODO: Implement Redis caching
      return null;
    
    case 'database':
      // TODO: Implement database caching
      return null;
    
    default:
      return null;
  }
}

async function setCache(key: string, data: any, config: BFFCacheConfig): Promise<void> {
  switch (config.strategy) {
    case 'memory':
      const memoryCache = global.__bffMemoryCache || (global.__bffMemoryCache = new Map());
      memoryCache.set(key, { data, timestamp: Date.now() });
      break;
    
    case 'redis':
      // TODO: Implement Redis caching
      break;
    
    case 'database':
      // TODO: Implement database caching
      break;
  }
}

function createBFFError(code: string, message: string, req: Request, originalError?: Error): BFFError {
  return {
    code,
    message,
    timestamp: new Date(),
    requestId: req.headers['x-request-id'] as string || generateRequestId(),
    details: originalError ? {
      originalMessage: originalError.message,
      stack: process.env.NODE_ENV === 'development' ? originalError.stack : undefined
    } : undefined
  };
}

function determineErrorType(error: Error): string {
  if (error.name === 'ValidationError') return 'validation';
  if (error.name === 'UnauthorizedError') return 'auth';
  if (error.message.includes('timeout')) return 'timeout';
  if (error.message.includes('network')) return 'network';
  return 'unknown';
}

function isRetryableError(error: Error): boolean {
  return ['timeout', 'network', 'rate_limit'].some(type => 
    error.message.toLowerCase().includes(type)
  );
}

function getUserFriendlyMessage(error: Error): string {
  const errorMessages: Record<string, string> = {
    'ValidationError': 'Please check your input and try again.',
    'UnauthorizedError': 'You need to sign in to access this feature.',
    'timeout': 'The request is taking longer than expected. Please try again.',
    'network': 'Connection issue detected. Please check your internet connection.',
    'rate_limit': 'Too many requests. Please wait a moment before trying again.'
  };
  
  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.name === key || error.message.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

function getStatusCodeFromError(error: Error): number {
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'UnauthorizedError') return 401;
  if (error.name === 'NotFoundError') return 404;
  if (error.message.includes('timeout')) return 408;
  if (error.message.includes('rate_limit')) return 429;
  return 500;
}

async function processBatchRequests(requests: any[], originalReq: Request): Promise<any[]> {
  const results = await Promise.allSettled(
    requests.map(async (request) => {
      try {
        // Simulate internal request processing
        // In a real implementation, this would make internal API calls
        return {
          success: true,
          data: { processed: true, request },
          _bff: { batchItem: true }
        };
      } catch (error) {
        return {
          success: false,
          error: createBFFError('BATCH_ITEM_ERROR', (error as Error).message, originalReq)
        };
      }
    })
  );
  
  return results.map((result, index) => ({
    index,
    status: result.status,
    ...(result.status === 'fulfilled' ? { data: result.value } : { error: result.reason })
  }));
}

// Export metrics for monitoring
export function getBFFMetrics(): BFFMetrics {
  return { ...metrics };
}

// Reset metrics (useful for testing)
export function resetBFFMetrics(): void {
  metrics.requestCount = 0;
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.averageResponseTime = 0;
  metrics.coalescedRequests = 0;
}