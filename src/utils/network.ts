/**
 * Network utility helpers with SSR-safe guards.
 */
const getNavigator = () => (typeof window !== 'undefined' ? window.navigator : undefined);

export const isOnline = (): boolean => {
  const navigatorRef = getNavigator();
  if (!navigatorRef) return true;
  if (typeof navigatorRef.onLine === 'boolean') {
    return navigatorRef.onLine;
  }
  return true;
};

export const isOffline = (): boolean => !isOnline();

export const addNetworkListener = (
  type: 'online' | 'offline',
  handler: () => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {
      /* noop */
    };
  }

  window.addEventListener(type, handler);
  return () => window.removeEventListener(type, handler);
};
