import { useState, useEffect, useCallback } from 'react';

import logger from '@/lib/logger';

/**
 * Custom hook for type-safe localStorage access with SSR-safety and error handling.
 *
 * @template T - The type of value to store
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist or on error
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * ```tsx
 * // Basic usage with boolean
 * const [isDarkMode, setIsDarkMode] = useLocalStorage('theme:dark', false);
 *
 * // With complex object
 * const [settings, setSettings] = useLocalStorage('user:settings', {
 *   volume: 0.5,
 *   notifications: true
 * });
 *
 * // Functional updates
 * setSettings(prev => ({ ...prev, volume: 0.8 }));
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state with SSR-safety
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Return default value during SSR
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);

      if (item === null) {
        return defaultValue;
      }

      // Handle special case: boolean stored as '1'/'0'
      if (typeof defaultValue === 'boolean') {
        return (item === '1') as T;
      }

      // Parse JSON for objects/arrays
      return JSON.parse(item) as T;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Wrapper function to set value and sync to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((previousValue) => {
        const nextValue =
          value instanceof Function ? (value as (prev: T) => T)(previousValue) : value;

        if (Object.is(previousValue, nextValue)) {
          return previousValue;
        }

        try {
          if (typeof window !== 'undefined') {
            if (typeof nextValue === 'boolean') {
              window.localStorage.setItem(key, nextValue ? '1' : '0');
            } else {
              window.localStorage.setItem(key, JSON.stringify(nextValue));
            }
          }
        } catch (error) {
          logger.error(`Error setting localStorage key "${key}":`, error);
        }

        return nextValue;
      });
    },
    [key],
  );

  // Sync with localStorage when value changes externally (e.g., in another tab)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key || e.storageArea !== window.localStorage) {
        return;
      }

      try {
        if (e.newValue === null) {
          setStoredValue(defaultValue);
        } else if (typeof defaultValue === 'boolean') {
          setStoredValue((e.newValue === '1') as T);
        } else {
          setStoredValue(JSON.parse(e.newValue) as T);
        }
      } catch (error) {
        logger.warn(`Error syncing localStorage key "${key}" from storage event:`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue]);

  return [storedValue, setValue];
}

/**
 * Variant of useLocalStorage that returns string values directly (no JSON parsing).
 * Useful for simple string storage.
 *
 * @param key - The localStorage key
 * @param defaultValue - Default string value
 * @returns Tuple of [value, setValue]
 *
 * @example
 * ```tsx
 * const [username, setUsername] = useLocalStorageString('user:name', 'Guest');
 * ```
 */
export function useLocalStorageString(
  key: string,
  defaultValue: string,
): [string, (value: string | ((prev: string) => string)) => void] {
  const [storedValue, setStoredValue] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: string | ((prev: string) => string)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, valueToStore);
        }
      } catch (error) {
        logger.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === window.localStorage) {
        setStoredValue(e.newValue !== null ? e.newValue : defaultValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue]);

  return [storedValue, setValue];
}
