import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a throttled function that only invokes the provided function at most once per every `wait` milliseconds.
 * The throttled function comes with a flush method to immediately invoke any pending function call.
 *
 * Throttling ensures that:
 * - The function is called immediately on the first invocation (leading edge)
 * - Subsequent calls within the wait period are ignored
 * - The last call is executed after the wait period (trailing edge)
 *
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function with a flush method
 *
 * @example
 * const throttledFn = throttle((value) => console.log(value), 250);
 * throttledFn('a'); // Executes immediately
 * throttledFn('b'); // Ignored (within 250ms)
 * throttledFn('c'); // Ignored (within 250ms)
 * // After 250ms, 'c' is executed (trailing edge)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): T & { flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;
  let lastCallTime = 0;

  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // Store the latest arguments for trailing edge execution
    lastArgs = args;

    // Leading edge: execute immediately if enough time has passed
    if (timeSinceLastCall >= wait) {
      lastCallTime = now;
      lastArgs = null;
      return func.apply(this, args);
    }

    // Trailing edge: schedule execution if not already scheduled
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        timeoutId = null;
        if (lastArgs) {
          const argsToUse = lastArgs;
          lastArgs = null;
          func.apply(this, argsToUse);
        }
      }, wait - timeSinceLastCall);
    }
  } as T & { flush: () => void };

  // Flush method to immediately invoke any pending function call
  throttled.flush = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs) {
      const argsToUse = lastArgs;
      lastArgs = null;
      func.apply(this, argsToUse);
      lastCallTime = Date.now();
    }
  };

  return throttled;
}
