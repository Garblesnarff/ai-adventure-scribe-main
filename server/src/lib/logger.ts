import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Winston Logger Configuration
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const logsDir = path.join(__dirname, '../../../logs');

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-adventure-scribe' },
  transports: [
    // Write to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Write errors to file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    // Write all logs to combined file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

// Create child loggers for different modules
export const combatLogger = logger.child({ module: 'combat' });
export const spellLogger = logger.child({ module: 'spells' });
export const progressionLogger = logger.child({ module: 'progression' });

// Request Logger Middleware Types and Configuration
export type RequestLoggerOptions = {
  headerName?: string;
};

const DEFAULT_HEADER = 'x-request-id';

export function requestIdMiddleware(options: RequestLoggerOptions = {}) {
  const headerName = (options.headerName || DEFAULT_HEADER).toLowerCase();
  return function reqId(req: Request, res: Response, next: NextFunction) {
    const incoming = (req.headers[headerName] as string | undefined) || (req.headers[headerName as any] as string | undefined);
    const id = (incoming && String(incoming)) || randomUUID();
    // store on req and res.locals
    (req as any).requestId = id;
    res.locals.requestId = id;
    res.setHeader(headerName, id);
    next();
  };
}

export function requestLoggingMiddleware() {
  return function requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    const rid = (res.locals && (res.locals as any).requestId) || (req as any).requestId;

    const logBase = {
      requestId: rid,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
    } as const;

    // Log request start
    console.log(JSON.stringify({ level: 'info', msg: 'request.start', ...logBase }));

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      const payload = {
        level: 'info',
        msg: 'request.end',
        ...logBase,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 1000) / 1000,
        contentLength: res.getHeader('content-length') || undefined,
      } as any;
      console.log(JSON.stringify(payload));
    });

    next();
  };
}

export function errorLoggingMiddleware() {
  // Error-handling middleware must have 4 args
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function onError(err: any, req: Request, res: Response, _next: NextFunction) {
    const rid = (res.locals && (res.locals as any).requestId) || (req as any).requestId;

    // Use Winston logger for structured error logging
    logger.error('Request error', {
      requestId: rid,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode || 500,
      error: err?.message,
      errorName: err?.name,
      stack: err?.stack,
      user: (req as any).user?.id,
    });

    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
