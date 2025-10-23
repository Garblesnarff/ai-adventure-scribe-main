import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { v4 as uuidv4 } from 'uuid';

// Basic frontend observability: request-id propagation and error reporting
(function setupObservability() {
  const RELEASE = (import.meta as any).env?.VITE_RELEASE || (import.meta as any).env?.VITE_APP_VERSION || 'dev';
  const ENV = (import.meta as any).env?.VITE_ENVIRONMENT || (import.meta as any).env?.MODE || 'development';

  // Inject X-Request-Id header into all fetch() calls
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const rid = (init?.headers as any)?.['x-request-id'] || (init?.headers as any)?.['X-Request-Id'] || uuidv4();
    const headers = new Headers(init?.headers || {});
    if (!headers.get('x-request-id')) headers.set('x-request-id', String(rid));
    headers.set('x-release', String(RELEASE));
    headers.set('x-environment', String(ENV));

    const nextInit: RequestInit = { ...(init || {}), headers };
    return originalFetch(input as any, nextInit).catch((err) => {
      // fire-and-forget error capture to backend
      try {
        originalFetch('/v1/observability/error', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': String(rid), 'x-release': String(RELEASE), 'x-environment': String(ENV) },
          body: JSON.stringify({ message: err?.message || 'fetch_failed', stack: err?.stack, extra: { input: String(input) } }),
          keepalive: true,
        });
      } catch {
        // Ignore error reporting failures
      }
      throw err;
    });
  };

  // Global error listeners
  window.addEventListener('error', (event) => {
    try {
      const rid = uuidv4();
      originalFetch('/v1/observability/error', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': String(rid), 'x-release': String(RELEASE), 'x-environment': String(ENV) },
        body: JSON.stringify({ message: event?.error?.message || event?.message || 'error', stack: event?.error?.stack, extra: { filename: event?.filename, lineno: event?.lineno, colno: event?.colno } }),
        keepalive: true,
      });
    } catch {
      // Ignore error reporting failures
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const rid = uuidv4();
      const reason: any = (event as any).reason;
      originalFetch('/v1/observability/error', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': String(rid), 'x-release': String(RELEASE), 'x-environment': String(ENV) },
        body: JSON.stringify({ message: (reason && (reason.message || String(reason))) || 'unhandledrejection', stack: reason?.stack }),
        keepalive: true,
      });
    } catch {
      // Ignore error reporting failures
    }
  });
})();

createRoot(document.getElementById('root')!).render(<App />);
