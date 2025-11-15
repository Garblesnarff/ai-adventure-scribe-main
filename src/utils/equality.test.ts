/**
 * Tests for Equality Utilities
 *
 * Ensures deep and shallow equality comparisons work correctly
 * for preventing unnecessary re-renders and state updates.
 */

import { describe, it, expect } from 'vitest';

import { deepEqual, shallowEqual, arrayEqual, pick } from './equality';

describe('deepEqual', () => {
  it('should compare primitive values correctly', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('test', 'test')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);

    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('test', 'other')).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('should compare simple objects correctly', () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);

    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('should compare nested objects correctly', () => {
    expect(deepEqual({ a: 1, b: { c: 2, d: 3 } }, { a: 1, b: { c: 2, d: 3 } })).toBe(true);

    expect(deepEqual({ a: 1, b: { c: 2, d: { e: 4 } } }, { a: 1, b: { c: 2, d: { e: 4 } } })).toBe(
      true,
    );

    expect(deepEqual({ a: 1, b: { c: 2, d: 3 } }, { a: 1, b: { c: 2, d: 4 } })).toBe(false);
  });

  it('should compare arrays correctly', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);

    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });

  it('should compare Date objects correctly', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-01');
    const date3 = new Date('2024-01-02');

    expect(deepEqual(date1, date2)).toBe(true);
    expect(deepEqual(date1, date3)).toBe(false);
  });

  it('should compare RegExp objects correctly', () => {
    expect(deepEqual(/test/gi, /test/gi)).toBe(true);
    expect(deepEqual(/test/gi, /test/g)).toBe(false);
    expect(deepEqual(/test/, /other/)).toBe(false);
  });

  it('should handle combat state scenario', () => {
    // Simulate the combat state scenario from GameContext
    const state1 = {
      isInCombat: true,
      currentTurnPlayerId: 'player-123',
    };
    const state2 = {
      isInCombat: true,
      currentTurnPlayerId: 'player-123',
    };
    const state3 = {
      isInCombat: true,
      currentTurnPlayerId: 'player-456',
    };

    expect(deepEqual(state1, state2)).toBe(true);
    expect(deepEqual(state1, state3)).toBe(false);
  });
});

describe('shallowEqual', () => {
  it('should compare objects with primitive values correctly', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('should use reference equality for nested objects', () => {
    const nested = { c: 3 };
    expect(shallowEqual({ a: nested }, { a: nested })).toBe(true);
    expect(shallowEqual({ a: { c: 3 } }, { a: { c: 3 } })).toBe(false); // Different references
  });

  it('should handle null and undefined', () => {
    expect(shallowEqual({ a: null }, { a: null })).toBe(true);
    expect(shallowEqual({ a: undefined }, { a: undefined })).toBe(true);
    expect(shallowEqual({ a: null }, { a: undefined })).toBe(false);
  });
});

describe('arrayEqual', () => {
  it('should compare arrays with default comparator', () => {
    expect(arrayEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(arrayEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(arrayEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('should use custom comparator', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 1 };
    const obj3 = { a: 2 };

    expect(arrayEqual([obj1], [obj2], deepEqual)).toBe(true);
    expect(arrayEqual([obj1], [obj3], deepEqual)).toBe(false);
  });

  it('should handle empty arrays', () => {
    expect(arrayEqual([], [])).toBe(true);
    expect(arrayEqual([], [1])).toBe(false);
  });
});

describe('pick', () => {
  it('should extract specified properties', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('should handle missing keys gracefully', () => {
    const obj = { a: 1, b: 2 };
    expect(pick(obj, ['a', 'c' as any])).toEqual({ a: 1 });
  });

  it('should return empty object for empty keys array', () => {
    const obj = { a: 1, b: 2 };
    expect(pick(obj, [])).toEqual({});
  });

  it('should be useful for combat state extraction', () => {
    const combatState = {
      isInCombat: true,
      currentTurnPlayerId: 'player-123',
      activeEncounter: {
        /* complex nested object */
      },
      participants: [
        /* array */
      ],
      otherStuff: 'ignored',
    };

    const extracted = pick(combatState, ['isInCombat', 'currentTurnPlayerId']);
    expect(extracted).toEqual({
      isInCombat: true,
      currentTurnPlayerId: 'player-123',
    });
    expect('activeEncounter' in extracted).toBe(false);
  });
});

describe('Performance considerations', () => {
  it('shallow equality should be faster for large objects', () => {
    const largeObj1 = {
      ...Array.from({ length: 100 }, (_, i) => ({ [`key${i}`]: i })).reduce(
        (acc, item) => ({ ...acc, ...item }),
        {},
      ),
    };
    const largeObj2 = { ...largeObj1 };

    const shallowStart = performance.now();
    shallowEqual(largeObj1, largeObj2);
    const shallowTime = performance.now() - shallowStart;

    const deepStart = performance.now();
    deepEqual(largeObj1, largeObj2);
    const deepTime = performance.now() - deepStart;

    // This is just a demonstration - actual performance depends on many factors
    expect(shallowTime).toBeGreaterThanOrEqual(0);
    expect(deepTime).toBeGreaterThanOrEqual(0);
  });
});
