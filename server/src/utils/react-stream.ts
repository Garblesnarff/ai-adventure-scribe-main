import type { Response } from 'express';
import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

interface StreamOptions {
  status?: number;
  headers?: Record<string, string>;
  onError?: (error: unknown) => void;
  abortDelayMs?: number;
}

export function streamReactResponse(
  res: Response,
  element: ReactElement,
  { status = 200, headers = {}, onError, abortDelayMs = 10000 }: StreamOptions = {}
) {
  let didError = false;

  const stream = renderToPipeableStream(element, {
    onShellReady() {
      res.status(didError ? 500 : status);
      res.set({ 'Content-Type': 'text/html; charset=utf-8', ...headers });
      res.write('<!DOCTYPE html>');
      stream.pipe(res);
    },
    onShellError(error) {
      didError = true;
      handleError(error, onError);
      if (!res.headersSent) {
        res.status(500).send('<!DOCTYPE html><html><body>Something went wrong.</body></html>');
      }
    },
    onError(error) {
      didError = true;
      handleError(error, onError);
    },
  });

  res.on('close', () => {
    stream.abort();
  });

  if (abortDelayMs > 0) {
    setTimeout(() => stream.abort(), abortDelayMs);
  }
}

function handleError(error: unknown, onError?: (error: unknown) => void) {
  console.error('SSR render error', error);
  onError?.(error);
}
