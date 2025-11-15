/**
 * Google Analytics gtag Type Definitions
 */

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetIdOrEventName: string,
      parameters?: Record<string, any>,
    ) => void;
  }
}

export {};
