/**
 * Equality Utilities
 *
 * Provides deep equality comparison functions for complex objects.
 * Use these when simple reference equality (===) is insufficient
 * for detecting actual value changes.
 *
 * Performance Note: Deep equality checks can be expensive for large objects.
 * Only use when necessary to prevent unnecessary re-renders or state updates.
 *
 * @author AI Dungeon Master Team
 */

/**
 * Performs a deep equality check between two values
 *
 * Compares:
 * - Primitives by value
 * - Objects by deeply comparing all properties
 * - Arrays by deeply comparing all elements
 * - Dates by time value
 * - RegExp by string representation
 * - Functions by reference (cannot compare implementations)
 *
 * Performance: O(n) where n is the total number of nested properties/elements
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal, false otherwise
 *
 * @example
 * ```typescript
 * deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
 * deepEqual([1, 2, [3, 4]], [1, 2, [3, 4]]); // true
 * deepEqual({ a: 1 }, { a: 2 }); // false
 * ```
 */
export function deepEqual(a: any, b: any): boolean {
  // Handle primitive types and reference equality
  if (a === b) return true;

  // Handle null/undefined cases
  if (a == null || b == null) return a === b;

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle RegExp objects
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(
      (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]),
    );
  }

  // All other cases (including functions, symbols, etc.)
  return false;
}

/**
 * Performs a shallow equality check between two objects
 *
 * Compares:
 * - Top-level properties by reference (===)
 * - Does NOT recursively compare nested objects
 *
 * Performance: O(n) where n is the number of top-level properties
 * Much faster than deep equality for objects with many properties
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 * @returns true if all top-level properties are equal, false otherwise
 *
 * @example
 * ```typescript
 * shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
 * shallowEqual({ a: { c: 1 } }, { a: { c: 1 } }); // false (different object references)
 * ```
 */
export function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
  // Handle reference equality
  if (a === b) return true;

  // Handle null/undefined cases
  if (a == null || b == null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  // Different number of keys
  if (keysA.length !== keysB.length) return false;

  // Compare top-level properties by reference
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key]);
}

/**
 * Creates a shallow copy of an object with specific properties
 * Useful for extracting only the properties you want to compare
 *
 * @param obj - Source object
 * @param keys - Array of property keys to pick
 * @returns New object with only the specified properties
 *
 * @example
 * ```typescript
 * const obj = { a: 1, b: 2, c: 3 };
 * pick(obj, ['a', 'c']); // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Checks if two arrays are equal by comparing their elements
 *
 * @param a - First array
 * @param b - Second array
 * @param compareFn - Optional custom comparison function (defaults to ===)
 * @returns true if arrays have same length and all elements are equal
 *
 * @example
 * ```typescript
 * arrayEqual([1, 2, 3], [1, 2, 3]); // true
 * arrayEqual([1, 2], [1, 2, 3]); // false
 * arrayEqual([{a:1}], [{a:1}], deepEqual); // true (with custom comparator)
 * ```
 */
export function arrayEqual<T>(
  a: T[],
  b: T[],
  compareFn: (x: T, y: T) => boolean = (x, y) => x === y,
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((item, index) => compareFn(item, b[index]));
}
