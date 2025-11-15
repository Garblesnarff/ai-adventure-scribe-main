import { createRoot } from 'react-dom/client';

import App from './App.tsx';

import './index.css';
import { v4 as uuidv4 } from 'uuid';
import { initializeAnalytics } from './utils/analytics';
import { validateEnvironment } from './utils/env-validation';

// Basic frontend observability: request-id propagation and error reporting
(function setupObservability() {
  const RELEASE =
    (import.meta as any).env?.VITE_RELEASE || (import.meta as any).env?.VITE_APP_VERSION || 'dev';
  const ENV =
    (import.meta as any).env?.VITE_ENVIRONMENT || (import.meta as any).env?.MODE || 'development';
  const OBS_ENABLED = (() => {
    const flag = String((import.meta as any).env?.VITE_OBSERVABILITY_ENABLED ?? '')
      .trim()
      .toLowerCase();
    if (!flag) return false;
    return flag === 'true' || flag === '1' || flag === 'yes' || flag === 'on';
  })();

  // Inject X-Request-Id header into all fetch() calls
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const rid =
      (init?.headers as any)?.['x-request-id'] ||
      (init?.headers as any)?.['X-Request-Id'] ||
      uuidv4();
    const headers = new Headers(init?.headers || {});
    if (!headers.get('x-request-id')) headers.set('x-request-id', String(rid));
    headers.set('x-release', String(RELEASE));
    headers.set('x-environment', String(ENV));

    const nextInit: RequestInit = { ...(init || {}), headers };
    return originalFetch(input as any, nextInit).catch((err) => {
      if (OBS_ENABLED) {
        // fire-and-forget error capture to backend
        try {
          originalFetch('/v1/observability/error', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-request-id': String(rid),
              'x-release': String(RELEASE),
              'x-environment': String(ENV),
            },
            body: JSON.stringify({
              message: err?.message || 'fetch_failed',
              stack: err?.stack,
              extra: { input: String(input) },
            }),
            keepalive: true,
          }).catch(() => {});
        } catch {
          // Ignore error reporting failures
        }
      }
      throw err;
    });
  };

  // Global error listeners
  window.addEventListener('error', (event) => {
    if (!OBS_ENABLED) return;
    try {
      const rid = uuidv4();
      originalFetch('/v1/observability/error', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-request-id': String(rid),
          'x-release': String(RELEASE),
          'x-environment': String(ENV),
        },
        body: JSON.stringify({
          message: event?.error?.message || event?.message || 'error',
          stack: event?.error?.stack,
          extra: { filename: event?.filename, lineno: event?.lineno, colno: event?.colno },
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore error reporting failures
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (!OBS_ENABLED) return;
    try {
      const rid = uuidv4();
      const reason: any = (event as any).reason;
      originalFetch('/v1/observability/error', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-request-id': String(rid),
          'x-release': String(RELEASE),
          'x-environment': String(ENV),
        },
        body: JSON.stringify({
          message: (reason && (reason.message || String(reason))) || 'unhandledrejection',
          stack: reason?.stack,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore error reporting failures
    }
  });
})();

// Validate environment configuration
validateEnvironment();

// Initialize Google Analytics
initializeAnalytics();

createRoot(document.getElementById('root')!).render(<App />);
