import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

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
    const payload = {
      level: 'error',
      msg: 'request.error',
      requestId: rid,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode || 500,
      error: {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      },
    };
    console.error(JSON.stringify(payload));
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
